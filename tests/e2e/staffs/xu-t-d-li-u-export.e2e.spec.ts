import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Xuất dữ liệu (Export) — Staffs', () => {
  test.beforeEach(async ({ staffsPage }) => {
    await staffsPage.goto();
  });

  test(
    'TC-STF-050 — mở dialog Export Employee',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage }) => {
      const dialog = await staffsPage.openExportDialog();

      await expect(dialog.excelFormatOption).toBeVisible();
      await expect(dialog.csvFormatOption).toBeVisible();
      await expect(dialog.statusFilterSelect).toBeVisible();
      await expect(dialog.compensationTypeFilterSelect).toBeVisible();
      await expect(dialog.roleFilterSelect).toBeVisible();
      await expect(dialog.basicInfoGroupHeading).toBeVisible();
      await expect(dialog.contactGroupHeading).toBeVisible();
      await expect(dialog.workInfoGroupHeading).toBeVisible();
      await expect(dialog.cancelDialogButton).toBeVisible();
      await expect(dialog.exportButton).toBeVisible();
    },
  );

  test(
    'TC-STF-051 — xuất file Excel với cột mặc định',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      const dialog = await staffsPage.openExportDialog();
      await expect(dialog.excelFormatOption).toBeVisible();

      const downloadPromise = page.waitForEvent('download');
      await dialog.exportButton.click();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
      await expect(page.getByRole('dialog', { name: /export employee/i })).toBeHidden();
    },
  );

  test(
    'TC-STF-052 — xuất file CSV',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      const dialog = await staffsPage.openExportDialog();
      await dialog.csvFormatOption.click();

      const downloadPromise = page.waitForEvent('download');
      await dialog.exportButton.click();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/\.csv$/i);
    },
  );

  /**
   * Steps:
   * 1. Bỏ tick toàn bộ checkbox cột, click "Export".
   * Expected:
   * Hệ thống hoặc chặn export (yêu cầu chọn ít nhất 1 cột) hoặc export file chỉ có cột định danh
   * tối thiểu — không tạo file rỗng gây lỗi ẩn.
   */
  // TODO(manual/setup): requires enumerating and unchecking all column checkboxes plus verifying
  // resulting file content/blocking behavior — needs live/manual verification of export output.
  test.fixme(
    'TC-STF-053 — bỏ chọn tất cả các cột trước khi Export',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage }) => {
      await staffsPage.openExportDialog();
    },
  );

  /**
   * Steps:
   * 1. Chọn Status = Active/Inactive cụ thể.
   * 2. Click Export.
   * Expected:
   * File xuất ra chỉ chứa nhân viên khớp bộ lọc đã chọn trong dialog Export (độc lập với filter
   * trạng thái ngoài trang danh sách).
   */
  // TODO(manual/setup): requires opening and inspecting the downloaded file's content against the
  // selected filter — file content verification is not feasible via UI assertions.
  test.fixme(
    'TC-STF-054 — áp dụng bộ lọc Status/Role/Compensation Type trước khi Export',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage }) => {
      await staffsPage.openExportDialog();
    },
  );

  test(
    'TC-STF-055 — đóng dialog Export bằng Cancel/X không xuất file',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      const dialog = await staffsPage.openExportDialog();
      let downloadFired = false;
      page.on('download', () => {
        downloadFired = true;
      });

      await dialog.cancelDialogButton.click();
      await expect(page.getByRole('dialog', { name: /export employee/i })).toBeHidden();
      expect(downloadFired).toBe(false);
    },
  );

  /**
   * Preconditions: Danh sách đang ở trạng thái 0 kết quả (vd sau khi tìm kiếm không khớp).
   * Steps:
   * 1. Click "Export" trong trạng thái này.
   * Expected:
   * Hệ thống hiển thị thông báo rõ ràng không có dữ liệu để xuất, hoặc export file rỗng có cấu
   * trúc hợp lệ (không lỗi, không file hỏng).
   */
  // TODO(manual/setup): requires seeding a search/filter that yields zero results, then verifying
  // either an empty-data message or a valid empty export file — needs live/manual verification.
  test.fixme(
    'TC-STF-056 — export khi danh sách rỗng (đã áp filter/search không có kết quả)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage }) => {
      await staffsPage.search('zzz_no_such_staff_zzz');
    },
  );
});
