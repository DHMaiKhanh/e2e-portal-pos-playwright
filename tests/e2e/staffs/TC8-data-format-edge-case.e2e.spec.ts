import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Định dạng dữ liệu & trạng thái biên (Data / Edge) — Staffs', () => {
  test.beforeEach(async ({ staffsPage }) => {
    await staffsPage.goto();
  });

  test(
    'TC-STF-090 — JOINED AT date format consistent across rows',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage }) => {
      await staffsPage.waitForReady();
      const dateFormat = /^[A-Z][a-z]{2} \d{1,2}, \d{4} \(UTC[+-]\d+\)$/;
      const rows = staffsPage.table.rows;
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);

      const joinedAtHeader = staffsPage.columnHeader(/joined at/i);
      await expect(joinedAtHeader).toBeVisible();

      const sampleSize = Math.min(count, 10);
      for (let i = 0; i < sampleSize; i++) {
        const row = rows.nth(i);
        const text = (await row.textContent()) ?? '';
        const match =
          text.match(dateFormat) || text.match(/[A-Z][a-z]{2} \d{1,2}, \d{4} \(UTC[+-]\d+\)/);
        expect(
          match,
          `Row ${i} did not contain a JOINED AT value in the expected format: ${text}`,
        ).toBeTruthy();
      }
    },
  );

  test(
    'TC-STF-091 — Status badge colors differ Active vs Inactive',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      await staffsPage.waitForReady();
      const activeBadge = page.getByText(/^active$/i).first();
      const inactiveBadge = page.getByText(/^inactive$/i).first();

      await expect(activeBadge).toBeVisible();

      const activeColor = await activeBadge.evaluate((el) => getComputedStyle(el).backgroundColor);

      if (await inactiveBadge.isVisible().catch(() => false)) {
        const inactiveColor = await inactiveBadge.evaluate(
          (el) => getComputedStyle(el).backgroundColor,
        );
        expect(inactiveColor).not.toBe(activeColor);
      }
    },
  );

  /**
   * Steps:
   * 1. Quan sát cột STAFF, hover vào tên bị cắt (nếu có).
   * Expected:
   * Văn bản dài hiển thị cắt gọn không vỡ layout dòng bảng; tooltip (nếu có) hiển thị đầy đủ tên khi hover.
   */
  // TODO(manual/setup): requires a staff row with a very long name (e.g. "E2E Comm Deduct" or longer) and hover-triggered
  // tooltip verification, which is data-dependent on a specific store record and not reliably assertable from static DOM.
  test.fixme(
    'TC-STF-092 — long staff name truncated with ellipsis, tooltip shows full name',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * Steps:
   * (none specified)
   * Expected:
   * Hiển thị empty-state rõ ràng thay vì bảng chỉ có header, không có lỗi phân trang (`0 to 0 of 0`).
   */
  // TODO(manual/setup): requires a store with zero staff records; current test store has 196 records and cannot be
  // reset/seeded to an empty state from this suite.
  test.fixme(
    'TC-STF-093 — empty state when store has no staff',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );
});
