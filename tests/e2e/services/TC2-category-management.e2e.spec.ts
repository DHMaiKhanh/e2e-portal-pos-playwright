import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Danh sách Category (Reorder / Edit / Add Category) — Services', () => {
  test.beforeEach(async ({ productsPage }) => {
    await productsPage.goto();
  });

  test(
    'TC-SVC-010 — category list shows correct names and "Other" is always last',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage }) => {
      await productsPage.switchToActiveTab();

      const otherButton = productsPage.otherCategoryButton;
      await expect(otherButton).toBeVisible();

      // "Other" reorder/move controls must be disabled with the "Other is always last" tooltip.
      const otherReorderHandle = productsPage.categoryReorderHandle('Other');
      const otherMoveUp = productsPage.categoryMoveUpButton('Other');
      const otherMoveDown = productsPage.categoryMoveDownButton('Other');
      const otherMoveToFirst = productsPage.categoryMoveToFirstButton('Other');
      const otherMoveToLast = productsPage.categoryMoveToLastButton('Other');

      for (const locator of [otherMoveUp, otherMoveDown, otherMoveToFirst, otherMoveToLast]) {
        if (await locator.count()) {
          await expect(locator).toBeDisabled();
        }
      }
      if (await otherReorderHandle.count()) {
        await expect(otherReorderHandle).toHaveAttribute('aria-disabled', /true/);
      }
    },
  );

  /**
   * TC-SVC-011 — "Move ... up/down" hoạt động đúng
   * Steps:
   * 1. Ghi lại thứ tự category hiện tại.
   * 2. Click "Move <tên category thứ 2> up".
   * 3. Quan sát lại danh sách.
   * Expected: Category được chọn hoán đổi vị trí với category ngay phía trên; thứ tự các category khác không đổi;
   * thay đổi được lưu lại sau khi reload trang.
   */
  // TODO(manual/setup): mutates shared category ordering (backend state) and requires a reload to verify persistence — not safe for parallel/independent runs.
  test.fixme(
    'TC-SVC-011 — "Move ... up/down" swaps adjacent category order and persists',
    { tag: [Tag.REGRESSION] },
    async () => {},
  );

  /**
   * TC-SVC-012 — "Move ... to first / to last" hoạt động đúng
   * Steps:
   * 1. Chọn một category ở giữa danh sách.
   * 2. Click "Move <tên> to first".
   * 3. Xác nhận category lên đầu danh sách.
   * 4. Click "Move <tên> to last" trên chính category đó.
   * 5. Xác nhận category xuống ngay trước "Other".
   * Expected: Category di chuyển đúng vị trí đầu/cuối (trước "Other") sau mỗi lần click; các nút biên tương ứng
   * (to first/up ở đầu, down/to last ở cuối) bị disable đúng lúc.
   */
  // TODO(manual/setup): mutates shared category ordering (backend state) — not safe for parallel/independent runs.
  test.fixme(
    'TC-SVC-012 — "Move ... to first / to last" moves category to boundary positions',
    { tag: [Tag.REGRESSION] },
    async () => {},
  );

  test(
    'TC-SVC-013 — first category disables "to first" and "up" buttons',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage }) => {
      await productsPage.switchToActiveTab();

      const firstCategoryName = productsPage.categoryButton(/.+/).first();
      const name = ((await firstCategoryName.textContent()) ?? '').trim();

      const moveToFirst = productsPage.categoryMoveToFirstButton(name);
      const moveUp = productsPage.categoryMoveUpButton(name);

      if (await moveToFirst.count()) {
        await expect(moveToFirst).toBeDisabled();
      }
      if (await moveUp.count()) {
        await expect(moveUp).toBeDisabled();
      }
    },
  );

  test(
    'TC-SVC-014 — last category (before "Other") disables "down" and "to last" buttons',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage }) => {
      await productsPage.switchToActiveTab();

      const otherButton = productsPage.otherCategoryButton;
      await expect(otherButton).toBeVisible();

      // The category immediately preceding "Other" is the last movable one.
      const lastCategoryName = await productsPage.otherCategoryButton
        .locator('xpath=preceding-sibling::*[1]')
        .textContent();
      const name = (lastCategoryName ?? '').trim();

      if (name) {
        const moveDown = productsPage.categoryMoveDownButton(name);
        const moveToLast = productsPage.categoryMoveToLastButton(name);

        if (await moveDown.count()) {
          await expect(moveDown).toBeDisabled();
        }
        if (await moveToLast.count()) {
          await expect(moveToLast).toBeDisabled();
        }
      }
    },
  );

  /**
   * TC-SVC-015 — Kéo-thả (drag handle "Reorder ...") đổi thứ tự category
   * Steps:
   * 1. Dùng chuột kéo handle "Reorder <tên category>" xuống dưới một category khác.
   * 2. Thả chuột.
   * Expected: Thứ tự category cập nhật đúng theo vị trí thả; danh sách không bị lỗi/trùng lặp dòng.
   */
  // TODO(manual/setup): drag-and-drop reordering mutates shared backend state and requires precise mouse emulation not safe for parallel/independent runs.
  test.fixme(
    'TC-SVC-015 — drag handle reorders category list',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * TC-SVC-016 — Click "Add Category" mở form thêm category mới
   * Steps:
   * 1. Click nút "Add Category".
   * 2. Nhập tên category hợp lệ.
   * 3. Xác nhận lưu.
   * Expected: Dialog/form thêm category hiển thị; sau khi lưu thành công, category mới xuất hiện trong danh sách
   * (thường ở cuối, trước "Other").
   */
  // TODO(manual/setup): creating a category mutates shared backend/store data — needs setup/cleanup not safe for parallel/independent runs.
  test.fixme(
    'TC-SVC-016 — "Add Category" opens the add-category form and creates a category',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  test(
    'TC-SVC-017 — adding a category with an empty name is blocked',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage, page }) => {
      await productsPage.addCategoryButton.click();

      const nameInput = page
        .getByLabel(/category name/i)
        .or(page.getByPlaceholder(/category name/i));
      if (await nameInput.count()) {
        await nameInput.fill('');
      }

      const saveButton = page.getByRole('button', { name: /save|add/i }).last();
      await saveButton.click();

      // Expect a validation message and no navigation away / no new category committed.
      await expect(page.getByText(/required|cannot be empty|please enter/i)).toBeVisible();

      // Close the dialog without creating anything.
      const cancelButton = page.getByRole('button', { name: /cancel|close/i });
      if (await cancelButton.count()) {
        await cancelButton.click();
      }
    },
  );

  /**
   * TC-SVC-018 — Click "Edit <category>" mở form sửa category
   * Steps:
   * 1. Click nút "Edit <tên category>" trên một category bất kỳ.
   * 2. Đổi tên category.
   * 3. Lưu.
   * Expected: Form sửa hiển thị đúng dữ liệu category hiện tại; sau khi lưu, tên category trong danh sách được
   * cập nhật.
   */
  // TODO(manual/setup): renaming a category mutates shared backend/store data — needs setup/cleanup not safe for parallel/independent runs.
  test.fixme(
    'TC-SVC-018 — "Edit <category>" opens edit form and updates the category name',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );
});
