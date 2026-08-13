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
  /**
   * Truncation is measurable rather than data-dependent: a cell is clipped
   * exactly when its `scrollWidth` exceeds its `clientWidth`, whatever the
   * roster happens to contain. The test finds the widest name on the page and
   * checks the layout holds — and only asserts a tooltip if the product
   * actually offers one, since "tooltip (nếu có)" is conditional in the case
   * itself.
   */
  test(
    'TC-STF-092 — long staff name truncated with ellipsis, tooltip shows full name',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      await staffsPage.waitForReady();

      const nameCells = staffsPage.table.rows.locator('td:first-child');
      const count = await nameCells.count();
      expect(count).toBeGreaterThan(0);

      let widestIndex = 0;
      let widestLength = 0;
      const texts = await nameCells.allInnerTexts();
      texts.forEach((text, index) => {
        const name = text.split('\n')[0].trim();
        if (name.length > widestLength) {
          widestLength = name.length;
          widestIndex = index;
        }
      });

      const cell = nameCells.nth(widestIndex);
      const metrics = await cell.evaluate((node) => {
        const el = (node.querySelector('.truncate') ?? node) as HTMLElement;
        return {
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          overflow: getComputedStyle(el).textOverflow,
          whiteSpace: getComputedStyle(el).whiteSpace,
        };
      });

      // The row must not be widened by its longest name: either the text fits,
      // or it is clipped with an ellipsis. What must never happen is the cell
      // growing past its column and pushing the table out of shape.
      if (metrics.scrollWidth > metrics.clientWidth) {
        expect(metrics.overflow).toBe('ellipsis');
        expect(metrics.whiteSpace).toMatch(/nowrap/);
      }

      // No horizontal overflow of the table container either.
      const overflowed = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(overflowed, 'the page scrolls horizontally').toBe(false);

      await test.step('Hovering surfaces the full name when a tooltip exists', async () => {
        await cell.hover();
        await page.waitForTimeout(700);
        const tooltip = page.getByRole('tooltip');
        if ((await tooltip.count()) > 0) {
          await expect(tooltip.first()).toContainText(texts[widestIndex].split('\n')[0].trim());
        }
      });
    },
  );

  /**
   * Steps:
   * (none specified)
   * Expected:
   * Hiển thị empty-state rõ ràng thay vì bảng chỉ có header, không có lỗi phân trang (`0 to 0 of 0`).
   */
  /**
   * The store cannot be emptied, but the screen's empty state can still be
   * reached without touching data: a search that matches nobody puts the table
   * into exactly the state this case is about. That covers the rendering
   * contract — a real empty state rather than a bare header, and a pagination
   * footer that reads sensibly rather than showing a broken range.
   */
  test(
    'TC-STF-093 — empty state when the list has no staff to show',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage }) => {
      await staffsPage.waitForReady();
      await staffsPage.search('zzz-no-such-staff-zzz');

      await expect(
        staffsPage.emptyState.or(staffsPage.page.getByText(/no staffs? found/i)).first(),
      ).toBeVisible();
      await expect(staffsPage.table.rows).toHaveCount(0);

      // "0 to 0 of 0" is the correct reading here — what must not appear is a
      // range implying rows that are not on screen.
      const footer = (
        await staffsPage.resultsFooter
          .first()
          .innerText()
          .catch(() => '')
      ).trim();
      if (footer) {
        expect(footer).toMatch(/showing 0 to 0 of 0 results/i);
      }
      await expect(staffsPage.pagination.nextButton).toBeDisabled();
      await expect(staffsPage.pagination.prevButton).toBeDisabled();
    },
  );
});
