import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Timeouts } from '@configs/constants/timeouts';
import {
  COMPLETE_ACTION_LABELS,
  COMPLETE_ACTION_LINKS,
  COMPLETE_CREATED_PATTERN,
  COMPLETE_QUICK_ACTIONS,
  GO_TO_DASHBOARD_HREF,
  ONBOARDING_STEP_LABELS,
  OnboardingStep,
  merchantPathPattern,
  stepUrlPattern,
} from '@pages/onboarding/OnboardingPage';

/**
 * Bước 7 — `Complete` (Merchant Onboarding, `?step=complete&whmcsId=<id>`).
 *
 * The wizard's terminal panel: a success message, a three-row summary of the
 * merchant that was just onboarded, four action links and an `Onboard Another`
 * button. No wizard footer at all.
 *
 * Ground rules for this file:
 *  - The route is the bare admin path `/pos/onboarding` and is NOT store-scoped,
 *    so nothing asserts `/pos/<id>/` *for this screen* and `env.STORE_ID` is
 *    never touched. Step 7's `View Merchant` / `Add Services` / `Add Staff`
 *    links are the one legitimate exception: they point at
 *    `/pos/<whmcsId>/…`, matched with `merchantPathPattern` against the WHMCS
 *    id on the URL — never a store id.
 *  - This step performs no writes: it renders after the fact and offers only
 *    read-only navigation, so every case here is executable. Nothing on this
 *    step can create or save a merchant.
 *  - DEV data is dirty, so the summary block is asserted by shape (non-empty
 *    business name, the id from the query string, the `Created` timestamp
 *    format) and never by value.
 *  - The screen paints in 7–12 s on DEV and `waitForLoadState('networkidle')`
 *    returns a blank page here, so every wait is an `expect(locator)` with
 *    `Timeouts.LONG`.
 */

/** The already-onboarded, read-only DEV merchant this whole file deep-links. */
const WHMCS_ID = '3660';

/** The two shortcut cards below the action links, with their exact copy. */
const [SERVICES_CARD, STAFF_CARD] = COMPLETE_QUICK_ACTIONS;

test.describe('Bước 7 — `Complete` — Onboarding', () => {
  test.beforeEach(async ({ onboardingPage }) => {
    await onboardingPage.gotoStep(OnboardingStep.COMPLETE, WHMCS_ID);
    await onboardingPage.waitForReady();
    // Wait out the DEV render on the panel itself, never on a load state.
    await expect(onboardingPage.completeHeading).toBeVisible({ timeout: Timeouts.LONG });
  });

  /**
   * TC-ONB-125 — Màn hoàn tất hiển thị đúng thông điệp
   * Steps:
   *  1. Quan sát nội dung chính.
   * Expected:
   *  Heading h2 `"Merchant Onboarding Complete!"`; đoạn mô tả `"The merchant has
   *  been successfully created and configured. They can now log in to the Volt
   *  POS application."`
   */
  test(
    'TC-ONB-125 — completion panel shows the h2 heading and its description',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ onboardingPage, page }) => {
      await expect(page).toHaveURL(stepUrlPattern(OnboardingStep.COMPLETE, WHMCS_ID));

      await expect(onboardingPage.completeHeading).toBeVisible();
      // The Expected pins the level, not just the text: it must be an h2.
      await expect(
        page.getByRole('heading', { name: 'Merchant Onboarding Complete!', level: 2 }),
      ).toHaveCount(1);

      await expect(onboardingPage.completeDescription).toBeVisible();
    },
  );

  /**
   * TC-ONB-126 — Khối tóm tắt hiển thị 3 trường
   * Steps:
   *  1. Đọc khối tóm tắt.
   * Expected:
   *  `Business Name` (chuỗi không rỗng), `WHMCS ID` (khớp đúng tham số URL),
   *  `Created` (khớp regex `^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2} (AM|PM)
   *  \(UTC[+-]\d+\)$` — mẫu `Jul 21, 2026, 10:32 AM (UTC+7)`).
   *
   * Business Name and Created are live merchant data — shape only, never value.
   */
  test(
    'TC-ONB-126 — summary block shows Business Name, WHMCS ID and a formatted Created stamp',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      // One value cell per label, so the reads below cannot be ambiguous.
      for (const label of ['Business Name', 'WHMCS ID', 'Created'] as const) {
        await expect(onboardingPage.summaryValue(label), `value of "${label}"`).toHaveCount(1);
      }

      // The id and the timestamp come straight from the wizard, but Business
      // Name is filled from GET /merchant_settings/<id> — the cell renders
      // empty until that resolves, so it is waited for rather than read once.
      await expect(onboardingPage.summaryValue('Business Name')).toHaveText(/\S/, {
        timeout: Timeouts.LONG,
      });

      expect(await onboardingPage.summaryValueText('WHMCS ID')).toBe(
        onboardingPage.currentWhmcsId(),
      );
      expect(await onboardingPage.summaryValueText('Created')).toMatch(COMPLETE_CREATED_PATTERN);
    },
  );

  /**
   * TC-ONB-127 — Link `View Merchant` trỏ đúng route settings
   * Steps:
   *  1. Đọc `href` của link `"View Merchant"`.
   *  2. Bấm vào.
   * Expected:
   *  `href` = `/pos/<whmcsId>/setting`; click mở đúng màn hình Settings của
   *  merchant vừa onboard.
   *
   * The `/pos/<id>/` segment here is the WHMCS id from the query string, which
   * is the one place this screen is merchant-scoped. Read-only navigation.
   */
  test(
    'TC-ONB-127 — View Merchant links to /pos/<whmcsId>/setting and opens it',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ onboardingPage, page }) => {
      await expect(onboardingPage.viewMerchantLink).toBeVisible();
      expect(await onboardingPage.hrefOf(onboardingPage.viewMerchantLink)).toMatch(
        merchantPathPattern('setting', WHMCS_ID),
      );

      await onboardingPage.viewMerchantLink.click();

      await expect(page).toHaveURL(merchantPathPattern('setting', WHMCS_ID), {
        timeout: Timeouts.NAVIGATION,
      });
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page).not.toHaveURL(/\/pos\/nail\/admin\/onboarding/);
    },
  );

  /**
   * TC-ONB-128 — Link `Go to Dashboard`
   * Steps:
   *  1. Đọc `href`.
   *  2. Bấm vào.
   * Expected:
   *  `href` = `/`; click đưa về trang chủ (redirect tới overview của store đang
   *  chọn).
   *
   * The Expected's parenthetical does not hold on DEV and is a doc inaccuracy,
   * not a step-7 defect: `/` does NOT bounce on to `/pos/<id>/overview` for this
   * Internal account — it renders the portal's product chooser (POS / Payment /
   * Gift Card / Business), verified live on 2026-08-19. The link's contract —
   * `href` = `/`, and clicking it leaves the wizard for the authenticated home —
   * is what this case asserts; a store id is never hard-coded either way.
   */
  test(
    'TC-ONB-128 — Go to Dashboard points at / and lands on the portal home',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage, page }) => {
      await expect(onboardingPage.goToDashboardLink).toBeVisible();
      expect(await onboardingPage.hrefOf(onboardingPage.goToDashboardLink)).toBe(
        GO_TO_DASHBOARD_HREF,
      );

      await onboardingPage.goToDashboardLink.click();

      await expect(page).toHaveURL(/^https?:\/\/[^/]+\/$/, { timeout: Timeouts.NAVIGATION });
      await expect(page).not.toHaveURL(/\/login/);
      // Home actually rendered — the POS entry card is its first product tile.
      // The portal home now ships three POS tiles ("POS", "POS Retail", "POS
      // Restaurant"), so target the plain "POS" card exactly rather than a prefix.
      await expect(page.getByRole('link', { name: 'POS', exact: true })).toBeVisible({
        timeout: Timeouts.LONG,
      });
    },
  );

  /**
   * TC-ONB-129 — Link tắt `Add Services`
   * Steps:
   *  1. Đọc nội dung và `href` của thẻ `"Add Services"`.
   *  2. Bấm vào.
   * Expected:
   *  Thẻ hiển thị tiêu đề `"Add Services"` và mô tả `"Configure services &
   *  products"`; `href` = `/pos/<whmcsId>/services`; click mở màn hình Services.
   */
  test(
    'TC-ONB-129 — Add Services card carries its subtitle and opens /pos/<whmcsId>/services',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage, page }) => {
      const card = onboardingPage.quickActionLink(SERVICES_CARD.title);

      await expect(card).toBeVisible();
      await expect(onboardingPage.quickActionSubtitle(SERVICES_CARD.subtitle)).toBeVisible();
      expect(await onboardingPage.hrefOf(card)).toMatch(
        merchantPathPattern(SERVICES_CARD.tail, WHMCS_ID),
      );

      await card.click();

      await expect(page).toHaveURL(merchantPathPattern(SERVICES_CARD.tail, WHMCS_ID), {
        timeout: Timeouts.NAVIGATION,
      });
      await expect(page).not.toHaveURL(/\/login/);
    },
  );

  /**
   * TC-ONB-130 — Link tắt `Add Staff`
   * Steps:
   *  1. Đọc nội dung và `href` của thẻ `"Add Staff"`.
   *  2. Bấm vào.
   * Expected:
   *  Tiêu đề `"Add Staff"`, mô tả `"Set up staff members"`; `href` =
   *  `/pos/<whmcsId>/staffs`; click mở màn hình Staffs.
   */
  test(
    'TC-ONB-130 — Add Staff card carries its subtitle and opens /pos/<whmcsId>/staffs',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage, page }) => {
      const card = onboardingPage.quickActionLink(STAFF_CARD.title);

      await expect(card).toBeVisible();
      await expect(onboardingPage.quickActionSubtitle(STAFF_CARD.subtitle)).toBeVisible();
      expect(await onboardingPage.hrefOf(card)).toMatch(
        merchantPathPattern(STAFF_CARD.tail, WHMCS_ID),
      );

      await card.click();

      await expect(page).toHaveURL(merchantPathPattern(STAFF_CARD.tail, WHMCS_ID), {
        timeout: Timeouts.NAVIGATION,
      });
      await expect(page).not.toHaveURL(/\/login/);
    },
  );

  /**
   * TC-ONB-131 — Stepper ở bước 7 đánh dấu 6 bước trước hoàn tất
   * Steps:
   *  1. Quan sát stepper ở `?step=complete&whmcsId=3660`.
   * Expected:
   *  6 mục đầu đều mang dấu tick màu success; `Complete` là bước hiện tại;
   *  không mục nào còn ở trạng thái muted ngoài chính nó.
   *
   * State is read off the circle's background token (`bg-success` / `bg-primary`
   * / `bg-muted`) because the stepper cells are plain divs with no aria state.
   */
  test(
    'TC-ONB-131 — first six steps are ticked and Complete is the current step',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      const completed = ONBOARDING_STEP_LABELS.slice(0, 6);

      // Let the completion state settle before reading the whole strip.
      await expect(onboardingPage.stepperBadge(completed[0]).locator('svg')).toBeVisible({
        timeout: Timeouts.LONG,
      });

      // The first six lost their number to a tick; only step 7 still shows one.
      await expect
        .poll(() => onboardingPage.stepperCellTexts(), { timeout: Timeouts.MEDIUM })
        .toEqual([...completed, '7 Complete']);

      for (const label of completed) {
        expect(await onboardingPage.stepperState(label), `state of "${label}"`).toBe('complete');
        await expect(onboardingPage.stepperBadge(label).locator('svg')).toHaveCount(1);
      }

      // Nothing is left muted: the last cell is current, not pending.
      expect(await onboardingPage.stepperState('Complete')).toBe('current');
      await expect(onboardingPage.stepperBadge('Complete')).toHaveText('7');
    },
  );

  /**
   * TC-ONB-132 — Bước 7 không có nút `Back`/`Skip`/`Save`
   * Steps:
   *  1. Đọc toàn bộ nút trong vùng nội dung bước 7.
   * Expected:
   *  Chỉ có `Onboard Another` (button) và 4 link (`View Merchant`,
   *  `Go to Dashboard`, `Add Services`, `Add Staff`) — không còn nút điều hướng
   *  wizard.
   */
  test(
    'TC-ONB-132 — step 7 ships one button and four links, and no wizard footer',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      // No Back / Skip / Save Changes / Save Changes & Continue at all.
      await expect(onboardingPage.wizardFooterButtons).toHaveCount(0);

      await expect(onboardingPage.onboardAnotherButton).toBeVisible();
      await expect(onboardingPage.completeActionLinks).toHaveCount(COMPLETE_ACTION_LABELS.length);

      const hrefs = await onboardingPage.completeActionHrefs();
      expect(hrefs['Go to Dashboard']).toBe(GO_TO_DASHBOARD_HREF);
      for (const { label, tail } of COMPLETE_ACTION_LINKS) {
        expect(hrefs[label], `href of "${label}"`).toMatch(merchantPathPattern(tail, WHMCS_ID));
      }
    },
  );
});
