import type { Page } from '@playwright/test';
import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import {
  INTERNAL_NAV_LINKS,
  ONBOARDING_STEP_LABELS,
  OnboardingStep,
  PRODUCT_SWITCHER_BUTTONS,
  STORE_SCOPED_NAV_TAILS,
  stepUrlPattern,
} from '@pages/onboarding/OnboardingPage';

/**
 * Merchant Onboarding is an Internal/admin screen and is NOT store-scoped: the
 * route is a bare `/pos/onboarding`, so nothing here may assert `/pos/<id>/` or
 * touch `env.STORE_ID`.
 *
 * Two screen rules shape every test below:
 *
 *  - The app needs 7–12 s to paint on DEV and `waitForLoadState('networkidle')`
 *    returns a blank page here, so every wait is an `expect(locator)` (with
 *    `Timeouts.LONG` where the default is not enough), never a load state.
 *  - `Create Merchant` / `Save Changes` are real writes against the DEV backend.
 *    Nothing in this file clicks them — this area is read-only layout anyway.
 *
 * Every expectation was confirmed against the DEV Portal on 2026-08-19 with the
 * reused admin session at 1920x1080, except TC-ONB-009, which asserts the
 * correct behaviour of a live bug and is expected to fail (see its JSDoc).
 */

/** The already-onboarded merchant the deep-link cases read. Read-only: never saved. */
const WHMCS_ID = '3660';

/** Horizontal overflow of the document, in px. 0 means the layout fits the viewport. */
const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('Tải trang & bố cục (Page load / Layout) — Onboarding', () => {
  test.beforeEach(async ({ onboardingPage }) => {
    await onboardingPage.goto();
  });

  /**
   * TC-ONB-001 — Tải trang Onboarding qua điều hướng trực tiếp
   * Steps:
   *  1. Điều hướng trực tiếp tới `/pos/onboarding`.
   *  2. Chờ heading "Enter WHMCS ID" hiển thị.
   * Expected:
   *  Trang hiển thị, không bị redirect về `/login`; tiêu đề trang
   *  "Merchant Onboarding" và stepper 7 bước render đầy đủ.
   */
  test(
    'TC-ONB-001 — direct navigation renders the wizard, no login redirect',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ onboardingPage, page }) => {
      await expect(onboardingPage.enterWhmcsIdHeading).toBeVisible({ timeout: Timeouts.LONG });

      await expect(page).not.toHaveURL(/\/login/);
      await expect(page).toHaveURL(/\/pos\/onboarding/);
      await expect(onboardingPage.pageTitle).toBeVisible();
      await expect(onboardingPage.whmcsIdInput).toBeVisible();
      await expect(onboardingPage.validateButton).toBeEnabled();
      await expect(onboardingPage.stepperItems).toHaveCount(ONBOARDING_STEP_LABELS.length);
    },
  );

  /**
   * TC-ONB-002 — URL tự chuẩn hoá thành `?step=validate`
   * Steps:
   *  1. Vào `/pos/onboarding` (không kèm query).
   *  2. Đọc URL sau khi trang render xong.
   * Expected:
   *  URL trở thành `/pos/onboarding?step=validate`; bước 1 được highlight trên stepper.
   */
  test(
    'TC-ONB-002 — bare route normalises to ?step=validate with step 1 current',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ onboardingPage, page }) => {
      await expect(onboardingPage.enterWhmcsIdHeading).toBeVisible({ timeout: Timeouts.LONG });

      await expect(page).toHaveURL(/\/pos\/onboarding\?step=validate$/);
      await expect(page).toHaveURL(stepUrlPattern(OnboardingStep.VALIDATE));
      expect(onboardingPage.currentStep()).toBe(OnboardingStep.VALIDATE);
      // No merchant is selected yet, so the URL carries no whmcsId.
      expect(onboardingPage.currentWhmcsId()).toBe('');
      expect(await onboardingPage.stepperState('Validate')).toBe('current');
    },
  );

  /**
   * TC-ONB-003 — Tiêu đề trang hiển thị đúng
   * Steps:
   *  1. Quan sát vùng header nội dung.
   * Expected:
   *  Hiển thị đúng chuỗi "Merchant Onboarding".
   *
   * Asserted as text, not as a heading: the screen renders no `h1` at all (the
   * step panels start at `h3`), which the a11y area records separately as
   * TC-ONB-155. Using `getByRole('heading')` here would fail for that reason
   * rather than for a missing title.
   */
  test(
    'TC-ONB-003 — page header reads exactly "Merchant Onboarding"',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      await expect(onboardingPage.pageTitle).toBeVisible({ timeout: Timeouts.LONG });
      await expect(onboardingPage.pageTitle).toHaveText('Merchant Onboarding');
    },
  );

  /**
   * TC-ONB-004 — Stepper liệt kê đủ 7 bước đúng thứ tự và nhãn
   * Steps:
   *  1. Vào `/pos/onboarding`.
   *  2. Đọc lần lượt các mục stepper.
   * Expected:
   *  Đúng 7 mục theo thứ tự Validate → Business Information → Work Hours →
   *  Photos → Package → Payment & Transactions → Complete, đánh số 1–7.
   */
  test(
    'TC-ONB-004 — stepper lists the seven steps in order, numbered 1–7',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ onboardingPage }) => {
      const expected = ONBOARDING_STEP_LABELS.map((label, index) => `${index + 1} ${label}`);

      await expect
        .poll(() => onboardingPage.stepperCellTexts(), { timeout: Timeouts.LONG })
        .toEqual(expected);
    },
  );

  /**
   * TC-ONB-005 — Bước hiện tại được highlight, bước sau ở trạng thái chờ
   * Steps:
   *  1. Vào `?step=validate`.
   *  2. Kiểm tra style/`aria` của từng mục stepper.
   * Expected:
   *  Mục Validate được nhấn mạnh (màu primary); các mục 2–7 hiển thị số thứ tự
   *  với style muted; không mục nào mang dấu tick.
   *
   * State is read off the circle's background token (`bg-primary` vs `bg-muted`)
   * because the stepper exposes no `aria` state — the cells are plain divs, not
   * tabs or links.
   */
  test(
    'TC-ONB-005 — step 1 is current, steps 2–7 are pending and none is ticked',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      await expect(onboardingPage.stepperCell('Complete')).toBeVisible({
        timeout: Timeouts.LONG,
      });

      for (const [index, label] of ONBOARDING_STEP_LABELS.entries()) {
        expect(await onboardingPage.stepperState(label), `state of "${label}"`).toBe(
          index === 0 ? 'current' : 'pending',
        );
        // The number is still there, so nothing has been swapped for a tick icon.
        await expect(onboardingPage.stepperBadge(label)).toHaveText(String(index + 1));
        await expect(onboardingPage.stepperBadge(label).locator('svg')).toHaveCount(0);
      }
    },
  );

  /**
   * TC-ONB-006 — Bước đã hoàn tất hiển thị dấu tick
   * Preconditions: Có WHMCS ID của merchant đã onboard (vd `3660`).
   * Steps:
   *  1. Vào `?step=payment-transactions&whmcsId=3660`.
   *  2. Quan sát 5 mục đầu của stepper.
   * Expected:
   *  Validate, Business Information, Work Hours, Photos, Package hiển thị dấu
   *  tick màu success (không còn số); Payment & Transactions là bước hiện tại
   *  (số 6, màu primary); Complete vẫn muted (số 7).
   *
   * Deep-links merchant 3660 and only reads: no Save Changes button is pressed,
   * so nothing is written on DEV.
   */
  test(
    'TC-ONB-006 — steps 1–5 show success ticks when deep-linking step 6',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage, page }) => {
      await onboardingPage.gotoStep(OnboardingStep.PAYMENT_TRANSACTIONS, WHMCS_ID);
      await onboardingPage.waitForReady();

      await expect(page).toHaveURL(stepUrlPattern(OnboardingStep.PAYMENT_TRANSACTIONS, WHMCS_ID));

      const completed = ONBOARDING_STEP_LABELS.slice(0, 5);
      // Wait for the completion state to settle before reading the whole strip.
      await expect(onboardingPage.stepperBadge(completed[0]).locator('svg')).toBeVisible({
        timeout: Timeouts.LONG,
      });

      await expect
        .poll(() => onboardingPage.stepperCellTexts(), { timeout: Timeouts.MEDIUM })
        .toEqual([...completed, '6 Payment & Transactions', '7 Complete']);

      for (const label of completed) {
        expect(await onboardingPage.stepperState(label), `state of "${label}"`).toBe('complete');
        await expect(onboardingPage.stepperBadge(label).locator('svg')).toHaveCount(1);
      }

      expect(await onboardingPage.stepperState('Payment & Transactions')).toBe('current');
      await expect(onboardingPage.stepperBadge('Payment & Transactions')).toHaveText('6');

      expect(await onboardingPage.stepperState('Complete')).toBe('pending');
      await expect(onboardingPage.stepperBadge('Complete')).toHaveText('7');
    },
  );

  /**
   * TC-ONB-007 — Sidebar mục `Onboarding` được đánh dấu active
   * Steps:
   *  1. Vào `/pos/onboarding`.
   *  2. Kiểm tra mục `Onboarding` trong nhóm `Internal`.
   * Expected:
   *  Mục Onboarding có nền nhấn (active); không mục sidebar nào khác ở trạng
   *  thái active.
   */
  test(
    'TC-ONB-007 — only the Internal "Onboarding" link is marked current',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      await expect(onboardingPage.navLinkByHref(Urls.ONBOARDING)).toBeVisible({
        timeout: Timeouts.LONG,
      });
      await expect(onboardingPage.navLinkByHref(Urls.ONBOARDING)).toHaveAttribute(
        'aria-current',
        'page',
      );

      // Exactly one nav link claims the current page, and it is this one.
      await expect(onboardingPage.activeNavLinks).toHaveCount(1);
      const activeHrefs = await onboardingPage.activeNavLinks.evaluateAll((links) =>
        links.map((link) => link.getAttribute('href') ?? ''),
      );
      expect(activeHrefs).toEqual([Urls.ONBOARDING]);
    },
  );

  /**
   * TC-ONB-008 — Nhóm sidebar `Internal` đủ 8 mục
   * Steps:
   *  1. Đọc danh sách link nhóm `Internal`.
   * Expected:
   *  Merchants (`/pos/merchants`), Onboarding (`/pos/onboarding`), Packages
   *  (`/pos/admin/packages`), All Orders (`/pos/admin/orders`), Devices
   *  (`/pos/admin/devices`), Monitor (`/pos/admin/monitor`), Versions
   *  (`/pos/admin/versions`), Settings (`/pos/admin/setting`).
   *
   * Links are addressed by href, not by label: "Settings" and "Orders" each
   * appear twice in the nav (store-scoped vs admin), so a name lookup is
   * ambiguous. The Internal group is the tail of the nav, after Operations and
   * Management, which is what the slice pins.
   */
  test(
    'TC-ONB-008 — the Internal group holds all eight admin links',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      await expect(onboardingPage.navLinkByHref(Urls.ONBOARDING)).toBeVisible({
        timeout: Timeouts.LONG,
      });

      const hrefs = await onboardingPage.navHrefs();
      const internalHrefs = INTERNAL_NAV_LINKS.map((link) => link.href);
      expect(hrefs.slice(-internalHrefs.length)).toEqual(internalHrefs);

      for (const { label, href } of INTERNAL_NAV_LINKS) {
        const link = onboardingPage.navLinkByHref(href);
        await expect(link, `Internal link ${href}`).toBeVisible();
        await expect(link).toContainText(label);
      }
    },
  );

  /**
   * TC-ONB-009 — Link store-scoped trên sidebar bị hỏng thành `/pos/undefined/...`
   * Preconditions: Đang ở `/pos/onboarding`.
   * Steps:
   *  1. Đọc `href` các link nhóm `Operations` và `Management`.
   *  2. Ghi nhận giá trị.
   * Expected (theo thiết kế đúng):
   *  Các link phải trỏ tới store hiện hành (vd `/pos/14/overview`). Thực tế quét
   *  được là `/pos/undefined/overview`, `/pos/undefined/orders`, … → test này dự
   *  kiến FAIL, đây là bug cần báo.
   *
   * EXPECTED TO FAIL until the bug is fixed. `/pos/onboarding` is an admin route
   * with no store id in the path, and the shell interpolates the missing id
   * literally, so all nine Operations/Management links render as
   * `/pos/undefined/<screen>` (re-confirmed live 2026-08-19). The assertion is
   * deliberately written against the correct behaviour — do not soften it to
   * match the defect; delete the bug once the links carry a real store id.
   */
  test(
    'TC-ONB-009 — Operations/Management links must carry a real store id, not "undefined"',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      await expect(onboardingPage.navLinkByHref(Urls.ONBOARDING)).toBeVisible({
        timeout: Timeouts.LONG,
      });

      const hrefs = await onboardingPage.navHrefs();

      const broken = hrefs.filter((href) => href.startsWith('/pos/undefined/'));
      expect(broken, 'sidebar links must interpolate a store id, not "undefined"').toEqual([]);

      for (const tail of STORE_SCOPED_NAV_TAILS) {
        // The admin twins (/pos/admin/orders, /pos/admin/setting) share a tail
        // with the store-scoped links, so they are excluded by prefix.
        const href = hrefs.find(
          (candidate) => candidate.endsWith(`/${tail}`) && !candidate.startsWith('/pos/admin/'),
        );
        expect(href, `no store-scoped sidebar link for /${tail}`).toBeDefined();
        expect(href ?? '').toMatch(new RegExp(`^/pos/\\d+/${tail}$`));
      }
    },
  );

  /**
   * TC-ONB-010 — Thanh chuyển ngữ cảnh sản phẩm hiển thị đủ
   * Steps:
   *  1. Quan sát thanh icon dọc ngoài cùng bên trái.
   * Expected:
   *  Có link "FastboyPay home" (→ `/`) và 4 nút POS, Payment, Business, Gift
   *  Card; POS đang active. Có nút "Open user menu".
   *
   * "Active" is a real accessible state here, not just styling: the POS button
   * carries `aria-current="page"` and the other three carry none.
   */
  test(
    'TC-ONB-010 — the product rail shows home, four contexts with POS active, and the user menu',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      await expect(onboardingPage.homeLink).toBeVisible({ timeout: Timeouts.LONG });
      await expect(onboardingPage.homeLink).toHaveAttribute('href', Urls.HOME);

      for (const name of PRODUCT_SWITCHER_BUTTONS) {
        await expect(
          onboardingPage.productSwitcherButton(name),
          `rail button ${name}`,
        ).toBeVisible();
      }

      await expect(onboardingPage.productSwitcherButton('POS')).toHaveAttribute(
        'aria-current',
        'page',
      );
      for (const name of PRODUCT_SWITCHER_BUTTONS.filter((button) => button !== 'POS')) {
        await expect(
          onboardingPage.productSwitcherButton(name),
          `${name} must not be the active context`,
        ).not.toHaveAttribute('aria-current', 'page');
      }

      await expect(onboardingPage.userMenuButton).toBeVisible();
    },
  );

  /**
   * TC-ONB-011 — Nút `Toggle Sidebar` thu/mở sidebar
   * Steps:
   *  1. Bấm "Toggle Sidebar".
   *  2. Quan sát.
   *  3. Bấm lại.
   * Expected:
   *  Sidebar thu lại (chỉ còn icon hoặc ẩn hẳn) rồi mở lại; vùng nội dung wizard
   *  không bị vỡ layout ở cả hai trạng thái.
   *
   * There is no toggle to press at the desktop viewport: the trigger is in the
   * DOM at every width but only becomes visible below the tablet breakpoint,
   * where the nav stops being a permanent column and turns into an overlay
   * drawer (measured 2026-08-19 on this route: hidden at 1920, visible at 375).
   * So the case is asserted where the behaviour actually exists — the viewport
   * is narrowed in-test rather than parked as a scaffold, the same way the
   * sibling Merchants suite covers its equivalent case. The drawer is closed by
   * tapping the backdrop: once it is open its overlay covers the trigger, its
   * "Close" button is sr-only, and Escape does not dismiss this sheet.
   */
  test(
    'TC-ONB-011 — no desktop toggle; at 375px it opens and closes the nav drawer with the wizard intact',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage, page }) => {
      await expect(onboardingPage.whmcsIdInput).toBeVisible({ timeout: Timeouts.LONG });

      // Desktop: permanent nav column, no collapse affordance, layout fits.
      await expect(onboardingPage.sidebar.panel).toBeVisible();
      await expect(onboardingPage.sidebar.toggle).toBeHidden();
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);

      await page.setViewportSize({ width: 375, height: 812 });

      // Mobile: the column is gone and the trigger takes over.
      await expect(onboardingPage.sidebar.toggle).toBeVisible();
      await expect(onboardingPage.sidebar.panel).toHaveCount(0);
      await expect(onboardingPage.pageTitle).toBeVisible();
      await expect(onboardingPage.whmcsIdInput).toBeVisible();

      await onboardingPage.sidebar.toggle.click();
      await expect(onboardingPage.sidebar.mobileDrawer).toBeVisible();
      // The active item survives inside the drawer.
      await expect(
        onboardingPage.sidebar.mobileDrawer.locator(
          `a[href="${Urls.ONBOARDING}"][aria-current="page"]`,
        ),
      ).toHaveCount(1);

      // The open sheet covers the trigger, so the drawer is dismissed the way a
      // user can: tapping the backdrop to the right of the panel. (Escape does
      // not dismiss this sheet, and its "Close" control is sr-only.)
      await page.locator('[data-slot="sheet-overlay"]').click({ position: { x: 340, y: 600 } });
      await expect(onboardingPage.sidebar.mobileDrawer).toHaveCount(0);

      // Wizard content is unbroken in both states.
      await expect(onboardingPage.pageTitle).toBeVisible();
      await expect(onboardingPage.whmcsIdInput).toBeVisible();
      await expect(onboardingPage.validateButton).toBeVisible();
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    },
  );
});
