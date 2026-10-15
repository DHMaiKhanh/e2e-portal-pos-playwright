import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { ReportPageSlug, Urls, posStoreBase, reportPageUrl } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import { expectCrossStoreBlocked, expectUnauthenticatedRedirect } from '@helpers/security';
import { clientSideNavigate, expireSessionResponses, landOnShell } from '@helpers/network';
import { RPT_DATA_PAGES } from '@pages/reports/ReportPagesPage';

/**
 * Reports — hiệu năng (TC-RPT-101 … 102) & bảo mật (TC-RPT-103 … 105).
 * Ngưỡng hiệu năng là ngưỡng DEV (server dùng chung), không phải SLA production.
 */
const LOAD_BUDGET_MS = 20_000;
const SORT_BUDGET_MS = 5_000;

test.describe('Reports — performance', () => {
  test(
    'TC-RPT-101 — every data report shows its data within the DEV budget',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ reportPagesPage: rp }) => {
      test.setTimeout(200_000);
      for (const spec of RPT_DATA_PAGES) {
        const t0 = Date.now();
        await rp.openWithData(spec.slug);
        const ms = Date.now() - t0;
        test.info().annotations.push({ type: 'load-ms', description: `${spec.slug}: ${ms}` });
        expect(ms, spec.slug).toBeLessThan(LOAD_BUDGET_MS);
      }
    },
  );

  test(
    'TC-RPT-102 — a sort click re-renders the table within 5s',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ reportPagesPage: rp }) => {
      await rp.openWithData(ReportPageSlug.STAFF_PAYROLL);
      const t0 = Date.now();
      await rp.clickSort('Orders');
      await rp.waitForData();
      expect(Date.now() - t0).toBeLessThan(SORT_BUDGET_MS);
    },
  );
});

test.describe('Reports — security (signed out)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test(
    'TC-RPT-103 — a signed-out deep link redirects to /login with a redirect back',
    { tag: [Tag.REGRESSION, Tag.AUTH] },
    async ({ page }) => {
      const path = reportPageUrl(ReportPageSlug.STAFF_INCOME);
      await expectUnauthenticatedRedirect(page, path, [page.locator('tbody tr')]);
      await expect(page).toHaveURL(new RegExp(`redirect=${encodeURIComponent(path).replace(/%2F/g, '%2F')}`), {
        timeout: Timeouts.LONG,
      });
    },
  );
});

test.describe('Reports — security (signed in)', () => {
  test(
    "TC-RPT-104 — another merchant's store id is refused with no report rows",
    { tag: [Tag.REGRESSION, Tag.AUTH] },
    async ({ page }) => {
      await expectCrossStoreBlocked(page, (id) =>
        reportPageUrl(ReportPageSlug.DAILY_SALE, posStoreBase.replace(/\/\d+$/, `/${id}`)),
      );
    },
  );

  test(
    'TC-RPT-105 — a session that expires mid-flow sends the user to /login',
    { tag: [Tag.REGRESSION, Tag.AUTH] },
    async ({ page }) => {
      await landOnShell(page, Urls.DASHBOARD);
      await page.getByRole('button', { name: 'Reports', exact: true }).click();
      await expireSessionResponses(page);
      await clientSideNavigate(page, /^Staff Income$/);
      await expect(page).toHaveURL(/\/login/, { timeout: Timeouts.LONG });
    },
  );
});
