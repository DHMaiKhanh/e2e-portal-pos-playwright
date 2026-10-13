import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import {
  LOGIN_REDIRECT_PATTERN,
  ONBOARDING_API,
  ONBOARDING_SAMPLE_IDS,
  OnboardingPage,
  OnboardingStep,
} from '@pages/onboarding/OnboardingPage';

/**
 * Merchant Onboarding — negative and edge behaviour.
 *
 * The route is NOT store-scoped: it is a bare `/pos/onboarding`, so nothing here
 * asserts `/pos/<id>/` or touches `env.STORE_ID`. Wizard position lives entirely
 * in the query string, which is what most of these cases attack.
 *
 * SAFETY: `Create Merchant` (step 1) and `Save Changes` / `Save Changes &
 * Continue` (steps 2-6) are real writes against the DEV backend. No test in this
 * file clicks any of them. Submitting the Validate form, typing into a field and
 * navigating are read-only and are used freely; the one case whose Steps end in
 * a save takes the reload branch its Expected also allows (TC-ONB-139), and the
 * one that cannot avoid a save is parked as a scaffold (TC-ONB-141).
 *
 * Two cases are written against the behaviour the doc calls CORRECT rather than
 * the behaviour DEV currently has, and say so in their JSDoc: TC-ONB-133
 * (`whmcsId=0` keeps the form) and TC-ONB-134 (a negative id survives on the
 * URL). Softening either would encode the bug as the spec.
 *
 * Session-clearing and offline emulation run on `isolatedPage` — a Page in a
 * context of its own — because the worker-shared context would otherwise be left
 * signed out or offline for every later test on that worker.
 *
 * The screen renders in 7-12 s on DEV and `waitForLoadState('networkidle')`
 * returns a blank page here, so every first assertion carries `Timeouts.LONG`
 * and the multi-navigation cases raise their own test timeout.
 */

/** The already-onboarded merchant these cases deep-link. Never mutated. */
const WHMCS_ID = '3660';

/** The second merchant TC-ONB-140 opens in its own tab (`whmcsId=4`). */
const SECOND_WHMCS_ID = ONBOARDING_SAMPLE_IDS.DTS_OPTIONAL;

/** 20 digits — past `Number.MAX_SAFE_INTEGER`, so any float round-trip shows (TC-ONB-135). */
const HUGE_WHMCS_ID = '99999999999999999999';

/** What `99999999999999999999` becomes once it is pushed through a JS number. */
const HUGE_WHMCS_ID_ROUNDED = '100000000000000000000';

/** The negative id the form rejects but the URL currently accepts (TC-ONB-134). */
const NEGATIVE_WHMCS_ID = '-5';

/** Sentinels TC-ONB-140 types into each tab. Typed only — never saved. */
const TAB_A_SENTINEL = 'e2e-tab-a-never-saved';
const TAB_B_SENTINEL = 'e2e-tab-b-never-saved';

/**
 * Land on step 1's form and wait until it can actually take a submit.
 *
 * The first paint is server-rendered, so the form is on screen before React has
 * wired it up and a click fired too early is swallowed.
 */
async function hydrateValidateForm(onboarding: OnboardingPage): Promise<void> {
  await onboarding.waitForValidateForm();
  await onboarding.page.waitForLoadState('load', { timeout: Timeouts.NAVIGATION });
  await onboarding.page.waitForTimeout(500);
}

test.describe('Tiêu cực & biên (Negative / Edge) — Onboarding', () => {
  // Land on step 1 without paying the 7-12 s render here: every case below
  // navigates again — several on a page of their own — so each test waits for
  // the state it actually asserts on.
  test.beforeEach(async ({ onboardingPage }) => {
    await onboardingPage.gotoStep(OnboardingStep.VALIDATE);
  });

  /**
   * TC-ONB-133 — `whmcsId=0` không render panel
   * Steps:
   *  1. Vào `/pos/onboarding`.
   *  2. Nhập `0`, bấm `"Validate"`.
   *  3. Quan sát URL và nội dung.
   * Expected:
   *  **Bug đã quan sát được** — URL thành `?step=validate&whmcsId=0` (đã qua guard
   *  "chưa onboard") nhưng màn hình **vẫn hiện form**, không ra panel
   *  `Integration Status` → nghi kiểm tra falsy (`if (whmcsId)`) khiến `0` bị coi
   *  như không có. Kỳ vọng đúng: hoặc render panel với kết quả "không tìm thấy",
   *  hoặc chặn `0` ngay từ validate với thông báo rõ ràng.
   *
   * EXPECTED TO FAIL until the falsy check is fixed. The assertion encodes the
   * two outcomes the doc calls correct — an id on the URL means the panel owes a
   * result, otherwise the submit was blocked and owes a message — so the current
   * third outcome (id on the URL, form still up, nothing said) is a failure.
   *
   * Read-only: the Validate submit only fires GET lookups.
   */
  // PRODUCT GAP (2026-10-11): whmcsId=0 is treated as falsy — the id lands on the URL but the form stays up with no Integration Status panel and no error; expected either the panel with a "not found" result or a blocking message. Re-enable once fixed.
  test.fixme(
    'TC-ONB-133 — whmcsId=0 either reaches the panel or is blocked with a message',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage, page }) => {
      test.setTimeout(120_000);

      await hydrateValidateForm(onboardingPage);
      await onboardingPage.submitWhmcsId('0');

      // Settle: the app has either moved the id onto the URL, swapped the panel
      // in, or printed an error. `validateBranch()` reads the DOM once, so the
      // wait has to be the poll rather than the assertion.
      await expect
        .poll(
          async () =>
            onboardingPage.currentWhmcsId() !== '' ||
            (await onboardingPage.validateBranch()) === 'panel' ||
            (await page.getByRole('alert').count()) > 0,
          { timeout: Timeouts.LONG },
        )
        .toBe(true);

      const branch = await onboardingPage.validateBranch();
      const idOnUrl = onboardingPage.currentWhmcsId();

      if (idOnUrl === '0') {
        // Past the guard, so the panel owes a "not found" result — `0` must not
        // be swallowed by a falsy check on the way in.
        expect(branch, 'whmcsId=0 survived onto the URL, so the panel must render').toBe('panel');
        await expect(onboardingPage.integrationStatusHeading).toBeVisible({
          timeout: Timeouts.LONG,
        });
      } else {
        // The other correct branch: `0` was rejected at validate — the form
        // stays up, and it has to say why.
        expect(branch, 'whmcsId=0 was rejected, so the form stays').toBe('form');
        await expect(
          page.getByRole('alert'),
          'rejecting whmcsId=0 must be explained to the user',
        ).not.toHaveCount(0);
      }
    },
  );

  /**
   * TC-ONB-134 — `whmcsId` âm qua URL được chấp nhận
   * Steps:
   *  1. Vào `?step=validate&whmcsId=-5`.
   * Expected:
   *  **Bất nhất đã quan sát được** — form chặn dấu `-` (regex `^\d+$`) nhưng URL
   *  thì chấp nhận và gọi API, trả `Whmcs ID not found.`. Kỳ vọng đúng: schema URL
   *  nên ràng buộc số nguyên dương và đẩy về `?step=validate` khi giá trị âm.
   *
   * EXPECTED TO FAIL until the URL schema matches the form's `^\d+$` guard: today
   * the negative id stays on the URL and the panel renders behind it.
   */
  // PRODUCT GAP (2026-10-11): a negative whmcsId (-5) survives on the URL and the panel renders behind it; the URL schema should reject it like the form's ^\d+$ guard and drop back to ?step=validate. Re-enable once fixed.
  test.fixme(
    'TC-ONB-134 — a negative whmcsId on the URL is rejected the way the form rejects it',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      test.setTimeout(120_000);

      await onboardingPage.gotoStep(OnboardingStep.VALIDATE, NEGATIVE_WHMCS_ID);
      await onboardingPage.waitForReady();
      await expect
        .poll(async () => onboardingPage.validateBranch(), { timeout: Timeouts.LONG })
        .not.toBe('neither');

      expect(onboardingPage.currentStep()).toBe(OnboardingStep.VALIDATE);
      expect(
        onboardingPage.currentWhmcsId(),
        'a negative whmcsId must not survive on the URL',
      ).toBe('');
      expect(
        await onboardingPage.validateBranch(),
        'a negative whmcsId must not reach the Integration Status panel',
      ).toBe('form');
      await expect(onboardingPage.integrationStatusHeading).toHaveCount(0);
    },
  );

  /**
   * TC-ONB-135 — `whmcsId` rất lớn
   * Steps:
   *  1. Vào `?step=validate&whmcsId=99999999999999999999`.
   * Expected:
   *  Không crash; hiển thị panel với trạng thái "không tìm thấy" hoặc lỗi có kiểm
   *  soát; không tràn số/`NaN` trên giao diện.
   */
  // PRODUCT GAP (2026-10-11): a 20-digit whmcsId is pushed through a JS number and rounded — the panel echoes "WHMCS ID: 100000000000000000000" instead of the exact value given. Re-enable once fixed.
  test.fixme(
    'TC-ONB-135 — a 20-digit whmcsId renders a controlled result with no NaN or rounding',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      test.setTimeout(120_000);

      await onboardingPage.gotoStep(OnboardingStep.VALIDATE, HUGE_WHMCS_ID);
      await onboardingPage.waitForReady();
      await expect
        .poll(async () => onboardingPage.validateBranch(), { timeout: Timeouts.LONG })
        .not.toBe('neither');

      const branch = await onboardingPage.validateBranch();

      // No crash: the app never fell into its error boundary.
      await expect(onboardingPage.errorBoundaryTitle).toHaveCount(0);

      const rendered = await onboardingPage.visibleText();
      expect(rendered.length, 'the screen must not be blank').toBeGreaterThan(0);

      // No numeric overflow: nothing on screen went through a JS number.
      expect(rendered, 'no NaN / Infinity on screen').not.toMatch(/\bNaN\b|\bInfinity\b/);
      expect(rendered, 'the id must not be rendered in scientific notation').not.toMatch(
        /1e\+?\d+/i,
      );
      expect(rendered, 'the id must not be rounded by a float conversion').not.toContain(
        HUGE_WHMCS_ID_ROUNDED,
      );

      if (branch === 'panel') {
        // Whatever the lookup answered, the panel echoes the id byte for byte.
        expect(rendered, 'the panel must echo the id exactly as given').toContain(HUGE_WHMCS_ID);
      }
    },
  );

  /**
   * TC-ONB-136 — Mất mạng khi đang validate
   * Steps:
   *  1. Nhập ID hợp lệ.
   *  2. Ngắt mạng (`context.setOffline(true)`).
   *  3. Bấm `"Validate"`.
   * Expected:
   *  Hiện thông báo lỗi có kiểm soát (toast hoặc inline), nút `"Validate"` trở lại
   *  enabled, **không** trắng trang, **không** kẹt spinner vĩnh viễn.
   *
   * Runs on `isolatedPage`: `setOffline` is a context-level switch, and taking
   * the worker-shared context offline would strand every later test on it. The
   * `finally` restores connectivity even so.
   *
   * The error *surface* is not asserted — the scan never pinned whether this
   * failure lands as a sonner toast or an inline message, so demanding one of
   * them would encode a guess. The three clauses that are unambiguous (button
   * usable again, no blank page, no stuck spinner) are asserted in full.
   */
  // PRODUCT GAP (2026-10-11): an offline/failed validate submit leaves the Validate spinner spinning and the button disabled indefinitely — the app never catches the network failure to re-enable the form. Re-enable once fixed.
  test.fixme(
    'TC-ONB-136 — a validate submit while offline fails visibly instead of hanging',
    { tag: [Tag.REGRESSION] },
    async ({ isolatedPage }) => {
      test.setTimeout(120_000);

      const onboarding = new OnboardingPage(isolatedPage);
      await onboarding.goto();
      await hydrateValidateForm(onboarding);

      try {
        await onboarding.setOffline(true);
        await onboarding.submitWhmcsId(ONBOARDING_SAMPLE_IDS.NOT_ONBOARDED);

        // Not a blank page: the form is still up and still holds what was typed.
        await expect(onboarding.enterWhmcsIdHeading).toBeVisible({ timeout: Timeouts.MEDIUM });
        await expect(onboarding.whmcsIdInput).toHaveValue(ONBOARDING_SAMPLE_IDS.NOT_ONBOARDED);

        // Not stuck: the pending spinner clears and the button takes another try.
        await expect(onboarding.validateSpinner).toHaveCount(0, { timeout: Timeouts.MEDIUM });
        await expect(onboarding.validateButton).toBeEnabled({ timeout: Timeouts.MEDIUM });

        // The failed lookup took neither the app nor the wizard with it.
        await expect(onboarding.errorBoundaryTitle).toHaveCount(0);
        await expect(onboarding.integrationStatusHeading).toHaveCount(0);
        expect(onboarding.currentWhmcsId(), 'a failed lookup must not route the wizard').toBe('');
      } finally {
        await onboarding.setOffline(false);
      }
    },
  );

  /**
   * TC-ONB-137 — API `merchant_onboarding` trả 500
   * Steps:
   *  1. `page.route` chặn `**\/merchant_onboarding/**` trả 500.
   *  2. Validate một ID hợp lệ.
   * Expected:
   *  Hiển thị lỗi thân thiện (kỳ vọng badge `Failed Connect` + `"Failed to connect.
   *  Please contact support."`), nút `"Check Again"` vẫn dùng được; `"Create
   *  Merchant"` disabled.
   */
  // TODO(manual/setup): the Expected's target was never observed live. `Failed
  // Connect` and "Failed to connect. Please contact support." exist in the bundle,
  // but no scan of DEV ever rendered them, so which branch a 500 actually paints —
  // that badge, an empty panel, or the app's error boundary — is unknown, and the
  // assertion cannot be written without guessing it. Its twin TC-ONB-057 is parked
  // in TC4-step1-integration-status for the same reason. Pin the branch manually.
  test.fixme(
    'TC-ONB-137 — a 500 from merchant_onboarding shows Failed Connect with Create Merchant disabled',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      // Best-effort arrange only: install the fault and land on the panel route.
      // Asserts nothing, clicks nothing.
      await onboardingPage.stubApi(ONBOARDING_API.MERCHANT_ONBOARDING, 500);
      await onboardingPage.gotoStep(OnboardingStep.VALIDATE, ONBOARDING_SAMPLE_IDS.NOT_ONBOARDED);
    },
  );

  /**
   * TC-ONB-138 — API `merchant_settings` trả 500 ở bước 2
   * Steps:
   *  1. Chặn `**\/merchant_settings/**` trả 500.
   *  2. Vào `?step=merchant-info&whmcsId=3660`.
   * Expected:
   *  Không trắng trang; hiện lỗi hoặc form rỗng kèm thông báo; người dùng vẫn
   *  thoát được khỏi màn hình.
   *
   * Which recovery the app picks (an error, or an empty form with a message) is
   * not asserted — the Expected accepts either. What it does not accept is a
   * blank page or a dead end, so both of those are.
   */
  test(
    'TC-ONB-138 — a 500 from merchant_settings on step 2 leaves the screen readable and escapable',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage, page }) => {
      test.setTimeout(120_000);

      await onboardingPage.stubApi(ONBOARDING_API.MERCHANT_SETTINGS, 500);
      await onboardingPage.gotoStep(OnboardingStep.MERCHANT_INFO, WHMCS_ID);

      // Not blank: the wizard chrome paints even though its data call failed.
      await onboardingPage.waitForReady();
      expect(
        (await onboardingPage.visibleText()).length,
        'a failed data call must not blank the page',
      ).toBeGreaterThan(0);

      // Not a dead end: the Internal nav survived, and it still navigates.
      const merchantsLink = onboardingPage.navLinkByHref(Urls.MERCHANTS).first();
      await expect(merchantsLink).toBeVisible({ timeout: Timeouts.LONG });
      await merchantsLink.click();
      await expect(page).toHaveURL(/\/pos\/nail\/admin\/merchant/, {
        timeout: Timeouts.NAVIGATION,
      });
    },
  );

  /**
   * TC-ONB-139 — Session hết hạn giữa chừng
   * Steps:
   *  1. Vào `?step=work-hours&whmcsId=3660`.
   *  2. Xoá cookie/token phiên.
   *  3. Bấm `"Save Changes"` hoặc reload.
   * Expected:
   *  Bị đưa về `/login` (kèm `redirect` param), **không** hiện màn hình trắng hay
   *  lỗi 401 thô. (Ghi nhận: bản quét bắt được một request `401` nền trên trang
   *  này — cần xác định nguồn.)
   *
   * SAFETY: step 3 offers two triggers and this takes the reload one — `Save
   * Changes` writes merchant 3660's work hours on DEV for real.
   *
   * Runs on `isolatedPage` so the cleared cookies die with the test instead of
   * signing out every later test on this worker.
   */
  test(
    'TC-ONB-139 — losing the session mid-wizard bounces to /login, not a blank or raw 401 screen',
    { tag: [Tag.REGRESSION] },
    async ({ isolatedPage }) => {
      test.setTimeout(120_000);

      const onboarding = new OnboardingPage(isolatedPage);
      await onboarding.gotoStep(OnboardingStep.WORK_HOURS, WHMCS_ID);
      await onboarding.waitForReady();
      await expect(onboarding.businessHoursHeading).toBeVisible({ timeout: Timeouts.LONG });

      await onboarding.clearSessionCookies();
      await isolatedPage.reload({ waitUntil: 'domcontentloaded' });

      await onboarding.expectRedirectedToLogin();
      await expect(isolatedPage, 'the return path must come back on the URL').toHaveURL(
        LOGIN_REDIRECT_PATTERN,
        { timeout: Timeouts.MEDIUM },
      );

      const rendered = await onboarding.visibleText();
      expect(rendered.length, 'the sign-out must not land on a white screen').toBeGreaterThan(0);
      expect(rendered, 'no raw 401 may reach the user').not.toMatch(/\b401\b|unauthori[sz]ed/i);
      // The protected step went away with the session.
      await expect(onboarding.businessHoursHeading).toHaveCount(0);
    },
  );

  /**
   * TC-ONB-140 — Mở nhiều tab với `whmcsId` khác nhau
   * Steps:
   *  1. Tab A: `?step=merchant-info&whmcsId=3660`.
   *  2. Tab B: `?step=merchant-info&whmcsId=4`.
   *  3. Sửa dữ liệu ở cả hai.
   * Expected:
   *  Hai tab độc lập, không lẫn dữ liệu (state lấy từ URL chứ không từ storage
   *  dùng chung).
   *
   * SAFETY: both tabs are typed into and neither is ever saved — `Save Changes &
   * Continue` is a real write on DEV. The sentinel strings live only in the DOM.
   *
   * The second tab is opened in the same BrowserContext on purpose: sharing
   * cookies and localStorage is what would let one tab's edit leak into the
   * other, which is exactly the leak this case rules out.
   */
  test(
    'TC-ONB-140 — two tabs on different whmcsIds keep their own state',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage, page }) => {
      test.setTimeout(180_000);

      const tabA = onboardingPage;
      await tabA.gotoStep(OnboardingStep.MERCHANT_INFO, WHMCS_ID);
      await expect(tabA.businessNameInput).toBeVisible({ timeout: Timeouts.LONG });

      const secondTab = await page.context().newPage();
      try {
        const tabB = new OnboardingPage(secondTab);
        await tabB.gotoStep(OnboardingStep.MERCHANT_INFO, SECOND_WHMCS_ID);
        await expect(tabB.businessNameInput).toBeVisible({ timeout: Timeouts.LONG });

        // Each tab holds the merchant its own URL names.
        expect(tabA.currentWhmcsId()).toBe(WHMCS_ID);
        expect(tabB.currentWhmcsId()).toBe(SECOND_WHMCS_ID);

        // A distinct sentinel per tab — client-side only, never saved.
        await tabA.businessNameInput.fill(TAB_A_SENTINEL);
        await tabB.businessNameInput.fill(TAB_B_SENTINEL);

        // Neither edit crossed over, and neither tab was re-pointed.
        await expect(tabA.businessNameInput).toHaveValue(TAB_A_SENTINEL);
        await expect(tabB.businessNameInput).toHaveValue(TAB_B_SENTINEL);
        expect(tabA.currentWhmcsId()).toBe(WHMCS_ID);
        expect(tabB.currentWhmcsId()).toBe(SECOND_WHMCS_ID);
      } finally {
        await secondTab.close();
      }
    },
  );

  /**
   * TC-ONB-141 — Nhập chuỗi rất dài vào field text
   * Steps:
   *  1. Nhập 1000 ký tự vào `#businessName` rồi lưu.
   * Expected:
   *  `[CẦN XÁC MINH]` — kỳ vọng có giới hạn độ dài (maxlength hoặc validate) và
   *  thông báo rõ; layout không bị vỡ.
   */
  // TODO(manual/setup): real write on DEV — needs a single-use WHMCS ID. The Steps
  // end in `Save Changes & Continue`, which would overwrite merchant 3660's business
  // name for real, and the Expected is marked [CẦN XÁC MINH]: nobody has confirmed a
  // `maxlength` attribute or a validation message exists, so both the cap and its
  // wording would be guesses. Needs a disposable merchant plus a PO ruling on the cap.
  test.fixme(
    'TC-ONB-141 — a 1000-character Business Name is length-limited with a clear message',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      // Best-effort arrange only: reach step 2. Types nothing, saves nothing.
      await onboardingPage.gotoStep(OnboardingStep.MERCHANT_INFO, WHMCS_ID);
    },
  );
});
