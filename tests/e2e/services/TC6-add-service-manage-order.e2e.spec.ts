import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Thêm dịch vụ & Quản lý thứ tự (Add Service / Manage Order) — Services', () => {
  test.beforeEach(async ({ productsPage }) => {
    await productsPage.goto();
  });

  /**
   * TC-SVC-050 — Click "Add Service" mở form thêm dịch vụ mới
   * Steps:
   *   1. Click nút "Add Service".
   *   2. Điền đầy đủ thông tin hợp lệ (tên, category, giá, ...).
   *   3. Lưu.
   * Expected:
   *   Form/dialog thêm dịch vụ hiển thị; sau khi lưu, dịch vụ mới xuất hiện trong bảng với trạng thái Active theo mặc định.
   */
  // TODO(manual/setup): requires filling out the add-service form (name/category/price fields are not
  // described/enumerated in the .md) and mutates backend state by creating a new service; needs live verification.
  test.fixme(
    'TC-SVC-050 — Click "Add Service" mở form thêm dịch vụ mới',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage }) => {
      await productsPage.addServiceButton.click();
    },
  );

  /**
   * TC-SVC-051 — Thêm dịch vụ thiếu trường bắt buộc bị chặn
   * Steps:
   *   1. Click "Add Service".
   *   2. Bỏ trống các trường bắt buộc (vd tên).
   *   3. Thử lưu.
   * Expected:
   *   Hiển thị lỗi validation cho từng trường bắt buộc còn thiếu; không tạo dịch vụ mới.
   */
  // TODO(manual/setup): requires the add-service form's field locators (not enumerated in the .md) to
  // submit with required fields blank and assert per-field validation errors.
  test.fixme(
    'TC-SVC-051 — Thêm dịch vụ thiếu trường bắt buộc bị chặn',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage }) => {
      await productsPage.addServiceButton.click();
    },
  );

  /**
   * TC-SVC-052 — Thêm dịch vụ với giá âm hoặc không hợp lệ bị chặn
   * Steps:
   *   1. Click "Add Service".
   *   2. Nhập giá âm hoặc ký tự không phải số vào trường Price.
   *   3. Thử lưu.
   * Expected:
   *   Hiển thị lỗi validation, không cho lưu giá trị không hợp lệ.
   */
  // TODO(manual/setup): requires the add-service form's Price field locator (not enumerated in the .md)
  // to enter an invalid value and assert validation error; needs live verification.
  test.fixme(
    'TC-SVC-052 — Thêm dịch vụ với giá âm hoặc không hợp lệ bị chặn',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage }) => {
      await productsPage.addServiceButton.click();
    },
  );

  /**
   * TC-SVC-053 — Click "Manage Order" mở màn hình quản lý thứ tự
   * Steps:
   *   1. Click nút "Manage Order".
   * Expected:
   *   Mở dialog/trang quản lý thứ tự category và/hoặc dịch vụ; các thao tác sắp xếp trong đó phản ánh đúng ra
   *   danh sách category/bảng chính sau khi lưu — cần xác minh trực tiếp vì chưa quét được nội dung.
   */
  test(
    'TC-SVC-053 — Click "Manage Order" mở màn hình quản lý thứ tự',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage, page }) => {
      await expect(productsPage.manageOrderButton).toBeVisible();
      await productsPage.manageOrderButton.click();

      // Best-effort verification that some order-management surface (dialog or page) opened.
      const dialog = page.getByRole('dialog');
      await expect(dialog.or(page.getByRole('heading', { name: /order|thứ tự/i }))).toBeVisible();
    },
  );
});
