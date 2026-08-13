import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * These four cases were written against a detail modal/drawer the static scan
 * could not confirm, and parked as `test.fixme`. Live verification settled it:
 * there is no overlay. A row click navigates to a dedicated detail page,
 * `/pos/<store>/customers/<uuid>?tab=profile`, with Profile / Orders History /
 * Points History / Cashback History tabs.
 *
 * The cases are kept — same ids, same intent (open, content matches, dismiss by
 * control, dismiss by keyboard) — retargeted at the navigation the screen
 * actually implements. TC-CUS-055 in particular inverts: Escape has nothing to
 * dismiss on a page, and asserting it does nothing is the honest check.
 */
test.describe('Chi tiết khách hàng (Detail page) — Customers', () => {
  test.beforeEach(async ({ customersPage }) => {
    await customersPage.goto();
    await customersPage.waitForReady();
  });

  test(
    'TC-CUS-052 — row click opens the customer detail page',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, customerDetailPage, page }) => {
      const listUrl = page.url();
      await customersPage.table.rows.first().click();

      await expect(page).toHaveURL(/\/customers\/[0-9a-f-]{36}\?tab=profile/);
      expect(page.url()).not.toBe(listUrl);
      await customerDetailPage.waitForReady();

      await expect(customerDetailPage.tabs).toHaveCount(4);
      for (const label of [
        /^profile$/i,
        /orders history/i,
        /points history/i,
        /cashback history/i,
      ]) {
        await expect(customerDetailPage.tab(label)).toBeVisible();
      }
      await expect(customerDetailPage.tab(/^profile$/i)).toHaveAttribute('data-state', 'active');
    },
  );

  test(
    'TC-CUS-053 — detail content matches row data exactly',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, customerDetailPage, page }) => {
      const cells = (await customersPage.rowCells())[0];
      expect(cells, 'expected at least one customer row').toBeTruthy();
      const [name, , email, , totalVisits, points, cashback] = cells;

      await customersPage.table.rows.first().click();
      await customerDetailPage.waitForReady();

      // The editable fields carry their value in `value`, not in text content —
      // reading the rendered text was why an earlier draft saw them as blank.
      await expect(customerDetailPage.nameInput).toHaveValue(name);
      if (email !== '—') {
        await expect(customerDetailPage.emailInput).toHaveValue(email);
      }

      // The read-only stats are plain text on the page.
      const body = page.locator('body');
      await expect(body).toContainText(totalVisits);
      await expect(body).toContainText(points);
      await expect(body).toContainText(cashback);
    },
  );

  test(
    'TC-CUS-054 — leaving the detail restores the list and its query state',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, customerDetailPage, page }) => {
      // Start on page 2 so "restores table state" means something stronger than
      // "lands back on the default first page".
      await customersPage.gotoPage(2);
      const listUrl = page.url();
      const firstName = (await customersPage.rowCells())[0][0];

      await customersPage.table.rows.first().click();
      await customerDetailPage.waitForReady();

      // There is no close button on a full page; browser history is the way
      // back, which is what a user pressing Back or the OS gesture does.
      await page.goBack();
      await customersPage.waitForReady();

      expect(page.url()).toBe(listUrl);
      await expect(customersPage.pageIndicator).toHaveText(/2\s*\/\s*\d+/);
      expect((await customersPage.rowCells())[0][0]).toBe(firstName);
    },
  );

  test(
    'TC-CUS-055 — Escape does not discard the detail page',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, customerDetailPage, page }) => {
      await customersPage.table.rows.first().click();
      await customerDetailPage.waitForReady();
      const detailUrl = page.url();

      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);

      // A page is not a dialog: Escape must not navigate away, or a stray key
      // press would throw away whatever the user had typed into Profile.
      expect(page.url()).toBe(detailUrl);
      await expect(customerDetailPage.nameInput).toBeVisible();
      await expect(customerDetailPage.saveChangesButton).toBeVisible();
    },
  );
});
