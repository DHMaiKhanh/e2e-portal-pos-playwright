import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { ReportV4Slug, reportV4Url } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import { env } from '@configs/env/loadEnv';
import { ReportV4Api } from '@pages/reports-v4/ReportV4Api';
import type { ReportsV4Page } from '@pages/reports-v4/ReportsV4Page';

/**
 * Reports V4 › parity with the legacy reports (Linear VP-4848 / VP-4857 / VP-4863 children).
 * docs/test-cases/report-v4-master.md §B, §C, §D. Each test asserts the EXPECTED (legacy) behaviour.
 */
const issue = (id: string) => ({
  type: 'issue',
  description: `https://linear.app/fastboy/issue/${id}`,
});
const STORE14 = `/pos/${env.POS_SEGMENT}/14`;

async function open14(rp: ReportsV4Page, slug: string, query: string): Promise<void> {
  await rp.page.goto(`${reportV4Url(slug, STORE14)}${query}`);
  await rp.waitForReady();
  await rp.waitForData();
}

/** Case-insensitive, space-aware order the legacy report uses. */
const legacyOrder = (a: string, b: string) => a.localeCompare(b, 'en', { sensitivity: 'base' });

test.describe('Reports V4 › parity with legacy', () => {
  test(
    'VP-4854 — Staff Income Detail lists orders newest first',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4854') },
    async ({ reportsV4Page: rp }) => {
      await open14(
        rp,
        ReportV4Slug.STAFF_INCOME,
        '?after=2026-10-19&before=2026-10-19&search=Pamela',
      );
      await rp.bodyRows.filter({ hasText: 'Pamela' }).first().click();
      await rp.waitForHeading('Staff Income Detail');
      const codes = (await rp.columnTexts(0)).map((c) => c.replace(/\D/g, ''));
      expect(codes.length).toBeGreaterThan(1);
      const sorted = [...codes].sort((a, b) => b.localeCompare(a));
      expect(codes, 'order codes (embed date+time) should be descending').toEqual(sorted);
    },
  );

  test(
    'VP-4855 — Clock In / Clock Out use the same empty placeholder',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4855') },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(ReportV4Slug.STAFF_INCOME, {
        after: '2026-08-18',
        before: '2026-08-18',
      });
      await rp.bodyRows.first().click();
      await rp.waitForHeading('Staff Income Detail');
      const text = await rp.page.locator('#pos-main').innerText();
      const m = /Clock In\n(.*)\nClock Out\n(.*)\n/.exec(text);
      expect(m, 'Clock In / Clock Out block present').not.toBeNull();
      const [, inVal, outVal] = m!;
      if (!/\d/.test(inVal) && !/\d/.test(outVal)) {
        expect(inVal.trim(), 'empty Clock In vs empty Clock Out placeholder').toBe(outVal.trim());
      }
    },
  );

  test(
    'VP-4850 — Income Summary breakdown sheet has a Print button and real figures',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4850') },
    async ({ reportsV4Page: rp }) => {
      await open14(rp, ReportV4Slug.INCOME_SUMMARY, '?after=2026-10-19&before=2026-10-19');
      await rp.bodyRows.first().click();
      await expect(rp.sheet).toContainText('Payment details');
      const a = (await rp.sheet.innerText()).match(/[-−]?\$[\d,]+\.\d{2}/g) ?? [];
      expect(
        a.some((v) => !/^[-−]?\$0\.00$/.test(v)),
        'breakdown shows non-zero figures',
      ).toBe(true);
      await expect(
        rp.sheet.getByRole('button', { name: 'Print' }),
        'Print in the breakdown',
      ).toBeVisible();
    },
  );

  test(
    'VP-4853 — payroll percentages are shown without trailing zeros ("20%", not "20.000000%")',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4853') },
    async ({ reportsV4Page: rp }) => {
      await open14(rp, ReportV4Slug.STAFF_PAYROLL, '');
      await rp.pickPayrollPeriod('Oct 8, 2026 - Oct 15, 2026');
      await rp.waitForData();
      await rp.staffSearch.fill('Pamela');
      await expect
        .poll(async () => (await rp.columnTexts(0)).every((n) => /pamela/i.test(n)))
        .toBe(true);
      await rp.bodyRows.first().click();
      await expect(rp.sheet).toContainText('Total Income');
      const text = await rp.sheet.innerText();
      expect(text, 'no 6-decimal percentages').not.toMatch(/\d+\.\d{3,}%/);
      // The "Pay 1 (Total Income x 20%)" label exists only in the POS window (the legacy web report
      // shows no rate either), so the POS part of VP-4853 stays a manual case.
    },
  );

  for (const p of [
    {
      slug: ReportV4Slug.STAFF_PAYROLL,
      query: '?search=Duy',
      label: 'Staff Payroll (search "Duy")',
    },
    {
      slug: ReportV4Slug.STAFF_INCOME,
      query: '?after=2026-06-04&before=2026-06-04&search=wage',
      label: 'Staff Income 2026-06-04 (search "wage")',
    },
    {
      slug: ReportV4Slug.STAFF_INCOME,
      query: '?after=2026-10-19&before=2026-10-19&include_no_income=true',
      label: 'Staff Income 2026-10-19 (all staff)',
    },
  ]) {
    test(
      `VP-4868 — ${p.label}: Name sort is case-insensitive like legacy`,
      { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4868') },
      async ({ reportsV4Page: rp }) => {
        await open14(rp, p.slug, p.query);
        const names = await rp.columnTexts(0);
        expect(names.length).toBeGreaterThan(1);
        expect(names, 'default ascending order').toEqual([...names].sort(legacyOrder));
      },
    );
  }

  for (const p of [
    {
      slug: ReportV4Slug.INCOME_SUMMARY,
      base: `/pos/${env.POS_SEGMENT}/${env.STORE_ID}`,
      label: 'Income Summary (today)',
    },
    {
      slug: ReportV4Slug.DAILY_SALE,
      base: `/pos/${env.POS_SEGMENT}/${env.STORE_ID}`,
      label: 'Daily Sale tip-by-hour (small amounts)',
    },
    { slug: ReportV4Slug.INCOME_SUMMARY, base: STORE14, label: 'Income Summary store #14' },
  ]) {
    test(
      `VP-4874 — ${p.label}: chart Y-axis ticks are distinct values`,
      { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4874') },
      async ({ reportsV4Page: rp, page }) => {
        let query = '';
        if (p.label.includes('small amounts')) {
          // Ticks get rounded to whole dollars when the day's amounts are a few dollars at most: find such a day via the API.
          const api = new ReportV4Api(page);
          await api.ready(env.STORE_ID);
          const days = await api.rowsAll(
            'income-summary',
            env.STORE_ID,
            '2026-07-01',
            new Date().toISOString().slice(0, 10),
            { period: 'daily' },
          );
          const small = days.find(
            (d) => Number(d.dailySaleTip) > 0 && Number(d.dailySaleTip) < 400,
          );
          expect(small, 'a day with 0 < Tip < $4 on the suite store').toBeTruthy();
          const day = String(small!.date).slice(0, 10);
          query = `?after=${day}&before=${day}&metric=dailySaleTip`;
        }
        await rp.page.goto(`${reportV4Url(p.slug, p.base)}${query}`);
        await rp.waitForReady();
        await expect(rp.chart).toBeVisible({ timeout: Timeouts.LONG });
        const ticks = await rp.chart
          .locator('.recharts-yAxis-tick-labels text')
          .evaluateAll((ts) => ts.map((t) => (t.textContent ?? '').trim())); // SVG text has no innerText
        expect(ticks.length).toBeGreaterThan(1);
        expect(new Set(ticks).size, `y ticks: ${ticks.join(', ')}`).toBe(ticks.length);
      },
    );
  }

  test(
    'VP-4883 (related) — a reversed date range (URL only) shows a readable message, not "Request failed with status code 400"',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4883') },
    async ({ reportsV4Page: rp }) => {
      await rp.page.goto(
        `${reportV4Url(ReportV4Slug.INCOME_SUMMARY)}?after=2026-10-20&before=2026-10-19`,
      );
      await rp.waitForReady();
      await rp.page.waitForTimeout(Timeouts.DEBOUNCE * 3);
      await expect(rp.page.getByText(/Request failed with status code/)).toHaveCount(0);
    },
  );

  // POS-window-only bugs (VP-4849, VP-4851): the web portal cannot render the POS layout, so the
  // API contract the POS client reads is asserted; the visual part stays a manual case (§B).
  test(
    'VP-4849 / VP-4851 — POS Income Summary blocks return the total and dated rows the POS window shows',
    { tag: [Tag.REGRESSION, Tag.API], annotation: [issue('VP-4849'), issue('VP-4851')] },
    async ({ page }) => {
      const api = new ReportV4Api(page);
      await api.ready('14');
      const hero = await api.summary('income-total-hero', '14', '2026-10-19', '2026-10-19', {
        period: 'daily',
      });
      expect(Number(hero.dailySaleSale), 'Total Income hero (cents)').toBeGreaterThan(0);
      const rows = await api.rowsAll('income-summary-pos', '14', '2026-09-01', '2026-09-30', {
        period: 'daily',
      });
      expect(rows.length).toBeGreaterThan(1);
      for (const r of rows)
        expect(String(r.date ?? ''), 'each POS row carries its date').toMatch(/^\d{4}-\d{2}-\d{2}/);
    },
  );
});
