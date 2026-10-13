import { test, expect } from '@fixtures/index';
import type { Page } from '@playwright/test';
import { Tag } from '@/types/testTags';
import { Timeouts } from '@configs/constants/timeouts';
import {
  ONBOARDING_API,
  ONBOARDING_ERRORS,
  ONBOARDING_SAMPLE_IDS,
} from '@pages/onboarding/OnboardingPage';

/**
 * Step 1 of the merchant onboarding wizard — the `Enter WHMCS ID` form.
 *
 * Two things shape every test in this file.
 *
 * 1. The route is NOT store-scoped: it is a bare `/pos/onboarding`, so nothing
 *    here asserts `/pos/<id>/…` and nothing reads `env.STORE_ID`.
 * 2. Submitting this form is read-only. It fires `GET /merchant_settings/<id>`
 *    and, on a 404, `GET /merchant_onboarding/<id>` — the write lives behind
 *    `Create Merchant` on the Integration Status panel, which no test in this
 *    file clicks.
 *
 * The DEV app takes 7–12s to paint this screen, so first assertions carry
 * `Timeouts.LONG`; `networkidle` is never used (it returns a blank page here).
 */

/** The already-onboarded read-only merchant — submitted for lookup, never created. */
const WHMCS_ID = '3660';

/** No merchant behind this id, so the form walks through to Integration Status. */
const NOT_ONBOARDED_ID = ONBOARDING_SAMPLE_IDS.NOT_ONBOARDED;

/** Both endpoints a Validate submit can reach. */
const VALIDATE_ENDPOINTS = /merchant_settings|merchant_onboarding/;

/** The seven values the client-side `^\d+$` guard must reject (TC-ONB-030). */
const NON_NUMERIC_VALUES = ['12a', 'a12', '12 34', '12.5', '1e5', '+12', '-12'];

interface ApiCall {
  url: string;
  status: number;
}

/**
 * Start recording the URLs of Validate-chain requests.
 *
 * Returned array fills in as the page fires them, which is what lets the
 * negative cases prove the client-side guard never reached the network.
 */
function watchValidateRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on('request', (request) => {
    if (VALIDATE_ENDPOINTS.test(request.url())) urls.push(request.url());
  });
  return urls;
}

/** Same, but keeping each response's status so a case can assert 200 / 404. */
function watchValidateResponses(page: Page): ApiCall[] {
  const calls: ApiCall[] = [];
  page.on('response', (response) => {
    if (VALIDATE_ENDPOINTS.test(response.url())) {
      calls.push({ url: response.url(), status: response.status() });
    }
  });
  return calls;
}

test.describe('Bước 1 — Form `Validate` — Onboarding', () => {
  test.beforeEach(async ({ onboardingPage, page }) => {
    await onboardingPage.goto();
    await expect(onboardingPage.whmcsIdInput).toBeVisible({ timeout: Timeouts.LONG });
    // The first paint is server-rendered, so the form is on screen before React
    // has wired it up. Waiting for `load` plus a beat keeps a submit from being
    // swallowed by a button that is visible but not yet hydrated.
    await page.waitForLoadState('load', { timeout: Timeouts.NAVIGATION });
    await page.waitForTimeout(500);
  });

  /**
   * TC-ONB-024 — Form Validate hiển thị đủ thành phần
   * Steps:
   *  1. Vào `/pos/onboarding`.
   *  2. Quan sát khối form.
   * Expected:
   *  Heading h3 "Enter WHMCS ID", mô tả "Verify integration readiness across all
   *  systems", input `#whmcsId` với placeholder "e.g. 12345", và nút "Validate".
   */
  test(
    'TC-ONB-024 — the form renders heading, description, #whmcsId and Validate',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ onboardingPage, page }) => {
      await expect(onboardingPage.enterWhmcsIdHeading).toBeVisible({ timeout: Timeouts.LONG });
      expect(await onboardingPage.enterWhmcsIdHeading.evaluate((el) => el.tagName)).toBe('H3');

      await expect(onboardingPage.validateDescription).toBeVisible();
      await expect(onboardingPage.whmcsIdInput).toBeVisible();
      await expect(onboardingPage.whmcsIdInput).toHaveAttribute('placeholder', 'e.g. 12345');
      await expect(onboardingPage.validateButton).toBeVisible();

      // The screen is admin-wide, not store-scoped.
      await expect(page).toHaveURL(/\/pos\/nail\/admin\/onboarding/);
      expect(page.url(), 'onboarding must not be store-scoped').not.toMatch(/\/pos\/\d+\//);
    },
  );

  /**
   * TC-ONB-025 — Thuộc tính input `#whmcsId`
   * Steps:
   *  1. Đọc thuộc tính DOM của input.
   * Expected:
   *  `id="whmcsId"`, `name="whmcsId"`, `placeholder="e.g. 12345"`,
   *  `aria-invalid="false"` ở trạng thái ban đầu, không disabled, `value` rỗng.
   */
  test(
    'TC-ONB-025 — #whmcsId carries id/name/placeholder, aria-invalid=false, enabled and empty',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      const input = onboardingPage.whmcsIdInput;

      await expect(input).toBeVisible({ timeout: Timeouts.LONG });
      await expect(input).toHaveAttribute('id', 'whmcsId');
      await expect(input).toHaveAttribute('name', 'whmcsId');
      await expect(input).toHaveAttribute('placeholder', 'e.g. 12345');
      await expect(input).toHaveAttribute('aria-invalid', 'false');
      await expect(input).toBeEnabled();
      await expect(input).toHaveValue('');
    },
  );

  /**
   * TC-ONB-026 — Nút `Validate` không bị disable khi input rỗng
   * Steps:
   *  1. Vào `/pos/onboarding`.
   *  2. Kiểm tra trạng thái nút "Validate".
   * Expected:
   *  Nút enabled (hành vi hiện tại) — việc chặn được xử lý bằng validate khi
   *  submit chứ không bằng disable.
   */
  test(
    'TC-ONB-026 — Validate stays enabled while the input is empty',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      await expect(onboardingPage.whmcsIdInput).toHaveValue('', { timeout: Timeouts.LONG });
      await expect(onboardingPage.validateButton).toBeVisible();
      await expect(onboardingPage.validateButton).toBeEnabled();
    },
  );

  /**
   * TC-ONB-027 — Submit rỗng hiện lỗi `WHMCS ID must be numeric`
   * Steps:
   *  1. Vào `/pos/onboarding`.
   *  2. Không nhập gì, bấm "Validate".
   * Expected:
   *  Hiện thông báo `role="alert"` với nội dung đúng "WHMCS ID must be numeric";
   *  input có `aria-invalid="true"`; không phát sinh request tới
   *  `/merchant_settings/` hay `/merchant_onboarding/`; URL không đổi.
   */
  test(
    'TC-ONB-027 — an empty submit alerts "WHMCS ID must be numeric" without calling the API',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage, page }) => {
      const requests = watchValidateRequests(page);
      await expect(onboardingPage.validateButton).toBeVisible({ timeout: Timeouts.LONG });
      const urlBefore = page.url();

      await onboardingPage.validateButton.click();

      await expect(onboardingPage.numericError).toBeVisible();
      await expect(onboardingPage.numericError).toHaveText(ONBOARDING_ERRORS.NUMERIC);
      await expect(onboardingPage.whmcsIdInput).toHaveAttribute('aria-invalid', 'true');

      // Give a stray request a window to land before claiming none did.
      await page.waitForTimeout(1_000);
      expect(requests, 'client-side validation must not reach the network').toEqual([]);
      expect(page.url()).toBe(urlBefore);
    },
  );

  /**
   * TC-ONB-028 — Nhập chữ cái bị chặn khi submit
   * Steps:
   *  1. Nhập `abc` vào `#whmcsId`.
   *  2. Bấm "Validate".
   * Expected:
   *  Lỗi "WHMCS ID must be numeric"; không gọi API; giá trị `abc` vẫn nằm trong
   *  input (không bị xoá).
   */
  test(
    'TC-ONB-028 — submitting "abc" errors, keeps the typed value and calls nothing',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage, page }) => {
      const requests = watchValidateRequests(page);
      await expect(onboardingPage.whmcsIdInput).toBeVisible({ timeout: Timeouts.LONG });

      await onboardingPage.submitWhmcsId('abc');

      await expect(onboardingPage.numericError).toHaveText(ONBOARDING_ERRORS.NUMERIC);
      await expect(onboardingPage.whmcsIdInput).toHaveValue('abc');
      await expect(onboardingPage.whmcsIdInput).toHaveAttribute('aria-invalid', 'true');

      await page.waitForTimeout(1_000);
      expect(requests, 'a non-numeric value must not reach the network').toEqual([]);
    },
  );

  /**
   * TC-ONB-029 — Input không chặn ký tự khi gõ (validate chỉ ở submit)
   * Steps:
   *  1. Gõ `abc` vào `#whmcsId`.
   *  2. Đọc `value` mà chưa submit.
   * Expected:
   *  `value` = "abc" — input không áp mask số; xác nhận validate là client-side
   *  khi submit.
   */
  test(
    'TC-ONB-029 — typing letters is not masked and raises no error before submit',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      const input = onboardingPage.whmcsIdInput;
      await expect(input).toBeVisible({ timeout: Timeouts.LONG });

      await input.click();
      await input.pressSequentially('abc');

      // No numeric mask: every keystroke survives, letters and digits alike.
      // (The field also re-validates on change, so the alert may already be up —
      // that is the validation, not the input, rejecting the value.)
      await expect(input).toHaveValue('abc');
      await input.pressSequentially('1x');
      await expect(input).toHaveValue('abc1x');
    },
  );

  /**
   * TC-ONB-030 — Giá trị hỗn hợp chữ–số bị chặn
   * Steps:
   *  1. Lần lượt nhập `12a`, `a12`, `12 34`, `12.5`, `1e5`, `+12`, `-12` rồi bấm
   *     "Validate".
   * Expected:
   *  Cả 7 giá trị đều báo "WHMCS ID must be numeric" (regex `^\d+$`); không gọi
   *  API; URL không đổi.
   */
  test(
    'TC-ONB-030 — all seven mixed alphanumeric values are rejected as non-numeric',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage, page }) => {
      test.slow();
      const requests = watchValidateRequests(page);
      await expect(onboardingPage.whmcsIdInput).toBeVisible({ timeout: Timeouts.LONG });
      const urlBefore = page.url();

      for (const value of NON_NUMERIC_VALUES) {
        await onboardingPage.submitWhmcsId(value);
        await expect(onboardingPage.numericError, `"${value}" must be rejected`).toHaveText(
          ONBOARDING_ERRORS.NUMERIC,
        );
        await expect(onboardingPage.whmcsIdInput).toHaveAttribute('aria-invalid', 'true');
      }

      await page.waitForTimeout(1_000);
      expect(requests, 'none of the seven values may reach the network').toEqual([]);
      expect(page.url()).toBe(urlBefore);
    },
  );

  /**
   * TC-ONB-031 — Khoảng trắng đầu/cuối
   * Steps:
   *  1. Nhập `" 3660 "` (có space) rồi bấm "Validate".
   * Expected:
   *  [CẦN XÁC MINH] — theo regex `^\d+$` thì space làm fail → kỳ vọng lỗi
   *  "WHMCS ID must be numeric". Nếu hệ thống muốn trim thì đây là gap cần bổ sung.
   */
  // TODO(manual/setup): Expected is marked [CẦN XÁC MINH] and the two candidate
  // outcomes contradict each other — the raw `^\d+$` guard rejects the padded
  // value, while a trimming form would instead look 3660 up and answer "already
  // onboarded". Pin the real behaviour on DEV first, then write the assertion.
  test.fixme(
    'TC-ONB-031 — " 3660 " with surrounding spaces is rejected as non-numeric',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      // Best-effort arrange only; the assertion waits on manual verification.
      await onboardingPage.submitWhmcsId(` ${WHMCS_ID} `);
    },
  );

  /**
   * TC-ONB-032 — Số 0 đứng đầu (`0003660`)
   * Steps:
   *  1. Nhập `0003660` rồi bấm "Validate".
   * Expected:
   *  Qua được regex; API được gọi với giá trị đã nhập. [CẦN XÁC MINH] liệu backend
   *  coi `0003660` ≡ `3660` (phải báo "already onboarded") hay coi là ID khác
   *  (rủi ro tạo trùng merchant).
   */
  // TODO(manual/setup): Expected is marked [CẦN XÁC MINH]. Whether the backend
  // normalises `0003660` to `3660` decides between the already-onboarded error
  // and a live Integration Status panel, and the second branch is the duplicate-
  // merchant risk the case is written to expose — needs a manual DEV check
  // before it can assert anything.
  test.fixme(
    'TC-ONB-032 — leading zeros (`0003660`) clear the regex and reach the lookup',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      await onboardingPage.submitWhmcsId(`000${WHMCS_ID}`);
    },
  );

  /**
   * TC-ONB-033 — Sửa giá trị sau khi lỗi thì lỗi biến mất
   * Steps:
   *  1. Submit rỗng để hiện lỗi.
   *  2. Gõ `12345678` vào input.
   *  3. Quan sát vùng lỗi.
   * Expected:
   *  Thông báo lỗi biến mất, `aria-invalid` trở về `false` (listener `onChange`
   *  được đăng ký trên field).
   */
  test(
    'TC-ONB-033 — editing the field after an error clears the alert and aria-invalid',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      await expect(onboardingPage.validateButton).toBeVisible({ timeout: Timeouts.LONG });
      await onboardingPage.validateButton.click();
      await expect(onboardingPage.numericError).toBeVisible();

      // Typing only — the value is never submitted, so no API call is made.
      await onboardingPage.whmcsIdInput.fill(NOT_ONBOARDED_ID);

      await expect(onboardingPage.numericError).toHaveCount(0);
      await expect(onboardingPage.whmcsIdInput).toHaveAttribute('aria-invalid', 'false');
    },
  );

  /**
   * TC-ONB-034 — Submit bằng phím Enter
   * Steps:
   *  1. Focus `#whmcsId`.
   *  2. Nhập một WHMCS ID chưa onboard.
   *  3. Nhấn `Enter`.
   * Expected:
   *  Form submit y hệt khi bấm "Validate" (đây là `<form>` với nút `type=submit`);
   *  chuyển sang panel Integration Status.
   */
  test(
    'TC-ONB-034 — Enter submits the form and reaches the Integration Status panel',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage, page }) => {
      test.slow();
      await expect(onboardingPage.whmcsIdInput).toBeVisible({ timeout: Timeouts.LONG });

      await onboardingPage.submitWhmcsIdWithEnter(NOT_ONBOARDED_ID);

      await expect(onboardingPage.integrationStatusHeading).toBeVisible({
        timeout: Timeouts.LONG,
      });
      await expect(page).toHaveURL(new RegExp(`[?&]whmcsId=${NOT_ONBOARDED_ID}`), {
        timeout: Timeouts.MEDIUM,
      });
      await expect(onboardingPage.numericError).toHaveCount(0);
    },
  );

  /**
   * TC-ONB-035 — WHMCS ID đã onboard bị chặn
   * Preconditions: biết một WHMCS ID đã onboard (vd `3660`).
   * Steps:
   *  1. Nhập ID đó.
   *  2. Bấm "Validate".
   *  3. Chờ phản hồi.
   * Expected:
   *  Hiện đúng chuỗi "This merchant has already been onboarded. Please use a
   *  different WHMCS ID." màu destructive; vẫn ở form, URL giữ nguyên
   *  `?step=validate` (không thêm `whmcsId`); request `GET /merchant_settings/<id>`
   *  trả `200`.
   */
  test(
    'TC-ONB-035 — an already-onboarded id is blocked on the form with no whmcsId on the URL',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage, page }) => {
      test.slow();
      const calls = watchValidateResponses(page);
      await expect(onboardingPage.whmcsIdInput).toBeVisible({ timeout: Timeouts.LONG });
      const urlBefore = page.url();

      await onboardingPage.submitWhmcsId(WHMCS_ID);

      await expect(onboardingPage.alreadyOnboardedError).toBeVisible({ timeout: Timeouts.LONG });
      await expect(onboardingPage.alreadyOnboardedError).toHaveText(
        ONBOARDING_ERRORS.ALREADY_ONBOARDED,
      );

      // Still on the form, and the URL never picked up the id.
      await expect(onboardingPage.enterWhmcsIdHeading).toBeVisible();
      await expect(onboardingPage.integrationStatusHeading).toHaveCount(0);
      expect(onboardingPage.currentWhmcsId()).toBe('');
      expect(page.url()).toBe(urlBefore);

      const statuses = calls
        .filter((call) => /merchant_settings/.test(call.url))
        .map((call) => call.status);
      expect(statuses, 'the lookup answers 200 for an existing merchant').toContain(200);
    },
  );

  /**
   * TC-ONB-036 — WHMCS ID chưa onboard đi tiếp sang Integration Status
   * Steps:
   *  1. Nhập một ID chưa onboard (vd `12345678`).
   *  2. Bấm "Validate".
   * Expected:
   *  `GET /merchant_settings/<id>` trả `404` → gọi tiếp `GET /merchant_onboarding/<id>`;
   *  URL thành `?step=validate&whmcsId=12345678`; panel "Integration Status" hiển thị.
   */
  test(
    'TC-ONB-036 — a not-onboarded id opens Integration Status and adds whmcsId to the URL',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ onboardingPage, page }) => {
      test.slow();
      const calls = watchValidateResponses(page);
      await expect(onboardingPage.whmcsIdInput).toBeVisible({ timeout: Timeouts.LONG });

      await onboardingPage.submitWhmcsId(NOT_ONBOARDED_ID);

      await expect(onboardingPage.integrationStatusHeading).toBeVisible({
        timeout: Timeouts.LONG,
      });
      await expect(page).toHaveURL(/[?&]step=validate/);
      await expect(page).toHaveURL(new RegExp(`[?&]whmcsId=${NOT_ONBOARDED_ID}`));

      const settingsStatuses = calls
        .filter((call) => /merchant_settings/.test(call.url))
        .map((call) => call.status);
      expect(settingsStatuses, 'the lookup 404s for an id with no merchant').toContain(404);
      expect(
        calls.some((call) => /merchant_onboarding/.test(call.url)),
        'the 404 must chain into the onboarding readiness call',
      ).toBe(true);
    },
  );

  /**
   * TC-ONB-037 — Nút `Validate` hiện spinner và bị disable khi đang gọi API
   * Steps:
   *  1. Làm chậm mạng (throttle) hoặc chặn/route delay request `merchant_settings`.
   *  2. Submit một ID hợp lệ.
   *  3. Quan sát nút trong lúc chờ.
   * Expected:
   *  Nút "Validate" hiển thị icon spinner (`animate-spin`) và ở trạng thái
   *  `disabled`; sau khi có phản hồi thì trở lại bình thường.
   */
  // The `merchant_settings` lookup is stalled with a `page.route` delay so the
  // pending window stays open long enough to observe — unthrottled, DEV answers
  // faster than the spinner paints (same technique as TC-ONB-159). 3660 is an
  // already-onboarded id, so the lookup is a single read-only GET that 200s and
  // leaves the Validate button in place to re-enable afterwards.
  test(
    'TC-ONB-037 — Validate shows a spinner and is disabled while the lookup is in flight',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage, page }) => {
      const stallMs = 1_500;
      await page.route(ONBOARDING_API.MERCHANT_SETTINGS, async (route) => {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, stallMs);
        });
        await route.continue();
      });

      await onboardingPage.submitWhmcsId(WHMCS_ID);

      // While the lookup is held open, the button spins and refuses further input.
      await expect(
        onboardingPage.validateSpinner,
        'the Validate button spins while the lookup is in flight',
      ).toBeVisible({ timeout: Timeouts.MEDIUM });
      await expect(onboardingPage.validateButton).toBeDisabled();

      // Once the response lands the spinner clears and the button returns to normal.
      await expect(onboardingPage.validateSpinner).toHaveCount(0, { timeout: Timeouts.LONG });
      await expect(onboardingPage.validateButton).toBeEnabled();
      await page.unroute(ONBOARDING_API.MERCHANT_SETTINGS);
    },
  );

  /**
   * TC-ONB-038 — Không cho submit hai lần liên tiếp
   * Steps:
   *  1. Nhập ID hợp lệ.
   *  2. Bấm "Validate" liên tiếp 3 lần thật nhanh.
   * Expected:
   *  Chỉ có một chuỗi request được phát (nút disable ngay khi pending); không xuất
   *  hiện lỗi trùng hoặc nhấp nháy giao diện.
   */
  // Same stalled-response setup as TC-ONB-037: with the lookup held open the
  // button stays disabled across all three clicks. The first (unforced) click
  // fires while the button is still enabled; the next two are `force`d onto the
  // now-disabled button and must be swallowed, so only one lookup reaches the
  // network. Without the stall, Playwright would wait for the button to re-enable
  // between clicks and each would fire its own chain.
  test(
    'TC-ONB-038 — three rapid Validate clicks fire only one request chain',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage, page }) => {
      const settingsRequests: string[] = [];
      page.on('request', (request) => {
        if (/merchant_settings/.test(request.url())) settingsRequests.push(request.url());
      });

      const stallMs = 1_500;
      await page.route(ONBOARDING_API.MERCHANT_SETTINGS, async (route) => {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, stallMs);
        });
        await route.continue();
      });

      await onboardingPage.whmcsIdInput.fill(WHMCS_ID);
      await onboardingPage.validateButton.click();
      await onboardingPage.validateButton.click({ force: true });
      await onboardingPage.validateButton.click({ force: true });

      // Let the stalled lookup resolve, then confirm only one chain went out.
      await expect(onboardingPage.validateSpinner).toHaveCount(0, { timeout: Timeouts.LONG });
      await page.unroute(ONBOARDING_API.MERCHANT_SETTINGS);
      expect(settingsRequests, 'only one lookup chain may fire').toHaveLength(1);
    },
  );
});
