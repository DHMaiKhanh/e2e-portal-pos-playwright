import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import {
  GUARDED_STEP_SLUGS,
  OnboardingStep,
  WEEKDAYS,
  stepUrlPattern,
} from '@pages/onboarding/OnboardingPage';

/**
 * Merchant Onboarding is an Internal/admin screen and is NOT store-scoped: the
 * route is a bare `/pos/onboarding`, so nothing here may assert `/pos/<id>/`
 * or touch `env.STORE_ID`. Wizard position lives entirely in the query string
 * (`?step=<slug>&whmcsId=<number>`), which is exactly what this area exercises.
 *
 * Everything below is read-only. `Create Merchant` and `Save Changes` write to
 * the DEV backend for real and are never clicked; `Back` and `Onboard Another`
 * are pure navigation and are safe.
 *
 * The screen renders in 7-12 s on DEV and `waitForLoadState('networkidle')`
 * returns a blank page here, so every wait is an `expect(locator)` with
 * `Timeouts.LONG`, and the multi-navigation cases raise their own test timeout.
 */

/** The already-onboarded merchant every deep-link case reads. Never mutated. */
const WHMCS_ID = '3660';

test.describe('Điều hướng & định tuyến (Navigation / Routing guard) — Onboarding', () => {
  test.beforeEach(async ({ onboardingPage }) => {
    await onboardingPage.goto();
  });

  /**
   * TC-ONB-012 — Truy cập bước 2 khi thiếu `whmcsId` bị đẩy về `validate`
   * Steps:
   *  1. Vào `/pos/onboarding?step=merchant-info` (không có `whmcsId`).
   *  2. Chờ render.
   * Expected:
   *  URL bị đổi về `/pos/onboarding?step=validate`; hiện form "Enter WHMCS ID".
   */
  test(
    'TC-ONB-012 — step=merchant-info without whmcsId is bounced to ?step=validate',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ onboardingPage, page }) => {
      await onboardingPage.gotoStep(OnboardingStep.MERCHANT_INFO);

      await onboardingPage.expectGuardRedirect();
      await expect(page).toHaveURL(/\/pos\/onboarding/);
      expect(onboardingPage.currentStep()).toBe(OnboardingStep.VALIDATE);
      await expect(onboardingPage.whmcsIdInput).toBeVisible();
      // Step 2's own content must not have rendered behind the redirect.
      await expect(onboardingPage.businessInformationHeading).toBeHidden();
    },
  );

  /**
   * TC-ONB-013 — Guard áp dụng cho mọi bước 2–7 khi thiếu `whmcsId`
   * Steps:
   *  1. Lặp cho từng `step` ∈ {merchant-info, work-hours, photos, pos-package,
   *     payment-transactions, complete}: vào `/pos/onboarding?step=<step>` rồi
   *     đọc URL cuối.
   * Expected:
   *  Cả 6 trường hợp đều về `?step=validate` và hiện form nhập WHMCS ID.
   */
  test(
    'TC-ONB-013 — all six guarded steps fall back to ?step=validate without whmcsId',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ onboardingPage }) => {
      // Six full page loads at 7-12 s each on DEV.
      test.setTimeout(180_000);

      expect(GUARDED_STEP_SLUGS).toHaveLength(6);

      for (const slug of GUARDED_STEP_SLUGS) {
        await onboardingPage.gotoStep(slug);

        await onboardingPage.expectGuardRedirect();
        expect(onboardingPage.currentStep(), `?step=${slug} should be guarded`).toBe(
          OnboardingStep.VALIDATE,
        );
        expect(onboardingPage.currentWhmcsId()).toBe('');
        await expect(onboardingPage.whmcsIdInput).toBeVisible();
      }
    },
  );

  /**
   * TC-ONB-014 — Deep-link bước bất kỳ kèm `whmcsId` hợp lệ render đúng bước
   * Preconditions: WHMCS ID của merchant đã onboard (vd `3660`).
   * Steps:
   *  1. Lặp cho từng `step` ∈ {merchant-info, work-hours, photos, pos-package,
   *     payment-transactions, complete}: vào `?step=<step>&whmcsId=3660`.
   * Expected:
   *  URL giữ nguyên; nội dung đúng bước hiển thị (`Business Information` /
   *  `Business Hours` / `Business Photos` / lưới gói / `Payment Methods` /
   *  `Merchant Onboarding Complete!`).
   */
  test(
    'TC-ONB-014 — deep-linking each step with a valid whmcsId renders that step',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ onboardingPage, page }) => {
      // Six full page loads at 7-12 s each on DEV.
      test.setTimeout(180_000);

      const stepContent = [
        { slug: OnboardingStep.MERCHANT_INFO, content: onboardingPage.businessInformationHeading },
        { slug: OnboardingStep.WORK_HOURS, content: onboardingPage.businessHoursHeading },
        { slug: OnboardingStep.PHOTOS, content: onboardingPage.businessPhotosHeading },
        // Step 5 has no heading of its own — the package grid is its content.
        {
          slug: OnboardingStep.POS_PACKAGE,
          content: onboardingPage.viewAllFeaturesButtons.first(),
        },
        {
          slug: OnboardingStep.PAYMENT_TRANSACTIONS,
          content: onboardingPage.paymentMethodsHeading,
        },
        { slug: OnboardingStep.COMPLETE, content: onboardingPage.completeHeading },
      ];

      for (const { slug, content } of stepContent) {
        await onboardingPage.gotoStep(slug, WHMCS_ID);
        await onboardingPage.waitForReady();

        await expect(content).toBeVisible({ timeout: Timeouts.LONG });
        await expect(page).toHaveURL(stepUrlPattern(slug, WHMCS_ID));
        expect(onboardingPage.currentStep(), `?step=${slug} should be kept`).toBe(slug);
        expect(onboardingPage.currentWhmcsId()).toBe(WHMCS_ID);
      }
    },
  );

  /**
   * TC-ONB-015 — Wizard không ép đi tuần tự khi đã có `whmcsId`
   * Steps:
   *  1. Vào thẳng `?step=complete&whmcsId=3660` (bỏ qua bước 2–6).
   * Expected:
   *  Bước 7 render bình thường, **không** bị đẩy về bước trước. Ghi nhận đây là
   *  hành vi hiện tại (nới lỏng guard) — cần xác nhận với PO xem có phải yêu cầu
   *  hay không.
   */
  test(
    'TC-ONB-015 — jumping straight to ?step=complete is not forced back a step',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage, page }) => {
      await onboardingPage.gotoStep(OnboardingStep.COMPLETE, WHMCS_ID);
      await onboardingPage.waitForReady();

      await expect(onboardingPage.completeHeading).toBeVisible({ timeout: Timeouts.LONG });
      await expect(page).toHaveURL(stepUrlPattern(OnboardingStep.COMPLETE, WHMCS_ID));
      expect(onboardingPage.currentStep()).toBe(OnboardingStep.COMPLETE);
      await expect(onboardingPage.onboardAnotherButton).toBeVisible();
      // No bounce back to step 1 and no bounce back to an earlier wizard step.
      await expect(onboardingPage.enterWhmcsIdHeading).toBeHidden();
      await expect(onboardingPage.paymentMethodsHeading).toBeHidden();
    },
  );

  /**
   * TC-ONB-016 — `step` không hợp lệ rơi vào error boundary
   * Steps:
   *  1. Vào `/pos/onboarding?step=bogus&whmcsId=3660`.
   *  2. Quan sát.
   * Expected:
   *  Hiển thị màn lỗi "POS is unavailable right now" kèm nút "Try again";
   *  **không** trắng trang, **không** crash toàn app (sidebar vẫn còn). Xem thêm
   *  `TC-ONB-165` về nội dung lỗi bị lộ.
   *
   * EXPECTED TO FAIL until the boundary is scoped to the wizard. Verified on DEV
   * 2026-08-19 (`?step=bogus&whmcsId=3660`): the boundary replaces the whole app
   * shell — `[data-slot="sidebar"]` count 0, zero `li a[href]`, the only anchor
   * left on the page being the icon-rail home `/` — so the invalid slug does take
   * the entire app frame down, which is exactly what this case forbids. The first
   * two assertions pass; the nav assertions are the bug. The same load also
   * printed the raw zod payload listing all seven valid `step` values (TC-ONB-165).
   */
  test(
    'TC-ONB-016 — an invalid step slug lands on the error boundary, app still framed',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      await onboardingPage.gotoWithQuery({ step: 'bogus', whmcsId: WHMCS_ID });

      await expect(onboardingPage.errorBoundaryTitle).toBeVisible({ timeout: Timeouts.LONG });
      await expect(onboardingPage.tryAgainButton).toBeVisible();
      // Not a blank page and not a whole-app crash: the Internal nav must survive.
      await expect(onboardingPage.navLinkByHref(Urls.ONBOARDING).first()).toBeVisible();
      await expect(onboardingPage.navLinkByHref(Urls.MERCHANTS).first()).toBeVisible();
    },
  );

  /**
   * TC-ONB-017 — Nút `Try again` trên error boundary
   * Preconditions: Đang ở màn lỗi của `TC-ONB-016`.
   * Steps:
   *  1. Bấm "Try again".
   *  2. Quan sát.
   * Expected:
   *  `[CẦN XÁC MINH]` — kỳ vọng app thử render lại; nếu query vẫn sai thì phải
   *  đưa người dùng về `?step=validate` chứ không lặp vô hạn màn lỗi.
   */
  // TODO(manual/setup): the Expected is an unverified assumption ([CẦN XÁC MINH]) —
  // nobody has confirmed what "Try again" does while the query is still invalid.
  // Writing either branch (recovers to ?step=validate, or re-renders the same
  // boundary) would encode a guess as a requirement. Needs live verification and
  // a PO ruling on which behaviour is correct before this can be asserted.
  test.fixme(
    'TC-ONB-017 — Try again on the error boundary recovers instead of looping',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      // Best-effort arrange only: reach the boundary, assert nothing.
      await onboardingPage.gotoWithQuery({ step: 'bogus', whmcsId: WHMCS_ID });
    },
  );

  /**
   * TC-ONB-018 — Reload giữ nguyên bước hiện tại
   * Steps:
   *  1. Vào `?step=work-hours&whmcsId=3660`.
   *  2. Nhấn F5.
   *  3. Chờ render.
   * Expected:
   *  Sau reload vẫn ở bước `Work Hours`, URL không đổi, dữ liệu giờ làm việc
   *  được nạp lại.
   */
  test(
    'TC-ONB-018 — reload keeps the current step and reloads its data',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage, page }) => {
      test.setTimeout(120_000);

      await onboardingPage.gotoStep(OnboardingStep.WORK_HOURS, WHMCS_ID);
      await onboardingPage.waitForReady();
      await expect(onboardingPage.businessHoursHeading).toBeVisible({ timeout: Timeouts.LONG });

      await page.reload({ waitUntil: 'domcontentloaded' });
      await onboardingPage.waitForReady();

      await expect(page).toHaveURL(stepUrlPattern(OnboardingStep.WORK_HOURS, WHMCS_ID));
      expect(onboardingPage.currentStep()).toBe(OnboardingStep.WORK_HOURS);
      expect(onboardingPage.currentWhmcsId()).toBe(WHMCS_ID);
      await expect(onboardingPage.businessHoursHeading).toBeVisible({ timeout: Timeouts.LONG });

      // Work-hours data is back: every weekday row rendered with its switch.
      for (const day of WEEKDAYS) {
        await expect(onboardingPage.dayOpenSwitch(day)).toBeVisible({ timeout: Timeouts.LONG });
      }
    },
  );

  /**
   * TC-ONB-019 — Nút Back/Forward của trình duyệt hoạt động theo bước
   * Steps:
   *  1. Vào `?step=merchant-info&whmcsId=3660`.
   *  2. Vào tiếp `?step=work-hours&whmcsId=3660`.
   *  3. Bấm Back của trình duyệt.
   *  4. Bấm Forward.
   * Expected:
   *  Back về bước `Business Information`, Forward tới lại `Work Hours`; stepper
   *  cập nhật theo.
   */
  test(
    'TC-ONB-019 — browser Back/Forward walks the wizard steps and updates the stepper',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage, page }) => {
      test.setTimeout(180_000);

      await onboardingPage.gotoStep(OnboardingStep.MERCHANT_INFO, WHMCS_ID);
      await onboardingPage.waitForReady();
      await expect(onboardingPage.businessInformationHeading).toBeVisible({
        timeout: Timeouts.LONG,
      });

      await onboardingPage.gotoStep(OnboardingStep.WORK_HOURS, WHMCS_ID);
      await onboardingPage.waitForReady();
      await expect(onboardingPage.businessHoursHeading).toBeVisible({ timeout: Timeouts.LONG });

      await page.goBack({ waitUntil: 'domcontentloaded' });
      await onboardingPage.waitForReady();
      await expect(page).toHaveURL(stepUrlPattern(OnboardingStep.MERCHANT_INFO, WHMCS_ID));
      await expect(onboardingPage.businessInformationHeading).toBeVisible({
        timeout: Timeouts.LONG,
      });
      expect(await onboardingPage.stepperState('Business Information')).toBe('current');

      await page.goForward({ waitUntil: 'domcontentloaded' });
      await onboardingPage.waitForReady();
      await expect(page).toHaveURL(stepUrlPattern(OnboardingStep.WORK_HOURS, WHMCS_ID));
      await expect(onboardingPage.businessHoursHeading).toBeVisible({ timeout: Timeouts.LONG });
      expect(await onboardingPage.stepperState('Work Hours')).toBe('current');
    },
  );

  /**
   * TC-ONB-020 — Nút `Back` trong wizard lùi đúng 1 bước
   * Preconditions: Đang ở `?step=photos&whmcsId=3660`.
   * Steps:
   *  1. Bấm nút "Back" ở cuối trang.
   *  2. Đọc URL và heading.
   * Expected:
   *  Chuyển về `?step=work-hours&whmcsId=3660`, heading "Business Hours";
   *  `whmcsId` được giữ nguyên trên URL.
   */
  test(
    'TC-ONB-020 — the wizard Back button steps photos → work-hours and keeps whmcsId',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ onboardingPage, page }) => {
      test.setTimeout(120_000);

      await onboardingPage.gotoStep(OnboardingStep.PHOTOS, WHMCS_ID);
      await onboardingPage.waitForReady();
      await expect(onboardingPage.businessPhotosHeading).toBeVisible({ timeout: Timeouts.LONG });

      await expect(onboardingPage.backButton).toBeEnabled();
      await onboardingPage.backButton.click();

      // The app builds this URL itself, so assert the params rather than their order.
      await expect(page).toHaveURL(/[?&]step=work-hours/, { timeout: Timeouts.MEDIUM });
      await expect(page).toHaveURL(/\/pos\/onboarding/);
      await expect(onboardingPage.businessHoursHeading).toBeVisible({ timeout: Timeouts.LONG });
      await expect.poll(() => onboardingPage.currentWhmcsId()).toBe(WHMCS_ID);
    },
  );

  /**
   * TC-ONB-021 — Bấm vào mục stepper để nhảy bước
   * Steps:
   *  1. Vào `?step=photos&whmcsId=3660`.
   *  2. Bấm vào chữ "Validate" trên stepper.
   * Expected:
   *  `[CẦN XÁC MINH]` — trong DOM quét được stepper là `div`/`span`, **không**
   *  phải `button`/`link` → dự kiến **không** click được. Nếu đúng vậy thì test
   *  khẳng định stepper chỉ hiển thị, không điều hướng.
   *
   * Kept executable because the assertion is read-only and safe either way: it
   * pins that the stepper exposes no interactive role and that clicking its
   * label does not move the wizard.
   */
  test(
    'TC-ONB-021 — the stepper is display-only and clicking a label does not navigate',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage, page }) => {
      await onboardingPage.gotoStep(OnboardingStep.PHOTOS, WHMCS_ID);
      await onboardingPage.waitForReady();
      await expect(onboardingPage.businessPhotosHeading).toBeVisible({ timeout: Timeouts.LONG });

      const validateCell = onboardingPage.stepperCell('Validate').first();
      await expect(validateCell).toBeVisible();
      await expect(validateCell.getByRole('button')).toHaveCount(0);
      await expect(validateCell.getByRole('link')).toHaveCount(0);

      // Dispatched rather than a real click: a display-only div need not pass
      // actionability checks, and the case is about the click changing nothing.
      // React's delegated `onClick` still fires from a dispatched click event,
      // so a hidden navigation handler would be caught by the URL assertion.
      await onboardingPage.stepperItem('Validate').dispatchEvent('click');
      await page.waitForTimeout(Timeouts.ANIMATION);

      await expect(page).toHaveURL(stepUrlPattern(OnboardingStep.PHOTOS, WHMCS_ID));
      expect(onboardingPage.currentStep()).toBe(OnboardingStep.PHOTOS);
      await expect(onboardingPage.businessPhotosHeading).toBeVisible();
      await expect(onboardingPage.enterWhmcsIdHeading).toBeHidden();
    },
  );

  /**
   * TC-ONB-022 — Rời màn hình rồi quay lại reset về bước 1
   * Steps:
   *  1. Vào `?step=work-hours&whmcsId=3660`.
   *  2. Bấm sidebar `Merchants`.
   *  3. Bấm sidebar `Onboarding`.
   * Expected:
   *  Quay lại `/pos/onboarding?step=validate` với form trống (không nhớ
   *  `whmcsId` cũ).
   */
  test(
    'TC-ONB-022 — leaving via the sidebar and coming back resets the wizard to step 1',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage, page }) => {
      test.setTimeout(180_000);

      await onboardingPage.gotoStep(OnboardingStep.WORK_HOURS, WHMCS_ID);
      await onboardingPage.waitForReady();
      await expect(onboardingPage.businessHoursHeading).toBeVisible({ timeout: Timeouts.LONG });

      // Address the Internal links by href: the sidebar repeats labels across groups.
      await onboardingPage.sidebar.navigateToHref(new RegExp(`^${Urls.MERCHANTS}$`));
      await expect(page).toHaveURL(/\/pos\/merchants/, { timeout: Timeouts.LONG });

      await onboardingPage.sidebar.navigateToHref(new RegExp(`^${Urls.ONBOARDING}$`));
      await expect(page).toHaveURL(/\/pos\/onboarding/, { timeout: Timeouts.LONG });

      await expect(onboardingPage.enterWhmcsIdHeading).toBeVisible({ timeout: Timeouts.LONG });
      await expect
        .poll(() => onboardingPage.currentStep(), { timeout: Timeouts.MEDIUM })
        .toBe(OnboardingStep.VALIDATE);
      await expect.poll(() => onboardingPage.currentWhmcsId()).toBe('');
      await expect(onboardingPage.whmcsIdInput).toHaveValue('');
    },
  );

  /**
   * TC-ONB-023 — `Onboard Another` reset wizard về bước 1
   * Preconditions: Đang ở `?step=complete&whmcsId=3660`.
   * Steps:
   *  1. Bấm "Onboard Another".
   *  2. Đọc URL và nội dung.
   * Expected:
   *  URL thành `/pos/onboarding?step=validate` (**mất** tham số `whmcsId`);
   *  hiện form "Enter WHMCS ID" với input rỗng.
   */
  test(
    'TC-ONB-023 — Onboard Another resets to ?step=validate with an empty form',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ onboardingPage, page }) => {
      test.setTimeout(120_000);

      await onboardingPage.gotoStep(OnboardingStep.COMPLETE, WHMCS_ID);
      await onboardingPage.waitForReady();
      await expect(onboardingPage.completeHeading).toBeVisible({ timeout: Timeouts.LONG });

      // Pure client-side reset — it writes nothing to the DEV backend.
      await onboardingPage.onboardAnotherButton.click();

      await expect(page).toHaveURL(/[?&]step=validate/, { timeout: Timeouts.MEDIUM });
      await expect(page).toHaveURL(/\/pos\/onboarding/);
      await expect(onboardingPage.enterWhmcsIdHeading).toBeVisible({ timeout: Timeouts.LONG });
      await expect.poll(() => onboardingPage.currentWhmcsId()).toBe('');
      await expect(onboardingPage.whmcsIdInput).toHaveValue('');
    },
  );
});
