import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import {
  LOGIN_REDIRECT_PATTERN,
  MALICIOUS_WHMCS_IDS,
  ONBOARDING_ERRORS,
  ONBOARDING_STEP_SLUGS,
  OnboardingStep,
  SENSITIVE_TEXT_PATTERNS,
  XSS_PAYLOAD,
} from '@pages/onboarding/OnboardingPage';

/**
 * Merchant Onboarding — access control and injection hardening.
 *
 * The screen is an Internal/admin route and is NOT store-scoped: the path is a
 * bare `/pos/onboarding`, so nothing here asserts `/pos/<id>/` or touches
 * `env.STORE_ID`. Wizard position lives entirely in the query string, which is
 * also the attack surface these cases push on (`?step=<slug>&whmcsId=<value>`).
 *
 * SAFETY: `Create Merchant` (step 1) and `Save Changes & Continue` (step 2) are
 * real writes against the DEV backend. Nothing below ever clicks them — the
 * duplicate-guard case asserts `Create Merchant`'s *state* only, and the XSS
 * case types its payload and reads the DOM back without saving, which is what
 * the Expected actually turns on (the string must stay inert, not that a save
 * succeeded).
 *
 * No navigating `beforeEach`: each case starts from a different place — signed
 * out, an invalid `step`, a hostile `whmcsId`, step 2, step 7 — so navigation
 * lives inside the tests. The screen renders in 7-12 s on DEV and
 * `waitForLoadState('networkidle')` returns a blank page here, so every wait is
 * an `expect(locator)` with `Timeouts.LONG`, and the multi-navigation cases
 * raise their own test timeout with `test.slow()`.
 */

/** The already-onboarded merchant these cases deep-link. Never mutated. */
const WHMCS_ID = '3660';

/** Zod payload keys the error boundary must never print (TC-ONB-165). */
const ZOD_LEAK_MARKERS = ['"code"', '"path"', '"expected"', '"received"', 'invalid_enum_value'];

/** Assert a rendered blob of text carries nothing credential-shaped (TC-ONB-168). */
function expectNoSensitiveText(text: string, where: string): void {
  for (const pattern of SENSITIVE_TEXT_PATTERNS) {
    expect(text, `${where} must not print anything matching ${pattern}`).not.toMatch(pattern);
  }
}

test.describe('Bảo mật (Security) — Onboarding', () => {
  // The signed-out case needs a session-free context. `test.use` is scoped to
  // its own block so the remaining cases keep the shared admin storageState;
  // the reuseContext fixture builds a dedicated context whenever the resolved
  // options differ from the project defaults.
  test.describe('chưa đăng nhập (no session)', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    /**
     * TC-ONB-163 — Truy cập khi chưa đăng nhập
     * Preconditions: Context trình duyệt sạch, không `storageState`.
     * Steps:
     *  1. Vào `/pos/onboarding`.
     * Expected:
     *  Bị chuyển tới `/login` (kèm tham số `redirect=%2Fpos%2Fonboarding`);
     *  **không** lộ bất kỳ nội dung nào của wizard.
     */
    test(
      'TC-ONB-163 — an unauthenticated visit is bounced to /login with no wizard content',
      { tag: [Tag.REGRESSION, Tag.SMOKE] },
      async ({ onboardingPage, page }) => {
        // `page.goto` rather than `onboardingPage.goto()`: the Page Object's
        // navigation waits for the wizard chrome, which must never appear here.
        await page.goto(Urls.ONBOARDING, { waitUntil: 'domcontentloaded' });

        await onboardingPage.expectRedirectedToLogin();
        await expect(page).toHaveURL(LOGIN_REDIRECT_PATTERN);

        // None of the wizard's own surfaces reached the DOM.
        await expect(onboardingPage.pageTitle).toHaveCount(0);
        await expect(onboardingPage.enterWhmcsIdHeading).toHaveCount(0);
        await expect(onboardingPage.whmcsIdInput).toHaveCount(0);
        await expect(onboardingPage.integrationStatusHeading).toHaveCount(0);
        await expect(onboardingPage.stepperItems).toHaveCount(0);

        // Not even server-rendered into the HTML behind the redirect.
        const html = await page.content();
        expect(html).not.toContain('Merchant Onboarding');
        expect(html).not.toContain('Enter WHMCS ID');
        expect(html).not.toContain('Integration Status');
      },
    );
  });

  /**
   * TC-ONB-164 — Truy cập bằng tài khoản không thuộc nhóm Internal
   * Preconditions: Tài khoản merchant/staff thường (không phải admin nội bộ).
   * Steps:
   *  1. Đăng nhập bằng tài khoản đó rồi vào `/pos/onboarding`.
   * Expected:
   *  `[CẦN XÁC MINH]` — kỳ vọng bị chặn (403 / redirect) và mục `Onboarding`
   *  **không** xuất hiện trên sidebar. Đây là màn hình tạo merchant nên phải
   *  giới hạn quyền chặt.
   */
  // TODO(manual/setup): needs a second, non-Internal account (merchant/staff)
  // and a storageState built from it. The suite ships exactly one signed-in
  // admin session, so there is no role to switch to; the Expected is also
  // flagged [CẦN XÁC MINH], i.e. the block is an assumption, not an observed
  // behaviour. Unfixme once a non-Internal storageState exists.
  test.fixme(
    'TC-ONB-164 — a non-Internal account is blocked and gets no Onboarding nav item',
    { tag: [Tag.REGRESSION] },
    async () => {
      // Intentionally empty — see the TODO above.
    },
  );

  /**
   * TC-ONB-165 — Error boundary không được lộ chi tiết schema nội bộ
   * Steps:
   *  1. Vào `?step=bogus&whmcsId=3660`.
   *  2. Đọc nội dung màn lỗi.
   * Expected (thiết kế đúng):
   *  Thông báo lỗi thân thiện, chi tiết kỹ thuật chỉ ghi vào log.
   *  **Thực tế quét được**: màn hình in nguyên JSON zod gồm `code`, `path`, và
   *  toàn bộ 7 giá trị enum hợp lệ của `step` → rò rỉ chi tiết nội bộ.
   *
   * EXPECTED TO FAIL until the leak is closed — the assertions below state the
   * correct behaviour (friendly message only, app shell intact) and are
   * deliberately NOT softened to match the bug. File it as a defect, not as a
   * flaky test.
   */
  test(
    'TC-ONB-165 — the error boundary leaks no zod schema detail and keeps the app shell',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      await onboardingPage.gotoWithQuery({ step: 'bogus', whmcsId: WHMCS_ID });

      // The friendly half is what the user is allowed to see.
      await expect(onboardingPage.errorBoundaryTitle).toBeVisible({ timeout: Timeouts.LONG });
      await expect(onboardingPage.tryAgainButton).toBeVisible();

      // The raw zod payload must not be on screen at all.
      await expect(onboardingPage.errorBoundaryDetails).toHaveCount(0);

      const text = await onboardingPage.visibleText();
      for (const marker of ZOD_LEAK_MARKERS) {
        expect(text, `the error screen must not print the zod key ${marker}`).not.toContain(marker);
      }

      // The dump enumerates every valid `step` value — internal routing detail.
      const leakedSlugs = ONBOARDING_STEP_SLUGS.filter((slug) => text.includes(slug));
      expect(leakedSlugs, 'the error screen must not enumerate the internal step slugs').toEqual(
        [],
      );

      // A boundary is not allowed to swallow the whole app shell either: the
      // Internal sidebar must survive so the user can navigate away.
      const hrefs = await onboardingPage.navHrefs();
      expect(hrefs, 'the sidebar must survive the error boundary').toContain(Urls.ONBOARDING);
    },
  );

  /**
   * TC-ONB-166 — Chèn XSS vào trường text
   * Steps:
   *  1. Ở bước 2, nhập `<script>alert(1)</script>` vào `Business Name`.
   *  2. Lưu (dùng WHMCS ID dùng-một-lần).
   *  3. Xem lại giá trị ở bước 2 và ở bước 7.
   * Expected:
   *  Chuỗi được hiển thị dưới dạng văn bản thuần, **không** thực thi script;
   *  không có dialog `alert` nào bật lên.
   *
   * SAFETY: step 2 of the case (`Save Changes & Continue`) is a real PATCH on
   * DEV and is deliberately NOT performed — the Expected is about the payload
   * staying inert, which the typed value proves on its own. The round-trip
   * through a saved record and step 7 needs a single-use WHMCS ID and is left
   * to manual verification.
   */
  test(
    'TC-ONB-166 — an XSS payload typed into Business Name stays inert text',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage, page }) => {
      // Attach before navigating: an alert() fired during hydration would
      // otherwise never be recorded.
      const dialogs = onboardingPage.captureDialogs();

      await onboardingPage.gotoStep(OnboardingStep.MERCHANT_INFO, WHMCS_ID);
      await expect(onboardingPage.businessInformationHeading).toBeVisible({
        timeout: Timeouts.LONG,
      });

      await onboardingPage.businessNameInput.fill(XSS_PAYLOAD);
      await onboardingPage.businessNameInput.blur();

      // The field holds the payload verbatim, as a string...
      await expect(onboardingPage.businessNameInput).toHaveValue(XSS_PAYLOAD);

      // ...and nothing anywhere parsed it as markup.
      expect(await onboardingPage.injectedScriptCount(), 'no <script> carries the payload').toBe(0);
      const bodyHtml = await page.evaluate(() => document.body.innerHTML);
      expect(bodyHtml, 'the payload must never appear as live markup').not.toContain(XSS_PAYLOAD);
      expect(dialogs, 'no alert() dialog fired').toEqual([]);

      // Nothing is saved: the footer's write control is left untouched.
      await expect(onboardingPage.saveChangesAndContinueButton).toBeVisible();
    },
  );

  /**
   * TC-ONB-167 — Chèn giá trị lạ vào tham số `whmcsId`
   * Steps:
   *  1. Lần lượt vào `?step=validate&whmcsId=` với `<script>alert(1)</script>`,
   *     `1 OR 1=1`, `../../etc/passwd`.
   * Expected:
   *  Schema zod chặn (do yêu cầu kiểu number) → error boundary hoặc redirect về
   *  `?step=validate`; **không** thực thi script, không render nguyên chuỗi vào
   *  DOM dưới dạng HTML.
   */
  test(
    'TC-ONB-167 — hostile whmcsId values are rejected and never executed',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage, page }) => {
      test.slow(); // three full page loads at 7-12 s each on DEV.
      const dialogs = onboardingPage.captureDialogs();

      for (const id of MALICIOUS_WHMCS_IDS) {
        await onboardingPage.gotoStep(OnboardingStep.VALIDATE, id);

        // Either answer satisfies the case: the boundary catches the zod
        // failure, or the guard drops back to the plain WHMCS ID form.
        // `.first()` goes on the union — one of the two branches renders.
        await expect(
          onboardingPage.errorBoundaryTitle.or(onboardingPage.enterWhmcsIdHeading).first(),
          `${id} must be rejected, not looked up`,
        ).toBeVisible({ timeout: Timeouts.LONG });

        // Whichever branch fired, no merchant was resolved for this value.
        await expect(onboardingPage.integrationStatusHeading).toHaveCount(0);

        expect(await onboardingPage.injectedScriptCount(), `${id} injected no script`).toBe(0);
        const bodyHtml = await page.evaluate(() => document.body.innerHTML);
        expect(bodyHtml, `${id} must not reach the DOM as markup`).not.toContain(XSS_PAYLOAD);
        expect(dialogs, `no alert() dialog fired for ${id}`).toEqual([]);
      }
    },
  );

  /**
   * TC-ONB-168 — Không lộ thông tin nhạy cảm trong response hiển thị
   * Steps:
   *  1. Quan sát panel `Integration Status` và bước 7 cho một merchant bất kỳ.
   * Expected:
   *  Chỉ hiển thị trạng thái tích hợp và thông tin doanh nghiệp; **không** lộ
   *  token, khoá mã hoá, credential của DTS/Magensa/Bamboo.
   */
  test(
    'TC-ONB-168 — neither the status panel nor the summary prints credential-shaped text',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      test.slow(); // two full page loads at 7-12 s each on DEV.

      await onboardingPage.gotoStep(OnboardingStep.VALIDATE, WHMCS_ID);
      await onboardingPage.waitForIntegrationPanel();
      expectNoSensitiveText(await onboardingPage.visibleText(), 'the Integration Status panel');

      await onboardingPage.gotoStep(OnboardingStep.COMPLETE, WHMCS_ID);
      await expect(onboardingPage.completeHeading).toBeVisible({ timeout: Timeouts.LONG });
      expectNoSensitiveText(await onboardingPage.visibleText(), 'the step 7 summary');
    },
  );

  /**
   * TC-ONB-169 — Guard chống trùng bị bỏ qua khi deep-link
   * Steps:
   *  1. Nhập `3660` vào form → xác nhận bị chặn bởi `"This merchant has already
   *     been onboarded..."`.
   *  2. Vào thẳng `?step=validate&whmcsId=3660`.
   *  3. Kiểm tra nút `"Create Merchant"`.
   * Expected (thiết kế đúng):
   *  Deep-link cũng phải chạy cùng guard → hiện cảnh báo đã onboard và
   *  **disable** `"Create Merchant"`.
   *  **Thực tế quét được**: panel render bình thường với `"Create Merchant"`
   *  **enabled** → nguy cơ tạo trùng merchant.
   *
   * EXPECTED TO FAIL until the guard is moved out of the form's submit handler
   * — the assertions state the correct behaviour and are not softened.
   *
   * SAFETY: `Create Merchant` is never clicked. `Validate` only reads
   * `merchant_settings`, so step 1 of the case is a safe round-trip.
   */
  test(
    'TC-ONB-169 — deep-linking an onboarded merchant must still hit the duplicate guard',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      test.slow(); // a validate round-trip plus a second full page load.

      // 1. The form branch does run the guard — establish that first.
      await onboardingPage.goto();
      await onboardingPage.waitForValidateForm();
      await onboardingPage.submitWhmcsId(WHMCS_ID);
      await expect(onboardingPage.alreadyOnboardedError).toBeVisible({ timeout: Timeouts.LONG });
      await expect(onboardingPage.alreadyOnboardedError).toHaveText(
        ONBOARDING_ERRORS.ALREADY_ONBOARDED,
      );

      // 2. The same merchant, reached by deep-link instead of by the form.
      await onboardingPage.gotoStep(OnboardingStep.VALIDATE, WHMCS_ID);
      await onboardingPage.waitForIntegrationPanel();

      // 3. The guard must fire on this branch too, and the write control must
      //    be unusable. Never clicked either way — it is a real create on DEV.
      await expect(onboardingPage.alreadyOnboardedError).toBeVisible({ timeout: Timeouts.MEDIUM });
      await expect(onboardingPage.createMerchantButton).toBeDisabled();
    },
  );
});
