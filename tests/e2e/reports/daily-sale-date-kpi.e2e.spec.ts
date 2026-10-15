import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { ReportPageSlug } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import {
  RPT_COUNT,
  RPT_CURRENCY,
  RPT_DAILY_KPIS,
  RPT_HOUR_LABEL,
  RPT_TEXT,
  type ReportPagesPage,
  rptDateLabel,
  rptIsoDay,
} from '@pages/reports/ReportPagesPage';

/**
 * Reports › Daily Sale Report — bộ chọn ngày, KPI & biểu đồ (TC-RPT-016 … 025).
 */
const SLUG = ReportPageSlug.DAILY_SALE;

/** Open the calendar and make sure the month holding `iso` is displayed. */
async function openCalendarAt(rp: ReportPagesPage, iso: string): Promise<void> {
  await rp.reportDateButton.click();
  await expect(rp.calendar).toBeVisible();
  const today = rptIsoDay(0);
  const months = (Number(today.slice(0, 4)) - Number(iso.slice(0, 4))) * 12 + Number(today.slice(5, 7)) - Number(iso.slice(5, 7));
  for (let i = 0; i < months; i++) await rp.calendar.getByRole('button', { name: 'Go to the Previous Month' }).click();
  for (let i = 0; i > months; i--) await rp.calendar.getByRole('button', { name: 'Go to the Next Month' }).click();
}

test.describe('Reports › Daily Sale — date picker, KPI & chart', () => {
  test(
    'TC-RPT-016 — Report Date defaults to Today and opens a one-month calendar with today selected',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp }) => {
      await rp.open(SLUG);
      await expect(rp.reportDateButton).toHaveText('Today', { timeout: Timeouts.LONG });
      await expect(rp.reportDateButton).toHaveAttribute('aria-haspopup', 'dialog');
      await rp.reportDateButton.click();
      await expect(rp.calendar).toBeVisible();
      await expect(rp.calendar.getByRole('grid')).toHaveCount(1);
      await expect(rp.calendar.getByRole('button', { name: /^Today, .*selected$/ })).toBeVisible();
      await expect(rp.calendar.getByRole('button', { name: 'Go to the Previous Month' })).toBeVisible();
      await rp.page.keyboard.press('Escape');
      await expect(rp.calendar).toBeHidden();
    },
  );

  test(
    'TC-RPT-017 — picking a past day writes after/before, relabels the trigger and reloads data',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ reportPagesPage: rp, page }) => {
      const day = rptIsoDay(-1);
      await rp.openWithData(SLUG);
      await openCalendarAt(rp, day);
      await rp.dayButton(day).click();
      await expect(page).toHaveURL(new RegExp(`after=${day}&before=${day}`));
      await expect(rp.reportDateButton).toHaveText(rptDateLabel(day));
      await expect(rp.calendar).toBeHidden();
      await rp.waitForData();
    },
  );

  test(
    'TC-RPT-018 — an after/before deep link keeps the chosen day across a reload',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp, page }) => {
      const day = rptIsoDay(-2);
      await rp.open(SLUG, { after: day, before: day });
      await expect(rp.reportDateButton).toHaveText(rptDateLabel(day), { timeout: Timeouts.LONG });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await rp.waitForShell();
      await expect(rp.reportDateButton).toHaveText(rptDateLabel(day), { timeout: Timeouts.LONG });
      expect(rp.param('after')).toBe(day);
      expect(rp.param('before')).toBe(day);
    },
  );

  test(
    'TC-RPT-019 — the calendar pages to the previous and next month',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp }) => {
      await rp.open(SLUG);
      await rp.reportDateButton.click();
      const caption = rp.calendar.getByText(/^[A-Z][a-z]+ \d{4}$/).first();
      const current = (await caption.textContent())!.trim();
      await rp.calendar.getByRole('button', { name: 'Go to the Previous Month' }).click();
      await expect(caption).not.toHaveText(current);
      await rp.calendar.getByRole('button', { name: 'Go to the Next Month' }).click();
      await expect(caption).toHaveText(current);
    },
  );

  test(
    'TC-RPT-020 — a future day renders a clean empty state (zero KPIs, no rows)',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp }) => {
      const day = rptIsoDay(7);
      await rp.open(SLUG, { after: day, before: day });
      await expect(rp.emptyRow).toBeVisible({ timeout: Timeouts.LONG });
      await expect(rp.resultsFooter).toHaveText('Showing 0 to 0 of 0 results');
      const value = async (label: string) =>
        (await rp.kpiTile(label).innerText()).split('\n').map((l) => l.trim()).filter(Boolean)[1];
      await expect.poll(() => value('Total Orders')).toBe('0');
      await expect.poll(() => value('Total Payment')).toBe('$0.00');
    },
  );

  test(
    'TC-RPT-021 — the four KPI tiles render in order with count / currency / percent formats',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp }) => {
      await rp.openWithData(SLUG);
      await expect(rp.kpiTiles).toHaveCount(4);
      for (const [i, kpi] of RPT_DAILY_KPIS.entries()) {
        const lines = (await rp.kpiTiles.nth(i).innerText()).split('\n').map((l) => l.trim()).filter(Boolean);
        expect(lines[0]).toBe(kpi.label);
        expect(lines[1]).toMatch(kpi.label === 'Total Orders' ? RPT_COUNT : RPT_CURRENCY);
        expect(lines.join(' ')).toMatch(/[+-]?\d+% vs /);
      }
    },
  );

  test(
    'TC-RPT-022 — the comparison caption is "vs Yesterday" for today and "vs <Mmm d>" for another day',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp }) => {
      await rp.openWithData(SLUG);
      await expect(rp.kpiTile('Sale Income')).toContainText('vs Yesterday');
      await rp.open(SLUG, { after: '2020-01-01', before: '2020-01-01' });
      await expect(rp.kpiTile('Sale Income')).toContainText(/vs (?:Yesterday|Dec 31)/, { timeout: Timeouts.LONG });
    },
  );

  test(
    'TC-RPT-023 — clicking a KPI tile selects it, writes ?metric= and retitles the chart',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(SLUG);
      const seen = new Set<string>();
      for (const kpi of RPT_DAILY_KPIS) {
        await rp.kpiTile(kpi.label).click();
        await expect(rp.kpiTile(kpi.label)).toHaveAttribute('data-selected', 'true');
        await expect(page.getByText(`${kpi.label} by Hour`, { exact: true })).toBeVisible();
        await expect.poll(() => rp.param('metric')).toBeTruthy();
        seen.add(rp.param('metric')!);
      }
      expect(seen.size).toBe(RPT_DAILY_KPIS.length);
      await rp.kpiTile('Total Tip').click();
      await expect.poll(() => rp.param('metric')).toBe('dailySaleTip');
    },
  );

  test(
    'TC-RPT-024 — the by-hour chart has 24 hour ticks from 12 AM to 11 PM',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(SLUG);
      const readHours = () =>
        page.evaluate(() =>
          [...document.querySelectorAll('svg text')]
            .map((t) => (t.textContent ?? '').trim())
            .filter((t) => /^\d{1,2} (?:AM|PM)$/.test(t)),
        );
      await expect.poll(async () => (await readHours()).length, { timeout: Timeouts.MEDIUM }).toBe(24);
      const hours = await readHours();
      expect(hours[0]).toBe('12 AM');
      expect(hours[23]).toBe('11 PM');
      hours.forEach((h) => expect(h).toMatch(RPT_HOUR_LABEL));
    },
  );

  test(
    'TC-RPT-025 — an unknown ?metric= shows "No Metric Selected" in the chart area',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.open(SLUG, { metric: 'bogus' });
      await expect(page.getByText(RPT_TEXT.NO_METRIC)).toBeVisible({ timeout: Timeouts.LONG });
      await expect(rp.kpiTiles.and(rp.page.locator('[data-selected="true"]'))).toHaveCount(0);
    },
  );
});
