import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Tạo nhân viên mới (Create) — Staffs', () => {
  test.beforeEach(async ({ staffsPage }) => {
    await staffsPage.goto();
  });

  test(
    'TC-STF-030 — opens "Create New Staff" dialog with all fields',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage }) => {
      const dialog = await staffsPage.openCreateDialog();
      await expect(dialog.firstNameInput).toBeVisible();
      await expect(dialog.lastNameInput).toBeVisible();
      await expect(dialog.nickNameInput).toBeVisible();
      await expect(dialog.phoneInput).toBeVisible();
      await expect(dialog.emailInput).toBeVisible();
      await expect(dialog.ssnInput).toBeVisible();
      await expect(dialog.streetAddressInput).toBeVisible();
      await expect(dialog.countrySelect).toBeVisible();
      await expect(dialog.stateSelect).toBeVisible();
      await expect(dialog.cityInput).toBeVisible();
      await expect(dialog.zipCodeInput).toBeVisible();
      await expect(dialog.staffRoleSelect).toBeVisible();
      await expect(dialog.statusSelect).toBeVisible();
      await expect(dialog.staffCodeInput).toBeVisible();
      await expect(dialog.colorPicker).toBeVisible();
      await expect(dialog.allowBookingToggle).toBeVisible();
      await expect(dialog.uploadPhotoButton).toBeVisible();
      await expect(dialog.createStaffButton).toBeVisible();
      await expect(dialog.cancelDialogButton).toBeVisible();
    },
  );

  /**
   * Steps:
   * 1. Mở dialog Create.
   * 2. Điền First Name, Last Name, Nick Name và các trường bắt buộc hợp lệ.
   * 3. Click "Create Staff".
   * Expected:
   * Thông báo tạo thành công hiển thị, dialog đóng, nhân viên mới xuất hiện trong danh sách (ở đầu danh sách nếu sort mặc định Newest first).
   */
  // TODO(manual/setup): creating a staff mutates backend/shared store data; needs seeded/cleanup-safe environment for live verification.
  test.fixme(
    'TC-STF-031 — creates staff successfully with valid data',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * Steps:
   * 1. Mở dialog Create.
   * 2. Để trống các trường bắt buộc (vd First Name).
   * 3. Click "Create Staff".
   * Expected:
   * Form không submit, hiển thị lỗi validation dưới trường trống tương ứng.
   */
  // TODO(manual/setup): exact validation error text/selectors for required fields are not documented; needs live verification before asserting.
  test.fixme(
    'TC-STF-032 — leaving required field empty blocks submit',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * Steps:
   * 1. Nhập email không hợp lệ (vd `abc@`) hoặc phone không hợp lệ.
   * 2. Submit.
   * Expected:
   * Hiển thị lỗi định dạng tương ứng, form không được submit.
   */
  // TODO(manual/setup): exact validation error text/selectors for email/phone format are not documented; needs live verification before asserting.
  test.fixme(
    'TC-STF-033 — invalid email/phone format blocks submit',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * Steps:
   * 1. Click "Upload".
   * 2. Chọn file JPG/PNG < 5MB.
   * Expected:
   * Ảnh preview hiển thị trong dialog thay cho placeholder mặc định.
   */
  // TODO(manual/setup): requires a real file upload fixture and clipboard/filesystem interaction not available in this scaffold; needs live verification.
  test.fixme(
    'TC-STF-034 — uploads valid avatar image (JPG/PNG < 5MB)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * Steps:
   * 1. Chọn file > 5MB hoặc định dạng không phải JPG/PNG.
   * Expected:
   * Hệ thống từ chối file, hiển thị thông báo lỗi rõ ràng (vd "File quá lớn" / "Định dạng không hỗ trợ"), không crash dialog.
   */
  // TODO(manual/setup): requires oversized/invalid-format file fixtures and exact rejection message text; needs live verification.
  test.fixme(
    'TC-STF-035 — rejects avatar upload over 5MB or invalid format',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  test(
    'TC-STF-036 — selects Staff Role and Status in Create dialog',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      const dialog = await staffsPage.openCreateDialog();
      await expect(dialog.staffRoleSelect).toBeVisible();
      await expect(dialog.statusSelect).toBeVisible();
      await dialog.statusSelect.click();
      await page.getByRole('option', { name: /Inactive/i }).click();
      await expect(dialog.statusSelect).toHaveText(/Inactive/i);
    },
  );

  /**
   * Steps:
   * 1. Chọn 1 Country cụ thể, sau đó mở dropdown State.
   * Expected:
   * Danh sách State hiển thị đúng các bang thuộc Country đã chọn (cần xác minh trực tiếp hành vi phụ thuộc này).
   */
  // TODO(manual/setup): Expected text explicitly states this dependent-select behavior needs live verification; option data set is not documented.
  test.fixme(
    'TC-STF-037 — Country selection filters dependent State options',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  test(
    'TC-STF-038 — Cancel or Close (X) discards staff creation',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage }) => {
      const dialog = await staffsPage.openCreateDialog();
      await dialog.firstNameInput.fill('Temp');
      await dialog.lastNameInput.fill('Staff');
      await dialog.cancelDialogButton.click();
      await expect(dialog.firstNameInput).toBeHidden();
    },
  );

  test(
    'TC-STF-039 — closes Create dialog with Esc key',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SLOW] },
    async ({ staffsPage, page }) => {
      const dialog = await staffsPage.openCreateDialog();
      await expect(dialog.firstNameInput).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog.firstNameInput).toBeHidden();
    },
  );

  /**
   * Steps:
   * 1. Nhập Staff Code trùng khi tạo mới, submit.
   * Expected:
   * Hiển thị lỗi báo trùng mã, không tạo được nhân viên mới với mã đã tồn tại.
   * Preconditions:
   * Biết một Staff Code đã tồn tại (vd `8899`).
   */
  // TODO(manual/setup): requires knowing/seeding an existing Staff Code and would mutate shared data on duplicate attempt; needs live verification.
  test.fixme(
    'TC-STF-040 — duplicate Staff Code is rejected on Create',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );
});
