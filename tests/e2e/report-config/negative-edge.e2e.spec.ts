import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { failDataResponses } from '@helpers/network';

/**
 * List fetches are client-side XHRs even on a full `goto` (verified 2026-10-13),
 * so error injection works without a sidebar click.
 */
const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

test.describe('Tiêu cực & biên (Negative / Edge) — Report Configuration', () => {
  /**
   * TC-RCF-120 — API danh sách lỗi 500 → báo lỗi + "Try again" (defect D6 đã sửa)
   * D6 (2026-10-13: a 500 rendered "No report columns found.") is fixed as of
   * 2026-10-26 — the empty-state slot now carries an error title and a retry.
   */
  test(
    'TC-RCF-120 — a 500 from the list API shows a load error with Try again, not the empty state (D6 fixed)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('columns');
      const pageErrors: string[] = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));
      await failDataResponses(page, 500, rc.spec.listEndpoint);
      await page.goto(rc.pathname, { waitUntil: 'domcontentloaded' });
      // The client retries before giving up, hence the long timeout.
      await expect(rc.emptyState).toHaveText("Couldn't load report columns", { timeout: 30_000 });
      await expect(page.getByText(rc.spec.emptyText)).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
      await expect(rc.table.rows).toHaveCount(0);
      expect(pageErrors).toEqual([]);
    },
  );

  /**
   * TC-RCF-121 — ID không tồn tại trên route chi tiết (defect D7 đã sửa)
   * D7 (2026-10-13: Pages/Blocks rendered a blank body, Sources the raw axios
   * text "Request failed with status code 404") is fixed as of 2026-10-26.
   */
  test(
    'TC-RCF-121 — unknown record ids show a not-found message on every detail route (D7 fixed)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      for (const screen of ['sources', 'blocks', 'columns'] as const) {
        const rc = reportConfigPage.on(screen);
        await page.goto(`${rc.pathname}/${ZERO_UUID}`, { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('This item no longer exists'), screen).toBeVisible({
          timeout: 30_000,
        });
        await expect(page.getByText('Request failed with status code 404')).toHaveCount(0);
      }

      await page.goto(`${reportConfigPage.pathname}/${ZERO_UUID}`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(page).toHaveTitle('Page builder | Portal');
      await expect(page.getByText('This page could not be loaded')).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Page filters' })).toHaveCount(0);
    },
  );

  /**
   * TC-RCF-122 — Chuỗi tìm kiếm rất dài
   */
  test(
    'TC-RCF-122 — a 300-character search term is accepted and returns the empty state',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      for (const screen of ['pages', 'sources'] as const) {
        const rc = reportConfigPage.on(screen);
        await rc.goto();
        const term = 'x'.repeat(300);
        await rc.search(term);
        await expect(rc.searchInput).toHaveValue(term);
        await expect(rc.emptyState).toBeVisible();
      }
      expect(errors).toEqual([]);
    },
  );

  /**
   * TC-RCF-123 — HTML / ký tự đặc biệt trong ô tìm kiếm không được thực thi
   */
  test(
    'TC-RCF-123 — HTML and quote characters in search are treated as text, never executed',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const payload = `<img src=x onerror="window.__rcfXss=1">' OR 1=1 --`;
      for (const screen of ['pages', 'columns'] as const) {
        const rc = reportConfigPage.on(screen);
        await rc.goto();
        await rc.search(payload);
        await expect(rc.searchInput).toHaveValue(payload);
        await expect(rc.emptyState).toBeVisible();
        expect(
          await page.evaluate(() => (window as unknown as { __rcfXss?: number }).__rcfXss),
        ).toBeUndefined();
        await page.reload({ waitUntil: 'domcontentloaded' });
        await rc.waitForReady();
        await expect(rc.searchInput).toHaveValue(payload);
        expect(
          await page.evaluate(() => (window as unknown as { __rcfXss?: number }).__rcfXss),
        ).toBeUndefined();
      }
    },
  );
});
