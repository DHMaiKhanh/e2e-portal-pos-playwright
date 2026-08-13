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
   * This one creates a real service, prefixed `E2E-` so it is identifiable, and
   * deactivates it afterwards. As with categories, the Portal offers no delete
   * control on the service form (Cancel / Save Changes / Close only), so
   * deactivation is the furthest the UI can undo it.
   */
  test(
    'TC-SVC-050 — Click "Add Service" mở form thêm dịch vụ mới',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage }) => {
      const name = `E2E-SVC-${Date.now()}`;

      try {
        await test.step('The form opens with its documented fields', async () => {
          await productsPage.openAddService();
          await expect(productsPage.serviceDialog).toContainText(/create service/i);
          await expect(productsPage.serviceNameInput).toBeVisible();
          await expect(productsPage.serviceCategoryCombobox).toBeVisible();
          await expect(productsPage.servicePriceInput).toBeVisible();
          await expect(productsPage.serviceSupplyFeeInput).toBeVisible();
        });

        await test.step('Filling it in and saving adds the service, Active by default', async () => {
          await productsPage.serviceNameInput.fill(name);
          await productsPage.selectServiceCategory();
          await productsPage.servicePriceInput.fill('12.34');
          await productsPage.submitServiceCreate();

          await productsPage.search(name);
          const row = productsPage.table.rowContaining(name);
          await expect(row.first()).toBeVisible();
          const cells = (await row.first().innerText()).split('\t').map((cell) => cell.trim());
          expect(cells[1]).toBe('$12.34');
          expect(cells[4]).toBe('Active');
        });
      } finally {
        await productsPage.deactivateServiceIfPresent(name);
      }
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
      const dialog = page.getByRole('dialog');
      await expect(
        dialog.or(page.getByRole('heading', { name: /order|thứ tự/i })).first(),
      ).toBeVisible();
    },
  );
});
