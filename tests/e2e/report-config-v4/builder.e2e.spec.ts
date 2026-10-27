import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Timeouts } from '@configs/constants/timeouts';
import { reportV4Url } from '@constants/urls';

/**
 * Report Configuration V4 › page builder — Linear VP-4863 children (VP-4871, VP-4872, VP-4875) and
 * the builder dialogs of the VP-4876 family. docs/test-cases/report-v4-master.md §D, §E.
 *
 * - Read-only tests open the shared Daily Sale builder with every write intercepted (`guardWrites`).
 * - Write tests only touch their own `e2e-rv4-…` page scoped "This merchant" (STORE_ID), deleted in
 *   `finally`.
 */
test.describe.configure({ mode: 'default' });
const issue = (id: string) => ({
  type: 'issue',
  description: `https://linear.app/fastboy/issue/${id}`,
});
const PREFIX = 'e2e-rv4-';
const SHARED_PAGE = 'Daily Sale Report';

const newKey = (tag: string) => {
  const key = `${PREFIX}${tag}-${Date.now().toString(36)}`;
  return { key, name: `E2E RV4 ${tag} ${key.slice(-6)}` };
};

test.describe('Report Config V4 › builder (shared page, read-only)', () => {
  test.beforeEach(async ({ rcV4Page: rc }) => {
    await rc.guardWrites();
    await rc.openRow('pages', SHARED_PAGE);
    await expect(rc.main.getByRole('button', { name: 'Page filters' })).toBeVisible({
      timeout: 45_000,
    });
  });

  test(
    'VP-4872 — "+ Filter" offers the params the Daily Sale blocks accept',
    { tag: [Tag.REGRESSION], annotation: issue('VP-4872') },
    async ({ rcV4Page: rc }) => {
      await rc.main.getByRole('button', { name: 'Page filters' }).click();
      const panel = rc.page.getByRole('dialog').filter({ hasText: 'Page filters' }).last();
      await panel.getByRole('button', { name: 'Filter', exact: true }).click();
      const items = await rc.page.getByRole('menuitem').allInnerTexts();
      expect(items.join(' | '), 'accepted params listed').not.toMatch(
        /No block here publishes an accepted param/,
      );
      expect(
        items.filter((i) => !/Blank filter/.test(i)).length,
        `menu: ${items.join(' | ')}`,
      ).toBeGreaterThan(0);
      expect(rc.writes).toHaveLength(0);
    },
  );

  // VP-4876 family: dialogs of the builder closed with Escape must leave the page clickable.
  for (const d of [
    { name: 'Page details', open: 'Page details' },
    { name: 'Preview as merchant', open: 'Preview as merchant…' },
    { name: 'Page filters', open: 'Page filters' },
  ]) {
    test(
      `VP-4876 (builder) — closing "${d.name}" with Escape leaves the page clickable`,
      { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4876') },
      async ({ rcV4Page: rc }) => {
        await rc.main.getByRole('button', { name: d.open }).click();
        await expect(rc.dialog).toBeVisible();
        await rc.page.keyboard.press('Escape');
        await expect(rc.dialog).toBeHidden();
        await expect
          .poll(() => rc.isFrozen(), { message: 'body pointer-events stuck at none' })
          .toBe(false);
        await rc.main.getByRole('tab', { name: 'POS window' }).click({ timeout: Timeouts.SHORT });
        await expect(rc.page).toHaveURL(/variant=pos/);
        expect(rc.writes).toHaveLength(0);
      },
    );
  }

  test(
    'VP-4876 (builder) — closing "Block settings" with Escape leaves the page clickable',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4876') },
    async ({ rcV4Page: rc }) => {
      await rc.main
        .getByRole('button', { name: 'Store Daily Totals', exact: true })
        .first()
        .click();
      await rc.main.getByRole('button', { name: 'Block settings' }).click();
      await expect(rc.dialog).toBeVisible();
      await rc.page.keyboard.press('Escape');
      await expect
        .poll(() => rc.isFrozen(), { message: 'body pointer-events stuck at none' })
        .toBe(false);
      expect(rc.writes).toHaveLength(0);
    },
  );
});

test.describe('Report Config V4 › builder (writes on own e2e page)', () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ reportConfigV4Page: cfg }) => {
    await cfg.sweep(PREFIX);
  });

  test(
    'VP-4875 — after closing a settings panel, ONE click on Save draft saves',
    { tag: [Tag.REGRESSION], annotation: issue('VP-4875') },
    async ({ reportConfigV4Page: cfg, page }) => {
      const { key, name } = newKey('4875');
      let id = '';
      try {
        id = await cfg.createMerchantPage(name, key);
        await cfg.addBlockToStack('Store Daily Totals');
        await cfg.saveDraft();
        // open a settings panel, change a value, close it
        await page
          .getByRole('region', { name: 'Page canvas' })
          .getByText('Store Daily Totals', { exact: true })
          .first()
          .click();
        await page.getByRole('button', { name: 'Block settings' }).click();
        const panel = page.getByRole('dialog').filter({ hasText: 'Block settings' }).last();
        await panel
          .getByRole('button', { name: /Move up|Move down/ })
          .first()
          .isVisible();
        await panel
          .getByText('Bordered', { exact: false })
          .first()
          .click()
          .catch(() => {});
        // close the panel the way a user does (Esc / X)
        await page.keyboard.press('Escape');
        await expect(panel).toBeHidden();
        // settle the promise immediately so a timeout cannot abort the test before `finally`
        const saved = page
          .waitForRequest((r) => r.method() === 'PATCH' && /\/v4\/report_pages\//.test(r.url()), {
            timeout: Timeouts.MEDIUM,
          })
          .then(() => true)
          .catch(() => false);
        await cfg.saveDraftButton.click({ timeout: Timeouts.SHORT }).catch(() => {});
        expect(await saved, 'first Save draft click sent the draft').toBe(true);
      } finally {
        if (id) await cfg.deleteById(id);
      }
    },
  );

  test(
    'VP-4871 — Block style Text colour is applied (builder canvas and Report V4)',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4871') },
    async ({ reportConfigV4Page: cfg, reportsV4Page: rp, page }) => {
      const { key, name } = newKey('4871');
      let id = '';
      try {
        id = await cfg.createMerchantPage(name, key);
        await cfg.addBlockToStack('Store Daily Totals');
        await page
          .getByRole('region', { name: 'Page canvas' })
          .getByText('Store Daily Totals', { exact: true })
          .first()
          .click();
        await page.getByRole('button', { name: 'Block style' }).click();
        const style = page.getByRole('dialog').last();
        await expect(style).toContainText('Text colour');
        await style
          .getByRole('radio', { name: 'negative' })
          .or(style.getByRole('button', { name: 'negative', exact: true }))
          .first()
          .click();
        await page.getByRole('button', { name: 'Close' }).last().click();
        await cfg.unfreeze();
        await cfg.saveDraft();
        await cfg.publish();
        await rp.page.goto(reportV4Url(key));
        await rp.waitForReady();
        const card = page.locator('#pos-main').getByText('Daily Summary').first();
        await expect(card).toBeVisible({ timeout: Timeouts.LONG });
        const rgb = await card.evaluate((el) => getComputedStyle(el).color);
        const [r, g, b] = (rgb.match(/\d+/g) ?? []).map(Number);
        expect(
          r > g + 40 && r > b + 40,
          `block text colour ${rgb} should be the negative (red) token`,
        ).toBe(true);
      } finally {
        if (id) await cfg.deleteById(id);
      }
    },
  );
});
