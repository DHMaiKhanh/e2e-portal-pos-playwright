import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import { env } from '@configs/env/loadEnv';
import { expectUnauthenticatedRedirect, expectCrossStoreBlocked } from '@helpers/security';
import { clientSideNavigate, expireSessionResponses, landOnShell } from '@helpers/network';

/**
 * Signed-out cases. `test.use` opts this describe out of the worker-shared
 * authenticated context; the fixture builds a throwaway one instead.
 */
test.describe('Bảo mật & phân quyền (Security/permissions) — Customers (chưa đăng nhập)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  /**
   * TC-CUS-074 — Chuyển hướng người dùng chưa đăng nhập từ /pos/<id>/customers về /login.
   */
  test(
    'TC-CUS-074 — unauthenticated access redirects to /login',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page }) => {
      await expectUnauthenticatedRedirect(page, Urls.CUSTOMERS, [
        page.getByRole('table'),
        page.getByRole('columnheader', { name: /^name$/i }),
      ]);
    },
  );
});

test.describe('Bảo mật & phân quyền (Security/permissions) — Customers', () => {
  /**
   * TC-CUS-075 — Phiên hết hạn giữa chừng chuyển hướng về /login khi thao tác tiếp theo.
   *
   * The real session cannot be invalidated server-side without breaking the
   * snapshot every other spec reuses, so the expiry is injected: the next
   * client-side data fetch is answered 401 and the app must react to it. That is
   * exactly the signal a server-side expiry would produce at the browser.
   *
   * Runs on `isolatedPage` because the app may clear its session cookie on the
   * way to /login, which in the shared context would sign out every later test
   * on this worker.
   */
  test(
    'TC-CUS-075 — mid-session expiry redirects to /login on next action',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ isolatedPage }) => {
      await test.step('Start on an authenticated screen', async () => {
        await landOnShell(isolatedPage, Urls.DASHBOARD);
      });

      await test.step('Session expires, then the user acts', async () => {
        await expireSessionResponses(isolatedPage);

        // The bounce can win the race: the screen's own background refetch may
        // get the injected 401 and navigate away before the click lands. Either
        // path is the behaviour under test, so clientSideNavigate tolerates an
        // interrupted click — the assertion below is what decides.
        await clientSideNavigate(isolatedPage, /^Customers$/i);
      });

      await test.step('Bounced to login, carrying a return path', async () => {
        await expect(isolatedPage).toHaveURL(/\/login/, { timeout: 20_000 });
        await expect(isolatedPage.locator('tbody tr')).toHaveCount(0);
      });
    },
  );

  /**
   * TC-CUS-076 — Chặn truy cập dữ liệu khách hàng khi đổi store id sang store không có quyền.
   */
  test(
    'TC-CUS-076 — switching to an unauthorized store id blocks customer data access',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page }) => {
      await expectCrossStoreBlocked(page, (storeId) => `/pos/${storeId}/customers`);
      await expect(page.getByRole('columnheader', { name: /^name$/i })).toHaveCount(0);
    },
  );

  /**
   * TC-CUS-077 — Chuyển store qua store switcher chỉ giới hạn dữ liệu Customers của store đang chọn.
   *
   * Isolated: the Portal remembers the active merchant, so leaving another store
   * selected would point the rest of this worker's tests at the wrong data.
   */
  test(
    'TC-CUS-077 — switching stores via the store switcher scopes customer data to the new store',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ isolatedPage }) => {
      await landOnShell(isolatedPage, Urls.CUSTOMERS);

      const rowsBefore = await isolatedPage.locator('tbody tr').allInnerTexts();

      await test.step('Pick a different merchant from the switcher', async () => {
        await isolatedPage.getByRole('button', { name: /#\d+$/ }).first().click();

        // The switcher lists every merchant on the account, current one included;
        // take the first entry that is not the store we are already on.
        const otherStore = isolatedPage
          .getByRole('option')
          .or(isolatedPage.getByRole('menuitem'))
          .filter({ hasNotText: `#${env.STORE_ID}` })
          .first();

        await expect(otherStore).toBeVisible();
        await otherStore.click();
      });

      await test.step('URL and data follow the new store', async () => {
        await expect(isolatedPage).not.toHaveURL(new RegExp(`/pos/nail/${env.STORE_ID}/`), {
          timeout: 20_000,
        });
        await expect(isolatedPage).toHaveURL(/\/pos\/nail\/\d+\//);

        // Scoped, not merely re-rendered: the previous store's rows are gone.
        // Poll rather than wait on the network — the new store's rows arrive
        // after their own fetch, and the Portal keeps background traffic going.
        await expect
          .poll(async () => isolatedPage.locator('tbody tr').allInnerTexts(), {
            timeout: 30_000,
          })
          .not.toEqual(rowsBefore);
      });
    },
  );
});
