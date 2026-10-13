import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Internal-group sidebar links, as served on 2026-10-10.
 *
 * Navigation goes by href, not by name: labels repeat across groups and "Orders"
 * (store) sits next to "All Orders" (admin). The Internal group was restructured
 * since 2026-08-18 — every target now lives under the vertical segment at
 * `/pos/nail/admin/<name>` (merchant is singular), and the former Monitor /
 * Versions / Settings links are gone, replaced by the "System" and
 * "Users & Roles" buttons (submenus, not links — see SYSTEM/USERS buttons below).
 */
const INTERNAL_ITEMS = [
  { label: 'Merchants', href: '/pos/nail/admin/merchant' },
  { label: 'Onboarding', href: '/pos/nail/admin/onboarding' },
  { label: 'Packages', href: '/pos/nail/admin/packages' },
  { label: 'All Orders', href: '/pos/nail/admin/orders' },
  { label: 'Devices', href: '/pos/nail/admin/devices' },
] as const;

/** Internal-group entries that are now buttons (submenu triggers), not links. */
const INTERNAL_BUTTONS = ['System', 'Users & Roles'] as const;

test.describe('Điều hướng & sidebar (Navigation) — Merchants', () => {
  /**
   * TC-MCH-010 — Vào Merchants từ sidebar nhóm "Internal"
   * Steps:
   *  1. Click "Merchants" trong nhóm "Internal" ở sidebar.
   *  2. Quan sát URL và nội dung.
   * Expected:
   *  Điều hướng tới `/pos/merchants`, tiêu đề "Merchant Management" hiển thị.
   */
  test(
    'TC-MCH-010 — reaches Merchants from the Internal sidebar group',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, merchantsPage, page }) => {
      await dashboardPage.goto();
      await merchantsPage.sidebar.navigateToHref(/^\/pos\/nail\/admin\/merchant$/);

      await expect(page).toHaveURL(/\/pos\/nail\/admin\/merchant/);
      await merchantsPage.waitForReady();
      await expect(merchantsPage.pageTitle).toBeVisible();
    },
  );

  /**
   * TC-MCH-011 — Mục "Merchants" được highlight là active
   * Steps:
   *  1. Đang ở trang Merchants, quan sát sidebar.
   * Expected:
   *  Mục "Merchants" có style active; các mục khác trong Internal không active.
   *
   * The visual highlight is backed by `aria-current="page"` plus
   * `data-active="true"` on the link (verified 2026-08-18), which is what this
   * asserts — a background-colour check would be brittle and says less.
   */
  test(
    'TC-MCH-011 — the Merchants item is the only active Internal item',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      await merchantsPage.goto();
      await merchantsPage.waitForReady();

      const merchantsLink = page.locator('a[href="/pos/nail/admin/merchant"]').first();
      await expect(merchantsLink).toHaveAttribute('aria-current', 'page');
      await expect(merchantsLink).toHaveAttribute('data-active', 'true');

      for (const item of INTERNAL_ITEMS.filter((i) => i.href !== '/pos/nail/admin/merchant')) {
        const link = page.locator(`a[href="${item.href}"]`).first();
        await expect(link, `${item.label} must not be active`).not.toHaveAttribute(
          'aria-current',
          'page',
        );
      }
    },
  );

  /**
   * TC-MCH-012 — Sidebar hiển thị đủ 3 nhóm và các mục
   * Steps:
   *  1. Quan sát toàn bộ sidebar.
   * Expected:
   *  Có 3 nhãn nhóm "Operations", "Management", "Internal"; nhóm Internal chứa
   *  5 link (Merchants, Onboarding, Packages, All Orders, Devices) cùng 2 nút
   *  submenu (System, Users & Roles). Monitor/Versions/Settings đã bị bỏ.
   */
  test(
    'TC-MCH-012 — sidebar shows the three groups, five Internal links and the submenu buttons',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      await merchantsPage.goto();
      await merchantsPage.waitForReady();

      for (const group of ['Operations', 'Management', 'Internal']) {
        await expect(page.getByText(group, { exact: true }).first()).toBeVisible();
      }

      for (const item of INTERNAL_ITEMS) {
        const link = page.locator(`a[href="${item.href}"]`).first();
        await expect(link, `${item.label} → ${item.href}`).toBeVisible();
        await expect(link).toContainText(item.label);
      }

      for (const label of INTERNAL_BUTTONS) {
        await expect(
          page.getByRole('button', { name: label, exact: true }).first(),
          `${label} submenu button`,
        ).toBeVisible();
      }
    },
  );

  /**
   * TC-MCH-013 — Điều hướng qua màn hình Internal khác rồi quay lại
   * Steps:
   *  1. Từ Merchants click "Packages".
   *  2. Click lại "Merchants".
   * Expected:
   *  Cả hai lần điều hướng đều thành công, không lỗi; trang Merchants tải lại
   *  dữ liệu đúng, không giữ state rác của màn hình trước.
   */
  test(
    'TC-MCH-013 — round trip to another Internal screen and back reloads the list cleanly',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await merchantsPage.goto();
      await merchantsPage.waitForReady();
      const rowsBefore = await merchantsPage.table.rows.count();

      await merchantsPage.sidebar.navigateToHref(/^\/pos\/nail\/admin\/packages$/);
      await expect(page).toHaveURL(/\/pos\/nail\/admin\/packages/);

      await merchantsPage.sidebar.navigateToHref(/^\/pos\/nail\/admin\/merchant$/);
      await expect(page).toHaveURL(/\/pos\/nail\/admin\/merchant/);
      await merchantsPage.waitForReady();

      await expect(merchantsPage.pageTitle).toBeVisible();
      await expect(merchantsPage.table.rows).toHaveCount(rowsBefore);
      // No state carried over from Packages: filters back at their defaults.
      await expect(merchantsPage.searchInput).toHaveValue('');
      await expect(merchantsPage.statusFilter).toHaveText(/all statuses/i);
      expect(pageErrors).toEqual([]);
    },
  );

  /**
   * TC-MCH-014 — Nút Back/Forward của trình duyệt
   * Steps:
   *  1. Vào Merchants.
   *  2. Điều hướng sang `Devices`.
   *  3. Nhấn Back.
   *  4. Nhấn Forward.
   * Expected:
   *  Back trở về `/pos/merchants` với bảng render đúng; Forward về `Devices`;
   *  không xuất hiện trang trắng hay lỗi hydrate.
   */
  test(
    'TC-MCH-014 — browser Back/Forward restores the list and the Devices screen',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await merchantsPage.goto();
      await merchantsPage.waitForReady();

      await merchantsPage.sidebar.navigateToHref(/^\/pos\/nail\/admin\/devices$/);
      await expect(page).toHaveURL(/\/pos\/nail\/admin\/devices/);

      await page.goBack();
      await expect(page).toHaveURL(/\/pos\/nail\/admin\/merchant/);
      await merchantsPage.waitForReady();
      await expect(merchantsPage.table.rows.first()).toBeVisible();

      await page.goForward();
      await expect(page).toHaveURL(/\/pos\/nail\/admin\/devices/);
      // Not a blank page: the shell is still mounted after the history moves.
      await expect(page.locator('[data-sidebar="menu-button"]').first()).toBeVisible();
      expect(pageErrors).toEqual([]);
    },
  );

  /**
   * TC-MCH-015 — Thu gọn/mở rộng sidebar
   * Steps:
   *  1. Toggle sidebar (nếu có nút).
   *  2. Quan sát vùng nội dung.
   * Expected:
   *  Bảng và thanh công cụ giãn/co theo, không bị cắt hay chồng lấp; trạng thái
   *  thu gọn không làm mất mục active.
   *
   * [CẦN XÁC MINH] resolved 2026-08-18: there is no desktop collapse
   * affordance. `[data-slot="sidebar-trigger"]` exists in the DOM at every
   * width but is only *visible* below the tablet breakpoint (measured hidden at
   * 1920 / 1366 / 1024 / 768) — the nav is a permanent column down to 768px and
   * becomes an overlay drawer only at mobile widths. So the case is asserted as
   * "no toggle to press at desktop, layout intact", and the drawer behaviour is
   * covered where it actually exists, at 375px.
   */
  test(
    'TC-MCH-015 — no desktop sidebar toggle; the mobile drawer opens at 375px',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      await merchantsPage.goto();
      await merchantsPage.waitForReady();

      await expect(merchantsPage.sidebar.toggle).toBeHidden();
      await expect(merchantsPage.sidebar.panel).toBeVisible();
      await expect(page.locator('a[href="/pos/nail/admin/merchant"]').first()).toHaveAttribute(
        'aria-current',
        'page',
      );

      await page.setViewportSize({ width: 375, height: 812 });
      await expect(merchantsPage.sidebar.toggle).toBeVisible();
      await merchantsPage.sidebar.toggle.click();
      await expect(merchantsPage.sidebar.mobileDrawer).toBeVisible();

      // The active item survives the collapsed/drawer state.
      await expect(
        merchantsPage.sidebar.mobileDrawer.locator('a[href="/pos/nail/admin/merchant"]').first(),
      ).toHaveAttribute('aria-current', 'page');
    },
  );
});

// Note for anyone extending this file: on `/pos/merchants` the Operations and
// Management sidebar links are served as `/pos/undefined/<screen>` — the admin
// route has no store id to interpolate. That is a product defect (asserted by
// TC-MCH-072), and it is why nothing here navigates to a store-scoped screen by
// clicking; reach those screens through their own page objects instead.
