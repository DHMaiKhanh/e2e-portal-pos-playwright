import type { Locator, Page } from '@playwright/test';
import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Timeouts } from '@configs/constants/timeouts';
import {
  INCOME_ACTIVITY_LOG_TABS,
  INCOME_HOUR_AXIS_PATTERN,
  INCOME_KPI_CARDS,
  INCOME_SIDEBAR_GROUPS,
  INCOME_SIDEBAR_ITEMS,
  INCOME_TABLE_ANCHORS,
  INCOME_TABS,
  INCOME_VIEWPORTS,
  IncomeTab,
} from '@pages/income/IncomePage';

/**
 * Responsive — Income Reports (`/pos/<storeId>/income`).
 *
 * playwright.config ships a single 1920x1080 chromium project, so every width
 * below is applied in-test with `page.setViewportSize` rather than
 * `test.use({ viewport })`. Two reasons:
 *  - the reuseContext fixture hands each test its OWN Page (created at the
 *    project default) on the worker-shared context, so a resize cannot leak
 *    sideways into a sibling test and needs no cleanup;
 *  - a `test.use({ viewport })` override forces a dedicated context and throws
 *    away the warm HTTP cache the shared context exists for.
 * The app relays out on resize alone (no reload), which is how the responsive
 * cases on Merchants / Onboarding / Batch History are already written.
 *
 * Breakpoint facts this file leans on, verified live against the Portal across
 * 1920 / 1280 / 1024 / 900 / 768 / 375 (see `Sidebar.toggle`):
 *  - from 768px up the nav is a permanent column and `Toggle Sidebar` is in the
 *    DOM but hidden — there is no desktop collapse affordance to test;
 *  - below that the column is gone (`sidebar.panel` count 0) and the trigger
 *    opens the nav as an overlay sheet instead;
 *  - the open sheet covers its own trigger, so closing it by the same button
 *    needs `force` — the click is real, the overlay just sits on top.
 *
 * Data is store-scoped and time-based, so nothing here asserts a figure: the
 * assertions are geometry (no sideways scroll, column order, no overlap),
 * presence, and format. Where a case needs a plot or a table row to exist at
 * all, it pins {@link DATA_BEARING_DATE} instead of hoping today traded.
 */

/**
 * A busy trading day in the past, recorded by the screen scan as data-bearing
 * (a full `9 AM` → `7 PM` axis and a populated `Order Details` table). Pinned by
 * the chart-tick and order-dialog cases: an empty day swaps the plot for an
 * empty state and leaves no ticks and no row to open.
 */
const DATA_BEARING_DATE = '2026-08-18';

/** Rough width of a `11 AM` tick at the chart's font size, plus breathing room. */
const MIN_TICK_ROOM_PX = 36;

/** A rendered rectangle, as `boundingBox()` reports it. */
type Box = { x: number; y: number; width: number; height: number };

/** Box of a locator — the layout cases need real geometry, so absence is fatal. */
async function boxOf(locator: Locator, what: string): Promise<Box> {
  const box = await locator.first().boundingBox();
  if (!box) throw new Error(`${what} has no bounding box (not rendered?)`);
  return box;
}

/**
 * Horizontal containment only.
 *
 * Vertical position is a scrolling concern on a long report screen — a region
 * below the fold is fine, a region past the right edge is the defect these
 * cases are about.
 */
function fitsHorizontally(box: Box, viewportWidth: number): boolean {
  return box.x >= -1 && box.x + box.width <= viewportWidth + 1;
}

/** Whether two rectangles share any area (1px of slack for sub-pixel drift). */
function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width - 1 &&
    b.x < a.x + a.width - 1 &&
    a.y < b.y + b.height - 1 &&
    b.y < a.y + a.height - 1
  );
}

/**
 * Resize and wait until the document actually reports the new width.
 *
 * `setViewportSize` resolves before the page has relaid out; polling
 * `clientWidth` is the cheap proof that measurements taken next are taken at
 * the requested width. (`clientWidth` excludes the scrollbar, hence `<=`.)
 */
async function applyViewport(
  page: Page,
  viewport: { readonly width: number; readonly height: number },
): Promise<void> {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.clientWidth), {
      timeout: Timeouts.SHORT,
    })
    .toBeLessThanOrEqual(viewport.width);
}

/** `9 AM` / `7 PM` -> minutes past midnight, so tick spacing can be compared. */
function hourLabelToMinutes(label: string): number {
  const parsed = label.match(/^(\d{1,2}) (AM|PM)$/);
  if (!parsed) return Number.NaN;
  const hour = Number(parsed[1]) % 12;
  return (parsed[2] === 'PM' ? hour + 12 : hour) * 60;
}

/** Gaps in minutes between consecutive axis ticks. */
function tickGaps(hours: string[]): number[] {
  const minutes = hours.map(hourLabelToMinutes);
  return minutes.slice(1).map((value, index) => value - minutes[index]);
}

test.describe('Responsive — Income Reports', () => {
  test.beforeEach(async ({ incomePage }) => {
    await incomePage.goto();
  });

  /**
   * TC-INC-156 — Bố cục ở 1920px
   * Steps:
   *  1. Đặt viewport 1920×1080.
   *  2. Load `?tab=daily`.
   * Expected:
   *  Sidebar cố định bên trái, nội dung chính giữa, rail KPI/panel bên phải;
   *  không tràn ngang.
   */
  test(
    'TC-INC-156 — at 1920×1080 the nav is left, the report middle and the detail rail right',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ incomePage, page }) => {
      await applyViewport(page, INCOME_VIEWPORTS.desktop);
      await incomePage.waitForDataSettled();

      const width = INCOME_VIEWPORTS.desktop.width;

      // A permanent nav column: no collapse affordance is offered at this width.
      await expect(incomePage.sidebar.panel).toBeVisible();
      await expect(incomePage.sidebar.toggle).toBeHidden();

      const nav = await boxOf(incomePage.sidebar.panel, 'sidebar column');
      const tabStrip = await boxOf(incomePage.tabList, 'tab strip');
      const incomeDetail = await boxOf(incomePage.incomeDetailHeading, 'INCOME DETAIL rail');
      const paymentDetail = await boxOf(incomePage.paymentDetailHeading, 'PAYMENT DETAIL rail');

      // Left: the nav starts at the left edge (only the icon rail is further
      // out) and the report content begins past its right edge.
      expect(nav.x, 'sidebar is not pinned to the left').toBeLessThan(width / 3);
      expect(nav.x + nav.width, 'content starts before the sidebar ends').toBeLessThanOrEqual(
        tabStrip.x + 1,
      );

      // Right: both rail panels sit in the right half, further right than the
      // content column starts, and stacked in one shared column.
      for (const [what, box] of [
        ['INCOME DETAIL', incomeDetail],
        ['PAYMENT DETAIL', paymentDetail],
      ] as const) {
        expect(box.x, `${what} is not in the right half of the screen`).toBeGreaterThan(width / 2);
        expect(box.x, `${what} is not right of the content column`).toBeGreaterThan(tabStrip.x);
      }
      expect(
        Math.abs(incomeDetail.x - paymentDetail.x),
        'the two rail panels are not in one column',
      ).toBeLessThanOrEqual(4);

      // Middle: all four KPI cards render, and every one of them is inside the
      // content column rather than under the nav.
      await expect(incomePage.kpiCards).toHaveCount(INCOME_KPI_CARDS.length);
      for (const card of await incomePage.kpiCards.all()) {
        const box = await boxOf(card, 'KPI card');
        expect(box.x, 'a KPI card overlaps the sidebar').toBeGreaterThanOrEqual(
          nav.x + nav.width - 1,
        );
        expect(fitsHorizontally(box, width), 'a KPI card spills past 1920px').toBe(true);
      }
      await expect(incomePage.chartTitle).toBeVisible();
      await expect(incomePage.orderDetailsTitle).toBeVisible();

      expect(
        await incomePage.hasHorizontalOverflow(),
        'the document scrolls sideways at 1920px',
      ).toBe(false);
    },
  );

  /**
   * TC-INC-157 — Bố cục ở 1280px
   * Steps:
   *  1. Đặt viewport 1280×800.
   *  2. Load `?tab=daily`.
   * Expected:
   *  Không tràn ngang (`scrollWidth <= clientWidth`); mọi khu vực vẫn hiện diện
   *  và đọc được.
   */
  test(
    'TC-INC-157 — at 1280×800 every region is still present with no sideways scroll',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ incomePage, page }) => {
      await incomePage.waitForDataSettled();
      await applyViewport(page, INCOME_VIEWPORTS.laptop);

      const width = INCOME_VIEWPORTS.laptop.width;

      // The Expected spells out the red line, so assert it in its own terms too.
      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(
        metrics.scrollWidth,
        `scrollWidth ${metrics.scrollWidth} > clientWidth ${metrics.clientWidth}`,
      ).toBeLessThanOrEqual(metrics.clientWidth + 1);
      expect(await incomePage.hasHorizontalOverflow()).toBe(false);

      // Present AND readable: visible, and inside the viewport horizontally.
      const regions: ReadonlyArray<readonly [string, Locator]> = [
        ['sidebar column', incomePage.sidebar.panel],
        ['tab strip', incomePage.tabList],
        ['date trigger', incomePage.dateTrigger],
        ['chart title', incomePage.chartTitle],
        ['chart surface', incomePage.chartRegion.or(incomePage.chartEmptyState)],
        ['Order Details title', incomePage.orderDetailsTitle],
        ['Order Details table', incomePage.tableElement(INCOME_TABLE_ANCHORS.daily)],
        ['INCOME DETAIL rail', incomePage.incomeDetailHeading],
        ['PAYMENT DETAIL rail', incomePage.paymentDetailHeading],
        ['pagination footer', incomePage.resultsFooter],
      ];
      for (const [what, locator] of regions) {
        await expect(locator, `${what} is not visible at 1280px`).toBeVisible();
        expect(
          fitsHorizontally(await boxOf(locator, what), width),
          `${what} spills past 1280px`,
        ).toBe(true);
      }

      await expect(incomePage.tabs).toHaveCount(INCOME_TABS.length);
      await expect(incomePage.kpiCards).toHaveCount(INCOME_KPI_CARDS.length);
    },
  );

  /**
   * TC-INC-158 — Bố cục ở 768px (tablet)
   * Steps:
   *  1. Đặt viewport 768×1024.
   *  2. Load `?tab=daily`.
   * Expected:
   *  Không tràn ngang; các khu vực xếp lại (stack) hợp lý; biểu đồ và bảng vẫn
   *  dùng được.
   */
  test(
    'TC-INC-158 — at 768×1024 the regions relayout without colliding or overflowing',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ incomePage, page }) => {
      await incomePage.waitForDataSettled();
      await applyViewport(page, INCOME_VIEWPORTS.tablet);

      const width = INCOME_VIEWPORTS.tablet.width;

      // 768 is the breakpoint edge: the nav is still a column here (the mobile
      // sheet takes over just below it), which TC-INC-159 covers.
      await expect(incomePage.sidebar.panel).toBeVisible();

      expect(
        await incomePage.hasHorizontalOverflow(),
        'the document scrolls sideways at 768px',
      ).toBe(false);

      const chartSurface = incomePage.chartRegion.or(incomePage.chartEmptyState);
      const dailyTable = incomePage.tableElement(INCOME_TABLE_ANCHORS.daily);
      const regions: ReadonlyArray<readonly [string, Locator]> = [
        ['tab strip', incomePage.tabList],
        ['date trigger', incomePage.dateTrigger],
        ['chart title', incomePage.chartTitle],
        ['chart surface', chartSurface],
        ['Order Details title', incomePage.orderDetailsTitle],
        ['Order Details table', dailyTable],
        ['INCOME DETAIL rail', incomePage.incomeDetailHeading],
        ['PAYMENT DETAIL rail', incomePage.paymentDetailHeading],
      ];
      for (const [what, locator] of regions) {
        await expect(locator, `${what} is not visible at 768px`).toBeVisible();
        expect(
          fitsHorizontally(await boxOf(locator, what), width),
          `${what} spills past 768px`,
        ).toBe(true);
      }

      // "Stacked sensibly" = whichever way the columns fold, the chart card and
      // the detail rail do not end up on top of each other.
      const chartBox = await boxOf(chartSurface, 'chart surface');
      const railBox = await boxOf(incomePage.incomeDetailHeading, 'INCOME DETAIL rail');
      expect(overlaps(chartBox, railBox), 'the detail rail overlaps the chart at 768px').toBe(
        false,
      );

      // Chart and table still usable: the plot has real area, and the table
      // either fits or takes the sideways scroll itself (the page never does).
      expect(chartBox.width, 'the chart collapsed to nothing at 768px').toBeGreaterThan(100);
      const tableBox = await boxOf(dailyTable, 'Order Details table');
      const scrollsOwnContainer = await incomePage.tableScrollsHorizontally(
        INCOME_TABLE_ANCHORS.daily,
      );
      expect(
        scrollsOwnContainer || fitsHorizontally(tableBox, width),
        `Order Details neither fits (${Math.round(tableBox.width)}px) nor scrolls in its own container`,
      ).toBe(true);
      await expect(
        incomePage.orderDetailsTable.rows.first().or(incomePage.resultsFooter),
      ).toBeVisible();
    },
  );

  /**
   * TC-INC-159 — Bố cục ở 390px (mobile)
   * Steps:
   *  1. Đặt viewport 390×844.
   *  2. Load `?tab=daily`.
   * Expected:
   *  Không tràn ngang; sidebar thu về nút `Toggle Sidebar`; thanh tab, bộ chọn
   *  ngày, biểu đồ, bảng `Order Details` đều truy cập được.
   */
  test(
    'TC-INC-159 — at 390×844 the nav collapses to Toggle Sidebar and every control stays reachable',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ incomePage, page }) => {
      await incomePage.waitForDataSettled();
      await applyViewport(page, INCOME_VIEWPORTS.mobile);

      const width = INCOME_VIEWPORTS.mobile.width;

      // The permanent column is gone; the nav lives behind the trigger.
      await expect(incomePage.sidebar.panel).toHaveCount(0);
      await expect(incomePage.sidebar.toggle).toBeVisible();
      await expect(incomePage.toggleSidebarButton).toBeVisible();
      await expect(incomePage.toggleSidebarButton).toBeEnabled();

      expect(
        await incomePage.hasHorizontalOverflow(),
        'the document scrolls sideways at 390px',
      ).toBe(false);

      // Tab strip: all three tabs, each reachable.
      await expect(incomePage.tabs).toHaveCount(INCOME_TABS.length);
      for (const tab of await incomePage.tabs.all()) {
        await expect(tab).toBeVisible();
        await expect(tab).toBeEnabled();
      }

      // Date picker, chart and the Order Details table all still render inside
      // the 390px column.
      const reachable: ReadonlyArray<readonly [string, Locator]> = [
        ['tab strip', incomePage.tabList],
        ['date trigger', incomePage.dateTrigger],
        ['chart title', incomePage.chartTitle],
        ['chart surface', incomePage.chartRegion.or(incomePage.chartEmptyState)],
        ['Order Details title', incomePage.orderDetailsTitle],
        ['Order Details table', incomePage.tableElement(INCOME_TABLE_ANCHORS.daily)],
      ];
      for (const [what, locator] of reachable) {
        await expect(locator, `${what} is not visible at 390px`).toBeVisible();
        expect(
          fitsHorizontally(await boxOf(locator, what), width),
          `${what} spills past 390px`,
        ).toBe(true);
      }
      await expect(incomePage.dateTrigger).toBeEnabled();
    },
  );

  /**
   * TC-INC-160 — Sidebar dạng drawer ở mobile
   * Steps:
   *  1. Ở 390px, bấm `Toggle Sidebar`.
   *  2. Bấm lại để đóng.
   * Expected:
   *  Mở drawer chứa đủ menu điều hướng; đóng lại được bằng chính nút đó (theo
   *  màn hình khác trong app, Escape có thể không đóng — cần xác nhận).
   */
  test(
    'TC-INC-160 — Toggle Sidebar opens a drawer with the whole nav and closes it again',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ incomePage, page }) => {
      await applyViewport(page, INCOME_VIEWPORTS.mobile);

      await expect(incomePage.sidebar.panel).toHaveCount(0);
      await expect(incomePage.sidebar.toggle).toBeVisible();

      await incomePage.sidebar.toggle.click();
      const drawer = incomePage.sidebar.mobileDrawer;
      await expect(drawer).toBeVisible();
      expect(
        fitsHorizontally(await boxOf(drawer, 'nav drawer'), INCOME_VIEWPORTS.mobile.width),
        'the drawer spills past 390px',
      ).toBe(true);

      // "Đủ menu điều hướng": every sidebar destination is in the sheet, keyed
      // by href because `Settings` appears twice (store vs admin).
      const drawerHrefs = await drawer
        .locator('a[href]')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
      for (const item of INCOME_SIDEBAR_ITEMS) {
        expect(drawerHrefs, `the drawer is missing ${item.label} (${item.href})`).toContain(
          item.href,
        );
      }
      for (const group of INCOME_SIDEBAR_GROUPS) {
        await expect(
          drawer.getByText(group, { exact: true }),
          `the drawer is missing the ${group} group`,
        ).toBeVisible();
      }
      // The active screen is still marked inside the drawer.
      await expect(drawer.locator('a[aria-current="page"]')).toHaveCount(1);

      // Closing by the same button: the open sheet is painted over its own
      // trigger, so the click needs `force` — Escape is not a documented way
      // out of this drawer and is deliberately not asserted either way.
      await incomePage.sidebar.toggle.click({ force: true });
      await expect(drawer).toBeHidden();

      // The report underneath survived the round trip.
      await expect(incomePage.sidebar.toggle).toBeVisible();
      await expect(incomePage.tabList).toBeVisible();
      expect(
        await incomePage.hasHorizontalOverflow(),
        'the document scrolls sideways after the drawer closed',
      ).toBe(false);
    },
  );

  /**
   * TC-INC-161 — Trục X biểu đồ thưa bớt ở mobile
   * Steps:
   *  1. Ở 390px, đọc nhãn trục X biểu đồ tab Daily.
   * Expected:
   *  Nhãn giãn cách 2 giờ (`9 AM`, `11 AM`, `1 PM`, `3 PM`, `5 PM`, `7 PM`) thay
   *  vì từng giờ, không đè chữ lên nhau.
   */
  test(
    'TC-INC-161 — at 390px the hour ticks thin out instead of crowding the axis',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ incomePage, page }) => {
      // Pinned to a trading day: an empty day renders the chart empty state and
      // then there is no axis to thin at all.
      await incomePage.gotoWithQuery({ tab: IncomeTab.DAILY, date: DATA_BEARING_DATE });
      await incomePage.waitForDataSettled();

      const desktopHours = await incomePage.chartHourLabels();
      const desktopWidth = (await boxOf(incomePage.chartRegion, 'chart plot area')).width;

      await applyViewport(page, INCOME_VIEWPORTS.mobile);
      // The plot re-measures on resize; wait for that before reading ticks.
      await expect
        .poll(async () => (await incomePage.chartRegion.boundingBox())?.width ?? desktopWidth, {
          timeout: Timeouts.MEDIUM,
        })
        .toBeLessThan(INCOME_VIEWPORTS.mobile.width);

      const mobileHours = await incomePage.chartHourLabels();
      test.skip(mobileHours.length < 2, 'the pinned day renders fewer than two hour ticks');

      // Still 12-hour AM/PM labels, and only ticks the full axis also had —
      // thinning drops labels, it never invents them.
      for (const label of mobileHours) {
        expect(label, `mobile tick "${label}" is not a 12-hour AM/PM label`).toMatch(
          INCOME_HOUR_AXIS_PATTERN,
        );
        expect(desktopHours, `mobile tick "${label}" is not on the full axis`).toContain(label);
      }
      expect(
        mobileHours.length,
        `390px shows more ticks (${mobileHours.join(', ')}) than 1920px (${desktopHours.join(', ')})`,
      ).toBeLessThanOrEqual(desktopHours.length);

      // Sparser than the desktop axis, never tighter.
      const mobileGaps = tickGaps(mobileHours);
      const desktopGaps = tickGaps(desktopHours);
      expect(mobileGaps.some(Number.isNaN), `unparseable tick in ${mobileHours.join(', ')}`).toBe(
        false,
      );
      if (desktopGaps.length > 0) {
        expect(
          Math.min(...mobileGaps),
          `ticks are packed tighter at 390px (${mobileHours.join(', ')})`,
        ).toBeGreaterThanOrEqual(Math.min(...desktopGaps));
      }

      // The documented 2-hour grid — only meaningful when the full axis was
      // hourly to begin with (a short trading day never needs thinning).
      if (desktopHours.length >= 6) {
        for (const gap of mobileGaps) {
          expect(
            gap,
            `hourly ticks survived at 390px (${mobileHours.join(', ')})`,
          ).toBeGreaterThanOrEqual(120);
        }
      }

      // "Không đè chữ": each surviving tick has room for its own label.
      const mobileWidth = (await boxOf(incomePage.chartRegion, 'chart plot area')).width;
      expect(
        mobileWidth / mobileHours.length,
        `${mobileHours.length} ticks in ${Math.round(mobileWidth)}px will overlap`,
      ).toBeGreaterThanOrEqual(MIN_TICK_ROOM_PX);
    },
  );

  /**
   * TC-INC-162 — Bảng nhiều cột ở màn hình hẹp
   * Steps:
   *  1. Ở 390px, mở tab `Staff Income` (bảng 6 cột).
   * Expected:
   *  Bảng cuộn ngang trong vùng chứa riêng hoặc rút gọn cột; **trang** không bị
   *  cuộn ngang.
   */
  test(
    'TC-INC-162 — at 390px the six-column Staff table scrolls itself, never the page',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ incomePage, page }) => {
      // Enter the tab at the desktop default so the fetch lands before the
      // resize, then narrow the window onto the loaded table.
      await incomePage.gotoTab(IncomeTab.STAFF);
      await incomePage.waitForDataSettled();
      await applyViewport(page, INCOME_VIEWPORTS.mobile);

      const width = INCOME_VIEWPORTS.mobile.width;

      // The page itself must not scroll sideways — the bolded requirement.
      expect(
        await incomePage.hasHorizontalOverflow(),
        'the page scrolls sideways on the Staff tab at 390px',
      ).toBe(false);

      // Only the active tab's table is visible, whichever shape it takes.
      await expect(incomePage.visibleTables).toHaveCount(1);

      // Either branch of the Expected is acceptable: the table keeps its six
      // columns and scrolls inside its own container, or it drops columns and
      // fits. `TOTAL INCOME` is the anchor for the first branch; if the reduced
      // layout drops that header the second branch has to hold instead.
      const anchored = incomePage.tableElement(INCOME_TABLE_ANCHORS.staff);
      const keptAnchorColumn = (await anchored.count()) > 0;
      const measured = keptAnchorColumn ? anchored : incomePage.visibleTables.first();
      await expect(measured, 'the Staff table is not visible at 390px').toBeVisible();

      const tableBox = await boxOf(measured, 'Staff table');
      const scrollsOwnContainer = keptAnchorColumn
        ? await incomePage.tableScrollsHorizontally(INCOME_TABLE_ANCHORS.staff)
        : false;
      expect(
        scrollsOwnContainer || fitsHorizontally(tableBox, width),
        `Staff table is ${Math.round(tableBox.width)}px wide at ${width}px, and nothing around it takes the scroll`,
      ).toBe(true);

      // Still a usable table: rows, or the documented empty state.
      await expect(incomePage.staffTable.rows.first().or(incomePage.staffEmptyState)).toBeVisible();
    },
  );

  /**
   * TC-INC-163 — Dialog chi tiết order ở mobile
   * Steps:
   *  1. Ở 390px, mở dialog chi tiết order.
   * Expected:
   *  Dialog vừa khung nhìn, cuộn dọc được tới hết `Activity Log`, có nút đóng
   *  chạm được.
   */
  test(
    'TC-INC-163 — at 390px the order dialog fits, scrolls to Activity Log and closes by its button',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ incomePage, page }) => {
      // Pinned to a day that holds orders, otherwise there is no row to open.
      await incomePage.gotoWithQuery({ tab: IncomeTab.DAILY, date: DATA_BEARING_DATE });
      await incomePage.waitForDataSettled();
      const codes = await incomePage.orderCodes();
      test.skip(codes.length === 0, 'no orders on the pinned day to open');

      await applyViewport(page, INCOME_VIEWPORTS.mobile);
      const dialog = await incomePage.openOrderRow(0);

      // Fits the 390×844 window, and opening it did not push the page sideways.
      await expect(dialog.root).toBeVisible();
      const dialogBox = await boxOf(dialog.root, 'order dialog');
      expect(
        fitsHorizontally(dialogBox, INCOME_VIEWPORTS.mobile.width),
        `the dialog is ${Math.round(dialogBox.width)}px wide at 390px`,
      ).toBe(true);
      expect(
        await incomePage.isWithinViewport(dialog.root),
        `the dialog box (${Math.round(dialogBox.width)}×${Math.round(dialogBox.height)} at ${Math.round(dialogBox.x)},${Math.round(dialogBox.y)}) is not inside the viewport`,
      ).toBe(true);
      expect(
        await incomePage.hasHorizontalOverflow(),
        'the page scrolls sideways while the dialog is open',
      ).toBe(false);

      // Scrolls vertically all the way down to the end of `Activity Log`.
      await dialog.scrollToSection('Activity Log');
      await expect(dialog.section('Activity Log')).toBeVisible();
      await expect(dialog.activityLogTimezoneNote).toBeVisible();
      await expect(dialog.activityLogTabs).toHaveCount(INCOME_ACTIVITY_LOG_TABS.length);

      // The close control is genuinely tappable: no `force`, so an overlay
      // sitting on top of it would fail the click rather than pass silently.
      await expect(dialog.closeButton).toBeVisible();
      await expect(dialog.closeButton).toBeEnabled();
      expect(
        await incomePage.isWithinViewport(dialog.closeButton),
        'the dialog close button is outside the 390×844 viewport',
      ).toBe(true);
      await dialog.closeButton.click();
      await expect(dialog.root).toBeHidden();
    },
  );
});
