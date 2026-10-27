import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { ReportPageSlug, ReportV4Slug, reportPageUrl, reportV4Url } from '@constants/urls';
import { env } from '@configs/env/loadEnv';
import { Timeouts } from '@configs/constants/timeouts';
import {
  RV4_DATA_DAY,
  RV4_PAGES,
  RV4_TEXT,
  rv4Amount,
  rv4Cents,
} from '@pages/reports-v4/ReportsV4Page';

/**
 * Reports V4 › G. Đồng bộ cấu hình & legacy (RV4-G01 … G05) and
 * H. Phi chức năng (RV4-H01 … H05).
 *
 * G02/G03 (config writes) live in config-write.e2e.spec.ts. G04/G05/H05 assert the report API contract the POS client and merchant
 * isolation rely on.
 */
const DAY = { after: RV4_DATA_DAY, before: RV4_DATA_DAY };

/** The bits of `/v4/report_pages/<slug>/layout` these tests read. */
interface RV4Layout {
  name: string;
  resolvedLayout: string;
  declaredLayouts: string[];
  required: { permission: string; passcode: string };
  header: { actions: { action: string }[] };
  layout: { id: string };
}

test.describe('Reports V4 › config sync & legacy parity', () => {
  test(
    'RV4-G01 — Daily Sale V4 KPIs equal the legacy report for the same day',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp, page }) => {
      const labels = ['Total Orders', 'Sale Income', 'Total Tip', 'Total Payment'];
      await rp.openWithData(ReportV4Slug.DAILY_SALE, DAY);
      const v4 = await Promise.all(labels.map(async (l) => rv4Amount(await rp.statValue(l))));
      // The legacy page now renders the same `pos-stat` tiles, so the V4 helpers read it too.
      await page.goto(
        `${reportPageUrl(ReportPageSlug.DAILY_SALE)}?after=${RV4_DATA_DAY}&before=${RV4_DATA_DAY}`,
      );
      await expect(rp.stat('Total Payment')).toBeVisible({ timeout: Timeouts.LONG });
      const legacy = await Promise.all(labels.map(async (l) => rv4Amount(await rp.statValue(l))));
      expect(legacy.map(rv4Cents)).toEqual(v4.map(rv4Cents));
    },
  );

  test(
    'RV4-G04 — the POS client gets its own layout variant (layout=pos) for every V4 page',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp }) => {
      // The POS window shell is not reachable from the web portal, so the contract it consumes —
      // `/v4/report_pages/<slug>/layout?layout=pos` — is asserted instead.
      await rp.open(ReportV4Slug.DAILY_SALE);
      const menu = await rp.api('/v4/report_pages/menu?layout=pos');
      expect(menu.status()).toBe(200);
      const slugs = ((await menu.json()) as { slug: string }[]).map((m) => m.slug);
      expect(slugs).toEqual(RV4_PAGES.map((p) => p.slug));
      for (const p of RV4_PAGES) {
        const web = (await (await rp.api(`/v4/report_pages/${p.slug}/layout`)).json()) as RV4Layout;
        const pos = (await (
          await rp.api(`/v4/report_pages/${p.slug}/layout?layout=pos`)
        ).json()) as RV4Layout;
        expect(web.resolvedLayout, p.slug).toBe('web');
        expect(pos.resolvedLayout, p.slug).toBe('pos');
        expect(pos.declaredLayouts, p.slug).toContain('pos');
        expect(pos.name, p.slug).toBe(web.name);
        if (p.slug === ReportV4Slug.DAILY_SALE) {
          // Daily Sale has a dedicated POS tree (POS blocks, no Print action).
          expect(pos.layout.id).not.toBe(web.layout.id);
          expect(JSON.stringify(pos.layout)).toContain('-pos');
          expect(web.header.actions.map((a) => a.action)).toContain('print');
          expect(pos.header.actions).toEqual([]);
        }
      }
    },
  );

  test(
    'RV4-G05 — each V4 page declares the POS permission and passcode gate it needs',
    { tag: [Tag.REGRESSION, Tag.AUTH] },
    async ({ reportsV4Page: rp }) => {
      // POS enforces these gates; without a restricted POS staff session the declared contract is
      // checked (it is what POS reads to hide the page / prompt for the passcode).
      const expected: Record<string, string> = {
        [ReportV4Slug.DAILY_SALE]: 'daily_income',
        [ReportV4Slug.INCOME_SUMMARY]: 'summary_income',
        [ReportV4Slug.STAFF_INCOME]: 'staff_income',
        [ReportV4Slug.STAFF_PAYROLL]: 'staff_payroll',
      };
      await rp.open(ReportV4Slug.DAILY_SALE);
      for (const [slug, gate] of Object.entries(expected)) {
        for (const layout of ['web', 'pos']) {
          const res = await rp.api(`/v4/report_pages/${slug}/layout?layout=${layout}`);
          expect(res.status(), `${slug} ${layout}`).toBe(200);
          const body = (await res.json()) as RV4Layout;
          expect(body.required, `${slug} ${layout}`).toEqual({ permission: gate, passcode: gate });
        }
      }
    },
  );
});

test.describe('Reports V4 › non-functional', () => {
  test(
    'RV4-H01 — no console errors while opening the four pages',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp, page }) => {
      const errors: string[] = [];
      page.on('console', (m) => {
        // A 401 on a resource is the silent access-token refresh, not an app error.
        if (m.type() === 'error' && !/status of 401/.test(m.text()))
          errors.push(`${page.url()} :: ${m.text()}`);
      });
      for (const p of RV4_PAGES) await rp.openWithData(p.slug);
      expect(errors).toEqual([]);
    },
  );

  test(
    'RV4-H02 — at 375px the pages fit the viewport without horizontal page scroll',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ reportsV4Page: rp, page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      for (const p of RV4_PAGES) {
        await rp.open(p.slug);
        await expect(rp.heading).toBeVisible();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow, `${p.slug} horizontal overflow`).toBeLessThanOrEqual(1);
      }
    },
  );

  test(
    'RV4-H03 — icon buttons are labelled, sort headers expose aria-sort, dialogs close on Escape',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportsV4Page: rp, page }) => {
      await rp.openWithData(ReportV4Slug.STAFF_PAYROLL);
      await expect(rp.expandTableButton).toBeVisible();
      await expect(rp.previousPageButton).toBeVisible();
      const sorts = await rp.columnHeaders.evaluateAll((ths) =>
        ths.map((th) => th.getAttribute('aria-sort')),
      );
      expect(sorts.filter((s) => s !== null).length).toBeGreaterThan(0);
      const unlabeled = await page
        .locator('#pos-main button')
        .evaluateAll(
          (bs) =>
            bs.filter(
              (b) =>
                !(b.getAttribute('aria-label') || b.textContent?.trim() || b.getAttribute('title')),
            ).length,
        );
      expect(unlabeled).toBe(0);
      await rp.bodyRows.first().click();
      await expect(rp.sheet).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(rp.sheet).toBeHidden();
    },
  );

  test(
    'RV4-H04 — each page shows data within the DEV budget',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ reportsV4Page: rp }) => {
      for (const p of RV4_PAGES) {
        const started = Date.now();
        await rp.openWithData(p.slug);
        expect(Date.now() - started, `${p.slug} load ms`).toBeLessThan(Timeouts.LONG);
      }
    },
  );

  test(
    'RV4-H05 — report data is merchant-scoped: no header → 400, unknown merchant → 400, no rows leak',
    { tag: [Tag.REGRESSION, Tag.AUTH] },
    async ({ reportsV4Page: rp, page }) => {
      // The suite user is an internal admin (all merchants), so isolation is checked through the
      // merchant header the API requires rather than with a second, restricted account.
      await rp.open(ReportV4Slug.DAILY_SALE);
      const noHeader = await rp.api(`/v4/report_pages/${ReportV4Slug.DAILY_SALE}/layout`, null);
      expect(noHeader.status()).toBe(400);
      expect(await noHeader.text()).toContain('needs the x-merch-id header');
      const unknown = await rp.api(`/v4/report_pages/${ReportV4Slug.DAILY_SALE}/layout`, '999998');
      expect(unknown.status()).toBe(400);
      expect(await unknown.text()).toContain('Merchant account id not registered');
      // And the UI for an unknown store shows no report data.
      await page.goto(reportV4Url(ReportV4Slug.DAILY_SALE, `/pos/${env.POS_SEGMENT}/999998`));
      await expect(
        page
          .getByText(RV4_TEXT.MERCHANT_LOAD_FAILURE)
          .or(page.getByText(/not available/i))
          .first(),
      ).toBeVisible({
        timeout: Timeouts.LONG,
      });
      await expect(page.locator('#pos-main table tbody tr')).toHaveCount(0);
    },
  );
});
