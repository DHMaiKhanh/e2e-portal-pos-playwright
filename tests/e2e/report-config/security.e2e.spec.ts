import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { expectCrossStoreBlocked, expectUnauthenticatedRedirect } from '@helpers/security';
import { expireSessionResponses, restoreNetwork } from '@helpers/network';
import {
  REPORT_CONFIG_SCREEN_NAMES,
  REPORT_CONFIG_SCREENS,
  ReportConfigPage,
} from '@pages/report-config/ReportConfigPage';
import { env } from '@configs/env/loadEnv';

test.describe('Bảo mật (Security) — Report Configuration (chưa đăng nhập)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  /**
   * TC-RCF-160 — Chưa đăng nhập → /login, không lộ cấu hình
   */
  test(
    'TC-RCF-160 — signed-out visitors are bounced to /login on all four screens with no table',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ page }) => {
      for (const screen of REPORT_CONFIG_SCREEN_NAMES) {
        // Under a parallel run the server-side bounce can exceed the helper's
        // default 10 s expect timeout, so wait for it explicitly first.
        // Starting from /login (2nd screen on), Chromium intermittently reports the
        // bounced navigation as ERR_ABORTED — the redirect still happens, so
        // tolerate that one error and assert on where the page ends up.
        await page
          .goto(REPORT_CONFIG_SCREENS[screen].path, { waitUntil: 'domcontentloaded' })
          .catch((e: Error) => {
            if (!/ERR_ABORTED/.test(e.message)) throw e;
          });
        await page.waitForURL(/\/login/, { timeout: 30_000 });
        await expectUnauthenticatedRedirect(page, REPORT_CONFIG_SCREENS[screen].path, [
          page.getByRole('table'),
          page.locator('tbody tr'),
        ]);
      }
    },
  );
});

test.describe('Bảo mật (Security) — Report Configuration', () => {
  /**
   * TC-RCF-161 — Session hết hạn (401) khi tải lại danh sách
   */
  test(
    'TC-RCF-161 — a 401 on the list refetch is handled without a retry storm or stale rows',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ isolatedPage }) => {
      const rc = new ReportConfigPage(isolatedPage, 'sources');
      await rc.goto();
      const hits: string[] = [];
      isolatedPage.on('request', (r) => {
        if (rc.spec.listEndpoint.test(r.url())) hits.push(r.url());
      });
      await expireSessionResponses(isolatedPage, rc.spec.listEndpoint);
      await rc.searchInput.fill('Staff');
      await isolatedPage.waitForTimeout(8_000);
      expect(hits.length, `list hit ${hits.length}x after 401`).toBeLessThan(15);
      const onLogin = /\/login/.test(isolatedPage.url());
      const rows = onLogin ? 0 : await rc.table.rows.count();
      test.info().annotations.push({
        type: 'behaviour',
        description: `401 → ${onLogin ? 'redirected to /login' : `stayed with ${rows} row(s)`}`,
      });
      expect(onLogin || rows === 0).toBe(true);
      await restoreNetwork(isolatedPage);
    },
  );

  /**
   * TC-RCF-162 — Store không thuộc tài khoản
   */
  test(
    'TC-RCF-162 — a store outside the account shows "This merchant is not available." and no rows',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page }) => {
      await expectCrossStoreBlocked(
        page,
        (id) => `/pos/${env.POS_SEGMENT}/${id}/report-config/pages`,
      );
    },
  );

  /**
   * TC-RCF-164 — Mở/đóng mọi dialog không phát sinh request ghi nào
   */
  test(
    'TC-RCF-164 — opening and cancelling every dialog on Pages and Blocks issues zero write requests',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.CRITICAL] },
    async ({ reportConfigPage, page }) => {
      const writes: string[] = [];
      page.on('request', (r) => {
        if (/volt-pos\./.test(r.url()) && !['GET', 'HEAD', 'OPTIONS'].includes(r.method()))
          writes.push(`${r.method()} ${r.url()}`);
      });
      const blocked = await reportConfigPage.guardWrites();
      const pages = reportConfigPage;
      await pages.goto();
      await pages.openAdd();
      await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
      // One Cancel click must close the untouched form (defect D11).
      await expect(page.getByRole('dialog')).toHaveCount(0);
      for (const a of ['Edit', 'Clone']) {
        await pages.clickRowAction(a, 0);
        await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
        await expect(page.getByRole('dialog')).toHaveCount(0);
      }
      await pages.clickRowAction('Delete', 0);
      await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();

      const blocks = reportConfigPage.on('blocks');
      // Every DEV block is a system block (Delete disabled) — unlock the first row.
      await blocks.unlockSystemRows();
      await blocks.goto();
      await blocks.openAdd();
      await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await blocks.clickRowAction('Clone', 0);
      await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
      await blocks.clickRowAction('Delete', 0);
      await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();

      expect(writes).toEqual([]);
      expect(blocked).toEqual([]);
    },
  );
});
