import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { REPORT_CONFIG_SCREEN_NAMES } from '@pages/report-config/ReportConfigPage';

test.describe('Hiệu năng (Performance) — Report Configuration', () => {
  /**
   * TC-RCF-150 — Mỗi màn hình hiển thị dữ liệu trong 10 giây
   */
  test(
    'TC-RCF-150 — each screen shows its first rows within 10 s',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ reportConfigPage, page }) => {
      const timings: string[] = [];
      for (const screen of REPORT_CONFIG_SCREEN_NAMES) {
        const rc = reportConfigPage.on(screen);
        const t0 = Date.now();
        await page.goto(rc.pathname, { waitUntil: 'domcontentloaded' });
        await expect(rc.table.rows.first()).toBeVisible({ timeout: 10_000 });
        timings.push(`${screen}=${Date.now() - t0}ms`);
      }
      test.info().annotations.push({ type: 'timing', description: timings.join(', ') });
    },
  );

  /**
   * TC-RCF-151 — Pages/Blocks tải trọn một lần itemsPerPage=100 (rủi ro cắt cụt >100)
   */
  test(
    'TC-RCF-151 — Pages/Blocks fetch a single itemsPerPage=100 page; totals must stay ≤ 100 (truncation risk)',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ reportConfigPage, page }) => {
      for (const screen of ['pages', 'blocks'] as const) {
        const rc = reportConfigPage.on(screen);
        const req = page.waitForRequest((r) => rc.spec.listEndpoint.test(r.url()));
        await page.goto(rc.pathname, { waitUntil: 'domcontentloaded' });
        expect((await req).url()).toContain('itemsPerPage=100');
        await rc.waitForReady();
        const total = await rc.totalResults();
        expect(total, `${screen} total`).toBeLessThanOrEqual(100);
        if (total >= 80) {
          test.info().annotations.push({
            type: 'risk',
            description: `${screen}: ${total}/100 — the list is fetched as one 100-item page; record #101 would silently disappear`,
          });
        }
      }
    },
  );
});
