import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Bảng dữ liệu & phân trang — Batch History', () => {
  test.beforeEach(async ({ batchHistoryPage }) => {
    await batchHistoryPage.goto();
  });

  test(
    'TC-BH-023 — header bảng hiển thị đúng nhãn và đúng thứ tự',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ batchHistoryPage }) => {
      await expect(batchHistoryPage.batchDateHeader).toBeVisible();
      await expect(batchHistoryPage.batchNumberHeader).toBeVisible();
      await expect(batchHistoryPage.statusHeader).toBeVisible();
      await expect(batchHistoryPage.totalPaymentHeader).toBeVisible();
      await expect(batchHistoryPage.amountHeader).toBeVisible();

      const headers = [
        batchHistoryPage.batchDateHeader,
        batchHistoryPage.batchNumberHeader,
        batchHistoryPage.statusHeader,
        batchHistoryPage.totalPaymentHeader,
        batchHistoryPage.amountHeader,
      ];
      const boxes = await Promise.all(headers.map((h) => h.boundingBox()));
      for (let i = 1; i < boxes.length; i++) {
        const prev = boxes[i - 1];
        const curr = boxes[i];
        expect(prev).not.toBeNull();
        expect(curr).not.toBeNull();
        if (prev && curr) {
          expect(curr.x).toBeGreaterThan(prev.x);
        }
      }
    },
  );

  /**
   * Steps:
   * 1. So sánh dữ liệu một batch đã biết trước với dòng tương ứng trên bảng.
   * Expected:
   * BATCH DATE, BATCH NUMBER, STATUS, TOTAL PAYMENT và AMOUNT đều khớp chính xác, không bị cắt/lệch dữ liệu.
   */
  // TODO(manual/setup): requires a pre-known batch record seeded/verified against a backend source to compare row-by-row values.
  test.fixme(
    'TC-BH-024 — giá trị từng dòng khớp với dữ liệu nguồn',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * Steps:
   * 1. Ghi lại dữ liệu dòng trang 1.
   * 2. Bấm "Next".
   * 3. Bấm "Previous".
   * Expected:
   * Trang 2 hiển thị tập dòng khác, footer/chỉ số trang cập nhật ("2 / N"); Previous quay lại đúng các dòng trang 1 ban đầu.
   */
  // TODO(manual/setup): requires a date range guaranteed to have >30 results (e.g. all-time) which cannot be assumed for the live time-based dataset.
  test.fixme(
    'TC-BH-025 — nút Next/Previous chuyển trang đúng',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await batchHistoryPage.goToNextPage();
      await batchHistoryPage.goToPreviousPage();
    },
  );

  test(
    'TC-BH-026 — nút phân trang disable đúng ở trang đầu/cuối',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await expect(batchHistoryPage.previousPageButton).toBeDisabled();

      // Advance to the last available page (works regardless of dataset size).
      for (let i = 0; i < 50; i++) {
        const isDisabled = await batchHistoryPage.nextPageButton.isDisabled();
        if (isDisabled) break;
        await batchHistoryPage.goToNextPage();
      }

      await expect(batchHistoryPage.nextPageButton).toBeDisabled();
      const indicator = await batchHistoryPage.pageIndicatorText();
      expect(indicator).toMatch(/\d+\s*\/\s*\d+/);
    },
  );

  /**
   * Steps:
   * 1. Load tập filter có tổng số đã biết (vd 88 kết quả / 3 trang).
   * 2. Kiểm tra text footer ở trang 1, 2 và trang cuối.
   * Expected:
   * Trang 1 hiển thị "Showing 1 to 30 of 88 results", trang 2 "31 to 60", trang cuối phản ánh đúng phần còn lại (vd "61 to 88"); tổng không bao giờ vượt quá Z.
   */
  // TODO(manual/setup): requires a filtered dataset with a known total count/page breakdown to assert exact footer ranges.
  test.fixme(
    'TC-BH-027 — footer "Showing X to Y of Z results" chính xác qua các trang',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * Steps:
   * 1. Lọc khoảng có ≤30 kết quả.
   * Expected:
   * Cả Previous và Next đều disable, chỉ số trang hiển thị "1 / 1"; không có trang 2 bị vỡ/thiếu dữ liệu.
   */
  // TODO(manual/setup): requires seeding/selecting a date range known to yield <=30 results, which cannot be guaranteed on the live dataset.
  test.fixme(
    'TC-BH-028 — phân trang ẩn/disable đúng khi kết quả chỉ có 1 trang',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * Steps:
   * 1. Điều hướng tới trang 2 hoặc 3 của kết quả.
   * 2. Đổi filter status hoặc khoảng ngày.
   * Expected:
   * Bảng reset về trang 1 của kết quả đã lọc mới, thay vì hiển thị trang ngoài phạm vi hoặc bảng trống.
   */
  // TODO(manual/setup): requires a dataset guaranteed to have a page 2+ to navigate to before changing filters.
  test.fixme(
    'TC-BH-029 — đổi filter khi đang ở trang 2+ reset về trang 1',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await batchHistoryPage.selectStatus('Open');
    },
  );

  /**
   * Steps:
   * 1. Bấm trực tiếp vào ô BATCH NUMBER và các ô khác trong một dòng.
   * Expected:
   * Không có điều hướng, modal hay drawer nào mở ra — đúng với việc màn hình này không có detail view; không phát sinh lỗi console khi bấm.
   */
  // TODO(manual/setup): requires a known row with data present to click and confirm no navigation/modal/console error occurs.
  test.fixme(
    'TC-BH-030 — ô batch number và các ô khác không tương tác được (sổ cái chỉ đọc)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );
});
