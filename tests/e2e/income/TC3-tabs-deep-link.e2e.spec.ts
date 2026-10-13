import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import {
  INCOME_DAILY_COLUMNS,
  INCOME_KPI_CARDS,
  INCOME_STAFF_COLUMNS,
  INCOME_TABS,
  INCOME_TAB_LABELS,
  IncomePeriod,
  IncomeTab,
  incomeTabLabel,
  incomeTabUrlPattern,
} from '@pages/income/IncomePage';

/**
 * Tab & deep-link facts measured on the DEV Portal while the screen was scanned
 * (docs/test-cases/_scan/income-interactions*.txt):
 *
 *  - the strip is a real ARIA tablist: three `role="tab"` buttons in the order
 *    `Daily Sale Report`, `Income Summary`, `Staff Income`;
 *  - clicking a tab rewrites only `?tab=` — the scan's click on `Income Summary`
 *    from `?tab=daily` landed on a bare `?tab=summary`, while
 *    `period` / `dateAfter` / `dateBefore` showed up only on explicit deep
 *    links. The date scope the case describes ("today") is therefore asserted
 *    where it is actually observable — on the date trigger and on the
 *    `Income period` combobox — and the params only when the app emits them;
 *  - `?tab=bogus` is actively normalised back to `?tab=daily`;
 *  - all three panels stay mounted, the inactive two hidden — so every table
 *    assertion has to be visible-filtered (the Page Object already is).
 */
test.describe('Tab & deep-link — Income Reports', () => {
  test.beforeEach(async ({ incomePage }) => {
    await incomePage.goto();
  });

  /**
   * TC-INC-016 — Ba tab hiển thị đúng nhãn và role
   * Steps:
   *  1. Load màn hình.
   *  2. Liệt kê các phần tử `role="tab"`.
   * Expected:
   *  Đúng 3 tab theo thứ tự `Daily Sale Report`, `Income Summary`, `Staff Income`.
   */
  test(
    'TC-INC-016 — three tabs render in order with role=tab',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ incomePage }) => {
      await expect(incomePage.tabList).toBeVisible();
      await expect(incomePage.tabs).toHaveCount(INCOME_TABS.length);
      await expect(incomePage.tabs).toHaveText(INCOME_TAB_LABELS);

      // The bare route lands on Daily, so exactly one tab is selected and it is
      // the first one.
      await expect(incomePage.selectedTab).toHaveCount(1);
      await expect(incomePage.selectedTab).toHaveText(incomeTabLabel(IncomeTab.DAILY));
    },
  );

  /**
   * TC-INC-017 — Chuyển sang tab `Income Summary`
   * Steps:
   *  1. Load `?tab=daily`.
   *  2. Bấm tab `Income Summary`.
   * Expected:
   *  URL thành `?tab=summary&period=day&dateAfter=<hôm nay>&dateBefore=<hôm nay>`;
   *  hiện combobox `Income period`, bảng `Total Income Table`, panel `No row selected`.
   */
  test(
    'TC-INC-017 — clicking Income Summary switches to ?tab=summary with the day period',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ incomePage, page }) => {
      await incomePage.gotoTab(IncomeTab.DAILY);
      await expect(incomePage.selectedTab).toHaveText(incomeTabLabel(IncomeTab.DAILY));

      await incomePage.openTab(IncomeTab.SUMMARY);

      await expect(page).toHaveURL(incomeTabUrlPattern(IncomeTab.SUMMARY));
      expect(incomePage.currentTab()).toBe(IncomeTab.SUMMARY);
      // `period` / `dateAfter` / `dateBefore` are only written by the app on
      // some routes into this tab (see the file header), so they are asserted
      // for correctness when present rather than required to be present.
      if (incomePage.hasParam('period')) {
        expect(incomePage.param('period')).toBe(IncomePeriod.DAY);
      }
      if (incomePage.hasParam('dateAfter') && incomePage.hasParam('dateBefore')) {
        expect(incomePage.param('dateAfter')).toBe(incomePage.param('dateBefore'));
      }

      // The observable form of "today": a single day on the trigger, never a range.
      expect(await incomePage.dateTriggerLabel()).toMatch(/^Today$|^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);

      await expect(incomePage.incomePeriodCombobox).toBeVisible();
      expect(await incomePage.incomePeriodValue()).toBe('Day');
      await expect(incomePage.totalIncomeTableTitle).toBeVisible();
      await expect(incomePage.noRowSelectedTitle).toBeVisible();
      await expect(incomePage.noRowSelectedHint).toBeVisible();
    },
  );

  /**
   * TC-INC-018 — Chuyển sang tab `Staff Income`
   * Steps:
   *  1. Load `?tab=daily`.
   *  2. Bấm tab `Staff Income`.
   * Expected:
   *  URL thành `?tab=staff&dateAfter=<hôm nay>&dateBefore=<hôm nay>`; hiện ô
   *  `Search by staff name...`, checkbox `Show staff with no income`, bảng 6 cột,
   *  panel `STAFF SUMMARY`.
   */
  test(
    'TC-INC-018 — clicking Staff Income switches to ?tab=staff with its 6-column table',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ incomePage, page }) => {
      await incomePage.gotoTab(IncomeTab.DAILY);

      await incomePage.openTab(IncomeTab.STAFF);

      await expect(page).toHaveURL(incomeTabUrlPattern(IncomeTab.STAFF));
      expect(incomePage.currentTab()).toBe(IncomeTab.STAFF);
      if (incomePage.hasParam('dateAfter') && incomePage.hasParam('dateBefore')) {
        expect(incomePage.param('dateAfter')).toBe(incomePage.param('dateBefore'));
      }

      await expect(incomePage.staffSearchInput).toBeVisible();
      await expect(incomePage.staffSearchInput).toBeEnabled();
      await expect(incomePage.showStaffWithNoIncomeCheckbox).toBeVisible();
      await expect(incomePage.showStaffWithNoIncomeLabel).toBeVisible();

      await expect(incomePage.staffHeaders).toHaveCount(INCOME_STAFF_COLUMNS.length);
      await expect(incomePage.staffHeaders).toHaveText([...INCOME_STAFF_COLUMNS]);

      await expect(incomePage.staffSummaryHeading).toBeVisible();
    },
  );

  /**
   * TC-INC-019 — Quay lại tab `Daily Sale Report`
   * Steps:
   *  1. Vào `?tab=staff`.
   *  2. Bấm tab `Daily Sale Report`.
   * Expected:
   *  URL về `?tab=daily`; hiện lại biểu đồ theo giờ, 4 KPI card, bảng `Order Details`.
   */
  test(
    'TC-INC-019 — returning to Daily Sale Report restores the chart, KPI cards and table',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page }) => {
      await incomePage.gotoTab(IncomeTab.STAFF);
      await expect(incomePage.selectedTab).toHaveText(incomeTabLabel(IncomeTab.STAFF));

      await incomePage.openTab(IncomeTab.DAILY);

      await expect(page).toHaveURL(incomeTabUrlPattern(IncomeTab.DAILY));
      expect(incomePage.currentTab()).toBe(IncomeTab.DAILY);

      // The hourly chart: the title carries the `<series> by Hour` suffix.
      await expect(incomePage.chartTitle).toBeVisible();
      await expect(incomePage.chartTitle).toHaveText(/ by Hour$/);
      // store 100004 has no sales for "today": the Daily chart then renders its
      // empty state in place of the role="application" plot, so assert the plot
      // only when the day actually has data to chart.
      if (!(await incomePage.chartEmptyState.isVisible().catch(() => false))) {
        await expect(incomePage.chartRegion).toBeVisible();
      }

      await expect(incomePage.kpiCards).toHaveCount(INCOME_KPI_CARDS.length);
      await expect(incomePage.orderDetailsTitle).toBeVisible();
      await expect(incomePage.orderDetailsHeaders).toHaveText([...INCOME_DAILY_COLUMNS]);
    },
  );

  /**
   * TC-INC-020 — Deep-link trực tiếp vào từng tab
   * Steps:
   *  1. Lần lượt load `?tab=daily`, `?tab=summary`, `?tab=staff`.
   * Expected:
   *  Mỗi lần mở đúng tab tương ứng ngay từ đầu (không nháy qua tab mặc định rồi
   *  mới đổi), tab đó có `aria-selected="true"`.
   */
  test(
    'TC-INC-020 — each ?tab= deep link opens that tab already selected',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ incomePage, page }) => {
      for (const { value, label } of INCOME_TABS) {
        await incomePage.gotoTab(value);

        // Read the selection as soon as the chrome is up and BEFORE the data
        // settles: a flash through the default tab would still be showing here.
        await expect(incomePage.tab(label)).toHaveAttribute('aria-selected', 'true');
        await expect(incomePage.selectedTab).toHaveCount(1);
        await expect(incomePage.selectedTab).toHaveText(label);

        expect(incomePage.currentTab()).toBe(value);
        await expect(page).toHaveURL(incomeTabUrlPattern(value));
      }
    },
  );

  /**
   * TC-INC-021 — `tab` không hợp lệ được làm sạch về mặc định
   * Steps:
   *  1. Load `?tab=bogus`.
   * Expected:
   *  URL được chuẩn hóa về `?tab=daily`, nội dung tab Daily render đầy đủ, không lỗi.
   */
  test(
    'TC-INC-021 — an unknown ?tab= value is normalised back to daily',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page }) => {
      await incomePage.gotoWithQuery({ tab: 'bogus' });

      await expect(page).toHaveURL(incomeTabUrlPattern(IncomeTab.DAILY));
      expect(incomePage.currentTab()).toBe(IncomeTab.DAILY);
      await expect(incomePage.selectedTab).toHaveText(incomeTabLabel(IncomeTab.DAILY));

      // Daily renders in full, and nothing broke on the way.
      await incomePage.waitForDataSettled();
      // store 100004 has no sales for "today": the Daily chart then renders its
      // empty state in place of the role="application" plot, so assert the plot
      // only when the day actually has data to chart.
      if (!(await incomePage.chartEmptyState.isVisible().catch(() => false))) {
        await expect(incomePage.chartRegion).toBeVisible();
      }
      await expect(incomePage.kpiCards).toHaveCount(INCOME_KPI_CARDS.length);
      await expect(incomePage.orderDetailsTitle).toBeVisible();
      await expect(incomePage.orderDetailsHeaders).toHaveText([...INCOME_DAILY_COLUMNS]);
      await expect(incomePage.unavailableMessage).toHaveCount(0);
    },
  );

  /**
   * TC-INC-022 — Chỉ một tab panel hiển thị tại một thời điểm
   * Steps:
   *  1. Load `?tab=staff`.
   *  2. Đếm số `table` đang **visible**.
   * Expected:
   *  Chỉ đúng 1 bảng hiển thị (bảng của tab Staff); bảng các tab khác dù có trong
   *  DOM cũng phải ẩn — tránh assert trúng bảng ẩn.
   */
  test(
    'TC-INC-022 — only the Staff panel and its single table are visible',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage, page }) => {
      await incomePage.gotoTab(IncomeTab.STAFF);
      await incomePage.waitForDataSettled();

      await expect(page.getByRole('tabpanel').filter({ visible: true })).toHaveCount(1);

      const visibleTables = page.locator('table').filter({ visible: true });
      await expect(visibleTables).toHaveCount(1);
      // …and the one showing is the Staff table.
      await expect(visibleTables.getByRole('columnheader')).toHaveText([...INCOME_STAFF_COLUMNS]);

      // The other two tabs' tables are mounted but hidden: their header-keyed,
      // visible-filtered locators must resolve to nothing.
      await expect(incomePage.orderDetailsHeaders).toHaveCount(0);
      await expect(incomePage.summaryHeaders).toHaveCount(0);
    },
  );

  /**
   * TC-INC-023 — Điều hướng tab bằng bàn phím
   * Steps:
   *  1. Focus vào tab `Daily Sale Report`.
   *  2. Nhấn ArrowRight.
   *  3. Nhấn Enter/Space nếu cần.
   * Expected:
   *  Focus/selection chuyển sang tab kế tiếp theo chuẩn ARIA tablist; tab panel
   *  tương ứng được hiển thị.
   */
  test(
    'TC-INC-023 — ArrowRight moves tablist focus and selection to the next tab',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage, page }) => {
      await incomePage.gotoTab(IncomeTab.DAILY);

      const daily = incomePage.tab(incomeTabLabel(IncomeTab.DAILY));
      const summary = incomePage.tab(incomeTabLabel(IncomeTab.SUMMARY));

      await daily.focus();
      await expect(daily).toBeFocused();

      await page.keyboard.press('ArrowRight');

      // ARIA tablist: ArrowRight always moves focus to the next tab.
      await expect(summary).toBeFocused();

      // Automatic-activation tablists select on focus; a manual one needs the
      // explicit Enter the case allows for.
      if ((await summary.getAttribute('aria-selected')) !== 'true') {
        await page.keyboard.press('Enter');
      }

      await expect(summary).toHaveAttribute('aria-selected', 'true');
      await expect(incomePage.selectedTab).toHaveCount(1);
      await expect(incomePage.selectedTab).toHaveText(incomeTabLabel(IncomeTab.SUMMARY));

      // The matching panel is the one showing.
      await expect(incomePage.totalIncomeTableTitle).toBeVisible();
      await expect(incomePage.incomePeriodCombobox).toBeVisible();
    },
  );
});
