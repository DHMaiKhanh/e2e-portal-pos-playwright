import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { ReportV4Slug } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import {
  RV4_COLUMNS,
  RV4_DAILY_KPIS,
  RV4_DATA_DAY,
  RV4_ORDER_CODE,
  RV4_PERCENT,
  RV4_TEXT,
  ReportsV4Page,
  rv4Cents,
  rv4DateLabel,
  rv4Amount,
} from '@pages/reports-v4/ReportsV4Page';

/**
 * Reports V4 › B. Daily Sale Report (RV4-B01 … B21) — docs/test-cases/reports-v4.md
 *
 * Numbers are reconciled within the page on the pinned data day
 * ({@link RV4_DATA_DAY}) — never asserted as fixed values.
 */
const SLUG = ReportV4Slug.DAILY_SALE;
const DAY = { after: RV4_DATA_DAY, before: RV4_DATA_DAY };

/** Amounts of one collapsible summary card (`Income Detail` / `Payment Detail`). */
async function cardAmounts(rp: ReportsV4Page, title: string): Promise<Map<string, number>> {
  const card = rp.page.locator('[data-slot="pos-collapsible"]').filter({ hasText: title }).first();
  return ReportsV4Page.amounts(await card.innerText());
}

test.describe('Reports V4 › Daily Sale', () => {
  test(
    'RV4-B01 — Report date opens a one-month calendar',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportsV4Page: rp }) => {
      await rp.open(SLUG);
      await expect(rp.reportDateButton).toHaveAttribute('aria-haspopup', 'dialog');
      await rp.reportDateButton.click();
      await expect(rp.popover.getByRole('grid')).toHaveCount(1);
      await expect(
        rp.popover.getByRole('button', { name: 'Go to the Previous Month' }),
      ).toBeVisible();
      await rp.page.keyboard.press('Escape');
      await expect(rp.popover).toBeHidden();
    },
  );

  test(
    'RV4-B02 — picking a day writes after/before and relabels the trigger',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ reportsV4Page: rp, page }) => {
      await rp.openWithData(SLUG, DAY);
      await rp.pickDay('2026-08-17');
      await expect(page).toHaveURL(/after=2026-08-17&before=2026-08-17/);
      await expect(rp.reportDateButton).toHaveText(rv4DateLabel('2026-08-17'));
      await rp.waitForData();
    },
  );

  test(
    'RV4-B03 — Today returns to the store-local current day',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG, DAY);
      await rp.todayButton.click();
      await expect(rp.reportDateButton).toHaveText('Today', { timeout: Timeouts.LONG });
      expect(rp.param('after')).toBe(rp.param('before'));
      expect(rp.param('after')).not.toBe(RV4_DATA_DAY);
    },
  );

  test(
    'RV4-B04 — an after/before deep link opens that day with its orders',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG, DAY);
      await expect(rp.reportDateButton).toHaveText(rv4DateLabel(RV4_DATA_DAY));
      expect(await rp.countValue()).toBeGreaterThan(0);
      await expect(rp.bodyRows.first().locator('td').first()).toHaveText(RV4_ORDER_CODE);
    },
  );

  test(
    'RV4-B05 — the unsupported ?date= param is ignored (falls back to Today)',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp }) => {
      await rp.open(SLUG, { date: RV4_DATA_DAY });
      await expect(rp.reportDateButton).toHaveText('Today', { timeout: Timeouts.LONG });
    },
  );

  test(
    'RV4-B06 — a malformed date in the URL does not take the whole page down',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp, page }) => {
      await rp.open(SLUG, { after: '2026-13-45', before: 'abc' });
      await expect(page.getByText(RV4_TEXT.MERCHANT_LOAD_FAILURE)).toBeHidden();
      await expect(rp.heading).toContainText('Daily Sale Report');
    },
  );

  test(
    'RV4-B07 — a reversed range (after > before) does not crash the page',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp, page }) => {
      await rp.open(SLUG, { after: '2026-08-19', before: '2026-08-01' });
      await expect(page.getByText(RV4_TEXT.MERCHANT_LOAD_FAILURE)).toBeHidden();
      await expect(rp.heading).toContainText('Daily Sale Report');
    },
  );

  for (const kpi of RV4_DAILY_KPIS) {
    test(
      `RV4-B08 — tile "${kpi.label}" switches the chart and writes metric=${kpi.metric}`,
      { tag: [Tag.REGRESSION, Tag.UI] },
      async ({ reportsV4Page: rp, page }) => {
        await rp.openWithData(SLUG, DAY);
        await rp.stat(kpi.label).click();
        await expect(page).toHaveURL(new RegExp(`metric=${kpi.metric}`));
        await expect(rp.stat(kpi.label)).toHaveAttribute('data-selected', 'true');
        await expect(rp.chartTitle(kpi.chart)).toBeVisible();
      },
    );
  }

  test(
    'RV4-B09 — an unknown metric shows "No metric selected" and keeps the rest',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp, page }) => {
      await rp.openWithData(SLUG, { ...DAY, metric: 'bogus' });
      await expect(page.getByText(RV4_TEXT.NO_METRIC)).toBeVisible();
      await expect(page.getByText(RV4_TEXT.NO_METRIC_HINT)).toBeVisible();
      await expect(rp.bodyRows.first()).toBeVisible();
    },
  );

  test(
    'RV4-B10 — without metric the chart defaults to Sale Income by Hour',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG, DAY);
      await expect(rp.chartTitle('Sale Income by Hour')).toBeVisible();
      await expect(rp.stat('Sale Income')).toHaveAttribute('data-selected', 'true');
    },
  );

  test(
    'RV4-B11 — each tile shows a signed % delta "vs Yesterday"',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG, DAY);
      for (const kpi of RV4_DAILY_KPIS) {
        const tile = rp.stat(kpi.label);
        // "vs Yesterday" when the day is today, otherwise "vs <previous day>".
        await expect(tile.locator('[data-slot="pos-stat-vs"]')).toHaveText(
          /^vs (Yesterday|[A-Z][a-z]{2} \d{1,2})$/,
        );
        const delta = (await tile.locator('[data-slot="pos-stat-delta"]').innerText())
          .trim()
          .split('\n')[0]
          .trim();
        expect(delta, `${kpi.label} delta`).toMatch(RV4_PERCENT);
        expect(delta).not.toMatch(/Infinity|NaN/);
      }
    },
  );

  test(
    'RV4-B12 — summary tiles reconcile with the Order Details table (refund lines included)',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG, DAY);
      await rp.expectDefaultLayout(SLUG);
      expect(await rp.headerLabels()).toEqual([...RV4_COLUMNS.dailySale]);
      const rows = await rp.bodyRows.count();
      expect(await rp.countValue()).toBe(rows);
      // Total Orders counts sales only; refund lines ("#OD… (Refund)") are extra table rows.
      const sales = (await rp.columnTexts(0)).filter((c) => !/\(Refund\)$/.test(c)).length;
      expect(rv4Amount(await rp.statValue('Total Orders'))).toBe(sales);
      expect(rv4Cents(rv4Amount(await rp.statValue('Sale Income')))).toBe(
        rv4Cents(await rp.columnSum(1)),
      );
      expect(rv4Cents(rv4Amount(await rp.statValue('Total Tip')))).toBe(
        rv4Cents(await rp.columnSum(3)),
      );
      expect(rv4Cents(rv4Amount(await rp.statValue('Total Payment')))).toBe(
        rv4Cents(await rp.columnSum(4)),
      );
    },
  );

  test(
    'RV4-B13 — Income Detail = Sale + Tip + Tax Collected',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG, DAY);
      const a = await cardAmounts(rp, 'Income Detail');
      expect(rv4Cents(a.get('Income Detail')!)).toBe(
        rv4Cents(a.get('Sale')! + a.get('Tip')! + a.get('Tax Collected')!),
      );
      expect(rv4Cents(a.get('Sale')!)).toBe(rv4Cents(rv4Amount(await rp.statValue('Sale Income'))));
    },
  );

  test(
    'RV4-B14 — Payment Detail = Card + Cash + Others = Amount Collected',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG, DAY);
      const a = await cardAmounts(rp, 'Payment Detail');
      const total = a.get('Payment Detail')!;
      expect(rv4Cents(total)).toBe(rv4Cents(a.get('Card')! + a.get('Cash')! + a.get('Others')!));
      expect(rv4Cents(a.get('Amount Collected')!)).toBe(rv4Cents(total));
      expect(rv4Cents(total)).toBe(rv4Cents(rv4Amount(await rp.statValue('Total Payment'))));
    },
  );

  test(
    'RV4-B15 — clicking an order opens the Order detail dialog',
    { tag: [Tag.REGRESSION, Tag.SMOKE, Tag.UI] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG, DAY);
      const code = (await rp.bodyRows.first().locator('td').first().innerText()).trim();
      await rp.bodyRows.first().click();
      await expect(rp.dialog).toBeVisible();
      await expect(rp.dialog).toContainText('Order detail');
      await expect(rp.dialog).toContainText(code.replace(/\s*\(Refund\)$/, ''));
      for (const section of ['Order information', 'Payment details', 'Order summary']) {
        await expect(rp.dialog).toContainText(section);
      }
      await expect(rp.dialog).toContainText(/UTC[+-]\d+/);
      await rp.page.keyboard.press('Escape');
      await expect(rp.dialog).toBeHidden();
    },
  );

  test(
    'RV4-B16 — Order summary Total = Subtotal − Discount + Tax + Tip',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG, DAY);
      const rows = await rp.bodyRows.count();
      let checked = 0;
      for (let i = 0; i < rows && checked < 3; i++) {
        await rp.bodyRows.nth(i).click();
        await expect(rp.dialog).toContainText('Order summary');
        const text = await rp.dialog.innerText();
        await rp.page.keyboard.press('Escape');
        await expect(rp.dialog).toBeHidden();
        if (!/Successful/.test(text)) continue; // refunded / voided orders carry extra lines
        const summary = text.slice(text.indexOf('Order summary'));
        const m =
          /Subtotal[\s\S]*?([-−]?\$[\d,]+\.\d{2})[\s\S]*?Discount[\s\S]*?([-−]?\$[\d,]+\.\d{2})[\s\S]*?Tax\s+([-−]?\$[\d,]+\.\d{2})\s+Tip\s+([-−]?\$[\d,]+\.\d{2})\s+Total\s+([-−]?\$[\d,]+\.\d{2})/.exec(
            summary,
          );
        expect(m, `order summary of row ${i}`).not.toBeNull();
        const [sub, disc, tax, tip, total] = m!.slice(1).map(rv4Amount);
        expect(rv4Cents(total)).toBe(rv4Cents(sub - Math.abs(disc) + tax + tip));
        checked++;
      }
      expect(checked).toBeGreaterThan(0);
    },
  );

  test(
    'RV4-B17 — Income Detail / Payment Detail headers expand and collapse',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG, DAY);
      for (const name of [/^Income Detail/, /^Payment Detail/]) {
        const trigger = rp.page.locator('#pos-main').getByRole('button', { name });
        const before = await trigger.getAttribute('aria-expanded');
        await trigger.click();
        await expect(trigger).not.toHaveAttribute('aria-expanded', before ?? '');
        await trigger.click();
        await expect(trigger).toHaveAttribute('aria-expanded', before ?? '');
      }
    },
  );

  test(
    'RV4-B18 — Expand table opens the table in a dialog; Escape closes it',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG, DAY);
      await rp.expandTableButton.click();
      await expect(rp.dialog).toContainText('Order Details');
      await expect(rp.dialog.locator('tbody tr').first()).toBeVisible();
      await rp.page.keyboard.press('Escape');
      await expect(rp.dialog).toBeHidden();
    },
  );

  test(
    'RV4-B19 — a day without orders shows zero tiles and an empty table',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG, { after: '2020-01-01', before: '2020-01-01' });
      expect(await rp.countValue()).toBe(0);
      await expect(rp.stat('Total Orders').locator('[data-slot="pos-stat-value"]')).toHaveText('0');
      await expect(rp.stat('Total Payment').locator('[data-slot="pos-stat-value"]')).toHaveText(
        '$0.00',
      );
    },
  );

  test(
    'RV4-B20 — hovering the hour chart shows "<hour>" and "<metric> : $x.xx"',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG, DAY);
      await expect(rp.chart).toBeVisible();
      const seen = new Set<string>();
      for (const fx of [0.2, 0.45, 0.7, 0.9]) {
        const tip = await rp.chartTooltipAt(fx);
        const [hour, ...rest] = tip.split('\n').filter((l) => l.trim());
        expect(hour, tip).toMatch(/^\d{1,2} (AM|PM)$/);
        expect(rest.join(' '), tip).toMatch(/^Sale : [-−]?\$[\d,]+\.\d{2}$/);
        seen.add(hour);
      }
      expect(seen.size, 'tooltip follows the pointer across hours').toBeGreaterThan(1);
      // switching the tile renames the series in the tooltip
      await rp.stat('Total Orders').click();
      await expect(rp.chartTitle('Total Orders by Hour')).toBeVisible();
      expect(await rp.chartTooltipAt(0.7)).toMatch(/\nOrders : \d+$/);
    },
  );

  test(
    'RV4-B21 — Print triggers the browser print without a real dialog',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportsV4Page: rp }) => {
      await rp.installPrintSpy();
      await rp.openWithData(SLUG, DAY);
      await rp.printButton.click();
      await expect.poll(() => rp.printCount(), { timeout: Timeouts.MEDIUM }).toBeGreaterThan(0);
    },
  );
});
