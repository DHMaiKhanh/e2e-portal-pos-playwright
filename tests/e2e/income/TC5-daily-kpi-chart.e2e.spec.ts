import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import {
  INCOME_COUNT_PATTERN,
  INCOME_CURRENCY_PATTERN,
  INCOME_CURRENCY_TEXT_PATTERN,
  INCOME_EMPTY_STATES,
  INCOME_HOUR_AXIS_PATTERN,
  INCOME_KPI_CARDS,
  INCOME_PERCENT_BADGE_PATTERN,
  incomeKpiCard,
  parseIncomeAmount,
} from '@pages/income/IncomePage';

/**
 * `9 AM` / `12 PM` / `7 PM` -> minutes past midnight, so the X-axis ticks can
 * be checked for ascending order without depending on how many hours the store
 * happened to trade that day.
 */
function hourLabelToMinutes(label: string): number {
  const parsed = label.match(/^(\d{1,2}) (AM|PM)$/);
  if (!parsed) return Number.NaN;
  const hour = Number(parsed[1]) % 12;
  return (parsed[2] === 'PM' ? hour + 12 : hour) * 60;
}

/**
 * The day the screen scan recorded as data-bearing — a busy trading day in the
 * past, so its bars and axis are stable. Pinned wherever a case needs a plot to
 * actually exist: an empty day swaps the chart for TC-INC-043's empty state and
 * then has no axis and no bars to hover at all.
 */
const DATA_BEARING_DATE = '2026-08-18';

/** A day far enough back that the store has no orders — every KPI reads zero. */
const EMPTY_DATE = '2020-01-01';

test.describe('Tab Daily — KPI card & biểu đồ — Income Reports', () => {
  test.beforeEach(async ({ incomePage }) => {
    await incomePage.goto();
  });

  /**
   * TC-INC-035 — Bốn KPI card hiển thị đủ
   * Steps: 1) Load `?tab=daily`. 2) Kiểm tra các card.
   * Expected: Có đúng 4 card `Total Orders`, `Sale Income`, `Total Tip`,
   * `Total Payment`; mỗi card có giá trị, badge %, chữ `vs Yesterday` và nút
   * `About <tên>`.
   */
  test(
    'TC-INC-035 — four KPI cards with value, % badge, vs Yesterday and About button',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ incomePage }) => {
      await incomePage.waitForDataSettled();

      await expect(incomePage.kpiCards).toHaveCount(INCOME_KPI_CARDS.length);

      for (const card of INCOME_KPI_CARDS) {
        await test.step(`${card.label} card is complete`, async () => {
          const tile = incomePage.kpiCard(card.label);
          await expect(tile).toBeVisible();
          // The card text concatenates label + value + badge + comparison.
          await expect(tile).toHaveText(new RegExp(`^${card.label}\\b`));
          await expect(tile).toContainText('vs Yesterday');

          const value = await incomePage.kpiValue(card.label);
          expect(value, `${card.label} shows no headline figure`).toMatch(
            card.label === 'Total Orders' ? INCOME_COUNT_PATTERN : INCOME_CURRENCY_PATTERN,
          );

          expect(
            await incomePage.kpiPercent(card.label),
            `${card.label} shows no comparison badge`,
          ).toMatch(INCOME_PERCENT_BADGE_PATTERN);

          await expect(incomePage.kpiInfoButton(card.label)).toBeVisible();
        });
      }
    },
  );

  /**
   * TC-INC-036 — Tooltip `About Total Orders` đúng nội dung
   * Steps: 1) Hover/focus nút `About Total Orders`.
   * Expected: Hiện tooltip "Total number of orders (exclude refunds, and manual
   * refunds)."
   */
  test(
    'TC-INC-036 — About Total Orders tooltip text',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      const tooltip = await incomePage.openKpiTooltip('Total Orders');
      await expect(tooltip).toContainText(incomeKpiCard('Total Orders').tooltip);
    },
  );

  /**
   * TC-INC-037 — Tooltip `About Sale Income` đúng nội dung
   * Steps: 1) Hover/focus nút `About Sale Income`.
   * Expected: Hiện tooltip "Total sale amount of the order, including
   * refund/partial refund values after discount is applied, excluding Tax and
   * Tip."
   */
  test(
    'TC-INC-037 — About Sale Income tooltip text',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      const tooltip = await incomePage.openKpiTooltip('Sale Income');
      await expect(tooltip).toContainText(incomeKpiCard('Sale Income').tooltip);
    },
  );

  /**
   * TC-INC-038 — Tooltip `About Total Tip` đúng nội dung
   * Steps: 1) Hover/focus nút `About Total Tip`.
   * Expected: Hiện tooltip "Total tips received, not included in sales revenue
   * but counted in collected amounts."
   */
  test(
    'TC-INC-038 — About Total Tip tooltip text',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      const tooltip = await incomePage.openKpiTooltip('Total Tip');
      await expect(tooltip).toContainText(incomeKpiCard('Total Tip').tooltip);
    },
  );

  /**
   * TC-INC-039 — Tooltip `About Total Payment` đúng nội dung
   * Steps: 1) Hover/focus nút `About Total Payment`.
   * Expected: Hiện tooltip "The final revenue includes Gift Card Redemption."
   */
  test(
    'TC-INC-039 — About Total Payment tooltip text',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      const tooltip = await incomePage.openKpiTooltip('Total Payment');
      await expect(tooltip).toContainText(incomeKpiCard('Total Payment').tooltip);
    },
  );

  /**
   * TC-INC-040 — Bấm KPI card `Total Tip` đổi biểu đồ
   * Steps: 1) Load `?tab=daily`. 2) Bấm card `Total Tip`.
   * Expected: URL thêm `&stat=totalTip`; tiêu đề biểu đồ đổi thành `Total Tip
   * by Hour`; legend đổi thành `Total Tips`; card `Total Tip` có style được
   * chọn.
   */
  test(
    'TC-INC-040 — clicking Total Tip switches the chart to Total Tip by Hour',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page }) => {
      await incomePage.waitForDataSettled();
      await incomePage.selectKpiCard('Total Tip');

      await expect(page).toHaveURL(/[?&]stat=totalTip\b/);
      expect(incomePage.param('stat')).toBe('totalTip');
      await expect(incomePage.chartTitle).toHaveText('Total Tip by Hour');

      // "Style được chọn" is exposed as aria-pressed on exactly one card.
      await expect(incomePage.selectedKpiCard).toHaveCount(1);
      await expect(incomePage.selectedKpiCard).toHaveText(/^Total Tip\b/);

      // Tip is the one series the screen can legitimately have nothing to plot
      // for on the current day; when that happens the plot — legend included —
      // is replaced by the empty state TC-INC-043 pins.
      if (await incomePage.chartEmptyState.isVisible().catch(() => false)) {
        await expect(incomePage.chartEmptyState).toContainText(INCOME_EMPTY_STATES.TIP_CHART);
      } else {
        await expect(incomePage.chartLegend('Total Tips')).toBeVisible();
      }
    },
  );

  /**
   * TC-INC-041 — Bấm lần lượt cả 4 KPI card
   * Steps: 1) Bấm từng card `Total Orders` -> `Sale Income` -> `Total Tip` ->
   * `Total Payment`.
   * Expected: Mỗi lần bấm set đúng `stat=` tương ứng và tiêu đề biểu đồ đổi
   * thành `<tên KPI> by Hour`; tại mỗi thời điểm chỉ 1 card ở trạng thái được
   * chọn.
   */
  test(
    'TC-INC-041 — each of the four cards sets its own stat= and chart title',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await incomePage.waitForDataSettled();

      for (const card of INCOME_KPI_CARDS) {
        await test.step(`${card.label} -> stat=${card.stat}`, async () => {
          await incomePage.selectKpiCard(card.label);

          expect(incomePage.param('stat')).toBe(card.stat);
          await expect(incomePage.chartTitle).toHaveText(card.chartTitle);
          await expect(incomePage.selectedKpiCard).toHaveCount(1);
          await expect(incomePage.selectedKpiCard).toHaveText(new RegExp(`^${card.label}\\b`));
        });
      }
    },
  );

  /**
   * TC-INC-042 — Deep-link `stat=` khôi phục đúng series
   * Steps: 1) Load `?tab=daily&stat=totalTip`.
   * Expected: Biểu đồ mở ra đã là `Total Tip by Hour`, card `Total Tip` được
   * chọn ngay từ đầu.
   */
  test(
    'TC-INC-042 — deep-linked stat=totalTip restores the series and pressed card',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage, page }) => {
      await incomePage.gotoWithQuery({ tab: 'daily', stat: 'totalTip' });
      await incomePage.waitForDataSettled();

      await expect(page).toHaveURL(/\/pos\/\d+\/income\?[^#]*stat=totalTip/);
      await expect(incomePage.chartTitle).toHaveText('Total Tip by Hour');
      await expect(incomePage.selectedKpiCard).toHaveCount(1);
      await expect(incomePage.selectedKpiCard).toHaveText(/^Total Tip\b/);
    },
  );

  /**
   * TC-INC-043 — Empty state của biểu đồ khi series không có dữ liệu
   * Steps: 1) Chọn một ngày mà `Total Tip` = `$0.00`. 2) Bấm card `Total Tip`.
   * Expected: Vùng biểu đồ hiện đúng câu `No total tip recorded for this day
   * yet.` thay vì biểu đồ trống không giải thích.
   */
  test(
    'TC-INC-043 — zero-tip day shows the chart empty-state sentence',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      // A day the store never traded is the deterministic way to force
      // Total Tip to $0.00 without seeding or mutating store data.
      await incomePage.gotoWithQuery({ tab: 'daily', date: EMPTY_DATE });
      await incomePage.waitForDataSettled();

      expect(
        parseIncomeAmount(await incomePage.kpiValue('Total Tip')),
        `${EMPTY_DATE} was expected to have no tips`,
      ).toBe(0);

      await incomePage.selectKpiCard('Total Tip');

      await expect(incomePage.chartEmptyState).toBeVisible();
      await expect(incomePage.chartEmptyState).toContainText(INCOME_EMPTY_STATES.TIP_CHART);
    },
  );

  /**
   * TC-INC-044 — Biểu đồ mặc định là `Sale Income by Hour`
   * Steps: 1) Load `?tab=daily` không có `stat`.
   * Expected: Tiêu đề `Sale Income by Hour`, legend `Sale`.
   */
  test(
    'TC-INC-044 — default chart is Sale Income by Hour with the Sale legend',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery({ tab: 'daily' });
      await incomePage.waitForDataSettled();

      expect(incomePage.param('stat'), 'the default load should carry no stat=').toBe('');
      await expect(incomePage.chartTitle).toHaveText('Sale Income by Hour');
      await expect(incomePage.chartLegend('Sale')).toBeVisible();
    },
  );

  /**
   * TC-INC-045 — Trục X biểu đồ theo giờ
   * Steps: 1) Load `?tab=daily`. 2) Đọc nhãn trục X.
   * Expected: Các mốc giờ dạng `9 AM`, `10 AM`, ..., `7 PM` theo thứ tự tăng
   * dần, định dạng 12 giờ có AM/PM.
   */
  test(
    'TC-INC-045 — X axis ticks are ascending 12-hour AM/PM labels',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      // Pinned to a trading day: an empty day renders the empty state instead
      // of a plot, and then there is no axis to read at all.
      await incomePage.gotoWithQuery({ tab: 'daily', date: DATA_BEARING_DATE });
      await incomePage.waitForDataSettled();

      const hours = await incomePage.chartHourLabels();
      expect(hours.length, 'no hour ticks rendered on the X axis').toBeGreaterThan(1);

      for (const label of hours) {
        expect(label, 'hour tick is not 12-hour AM/PM').toMatch(INCOME_HOUR_AXIS_PATTERN);
      }

      const minutes = hours.map(hourLabelToMinutes);
      expect(minutes.some(Number.isNaN), `unparseable hour tick in ${hours.join(', ')}`).toBe(
        false,
      );
      expect(minutes, `hour ticks out of order: ${hours.join(', ')}`).toEqual(
        [...minutes].sort((a, b) => a - b),
      );

      // No 24-hour tick ("13:00") slipped in beside the AM/PM ones.
      const axisLabels = await incomePage.chartAxisLabels();
      expect(axisLabels.filter((label) => /^\d{1,2}:\d{2}$/.test(label))).toEqual([]);
    },
  );

  /**
   * TC-INC-046 — Trục Y tự co giãn theo dữ liệu
   * Steps:
   *  1. So sánh ngày doanh thu lớn (vd `date=2026-08-18`) với ngày có refund âm
   *     (vd hôm nay).
   * Expected: Ngày lớn hiện thang dương có viết tắt (`$0 $400 $800 $1.2K
   * $1.6K`); ngày có giá trị âm hiện thang bao cả phần âm (`-$70 ... $70`).
   */
  // TODO(manual/setup): the negative half of the comparison needs a day whose
  // Sale Income actually contains a refund. There is no fixed such date — the
  // case points at "today", which drifts, and DEV has no seeded refund day — so
  // an executable version would silently degrade into re-checking a
  // positive-only axis. Needs a seeded refund order on a known date, or a
  // manual pass.
  test.fixme(
    'TC-INC-046 — Y axis rescales for large revenue and for negative values',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery({ tab: 'daily', date: DATA_BEARING_DATE });
      await incomePage.waitForDataSettled();
    },
  );

  /**
   * TC-INC-047 — Hover cột biểu đồ hiện tooltip có giá trị
   * Steps: 1) Load `?tab=daily&date=2026-08-18`. 2) Hover vào một cột có dữ
   * liệu.
   * Expected: Tooltip hiện tên series và giá trị tiền tệ (vd `Sale $1,490.68`).
   */
  test(
    'TC-INC-047 — hovering a bar shows a tooltip with series name and amount',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery({ tab: 'daily', date: DATA_BEARING_DATE });
      await incomePage.waitForDataSettled();

      // Bars carry no accessible name, so the hover has to be geometric; walk a
      // few X positions because not every hour of the day has a bar.
      let tooltipText = '';
      for (const xFraction of [0.5, 0.35, 0.65, 0.25, 0.75, 0.85]) {
        await incomePage.hoverChartAt(xFraction, 0.6);
        const appeared = await incomePage.chartTooltip
          .waitFor({ state: 'visible', timeout: 2_000 })
          .then(() => true)
          .catch(() => false);
        if (!appeared) continue;
        tooltipText = ((await incomePage.chartTooltip.innerText()) ?? '')
          .replace(/\s+/g, ' ')
          .trim();
        if (INCOME_CURRENCY_TEXT_PATTERN.test(tooltipText)) break;
      }

      expect(tooltipText, 'chart tooltip never rendered').not.toBe('');
      expect(tooltipText, 'tooltip is missing the series name').toMatch(/Sale/i);
      expect(tooltipText, 'tooltip is missing a currency value').toMatch(
        INCOME_CURRENCY_TEXT_PATTERN,
      );
    },
  );

  /**
   * TC-INC-048 — Cột âm (refund) phân biệt được bằng màu và dấu
   * Steps:
   *  1. Chọn ngày có refund.
   *  2. Quan sát cột dưới mốc `$0`.
   * Expected: Cột âm vẽ xuống dưới đường 0 và tô màu khác cột dương; giá trị
   * trong tooltip có dấu trừ.
   */
  // TODO(manual/setup): needs a day that contains a refund — no seeded fixture
  // date exists on DEV — and the "different colour" half is a visual comparison
  // of two bar fills. Verify manually, or via a visual snapshot, once a
  // refund-bearing date is seeded.
  test.fixme(
    'TC-INC-048 — negative refund bars render below zero in a different colour',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery({ tab: 'daily' });
      await incomePage.waitForDataSettled();
    },
  );
});
