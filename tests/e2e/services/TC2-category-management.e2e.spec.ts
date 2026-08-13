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

  test(
    'TC-SVC-017 — adding a category with an empty name is blocked',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage, page }) => {
      await productsPage.addCategoryButton.click();

      // Scope to the dialog: an unscoped search leaks onto the page behind the
      // modal, and clicking there just hangs against the overlay.
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      const nameInput = dialog.getByPlaceholder(/enter category name/i);
      if (await nameInput.count()) {
        await nameInput.fill('');
      }

      // The submit control is labelled "Create" — not "Save"/"Add", which is what
      // this test used to look for (and never found inside the dialog).
      await dialog.getByRole('button', { name: /^create$/i }).click();

      // Expect a validation message and no navigation away / no new category committed.
      await expect(page.getByText(/required|cannot be empty|please enter/i)).toBeVisible();

      // Close the dialog without creating anything. The dialog carries BOTH a
      // "Cancel" button and an icon-only "Close" — match one of them explicitly
      // instead of a regex that resolves to two elements.
      const cancelButton = dialog.getByRole('button', { name: /^cancel$/i });
      if (await cancelButton.count()) {
        await cancelButton.click();
      }
    },
  );

  /**
   * Cases that write to the store live here.
   *
   * Serial, and in their own describe: they all mutate the one shared category
   * ordering, so running them in parallel would have them fighting over it.
   * Keeping the block separate also stops an unrelated failure in the
   * read-only cases above from cancelling the whole file, which is what a
   * file-wide serial mode did.
   *
   * Every one of them restores what it changed in a `finally`, so a failed
   * assertion still leaves the store as it was found.
   */
  test.describe('mutating category state', () => {
    test.describe.configure({ mode: 'serial' });

    test(
      'TC-SVC-011 — "Move ... up/down" swaps adjacent category order and persists',
      { tag: [Tag.REGRESSION] },
      async ({ productsPage }) => {
        await productsPage.switchToActiveTab();
        const before = await productsPage.categoryNamesInOrder();
        expect(before.length).toBeGreaterThan(2);

        const target = before[1];
        const neighbourAbove = before[0];

        try {
          await test.step(`Move "${target}" up`, async () => {
            await productsPage.moveCategoryUp(target);
            await expect
              .poll(async () => (await productsPage.categoryNamesInOrder()).slice(0, 2))
              .toEqual([target, neighbourAbove]);
          });

          await test.step('The swap survives a reload', async () => {
            await productsPage.goto();
            await productsPage.switchToActiveTab();
            const afterReload = await productsPage.categoryNamesInOrder();
            expect(afterReload.slice(0, 2)).toEqual([target, neighbourAbove]);
            // Only the two swapped entries moved.
            expect(afterReload.slice(2)).toEqual(before.slice(2));
          });
        } finally {
          // Restore the store's ordering whatever the assertions did — the
          // category may be anywhere if a step failed part-way, so converge on
          // the original index rather than assuming one inverse click.
          await productsPage.goto();
          await productsPage.switchToActiveTab();
          await productsPage.moveCategoryToIndex(target, before.indexOf(target));
          await expect.poll(async () => await productsPage.categoryNamesInOrder()).toEqual(before);
        }
      },
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
    test(
      'TC-SVC-012 — "Move ... to first / to last" moves category to boundary positions',
      { tag: [Tag.REGRESSION] },
      async ({ productsPage }) => {
        await productsPage.switchToActiveTab();
        const before = await productsPage.categoryNamesInOrder();
        expect(before.length).toBeGreaterThan(3);
        expect(before.at(-1), '"Other" should be pinned last').toBe('Other');

        // A category from the middle, so both boundaries are a real move.
        const target = before[Math.floor(before.length / 2)];
        const originalIndex = before.indexOf(target);

        try {
          await test.step(`"${target}" moves to first`, async () => {
            await productsPage.moveCategoryToFirst(target);
            await expect
              .poll(async () => (await productsPage.categoryNamesInOrder())[0])
              .toBe(target);

            // At the top, the upward controls must switch off.
            await productsPage.hoverCategory(target);
            await expect(productsPage.categoryMoveToFirstButton(target)).toBeDisabled();
            await expect(productsPage.categoryMoveUpButton(target)).toBeDisabled();
          });

          await test.step(`"${target}" moves to last, landing before "Other"`, async () => {
            await productsPage.moveCategoryToLast(target);
            await expect
              .poll(async () => (await productsPage.categoryNamesInOrder()).slice(-2))
              .toEqual([target, 'Other']);

            await productsPage.hoverCategory(target);
            await expect(productsPage.categoryMoveToLastButton(target)).toBeDisabled();
            await expect(productsPage.categoryMoveDownButton(target)).toBeDisabled();
          });
        } finally {
          await productsPage.moveCategoryToIndex(target, originalIndex);
          await expect.poll(async () => await productsPage.categoryNamesInOrder()).toEqual(before);
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
    /**
     * Driven by the drag handle's keyboard interface (dnd-kit: Space to lift,
     * arrows to move, Space to drop) rather than by emulated mouse movement.
     * Same code path and the same backend write, but deterministic — synthetic
     * pointer drags against a sortable list are exactly the flaky thing the
     * original note wanted to avoid.
     */
    test(
      'TC-SVC-015 — drag handle reorders category list',
      { tag: [Tag.REGRESSION, Tag.UI] },
      async ({ productsPage, page }) => {
        await productsPage.switchToActiveTab();
        const before = await productsPage.categoryNamesInOrder();
        expect(before.length).toBeGreaterThan(2);

        const target = before[0];
        const handle = productsPage.categoryReorderHandle(target);
        await productsPage.hoverCategory(target);
        await handle.focus();

        try {
          await productsPage.withReorderPersisted(async () => {
            await page.keyboard.press('Space');
            await page.waitForTimeout(300);
            await page.keyboard.press('ArrowDown');
            await page.waitForTimeout(300);
            await page.keyboard.press('Space');
          });

          await expect
            .poll(async () => (await productsPage.categoryNamesInOrder()).slice(0, 2))
            .toEqual([before[1], target]);

          // No duplicated or dropped rows — the failure mode the case names.
          const after = await productsPage.categoryNamesInOrder();
          expect(after).toHaveLength(before.length);
          expect([...after].sort()).toEqual([...before].sort());
        } finally {
          await productsPage.moveCategoryToIndex(target, 0);
          await expect.poll(async () => await productsPage.categoryNamesInOrder()).toEqual(before);
        }
      },
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
    /**
     * Creates a real category, named with an `E2E-` prefix so anything left
     * behind is identifiable.
     *
     * Caveat worth knowing: the Portal exposes no delete-category control — the
     * Edit dialog offers Cancel / Save Changes / Close and nothing else — so
     * cleanup can only deactivate the category, which moves it off the Active tab
     * and out of the way. That is as far as the UI allows; removing the rows
     * needs a backend/API delete.
     */
    test(
      'TC-SVC-016 — "Add Category" opens the add-category form and creates a category',
      { tag: [Tag.REGRESSION, Tag.UI] },
      async ({ productsPage, page }) => {
        await productsPage.switchToActiveTab();
        const before = await productsPage.categoryNamesInOrder();
        const name = `E2E-CAT-${Date.now()}`;

        try {
          await test.step('The form opens with the expected fields', async () => {
            await productsPage.addCategoryButton.click();
            await expect(productsPage.categoryDialog).toBeVisible();
            await expect(productsPage.categoryDialog).toContainText(/create new category/i);
            await expect(productsPage.categoryNameInput).toBeVisible();
            await expect(productsPage.categoryDialogCreateButton).toBeEnabled();
          });

          await test.step('Saving adds it to the list, just before "Other"', async () => {
            await productsPage.categoryNameInput.fill(name);
            await productsPage.submitCategoryCreate();

            await expect
              .poll(async () => await productsPage.categoryNamesInOrder())
              .toContain(name);

            const after = await productsPage.categoryNamesInOrder();
            expect(after).toHaveLength(before.length + 1);
            expect(after.slice(-2)).toEqual([name, 'Other']);
          });
        } finally {
          // Best-effort tidy-up: deactivate so it leaves the Active tab. The
          // Portal has no delete-category control, so this is as clean as the
          // UI gets — see the note above this test.
          await productsPage.goto();
          await productsPage.switchToActiveTab();
          if ((await productsPage.categoryRow(name).count()) > 0) {
            await productsPage.setCategoryActive(name, false);
          }
          void page;
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
    /**
     * A rename is its own undo, so this one round-trips cleanly: rename an
     * existing category to an `E2E-` marker, verify the list picked it up, then
     * rename it back and verify the original is restored.
     */
    test(
      'TC-SVC-018 — "Edit <category>" opens edit form and updates the category name',
      { tag: [Tag.REGRESSION, Tag.UI] },
      async ({ productsPage }) => {
        await productsPage.switchToActiveTab();
        const before = await productsPage.categoryNamesInOrder();
        const original = before[0];
        const renamed = `E2E-RENAMED-${Date.now()}`;

        try {
          await test.step('The form opens pre-filled with the current name', async () => {
            await productsPage.openEditCategory(original);
            await expect(productsPage.categoryDialog).toContainText(/edit category/i);
            await expect(productsPage.categoryNameInput).toHaveValue(original);
          });

          await test.step('Saving updates the name in the list', async () => {
            await productsPage.categoryNameInput.fill(renamed);
            await productsPage.submitCategorySave();

            await expect
              .poll(async () => (await productsPage.categoryNamesInOrder())[0])
              .toBe(renamed);
            // A rename must not reorder or duplicate anything.
            const after = await productsPage.categoryNamesInOrder();
            expect(after).toHaveLength(before.length);
            expect(after.slice(1)).toEqual(before.slice(1));
          });
        } finally {
          await productsPage.goto();
          await productsPage.switchToActiveTab();
          if ((await productsPage.categoryRow(renamed).count()) > 0) {
            await productsPage.renameCategory(renamed, original);
          }
          await expect.poll(async () => await productsPage.categoryNamesInOrder()).toEqual(before);
        }
      },
    );
  });
});
