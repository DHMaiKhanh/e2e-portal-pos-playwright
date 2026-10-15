import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Pages — row actions & dialogs.
 *
 * SHARED LIVE DATA: every test installs `guardWrites()` (abort) or `mockWrites()`
 * (fulfil locally with a 422 and capture the payload) BEFORE opening a dialog, so
 * no create / edit / clone / delete / publish can reach the DEV Portal. Each test
 * ends by asserting no unexpected write was attempted.
 *
 * Verified on DEV 2026-10-13:
 *  - Add / Edit / Clone are `role=dialog`; Delete is `role=alertdialog`.
 *  - Publish fires `POST /report_pages/<id>/publish` on ONE click, no confirm.
 *  - Build layout (and clicking the row) opens `/report-config/pages/<uuid>`
 *    ("Page Builder | Portal").
 *  - Layout badges open the live report in a new tab:
 *    `/report-pages/<slug>` (Web) or `?layout=pos` (POS Window).
 */
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

test.describe('Hành động dòng & dialog — Pages', () => {
  test.beforeEach(async ({ reportConfigPage }) => {
    await reportConfigPage.goto();
  });

  /**
   * TC-RCF-070 — Mỗi dòng Pages có 5 hành động icon
   */
  test(
    'TC-RCF-070 — every page row offers Publish, Build layout, Edit, Clone, Delete',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc }) => {
      const n = await rc.table.rows.count();
      for (let i = 0; i < n; i++) {
        for (const action of rc.spec.rowActions)
          await expect(rc.rowAction(action, i)).toBeVisible();
      }
    },
  );

  /**
   * TC-RCF-072 — Dialog "Add Page": field & giá trị mặc định
   */
  test(
    'TC-RCF-072 — Add Page dialog shows its fields with the documented defaults',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ reportConfigPage: rc, page }) => {
      const blocked = await rc.guardWrites();
      await rc.openAdd();
      const d = page.getByRole('dialog', { name: 'Add Page' });
      await expect(d).toBeVisible();
      await expect(d).toContainText('The slug comes from the name and is fixed after creation.');
      await expect(d.getByLabel('Name')).toHaveAttribute('placeholder', 'Income Reports');
      await expect(d.getByLabel('Name')).toHaveValue('');
      await expect(d.getByRole('radio', { name: 'A Page Of Its Own' })).toBeChecked();
      await expect(
        d.getByRole('radio', { name: 'A Fragment Of Another Screen' }),
      ).not.toBeChecked();
      await expect(d.getByRole('switch', { name: 'Hidden in menu' })).toHaveAttribute(
        'aria-checked',
        'false',
      );
      await expect(d.getByRole('switch', { name: 'Active' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
      await expect(d.locator('#required\\.permission')).toHaveText('None');
      await expect(d.locator('#required\\.passcode')).toHaveText('None');
      await expect(d.getByRole('button', { name: 'Cancel' })).toBeVisible();
      await expect(d.getByRole('button', { name: 'Create' })).toBeEnabled();
      await d.getByRole('button', { name: 'Cancel' }).click();
      await expect(d).toBeHidden();
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-073 — Slug tự sinh dạng kebab-case từ Name
   */
  test(
    'TC-RCF-073 — typing a name previews a kebab-case slug',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const blocked = await rc.guardWrites();
      await rc.openAdd();
      const d = page.getByRole('dialog', { name: 'Add Page' });
      await d.getByLabel('Name').fill('E2E Probe Page 01');
      await expect(d).toContainText('e2e-probe-page-01');
      await d.getByLabel('Name').fill('  Mixed CASE  & Symbols!! ');
      await expect(d).toContainText('mixed-case-symbols');
      await page.keyboard.press('Escape');
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-074 — Submit form rỗng → lỗi client, không request ghi
   */
  test(
    'TC-RCF-074 — submitting Add Page empty shows client-side errors and sends nothing',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const blocked = await rc.guardWrites();
      await rc.openAdd();
      const d = page.getByRole('dialog', { name: 'Add Page' });
      await d.getByRole('button', { name: 'Create' }).click();
      await expect(d).toContainText('Name must contain letters or numbers to make a slug');
      await expect(d).toBeVisible();
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-075 — Name chỉ có ký hiệu → slug "—" và bị chặn khi submit
   */
  test(
    'TC-RCF-075 — a symbols-only name yields no slug and is rejected client-side',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const blocked = await rc.guardWrites();
      await rc.openAdd();
      const d = page.getByRole('dialog', { name: 'Add Page' });
      await d.getByLabel('Name').fill('!!!');
      await d.getByRole('button', { name: 'Create' }).click();
      await expect(d).toContainText('Name must contain letters or numbers to make a slug');
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-076 — Submit hợp lệ (mock): payload POST đúng; lỗi server hiện inline
   */
  test(
    'TC-RCF-076 — a valid Add Page posts the expected payload (mocked 422 shown inline)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const writes = await rc.mockWrites(422);
      await rc.openAdd();
      const d = page.getByRole('dialog', { name: 'Add Page' });
      await d.getByLabel('Name').fill('E2E Probe Page 01');
      await d.getByRole('button', { name: 'Create' }).click();
      await expect.poll(() => writes.length).toBe(1);
      expect(writes[0].method).toBe('POST');
      expect(writes[0].url).toMatch(/\/report_pages\.jsonld$/);
      expect(writes[0].body).toEqual({
        slug: 'e2e-probe-page-01',
        name: 'E2E Probe Page 01',
        hiddenInMenu: false,
        usage: 'standalone',
        active: true,
        required: {},
      });
      // The violation is mapped back onto the Name field; the dialog stays open.
      await expect(d).toContainText('E2E mocked rejection');
      await expect(d).toBeVisible();
    },
  );

  /**
   * TC-RCF-077 — Cancel / Escape / nút Close đóng dialog không ghi gì
   */
  test(
    'TC-RCF-077 — Cancel, Escape and the close button all dismiss Add Page without a request',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const blocked = await rc.guardWrites();
      const d = page.getByRole('dialog', { name: 'Add Page' });
      await rc.openAdd();
      await d.getByLabel('Name').fill('should not persist');
      await d.getByRole('button', { name: 'Cancel' }).click();
      await expect(d).toBeHidden();
      await rc.openAdd();
      // Re-opened form keeps the cancelled draft (defect D10) — record, don't fail.
      const kept = await d.getByLabel('Name').inputValue();
      if (kept !== '') {
        test.info().annotations.push({
          type: 'defect',
          description: `D10: Add Page re-opens with the cancelled draft still filled in ("${kept}")`,
        });
      }
      await page.keyboard.press('Escape');
      await expect(d).toBeHidden();
      await rc.openAdd();
      await d.getByRole('button', { name: 'Close' }).click();
      await expect(d).toBeHidden();
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-078 — Dialog "Edit Page" điền sẵn dữ liệu; slug chỉ đọc
   */
  test(
    'TC-RCF-078 — Edit Page is prefilled, shows the fixed slug and publish state, Cancel saves nothing',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const blocked = await rc.guardWrites();
      const { name, slug } = await rc.nameAndSlug(0);
      const published = (await rc.columnValues(rc.columnIndex('PUBLISHED')))[0];
      await rc.rowAction('Edit', 0).click();
      const d = page.getByRole('dialog', { name: 'Edit Page' });
      await expect(d).toBeVisible();
      await expect(d.getByLabel('Name')).toHaveValue(name);
      await expect(d).toContainText(slug);
      await expect(d).toContainText(published);
      // Slug is text, not an input: Name is the only textbox.
      await expect(d.getByRole('textbox')).toHaveCount(1);
      await expect(d.getByRole('button', { name: 'Save Changes' })).toBeVisible();
      await d.getByRole('button', { name: 'Cancel' }).click();
      await expect(d).toBeHidden();
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-079 — Dialog "Clone Page"
   */
  test(
    'TC-RCF-079 — Clone Page proposes "Copy of <name>" and a "<slug>-copy" slug, blocks not cloned by default',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const blocked = await rc.guardWrites();
      const { name, slug } = await rc.nameAndSlug(0);
      await rc.rowAction('Clone', 0).click();
      const d = page.getByRole('dialog', { name: 'Clone Page' });
      await expect(d).toContainText(`Creates a new custom page from “${name}”`);
      await expect(d.getByLabel('Name')).toHaveAttribute('placeholder', `Copy of ${name}`);
      await expect(d).toContainText(`${slug}-copy`);
      await expect(d.getByRole('switch', { name: 'Also clone the blocks' })).toHaveAttribute(
        'aria-checked',
        'false',
      );
      await d.getByRole('button', { name: 'Cancel' }).click();
      await expect(d).toBeHidden();
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-080 — Clone submit (mock): POST /report_pages/<id>/clone
   */
  test(
    'TC-RCF-080 — confirming Clone posts {copyBlocks:false} to /report_pages/<id>/clone (mocked)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const writes = await rc.mockWrites(422);
      await rc.rowAction('Clone', 0).click();
      const d = page.getByRole('dialog', { name: 'Clone Page' });
      await d.getByRole('button', { name: 'Clone', exact: true }).click();
      await expect.poll(() => writes.length).toBe(1);
      expect(writes[0].method).toBe('POST');
      expect(writes[0].url).toMatch(new RegExp(`/report_pages/${UUID}/clone$`));
      expect(writes[0].body).toMatchObject({ copyBlocks: false });
    },
  );

  /**
   * TC-RCF-081 — Delete Page: alertdialog xác nhận, Cancel không xoá
   */
  test(
    'TC-RCF-081 — Delete asks for confirmation naming the page; Cancel keeps it',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ reportConfigPage: rc, page }) => {
      const blocked = await rc.guardWrites();
      const total = await rc.totalResults();
      const { name } = await rc.nameAndSlug(0);
      await rc.rowAction('Delete', 0).click();
      const a = page.getByRole('alertdialog', { name: 'Delete Page?' });
      await expect(a).toContainText(`This will permanently delete the page "${name}".`);
      await a.getByRole('button', { name: 'Cancel' }).click();
      await expect(a).toBeHidden();
      expect(await rc.totalResults()).toBe(total);
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-083 — Publish gửi request ngay, không hỏi xác nhận (UX risk D2)
   */
  test(
    'TC-RCF-083 — Publish posts /report_pages/<id>/publish on a single click with no confirmation (mocked, D2)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const writes = await rc.mockWrites(422);
      const last = (await rc.table.rows.count()) - 1;
      await rc.rowAction('Publish', last).click();
      await expect.poll(() => writes.length).toBeGreaterThanOrEqual(1);
      expect(writes[0].method).toBe('POST');
      expect(writes[0].url).toMatch(new RegExp(`/report_pages/${UUID}/publish$`));
      // No confirm step appeared before the request went out.
      await expect(page.getByRole('alertdialog')).toHaveCount(0);
      // The mocked failure is surfaced as a toast.
      await expect(rc.toasts.first()).toBeVisible();
      test.info().annotations.push({
        type: 'defect',
        description:
          'D2: Publish ships a page version to every POS on one click — no confirmation dialog',
      });
    },
  );

  /**
   * TC-RCF-084 — Build layout mở Page Builder (cả khi click vào dòng)
   */
  test(
    'TC-RCF-084 — Build layout (and clicking the row) opens the Page Builder for that page',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const blocked = await rc.guardWrites();
      await rc.rowAction('Build layout', 0).click();
      await expect(page).toHaveURL(new RegExp(`/report-config/pages/${UUID}$`), {
        timeout: 30_000,
      });
      const builderUrl = page.url();
      await expect(page).toHaveTitle('Page Builder | Portal');
      await expect(page.getByRole('button', { name: 'Page filters' })).toBeVisible({
        timeout: 30_000,
      });

      await rc.goto();
      await rc.row(0).getByRole('cell').first().click();
      await expect(page).toHaveURL(builderUrl);
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-085 — Badge layout mở report thật ở tab mới
   */
  test(
    'TC-RCF-085 — layout badges open the live report in a new tab (Web / POS Window)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const idx = await rc.table.rows
        .filter({ hasText: 'POS Window' })
        .first()
        .evaluate((r) => (r as HTMLTableRowElement).sectionRowIndex);
      const { slug } = await rc.nameAndSlug(idx);
      const web = rc.row(idx).getByRole('button', { name: 'Web', exact: true });
      await expect(web).toHaveAttribute('title', 'Open the page as a Web reader sees it');

      const [webTab] = await Promise.all([page.context().waitForEvent('page'), web.click()]);
      await expect(webTab).toHaveURL(new RegExp(`/report-pages/${slug}$`));
      await webTab.close();

      const pos = rc.row(idx).getByRole('button', { name: 'POS Window', exact: true });
      const [posTab] = await Promise.all([page.context().waitForEvent('page'), pos.click()]);
      await expect(posTab).toHaveURL(new RegExp(`/report-pages/${slug}\\?layout=pos$`));
      await posTab.close();
      // The list itself did not navigate.
      await expect(page).toHaveURL(/\/report-config\/pages/);
    },
  );
});
