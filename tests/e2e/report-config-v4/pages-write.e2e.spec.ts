import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Timeouts } from '@configs/constants/timeouts';
import { env } from '@configs/env/loadEnv';
import { reportV4Url } from '@constants/urls';
import { RV4_TEXT } from '@pages/reports-v4/ReportsV4Page';
import { rptDayButtonName } from '@pages/reports/ReportPagesPage';

/**
 * Report Configuration V4 › Pages (WRITES) — Linear VP-4834, VP-4839, VP-4845, VP-4846.
 *
 * ⚠ Writes only what the test owns, for the suite merchant (STORE_ID) only:
 *   - pages keyed `e2e-rv4-…` with scope "This merchant", deleted in `finally`;
 *   - the merchant copy made by "Copy for merchant" of the QA draft page, deleted in `finally`.
 * Shared ("All merchants") pages are never edited; deletion refuses anything but a merchant page.
 */
// One worker per file, in order — but a failing test must not skip the others (no 'serial'),
// and `sweep` must not race another worker's live e2e page.
test.describe.configure({ mode: 'default' });

const issue = (id: string) => ({
  type: 'issue',
  description: `https://linear.app/fastboy/issue/${id}`,
});
const PREFIX = 'e2e-rv4-';
const QA_DRAFT_PAGE = 'QA Claude Test Page'; // System page left as Draft by QC for VP-4834

const newKey = (tag: string) => {
  const key = `${PREFIX}${tag}-${Date.now().toString(36)}`;
  return { key, name: `E2E RV4 ${tag} ${key.slice(-6)}` };
};

/** Tomorrow in the store timezone, derived from the page's own "today" (after==before). */
const nextDay = (iso: string) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

test.describe('Report Config V4 › Pages (writes, merchant-scoped)', () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ reportConfigV4Page: cfg }) => {
    await cfg.sweep(PREFIX);
  });

  test.afterEach(async ({ reportConfigV4Page: cfg }) => {
    await cfg.sweep(PREFIX);
    // each test deletes its own page in `finally` (deleteById asserts it is gone via the API)
  });

  test(
    'VP-4845 — Publish asks for confirmation before going live',
    { tag: [Tag.REGRESSION], annotation: issue('VP-4845') },
    async ({ reportConfigV4Page: cfg, page }) => {
      const { key, name } = newKey('4845');
      let id = '';
      try {
        id = await cfg.createMerchantPage(name, key);
        await cfg.addBlockToStack('Store Daily Totals');
        await cfg.saveDraft();
        const published: string[] = [];
        page.on('request', (r) => {
          if (r.method() === 'POST' && /\/publish$/.test(r.url())) published.push(r.url());
        });
        await cfg.publishButton.click();
        const confirm = page
          .getByRole('alertdialog')
          .or(page.getByRole('dialog'))
          .filter({ hasText: /publish/i })
          .first();
        await expect(confirm, 'confirmation dialog before publishing').toBeVisible({
          timeout: Timeouts.SHORT,
        });
        expect(published, 'nothing published before confirming').toEqual([]);
      } finally {
        if (id) await cfg.deleteById(id);
      }
    },
  );

  test(
    'VP-4839 — "Open in legacy" is hidden (or works) on a page that only exists in V4',
    { tag: [Tag.REGRESSION], annotation: issue('VP-4839') },
    async ({ reportConfigV4Page: cfg, reportsV4Page: rp, page }) => {
      const { key, name } = newKey('4839');
      let id = '';
      try {
        id = await cfg.createMerchantPage(name, key);
        await cfg.addBlockToStack('Store Daily Totals');
        await cfg.saveDraft();
        await cfg.publish();
        await rp.open(key);
        await expect(rp.heading).toContainText(name);
        if (await rp.legacyLink.isVisible()) {
          await rp.legacyLink.click();
          await expect(
            page.getByText(RV4_TEXT.LOAD_FAILURE),
            'legacy link leads to a load failure',
          ).toHaveCount(0, {
            timeout: Timeouts.LONG,
          });
        }
      } finally {
        if (id) await cfg.deleteById(id);
      }
    },
  );

  test(
    'VP-4846 — a builder "Report date" filter blocks future dates like Daily Sale does',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4846') },
    async ({ reportConfigV4Page: cfg, reportsV4Page: rp }) => {
      // Reference behaviour: Daily Sale Report disables tomorrow.
      await rp.open('daily-sale-report');
      const today =
        rp.param('after') ?? (await rp.page.evaluate(() => new Date().toISOString().slice(0, 10)));
      await rp.reportDateButton.click();
      const tomorrowDS = rp.popover
        .getByRole('button', { name: rptDayButtonName(nextDay(today)) })
        .first();
      if (await tomorrowDS.count()) await expect(tomorrowDS, 'Daily Sale: tomorrow').toBeDisabled();
      await rp.page.keyboard.press('Escape');

      const { key, name } = newKey('4846');
      let id = '';
      try {
        id = await cfg.createMerchantPage(name, key);
        await cfg.addBlockToStack('Store Daily Totals');
        await cfg.addReportDateFilter('date');
        await cfg.saveDraft();
        await cfg.publish();
        await rp.open(key);
        // A builder filter's trigger is named after the filter key ("date"), not "Report date".
        const dateFilter = rp.page
          .locator('#pos-main')
          .getByRole('button', { name: 'date', exact: true });
        await expect(dateFilter).toBeVisible({ timeout: Timeouts.LONG });
        await dateFilter.click();
        const tomorrow = rp.popover
          .getByRole('button', { name: rptDayButtonName(nextDay(today)) })
          .first();
        if (await tomorrow.count()) await expect(tomorrow, 'builder page: tomorrow').toBeDisabled();
        await rp.page.keyboard.press('Escape');
      } finally {
        if (id) await cfg.deleteById(id);
      }
    },
  );

  test(
    'VP-4834 — Copy for merchant of a Draft page stays Draft (not live in the merchant menu)',
    { tag: [Tag.REGRESSION, Tag.CRITICAL], annotation: issue('VP-4834') },
    async ({ reportConfigV4Page: cfg, rcV4Page: rc, reportsV4Page: rp, page }) => {
      const api = (path: string) =>
        page.request.get(`${env.API_URL}${path}`, {
          headers: { 'x-merch-id': env.STORE_ID },
          failOnStatusCode: false,
        });
      // Precondition: the QA draft page exists at System scope and is still Draft.
      await rc.open('pages');
      const row = rc.main.locator('tbody tr').filter({ hasText: QA_DRAFT_PAGE }).first();
      await expect(row, `System page "${QA_DRAFT_PAGE}"`).toBeVisible();
      await expect(row).toContainText('Draft');

      const listCopies = async () => {
        const body = (await (await api('/v4/report_pages?itemsPerPage=200')).json()) as unknown;
        const items = (
          Array.isArray(body) ? body : (Object.values(body as object).find(Array.isArray) ?? [])
        ) as {
          id: string;
          slug: string;
          name: string;
          scope: string;
        }[];
        return items.filter((p) => p.scope === 'merchant' && p.name === QA_DRAFT_PAGE);
      };
      for (const old of await listCopies()) await cfg.revertMerchantCopy(old.id);

      let copyId = '';
      try {
        await rc.rowMenu(QA_DRAFT_PAGE, /Copy for merchant/);
        const dialog = page.getByRole('dialog').filter({ hasText: 'for a merchant' });
        await rc.pickMerchant(env.STORE_ID, dialog);
        const isCopy = (r: { request(): { method(): string }; url(): string }) =>
          r.request().method() === 'POST' && /\/v4\/report_pages/.test(r.url());
        let created = page.waitForResponse(isCopy, { timeout: 3_000 }).catch(() => null);
        await dialog.getByRole('button', { name: 'Copy', exact: true }).click();
        let res = await created;
        if (!res) {
          // VP-4844 (fixed?) — a first click that only closed the merchant dropdown.
          created = page.waitForResponse(isCopy, { timeout: Timeouts.LONG }).catch(() => null);
          await dialog.getByRole('button', { name: 'Copy', exact: true }).click();
          res = await created;
        }
        expect(res?.ok(), 'copy created').toBe(true);
        const copies = await listCopies();
        expect(copies).toHaveLength(1);
        copyId = copies[0].id;
        const slug = copies[0].slug;

        const menu = (
          (await (await api('/v4/report_pages/menu?layout=web')).json()) as { slug: string }[]
        ).map((m) => m.slug);
        expect(menu, 'draft copy must not be in the merchant menu').not.toContain(slug);
        expect(
          (await api(`/v4/report_pages/${slug}/layout`)).status(),
          'draft copy must not be served',
        ).toBe(404);
        await cfg.openBuilder(copyId);
        await expect(cfg.header).toContainText('Draft');
        await expect(cfg.header).not.toContainText(/Published v\d+/);
        await rp.page.goto(reportV4Url(slug));
        await expect(
          rp.page
            .getByText(RV4_TEXT.LOAD_FAILURE)
            .or(rp.page.getByText(/not found/i))
            .first(),
        ).toBeVisible({
          timeout: Timeouts.LONG,
        });
      } finally {
        if (copyId) await cfg.revertMerchantCopy(copyId);
        for (const left of await listCopies()) await cfg.revertMerchantCopy(left.id);
      }
    },
  );
});
