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
   * TC-RCF-120 — API danh sách lỗi 500 → hiện "không có dữ liệu" thay vì báo lỗi (defect D6)
   */
  test(
    'TC-RCF-120 — a 500 from the list API renders the empty state with no error message (defect D6)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('columns');
      const pageErrors: string[] = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));
      await failDataResponses(page, 500, rc.spec.listEndpoint);
      await page.goto(rc.pathname, { waitUntil: 'domcontentloaded' });
      await expect(rc.emptyState).toHaveText(rc.spec.emptyText, { timeout: 30_000 });
      await expect(rc.table.rows).toHaveCount(0);
      const errorShown = await page.getByText(/error|failed|try again|retry/i).count();
      if (errorShown === 0) {
        test.info().annotations.push({
          type: 'defect',
          description:
            'D6: list API 500 is shown as "No report columns found." — indistinguishable from a genuinely empty list, no Retry',
        });
      }
      expect(pageErrors).toEqual([]);
    },
  );

  /**
   * TC-RCF-121 — ID không tồn tại trên route chi tiết (defect D7)
   */
  test(
    'TC-RCF-121 — unknown record ids: Sources shows a raw 404 error with Retry; Pages builder renders blank (defect D7)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const sources = reportConfigPage.on('sources');
      await page.goto(`${sources.pathname}/${ZERO_UUID}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('Request failed with status code 404')).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();

      await page.goto(`${reportConfigPage.pathname}/${ZERO_UUID}`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(page).toHaveTitle('Page Builder | Portal');
      await page.waitForTimeout(6_000);
      const builderControls = page.getByRole('button', { name: 'Page filters' });
      const notFound = await page.getByText(/not found|404|error/i).count();
      await expect(builderControls).toHaveCount(0);
      if (notFound === 0) {
        test.info().annotations.push({
          type: 'defect',
          description:
            'D7: /report-config/pages/<unknown-id> (and /blocks/<unknown-id>) render an empty body — no not-found message; Sources shows the raw axios text "Request failed with status code 404"',
        });
      }
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
