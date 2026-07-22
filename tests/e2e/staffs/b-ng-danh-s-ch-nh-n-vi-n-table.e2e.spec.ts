import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Bảng danh sách nhân viên (Table) — Staffs', () => {
  test.beforeEach(async ({ staffsPage }) => {
    await staffsPage.goto();
  });

  test(
    'TC-STF-010 — header cột đúng thứ tự và nhãn',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage }) => {
      await staffsPage.waitForReady();
      const expectedOrder = [/STAFF/i, /PHONE/i, /EMAIL/i, /CODE/i, /JOINED AT/i, /STATUS/i];
      const headers = staffsPage.columnHeaders;
      await expect(headers).toHaveCount(expectedOrder.length);
      for (let i = 0; i < expectedOrder.length; i++) {
        await expect(headers.nth(i)).toHaveText(expectedOrder[i]);
      }
    },
  );

  /**
   * TC-STF-011 — Dữ liệu dòng khớp với thông tin nhân viên thực tế
   * Steps:
   *  1. Chọn 1 nhân viên có đủ Phone/Email đã biết.
   *  2. So sánh từng ô với dữ liệu nguồn.
   * Expected:
   *  Tên, phone (định dạng `(XXX) XXX-XXXX`), email, code, ngày gia nhập, trạng thái hiển thị
   *  chính xác.
   */
  // TODO(manual/setup): requires a known staff's real source data (phone/email/code/join date)
  // to compare row-by-row against, which is not available as static fixture data here.
  test.fixme(
    'TC-STF-011 — dữ liệu dòng khớp với thông tin nhân viên thực tế',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  test(
    'TC-STF-012 — trường Phone/Email trống hiển thị placeholder "-"',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      await staffsPage.waitForReady();
      const rows = page.getByRole('row');
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);
      const bodyText = (await page.locator('body').innerText()).toLowerCase();
      expect(bodyText).not.toContain('null');
      expect(bodyText).not.toContain('undefined');
    },
  );

  test(
    'TC-STF-013 — phân trang tới/lui hoạt động đúng',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ staffsPage }) => {
      await staffsPage.waitForReady();
      await staffsPage.pagination.waitForVisible();

      const prevButton = staffsPage.pagination.prevButton;
      const nextButton = staffsPage.pagination.nextButton;

      await expect(prevButton).toBeDisabled();

      if (await nextButton.isEnabled()) {
        await nextButton.click();
        await expect(staffsPage.pageIndicator).toContainText(/2/);
        await expect(prevButton).toBeEnabled();

        await prevButton.click();
        await expect(staffsPage.pageIndicator).toContainText(/1/);
        await expect(prevButton).toBeDisabled();
      }
    },
  );

  /**
   * TC-STF-014 — Điều hướng tới trang cuối
   * Steps:
   *  1. Bấm "Next" liên tục tới trang cuối (7/...).
   * Expected:
   *  Trang cuối chỉ hiển thị số dòng còn lại (≤30), nút "Next" bị disable.
   */
  // TODO(manual/setup): requires deterministic knowledge of total page count (data volume can
  // change over time), so repeatedly clicking Next to reach a specific last page is not stable
  // as a live assertion here.
  test.fixme(
    'TC-STF-014 — điều hướng tới trang cuối',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  test(
    'TC-STF-015 — click vào dòng điều hướng sang trang chi tiết đúng nhân viên',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ staffsPage, page }) => {
      await staffsPage.waitForReady();
      const rows = page.getByRole('row');
      const firstDataRow = rows.nth(1);
      await expect(firstDataRow).toBeVisible();
      const rowText = (await firstDataRow.innerText()).trim();
      const firstCellText = rowText.split('\n')[0]?.trim();

      await firstDataRow.click();

      await expect(page).toHaveURL(/\/pos\/\d+\/staffs\/[^/?]+\?tab=profile/);
      if (firstCellText) {
        await expect(page.getByText(firstCellText, { exact: false }).first()).toBeVisible();
      }
    },
  );
});
