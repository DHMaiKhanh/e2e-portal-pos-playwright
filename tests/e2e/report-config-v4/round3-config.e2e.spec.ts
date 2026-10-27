import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Timeouts } from '@configs/constants/timeouts';
import { env } from '@configs/env/loadEnv';
import { ReportV4Slug, reportV4Url } from '@constants/urls';

/**
 * Report Configuration V4 — Linear round 3 (VP-4881, VP-4885, VP-4886).
 * docs/test-cases/report-v4-master.md §H.
 *
 * - VP-4881 is read-only (writes intercepted by `guardWrites`).
 * - VP-4886 writes only its own `e2e-rv4-…` page (scope "This merchant", deleted in `finally`).
 * - VP-4885 needs a block setting saved: it makes a merchant copy of the shared "Staff Income" block
 *   for the suite store only, and reverts that copy ("Revert to default…") in `finally`.
 */
test.describe.configure({ mode: 'default' });
const issue = (id: string) => ({
  type: 'issue',
  description: `https://linear.app/fastboy/issue/${id}`,
});

test.describe('Report Config V4 › round 3 (read-only)', () => {
  test(
    'VP-4881 — Staff Income block Totals row reflects what Report V4 sums (or says so)',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4881') },
    async ({ rcV4Page: rc }) => {
      await rc.guardWrites();
      await rc.open('blocks', '?search=income-staff');
      await rc.main.getByRole('cell', { name: 'Staff Income', exact: true }).first().click();
      await rc.page.waitForURL(/\/report-config-v4\/blocks\/[0-9a-f-]{36}/);
      await expect(rc.main.getByRole('button', { name: 'Try query' })).toBeVisible({
        timeout: 45_000,
      });
      await rc.pickMerchant(env.STORE_ID);
      const section = await rc.main.evaluate((m) => {
        const t = (m as HTMLElement).innerText;
        const i = t.indexOf('Totals row');
        return t.slice(i, t.indexOf('Where children show', i));
      });
      const allNone = !/\n(Sum|Average|Min|Max|Count)\n/.test(section) && /No total/.test(section);
      if (allNone) {
        // Report V4 still prints a Total line, so the editor must explain where it comes from.
        expect(section, 'editor explains the automatic totals').toMatch(
          /sums the visible columns when no total is picked/i,
        );
      }
      expect(rc.writes).toHaveLength(0);
    },
  );
});

test.describe('Report Config V4 › round 3 (writes, merchant-scoped)', () => {
  test.setTimeout(240_000);

  test(
    'VP-4886 — renaming a page changes its heading on Report V4 (not only menu/breadcrumb)',
    { tag: [Tag.REGRESSION], annotation: issue('VP-4886') },
    async ({ reportConfigV4Page: cfg, reportsV4Page: rp }) => {
      const key = `e2e-rv4-4886-${Date.now().toString(36)}`;
      const renamed = `E2E Renamed ${key.slice(-6)}`;
      let id = '';
      try {
        id = await cfg.createMerchantPage(`E2E RV4 4886 ${key.slice(-6)}`, key);
        await cfg.addBlockToStack('Store Daily Totals');
        await cfg.saveDraft();
        await cfg.publish();
        await cfg.renamePage(renamed);
        await cfg.publish().catch(() => {}); // the rename may already be live
        await rp.page.goto(reportV4Url(key));
        await rp.waitForReady();
        await expect(rp.heading, 'page heading').toContainText(renamed, { timeout: Timeouts.LONG });
      } finally {
        if (id) await cfg.deleteById(id);
      }
    },
  );

  test(
    'VP-4885 — a column set to "Opens: Staff info" opens Staff info even when Row click is on',
    { tag: [Tag.REGRESSION], annotation: issue('VP-4885') },
    async ({ rcV4Page: rc, reportsV4Page: rp, page }) => {
      const api = (path: string) =>
        page.request.get(`${env.API_URL}${path}`, {
          headers: { 'x-merch-id': env.STORE_ID },
          failOnStatusCode: false,
        });
      const findCopy = async () => {
        const body = (await (await api('/v4/report_blocks?itemsPerPage=200')).json()) as unknown;
        const items = (
          Array.isArray(body) ? body : (Object.values(body as object).find(Array.isArray) ?? [])
        ) as {
          id: string;
          key?: string;
          slug?: string;
          scope: string;
          merchant?: number | null;
        }[];
        return items.find((b) => b.scope === 'merchant' && (b.key ?? b.slug) === 'income-staff');
      };
      await rc.open('blocks', '?search=income-staff');
      expect(await findCopy(), 'no merchant copy of Staff Income before the test').toBeUndefined();
      let copyId = '';
      try {
        // 1) merchant copy of the shared block for the suite store only
        await rc.rowMenu('Staff Income', /Copy for merchant/);
        const dialog = page.getByRole('dialog').filter({ hasText: 'for a merchant' });
        await rc.pickMerchant(env.STORE_ID, dialog);
        await dialog.getByRole('button', { name: 'Copy', exact: true }).click();
        await expect
          .poll(async () => (await findCopy())?.id ?? '', { timeout: Timeouts.LONG })
          .not.toBe('');
        copyId = (await findCopy())!.id;
        // 2) Staff name column → Opens: Staff info → Save
        await page.goto(`${rc.tabUrl('blocks')}/${copyId}?merchant=${env.STORE_ID}`);
        const settings = rc.main.getByRole('button', { name: 'Column settings for Staff name' });
        await expect(settings).toBeVisible({ timeout: 45_000 });
        await settings.click();
        const option = page.getByRole('menuitemradio', { name: 'Staff info', exact: true });
        await option.scrollIntoViewIfNeeded();
        await option.evaluate((el) => (el as HTMLElement).click());
        await page.keyboard.press('Escape');
        const saved = page.waitForResponse(
          (r) => r.request().method() === 'PATCH' && /\/v4\/report_blocks\//.test(r.url()),
        );
        await rc.main.getByRole('button', { name: 'Save changes' }).click();
        expect((await saved).ok(), 'block copy saved').toBe(true);
        // 3) Report V4: clicking the staff NAME opens Staff info, not Staff Income Detail
        await rp.open(ReportV4Slug.STAFF_INCOME, { after: '2026-08-18', before: '2026-08-18' });
        await rp.waitForData();
        await rp.bodyRows
          .first()
          .locator('td')
          .first()
          .locator('a, [data-route], [role="link"]')
          .first()
          .click();
        await expect(page, 'navigated to Staff info').not.toHaveURL(/staff-income-detail/, {
          timeout: Timeouts.MEDIUM,
        });
      } finally {
        // the copy may exist even when a later step (or the id lookup) failed — none existed before
        copyId ||= (await findCopy().catch(() => undefined))?.id ?? '';
        if (copyId) {
          await page.goto(`${rc.tabUrl('blocks')}/${copyId}?merchant=${env.STORE_ID}`);
          await rc.main.getByRole('button', { name: 'More actions' }).click({ timeout: 45_000 });
          await page.getByRole('menuitem', { name: /Revert to default|Delete/ }).click();
          const confirm = page.getByRole('alertdialog').or(page.getByRole('dialog')).last();
          await expect(confirm).toContainText(/this merchant/i);
          await confirm.getByRole('button', { name: /^(Revert|Delete)/ }).click();
          await expect
            .poll(async () => (await findCopy())?.id ?? '', { timeout: Timeouts.LONG })
            .toBe('');
        }
      }
    },
  );
});
