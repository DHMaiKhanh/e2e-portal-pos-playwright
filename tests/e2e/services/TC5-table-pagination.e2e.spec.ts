import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Bảng dữ liệu & Phân trang (Table / Pagination) — Services', () => {
  test.beforeEach(async ({ productsPage }) => {
    await productsPage.goto();
  });

  test(
    'TC-SVC-040 — header bảng đúng thứ tự và nhãn cột',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage }) => {
      const headers = productsPage.columnHeaders;
      await expect(headers).toHaveText([
        'NAME & DESCRIPTION',
        'PRICE',
        'DURATION',
        'SUPPLY FEE',
        'STATUS',
      ]);
    },
  );

  test(
    'TC-SVC-041 — định dạng cột PRICE và SUPPLY FEE hiển thị đúng tiền USD',
    {
      tag: [Tag.REGRESSION, Tag.UI],
    },
    async ({ page }) => {
      const priceCells = page.getByRole('cell', { name: /^\$[\d,]+\.\d{2}$/ });
      await expect(priceCells.first()).toBeVisible();
      const count = await priceCells.count();
      expect(count).toBeGreaterThan(0);
    },
  );

  /**
   * Steps:
   * 1. Quan sát cột DURATION trên các dòng không có thời gian thực hiện (đa số dòng mẫu) và trên dòng có thời gian (vd "Dipping Ombre" → "30 minutes").
   * Expected:
   * Dòng không đặt duration hiển thị "—"; dòng có đặt hiển thị đúng chuỗi thời gian dạng "N minutes".
   */
  // TODO(manual/setup): requires knowledge of which specific rows have duration set/unset in current store data to reliably assert both states
  test.fixme(
    'TC-SVC-042 — cột DURATION hiển thị "—" khi không đặt thời gian',
    {
      tag: [Tag.REGRESSION, Tag.UI],
    },
    async () => {},
  );

  /**
   * Steps:
   * 1. Quan sát dòng có mô tả (vd "Gel Manicure product 2" với mô tả "Gel nail polish") và dòng không có mô tả.
   * Expected:
   * Dòng có mô tả hiển thị tên chính + đoạn mô tả nhỏ bên dưới; dòng không có mô tả chỉ hiển thị tên, không có khoảng trắng thừa/dòng trống bất thường.
   */
  // TODO(manual/setup): depends on specific service rows with/without descriptions existing in current store data
  test.fixme(
    'TC-SVC-043 — NAME & DESCRIPTION hiển thị mô tả phụ khi có',
    {
      tag: [Tag.REGRESSION, Tag.UI],
    },
    async () => {},
  );

  test(
    'TC-SVC-044 — phân trang hiển thị đúng tổng số kết quả và số trang',
    {
      tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE],
    },
    async ({ productsPage }) => {
      await expect(productsPage.paginationFooter).toHaveText(/Showing \d+ to \d+ of \d+ results/);
      await expect(productsPage.pageIndicator).toHaveText(/^1 \/ \d+$/);
      await expect(productsPage.previousPageButton).toBeDisabled();
      await expect(productsPage.nextPageButton).toBeEnabled();
    },
  );

  test(
    'TC-SVC-045 — click "Next"/"Previous" chuyển trang đúng dữ liệu',
    {
      tag: [Tag.REGRESSION, Tag.UI],
    },
    async ({ productsPage }) => {
      const firstPageFooter = await productsPage.paginationFooterText();

      await productsPage.goToNextPage();
      await expect(productsPage.pageIndicator).toHaveText(/^2 \/ \d+$/);
      const secondPageFooter = await productsPage.paginationFooterText();
      expect(secondPageFooter).not.toBe(firstPageFooter);

      await productsPage.goToPreviousPage();
      await expect(productsPage.pageIndicator).toHaveText(/^1 \/ \d+$/);
      const backToFirstFooter = await productsPage.paginationFooterText();
      expect(backToFirstFooter).toBe(firstPageFooter);
    },
  );

  /**
   * Steps:
   * 1. Chuyển tới trang cuối (9/…) bằng cách click "Next" liên tục hoặc điều hướng trực tiếp qua query param page.
   * 2. Quan sát footer và nút Next.
   * Expected:
   * Nút "Next" bị disabled; footer hiển thị đúng số dòng còn lại (vd "Showing 241 to 259 of 259 results" nếu tổng là 259); không có dòng trống/lỗi hiển thị.
   */
  // TODO(manual/setup): requires knowing exact total page count / navigating many pages reliably which depends on live store data volume
  test.fixme(
    'TC-SVC-046 — trang cuối cùng (9/9) disable nút "Next" và hiển thị đủ số dòng còn lại',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * Steps:
   * 1. Click vào một dòng bất kỳ trong bảng (ngoài các nút hành động).
   * Expected:
   * Mở modal/trang sửa dịch vụ hiển thị đầy đủ thông tin của dịch vụ đó (tên, mô tả, giá, thời gian, supply fee, trạng thái, category) — cần xác minh trực tiếp vì chưa quét được nội dung modal.
   */
  // TODO(manual/setup): modal content not scanned/documented; selectors for the edit modal are unknown
  test.fixme(
    'TC-SVC-047 — click vào một dòng dịch vụ mở chi tiết/sửa dịch vụ',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );
});
