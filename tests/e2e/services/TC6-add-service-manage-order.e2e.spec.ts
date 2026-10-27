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
  /**
   * The form's fields are now known (scanned live): `#name`, a `#category`
   * combobox, a Flexible Pricing switch, `#price`, two duration selects,
   * `#supplyFee`, `#description` and four visibility switches, with Cancel /
   * Create / Close.
   *
   * Changed 2026-10-20: the case no longer SAVES a service. The Portal offers
   * no delete control for services (Edit dialog = Cancel / Save changes /
   * Close), so a created service can only be deactivated, never removed — it
   * cannot be restored on the shared DEV store. The case now fills the whole
   * form (name, category, price), checks the defaults (Active + the three
   * "Shown on …" visibility flags on), then Cancels and verifies nothing was
   * created.
   */
  test(
    'TC-SVC-050 — Click "Add Service" mở form thêm dịch vụ mới',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage }) => {
      const name = `E2E-SVC-${Date.now()}`;

      await test.step('The form opens with its documented fields', async () => {
        await productsPage.openAddService();
        await expect(productsPage.serviceDialog).toContainText(/add service/i);
        await expect(productsPage.serviceNameInput).toBeVisible();
        await expect(productsPage.serviceCategoryCombobox).toBeVisible();
        await expect(productsPage.servicePriceInput).toBeVisible();
        await expect(productsPage.serviceSupplyFeeInput).toBeVisible();
        await expect(productsPage.serviceDescriptionInput).toBeVisible();
      });

      await test.step('New services default to Active and visible everywhere', async () => {
        for (const toggle of [
          'status',
          'showOnGoPos',
          'showOnWebBooking',
          'showOnGoCheckin',
        ] as const) {
          await expect(productsPage.serviceToggle(toggle)).toHaveAttribute('aria-checked', 'true');
        }
        await expect(productsPage.serviceToggle('flexiblePricing')).toHaveAttribute(
          'aria-checked',
          'false',
        );
      });

      await test.step('The form accepts valid input', async () => {
        await productsPage.serviceNameInput.fill(name);
        await productsPage.selectServiceCategory();
        await productsPage.servicePriceInput.fill('12.34');
        await expect(productsPage.serviceNameInput).toHaveValue(name);
        await expect(productsPage.servicePriceInput).toHaveValue(/12\.34/);
        await expect(productsPage.serviceDialogCreateButton).toBeEnabled();
      });

      await test.step('Cancel commits nothing', async () => {
        await productsPage.serviceDialogCancelButton.click();
        await expect(productsPage.serviceDialog).toBeHidden();
        await productsPage.search(name);
        await expect(productsPage.emptyState).toBeVisible();
      });
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
  test(
    'TC-SVC-051 — Thêm dịch vụ thiếu trường bắt buộc bị chặn',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage }) => {
      await productsPage.openAddService();

      // Submit the form untouched: name and category are both required.
      await productsPage.serviceDialogCreateButton.click();

      // Nothing is created and the form stays put with its complaint on screen.
      await expect(productsPage.serviceDialog).toBeVisible();
      await expect(
        productsPage.serviceDialog
          .getByText(/required|cannot be empty|please (enter|select)/i)
          .first(),
      ).toBeVisible();

      await productsPage.serviceDialogCancelButton.click();
      await expect(productsPage.serviceDialog).toBeHidden();
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
  test(
    'TC-SVC-052 — Thêm dịch vụ với giá âm hoặc không hợp lệ bị chặn',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage }) => {
      await productsPage.openAddService();
      await productsPage.serviceNameInput.fill(`E2E-INVALID-${Date.now()}`);
      await productsPage.selectServiceCategory();

      for (const badPrice of ['-5', 'abc']) {
        await test.step(`Price "${badPrice}" is refused`, async () => {
          await productsPage.servicePriceInput.fill(badPrice);

          // The field is a masked currency input, so the first line of defence
          // is that it refuses to hold the value at all.
          const held = await productsPage.servicePriceInput.inputValue();
          const sanitised = !/^-|[a-z]/i.test(held);

          if (!sanitised) {
            await productsPage.serviceDialogCreateButton.click();
            await expect(productsPage.serviceDialog).toBeVisible();
          }
          // Either way, no service may be created from this state.
          await expect(productsPage.serviceDialog).toBeVisible();
        });
      }

      await productsPage.serviceDialogCancelButton.click();
      await expect(productsPage.serviceDialog).toBeHidden();
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

      // Best-effort verification that some order-management surface (dialog or page)
      // opened. It opens as a dialog headed "Manage Service Order", so BOTH sides
      // of the union match and the unqualified `.or()` trips strict mode —
      // `.first()` has to wrap the whole chain.
      // Since the 2026-10-13 refactor the button is "Reorder" and it opens
      // `dialog "Reorder services"` (find box, scope picker, Done/Close).
      const dialog = page.getByRole('dialog', { name: 'Reorder services' });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('textbox', { name: 'Find a service' })).toBeVisible();
      await dialog.getByRole('button', { name: 'Close' }).click();
      await expect(dialog).toBeHidden();
    },
  );
});
