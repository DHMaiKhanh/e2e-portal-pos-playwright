import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { ReportV4Slug, reportV4Url } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import { env } from '@configs/env/loadEnv';
import { ReportV4Api, usd } from '@pages/reports-v4/ReportV4Api';
import type { ReportsV4Page } from '@pages/reports-v4/ReportsV4Page';

/**
 * Reports V4 — Linear round 3 (VP-4879 → VP-4891) + the POS-window cases of VP-4848
 * (VP-4849/4850/4851/4853), now automatable because the portal renders the POS / Mobile layouts
 * with `?layout=pos|mobile`. docs/test-cases/report-v4-master.md §H, §B.
 * Read-only. Each test asserts the EXPECTED result of its bug (red until fixed).
 */
const issue = (id: string) => ({
  type: 'issue',
  description: `https://linear.app/fastboy/issue/${id}`,
});
const base = (store: string) => `/pos/${env.POS_SEGMENT}/${store}`;

async function openAt(rp: ReportsV4Page, store: string, slug: string, query = ''): Promise<void> {
  await rp.page.goto(`${reportV4Url(slug, base(store))}${query}`);
  await rp.waitForReady();
}

const csvRows = (text: string) =>
  (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text)
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '')
    .slice(1) // header
    .filter((l) => !/^"?Total/i.test(l));

test.describe('Reports V4 › Linear round 3 (web)', () => {
  test(
    'VP-4879 — Staff Payroll breakdown shows Working Hours with one decimal (3.4, like v1)',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4879') },
    async ({ reportsV4Page: rp }) => {
      await openAt(rp, '14', ReportV4Slug.STAFF_PAYROLL);
      await rp.pickPayrollPeriod('Oct 8, 2026 - Oct 15, 2026');
      await rp.waitForData();
      await rp.staffSearch.fill('1001vvv');
      await expect
        .poll(async () => (await rp.columnTexts(0)).every((n) => /1001vvv/i.test(n)))
        .toBe(true);
      await rp.bodyRows.first().click();
      await expect(rp.sheet).toContainText('Working Hours');
      const m = /Working Hours\n([^\n]+)/.exec(await rp.sheet.innerText());
      expect(m?.[1].trim(), 'Working Hours value').toMatch(/^\d+(\.\d)?$/);
    },
  );

  for (const c of [
    { store: env.STORE_ID, query: '', label: `store ${env.STORE_ID} today`, id: 'VP-4880' },
    {
      store: '14',
      query: '?after=2026-10-19&before=2026-10-19&search=Anastasia',
      label: 'store #14 Anastasia Parham',
      id: 'VP-4889',
    },
  ]) {
    test(
      `${c.id} — Staff Income Detail heading has no "\\" separator (${c.label})`,
      { tag: [Tag.REGRESSION, Tag.UI], annotation: issue(c.id) },
      async ({ reportsV4Page: rp }) => {
        await openAt(rp, c.store, ReportV4Slug.STAFF_INCOME, c.query);
        await rp.waitForData();
        const name = (await rp.columnTexts(0))[0];
        await rp.bodyRows.first().click();
        await rp.waitForHeading('Staff Income Detail');
        const heading = (await rp.heading.innerText()).replace(/V4$/, '').trim();
        expect(heading, 'heading').toContain(name);
        expect(heading, 'no backslash between title and staff').not.toContain('\\');
        expect(heading, 'title and name separated by a space').toMatch(/Staff Income Detail\s+\S/);
      },
    );
  }

  test(
    'VP-4882 — store #999999: a closed payroll period loads (no 400)',
    { tag: [Tag.REGRESSION], annotation: issue('VP-4882') },
    async ({ reportsV4Page: rp, page }) => {
      await openAt(rp, '999999', ReportV4Slug.STAFF_PAYROLL);
      await rp.payrollPeriodChip.click();
      await rp.page.getByRole('option').nth(1).click(); // most recent closed period
      await page.waitForTimeout(Timeouts.DEBOUNCE * 3);
      await expect(
        page.getByText(/could not be loaded|Request failed with status code/),
      ).toHaveCount(0, {
        timeout: Timeouts.LONG,
      });
      await expect(rp.bodyRows.first()).toBeVisible({ timeout: Timeouts.LONG });
    },
  );

  for (const slug of [ReportV4Slug.INCOME_SUMMARY, ReportV4Slug.STAFF_INCOME]) {
    test(
      `VP-4883 — ${slug}: a 368-day range shows data or a clear message (no raw 400)`,
      { tag: [Tag.REGRESSION], annotation: issue('VP-4883') },
      async ({ reportsV4Page: rp, page }) => {
        await openAt(rp, '14', slug, '?after=2025-10-18&before=2026-10-20');
        await page.waitForTimeout(Timeouts.DEBOUNCE * 4);
        await expect(
          page.getByText(/Request failed with status code 400|could not be loaded/),
        ).toHaveCount(0, {
          timeout: Timeouts.LONG,
        });
      },
    );
  }

  test.describe(() => {
    // A viewer far from the store: store #100004 runs on US/Central, the browser on Asia/Saigon.
    test.use({ timezoneId: 'Asia/Ho_Chi_Minh' });

    test(
      'VP-4884 — "Sale Income by Hour" plots each hour at the STORE time, not the browser time',
      { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4884') },
      async ({ reportsV4Page: rp, page }) => {
        const day = '2026-09-01';
        const api = new ReportV4Api(page);
        await api.ready(env.STORE_ID);
        const rows = await api.rowsAll('income-sale-by-hour', env.STORE_ID, day);
        const top = rows.reduce((a, b) =>
          Number(b.netSaleAmount) > Number(a.netSaleAmount) ? b : a,
        );
        const hour24 = Number(String(top.date).slice(11, 13));
        const label = `${hour24 % 12 === 0 ? 12 : hour24 % 12} ${hour24 < 12 ? 'AM' : 'PM'}`;
        const amount = usd(Number(top.netSaleAmount));
        await openAt(rp, env.STORE_ID, ReportV4Slug.DAILY_SALE, `?after=${day}&before=${day}`);
        await expect(rp.chart).toBeVisible({ timeout: Timeouts.LONG });
        let shownAt = '';
        for (let i = 2; i <= 98 && !shownAt; i += 2) {
          const tip = await rp.chartTooltipAt(i / 100).catch(() => '');
          if (tip.includes(amount)) shownAt = tip.split('\n')[0].trim();
        }
        expect(shownAt, `API: ${amount} at ${label} (store time)`).toBe(label);
      },
    );
  });

  for (const c of [
    {
      slug: ReportV4Slug.DAILY_SALE,
      query: '?after=2026-10-19&before=2026-10-19',
      what: 'Daily Sale Order Details 2026-10-19',
    },
    {
      slug: ReportV4Slug.STAFF_INCOME,
      query: '?after=2026-10-01&before=2026-10-20',
      what: 'Staff Income 10-01→10-20',
    },
    { slug: ReportV4Slug.STAFF_PAYROLL, query: '', what: 'Staff Payroll current period' },
  ]) {
    test(
      `VP-4887 — CSV export of ${c.what} (store #14) contains every row, not just page 1`,
      { tag: [Tag.REGRESSION], annotation: issue('VP-4887') },
      async ({ reportsV4Page: rp }) => {
        await openAt(rp, '14', c.slug, c.query);
        await rp.waitForData();
        const total = (await rp.paginationRange.isVisible())
          ? (await rp.paginationCounts()).total
          : await rp.countValue();
        expect(total, 'more than one page of rows').toBeGreaterThan(30);
        const { text } = await rp.downloadText('CSV');
        expect(csvRows(text)).toHaveLength(total);
      },
    );
  }

  test(
    'VP-4888 — Staff Payroll export file is named after the selected payroll period',
    { tag: [Tag.REGRESSION], annotation: issue('VP-4888') },
    async ({ reportsV4Page: rp }) => {
      await openAt(rp, '14', ReportV4Slug.STAFF_PAYROLL);
      await rp.waitForData();
      const label = ((await rp.payrollPeriodChip.getAttribute('aria-label')) ?? '').replace(
        /^Payroll period:\s*/,
        '',
      );
      const [from, to] = label
        .split(' - ')
        .map((d) => new Date(`${d} UTC`).toISOString().slice(0, 10));
      const { name } = await rp.downloadText('CSV');
      expect(name, `period ${label}`).toContain(`${from}-${to}`);
    },
  );
});

test.describe('Reports V4 › Linear round 3 (POS / Mobile layouts)', () => {
  test(
    'VP-4849 — POS Income Summary: Total Income tile shows the amount and "vs" comparison',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4849') },
    async ({ reportsV4Page: rp, page }) => {
      await openAt(
        rp,
        '14',
        ReportV4Slug.INCOME_SUMMARY,
        '?layout=pos&after=2026-10-19&before=2026-10-19',
      );
      await expect(page.getByText('Previewing the POS window layout')).toBeVisible({
        timeout: Timeouts.LONG,
      });
      const tile = rp.statTiles.filter({ hasText: 'Total Income' }).first();
      await expect(tile).toBeVisible({ timeout: Timeouts.LONG });
      const value = (await tile.locator('[data-slot="pos-stat-value"]').innerText()).trim();
      expect(value, 'Total Income tile').toMatch(/^\$[\d,]+\.\d{2}$/);
      expect(value).not.toBe('$0.00');
      await expect(tile.locator('[data-slot="pos-stat-vs"]')).toContainText('vs');
    },
  );

  test(
    'VP-4850 / VP-4851 — POS Income Summary: Date column shows dates; breakdown has Print and real figures',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: [issue('VP-4850'), issue('VP-4851')] },
    async ({ reportsV4Page: rp, page }) => {
      await openAt(
        rp,
        '14',
        ReportV4Slug.INCOME_SUMMARY,
        '?layout=pos&after=2026-09-01&before=2026-09-30',
      );
      await rp.waitForData();
      for (const d of await rp.columnTexts(0))
        expect(d, 'Date cell').toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
      await rp.bodyRows.first().click();
      const panel = page.getByRole('dialog').filter({ hasText: 'Breakdown' }).last();
      await expect(panel).toContainText('Payment details');
      await expect(panel.getByRole('button', { name: 'Print' })).toBeVisible();
      const amounts = (await panel.innerText()).match(/[-−]?\$[\d,]+\.\d{2}/g) ?? [];
      expect(
        amounts.some((a) => !/^[-−]?\$0\.00$/.test(a)),
        'non-zero figures',
      ).toBe(true);
    },
  );

  test(
    'VP-4853 — POS Staff Payroll: no "x 20.000000%" style percentages',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4853') },
    async ({ reportsV4Page: rp }) => {
      await openAt(rp, '14', ReportV4Slug.STAFF_PAYROLL, '?layout=pos');
      await rp.pickPayrollPeriod('Oct 8, 2026 - Oct 15, 2026');
      await rp.waitForData();
      await rp.staffSearch.fill('Pamela');
      await expect
        .poll(async () => (await rp.columnTexts(0)).every((n) => /pamela/i.test(n)))
        .toBe(true);
      await rp.bodyRows.first().click();
      await expect(rp.page.locator('#pos-main')).toContainText('Total Income');
      expect(await rp.page.locator('#pos-main').innerText()).not.toMatch(/\d+\.\d{3,}%/);
    },
  );

  test(
    'VP-4890 — Mobile Staff Income: column headers are not truncated',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4890') },
    async ({ reportsV4Page: rp, page }) => {
      await page.setViewportSize({ width: 390, height: 547 });
      await openAt(rp, env.STORE_ID, ReportV4Slug.STAFF_INCOME, '?layout=mobile');
      await rp.waitForData();
      const cut = await rp.columnHeaders.evaluateAll((ths) =>
        ths
          .map((th) => {
            const el =
              (th.querySelector('button, [class*="truncate"]') as HTMLElement | null) ??
              (th as HTMLElement);
            return {
              text: th.textContent?.trim() ?? '',
              clipped: el.scrollWidth > el.clientWidth + 1,
            };
          })
          .filter((h) => h.clipped || /…$/.test(h.text))
          .map((h) => h.text),
      );
      expect(cut, 'truncated headers').toEqual([]);
    },
  );

  test(
    'VP-4891 — POS Staff Payroll: a staff without figures shows only "No data" (no $0 day table)',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4891') },
    async ({ reportsV4Page: rp, page }) => {
      await openAt(rp, env.STORE_ID, ReportV4Slug.STAFF_PAYROLL, '?layout=pos&search=Amy');
      await rp.waitForData();
      await rp.bodyRows.filter({ hasText: 'Amy' }).first().click();
      await expect(page.locator('#pos-main')).toContainText(/No data|Total Income/, {
        timeout: Timeouts.LONG,
      });
      const text = await page.locator('#pos-main').innerText();
      const panel = text.slice(text.lastIndexOf('Amy'));
      if (/No data/.test(panel)) {
        expect(panel, 'no per-day $0.00 rows next to "No data"').not.toMatch(
          /[A-Z][a-z]{2} \d{1,2}, \d{4}\s+\$0\.00/,
        );
      }
    },
  );
});
