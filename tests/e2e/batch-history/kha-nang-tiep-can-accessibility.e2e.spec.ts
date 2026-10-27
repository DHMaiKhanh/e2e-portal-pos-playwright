import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Khả năng tiếp cận (Accessibility) — Batch History', () => {
  test.beforeEach(async ({ batchHistoryPage }) => {
    await batchHistoryPage.goto();
  });

  test(
    'TC-BH-048 — toàn bộ màn hình duyệt tuần tự bằng Tab',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage, page }) => {
      await batchHistoryPage.gotoAllTime();

      await expect(batchHistoryPage.dateRangeButton).toBeVisible();
      await expect(batchHistoryPage.statusFilter).toBeVisible();

      // Start at the filter bar and walk forward with Tab only: focus must
      // reach the status chip and then the enabled "Next page" button, in
      // reading order, without getting stuck.
      await batchHistoryPage.dateRangeButton.focus();
      await expect(batchHistoryPage.dateRangeButton).toBeFocused();

      const visited: string[] = [];
      for (let i = 0; i < 80; i++) {
        await page.keyboard.press('Tab');
        const name = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          return el ? (el.getAttribute('aria-label') ?? el.innerText ?? el.tagName).trim() : '';
        });
        visited.push(name);
        if (/^next page$/i.test(name)) break;
      }

      const statusIndex = visited.findIndex((name) => /^status$/i.test(name));
      const nextIndex = visited.findIndex((name) => /^next page$/i.test(name));
      expect(
        statusIndex,
        `Tab never reached the status filter: ${visited.join(' > ')}`,
      ).toBeGreaterThanOrEqual(0);
      expect(nextIndex, `Tab never reached "Next page": ${visited.join(' > ')}`).toBeGreaterThan(
        statusIndex,
      );
      await expect(batchHistoryPage.nextPageButton).toBeFocused();
    },
  );

  test(
    'TC-BH-049 — date picker và status filter thao tác được bằng bàn phím',
    {
      tag: [Tag.REGRESSION, Tag.UI],
    },
    async ({ batchHistoryPage, page }) => {
      await test.step('Date picker opens and closes from the keyboard', async () => {
        await batchHistoryPage.dateRangeButton.focus();
        await expect(batchHistoryPage.dateRangeButton).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(batchHistoryPage.dateRangePicker).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(batchHistoryPage.dateRangePicker).toBeHidden();
      });

      await test.step('Status filter is chosen with keyboard only', async () => {
        await batchHistoryPage.statusFilter.focus();
        await expect(batchHistoryPage.statusFilter).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(batchHistoryPage.statusOption('Open')).toBeVisible();
        // Highlight "Open" with the arrow keys, then confirm with Enter.
        for (let i = 0; i < 3; i++) {
          if (
            (await batchHistoryPage.statusOption('Open').getAttribute('data-selected')) === 'true'
          )
            break;
          await page.keyboard.press('ArrowDown');
        }
        await page.keyboard.press('Enter');
        await expect.poll(() => batchHistoryPage.currentQueryParams().get('status')).toBe('open');
        await expect(batchHistoryPage.statusFilter).toHaveAccessibleName(/status: open/i);
      });
    },
  );

  test(
    'TC-BH-050 — nút phân trang thao tác được bằng bàn phím',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage, page }) => {
      // All-time spans several pages, so both buttons get exercised.
      await batchHistoryPage.gotoAllTime();
      await expect(batchHistoryPage.pageIndicator).toHaveText(/^\s*1\s*\/\s*[2-9]/);
      await expect(batchHistoryPage.previousPageButton).toBeDisabled();

      await batchHistoryPage.nextPageButton.focus();
      await expect(batchHistoryPage.nextPageButton).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(batchHistoryPage.pageIndicator).toHaveText(/^\s*2\s*\//);

      await batchHistoryPage.previousPageButton.focus();
      await expect(batchHistoryPage.previousPageButton).toBeFocused();
      await page.keyboard.press('Space');
      await expect(batchHistoryPage.pageIndicator).toHaveText(/^\s*1\s*\//);
    },
  );

  /**
   * Steps:
   * 1. Kiểm tra badge "Open" vs "Closed" với công cụ giả lập mù màu hoặc bỏ style màu.
   * Expected:
   * Trạng thái vẫn phân biệt được qua nhãn text, không chỉ dựa vào màu badge.
   */
  /**
   * "Needs a colour-blindness simulator" overstates what the criterion asks.
   * The requirement (WCAG 1.4.1) is that colour is not the *only* carrier of the
   * information — which is a DOM question, not a rendering one: does the badge
   * also say "Open"/"Closed" in text a screen reader and a colour-blind user can
   * both get at? That is exactly what this asserts, and it additionally proves
   * the two states differ by more than their palette by stripping colour.
   */
  test(
    'TC-BH-051 — badge trạng thái không chỉ dựa vào màu sắc để phân biệt',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await batchHistoryPage.gotoAllTime();

      const badges = batchHistoryPage.statusBadges;
      const count = await badges.count();
      expect(count).toBeGreaterThan(0);

      const labels = new Set<string>();
      for (let index = 0; index < count; index++) {
        const badge = badges.nth(index);
        const text = (await badge.innerText()).trim();

        // Text content, not just a coloured pill.
        expect(text, 'status badge renders no text').toMatch(/^(Open|Closed)$/);
        // The label is real text (read aloud as-is); the coloured dot is decorative.
        await expect(badge.locator('[data-slot="pos-status-pill-label"]')).toHaveText(text);
        await expect(badge.locator('[data-slot="pos-status-pill-dot"]')).toHaveAttribute(
          'aria-hidden',
          'true',
        );
        labels.add(text);
      }

      await test.step('States stay distinguishable with all colour removed', async () => {
        await batchHistoryPage.page.emulateMedia({ forcedColors: 'active' });
        const monochrome = await badges.allInnerTexts();
        expect(new Set(monochrome.map((t) => t.trim()))).toEqual(labels);
        await batchHistoryPage.page.emulateMedia({ forcedColors: null });
      });
    },
  );
});
