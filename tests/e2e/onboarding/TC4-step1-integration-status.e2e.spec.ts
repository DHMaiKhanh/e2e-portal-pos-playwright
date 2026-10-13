import type { Locator, Page } from '@playwright/test';
import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Timeouts } from '@configs/constants/timeouts';
import {
  INTEGRATION_BADGES,
  INTEGRATION_DESCRIPTIONS,
  INTEGRATION_SUMMARIES,
  INTEGRATION_SYSTEMS,
  ONBOARDING_SAMPLE_IDS,
  OnboardingPage,
  OnboardingStep,
  stepUrlPattern,
} from '@pages/onboarding/OnboardingPage';

/**
 * Merchant Onboarding — step 1, the `Integration Status` panel.
 *
 * The screen is an Internal/admin route and is NOT store-scoped: the path is a
 * bare `/pos/onboarding`, so nothing here may assert `/pos/<id>/` or touch
 * `env.STORE_ID`. Wizard position lives entirely in the query string, which is
 * how these read-only cases reach the panel: `?step=validate&whmcsId=<id>`
 * renders it directly, without going through the form.
 *
 * SAFETY: `Create Merchant` writes to the DEV backend for real. No test in this
 * file ever clicks it — its presence and its enabled/disabled state are
 * asserted instead, and the one case that needs a real creation is a scaffold.
 * `Check Again` and `Back` only re-read / navigate, so they are safe to click.
 *
 * The screen renders in 7-12 s on DEV and `waitForLoadState('networkidle')`
 * returns a blank page here, so every wait is an `expect(locator)` with
 * `Timeouts.LONG`, and the multi-navigation cases raise their own timeout.
 */

/** The already-onboarded merchant this file deep-links. Never mutated. */
const WHMCS_ID = '3660';

/** Badge labels the panel may render, as a mutable list for `toContain`. */
const BADGES: string[] = [...INTEGRATION_BADGES];

/** An element whose entire text is one status word. */
const BADGE_PATTERN = new RegExp(`^(${INTEGRATION_BADGES.join('|')})$`);

/** Every description sentence a system row is allowed to print. */
const DESCRIPTIONS: string[] = Object.values(INTEGRATION_DESCRIPTIONS);

/**
 * The status badge of one integration row.
 *
 * `OnboardingPage.integrationBadge()` does not fit: its `div` filter takes the
 * innermost `div` whose text starts with the system name, which is the
 * icon + label pair — the badge is that node's *sibling*, so the Page Object's
 * locator resolves to nothing (verified against the live DOM, 2026-08-19). The
 * row header holding both is the label span's second `div` ancestor, and inside
 * it the badge is the only element whose whole text is a status word.
 */
function statusBadge(page: Page, system: string): Locator {
  return page
    .getByText(system, { exact: true })
    .locator('xpath=ancestor::div[2]')
    .getByText(BADGE_PATTERN);
}

/** Wait out the panel's 7-12 s render on DEV. */
async function waitForPanel(onboardingPage: OnboardingPage): Promise<void> {
  await expect(onboardingPage.integrationStatusHeading).toBeVisible({ timeout: Timeouts.LONG });
}

/** Deep-link the status panel for one WHMCS ID and wait for it to render. */
async function openPanel(onboardingPage: OnboardingPage, whmcsId: string): Promise<void> {
  await onboardingPage.gotoStep(OnboardingStep.VALIDATE, whmcsId);
  await waitForPanel(onboardingPage);
}

test.describe('Bước 1 — Panel `Integration Status` — Onboarding', () => {
  // Deep-link the panel, but do not wait for it here: most cases read a
  // *different* merchant and navigate again straight away, and paying the 7-12 s
  // render twice is what pushes those cases into their timeout. Each test waits
  // for the panel it actually asserts on, via `waitForPanel` / `openPanel`.
  test.beforeEach(async ({ onboardingPage }) => {
    await onboardingPage.gotoStep(OnboardingStep.VALIDATE, WHMCS_ID);
  });

  /**
   * TC-ONB-039 — Chip `WHMCS ID: <id>` hiển thị đúng giá trị
   * Steps:
   *  1. Vào `?step=validate&whmcsId=99999999`.
   *  2. Đọc chip trên đầu panel.
   * Expected:
   *  Hiển thị đúng `"WHMCS ID: 99999999"`, khớp với tham số URL.
   */
  test(
    'TC-ONB-039 — WHMCS ID chip mirrors the id on the URL',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage, page }) => {
      const id = ONBOARDING_SAMPLE_IDS.ID_NOT_FOUND;
      await openPanel(onboardingPage, id);

      await expect(page).toHaveURL(stepUrlPattern(OnboardingStep.VALIDATE, id));
      expect(onboardingPage.currentWhmcsId()).toBe(id);

      // The chip splits its label and its value across two sibling spans, so
      // `OnboardingPage.whmcsIdChip()` — one `getByText('WHMCS ID: <id>')` —
      // matches nothing. Assert the pairing on their shared parent instead.
      const chipLabel = page.getByText('WHMCS ID:', { exact: true });
      await expect(chipLabel).toBeVisible({ timeout: Timeouts.LONG });
      await expect(chipLabel.locator('xpath=..')).toHaveText(new RegExp(`WHMCS ID:\\s*${id}$`));
    },
  );

  /**
   * TC-ONB-040 — Panel có heading `Integration Status` và đủ 3 hệ thống
   * Steps:
   *  1. Vào `?step=validate&whmcsId=<id bất kỳ>`.
   *  2. Đọc danh sách hệ thống.
   * Expected:
   *  Heading h3 `"Integration Status"`; đúng 3 hàng theo thứ tự `DTS`,
   *  `Business App`, `Fastboypay`, mỗi hàng có badge trạng thái và một câu mô tả.
   */
  test(
    'TC-ONB-040 — panel heads with Integration Status and lists the three systems in order',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ onboardingPage, page }) => {
      await expect(onboardingPage.integrationStatusHeading).toBeVisible({
        timeout: Timeouts.LONG,
      });

      // Exactly three rows, each carrying one badge from the enumerated set.
      for (const system of INTEGRATION_SYSTEMS) {
        const badge = statusBadge(page, system);
        await expect(badge, `badge for ${system}`).toHaveCount(1);
        expect(BADGES, `badge for ${system}`).toContain((await badge.innerText()).trim());
      }

      const rendered = await page.locator('body').innerText();

      // Order: DTS, then Business App, then Fastboypay. None of the three labels
      // occurs elsewhere on this route ("FastboyPay home" differs in case).
      const positions = INTEGRATION_SYSTEMS.map((system) => rendered.indexOf(system));
      positions.forEach((position, index) => {
        expect(position, `${INTEGRATION_SYSTEMS[index]} is rendered`).toBeGreaterThan(-1);
      });
      expect(positions[0]).toBeLessThan(positions[1]);
      expect(positions[1]).toBeLessThan(positions[2]);

      // One description sentence per system, each from the known set.
      const shown = DESCRIPTIONS.filter((sentence) => rendered.includes(sentence));
      expect(shown.length).toBeGreaterThanOrEqual(INTEGRATION_SYSTEMS.length);
    },
  );

  /**
   * TC-ONB-041 — Trạng thái `DTS = Optional`
   * Preconditions: Một WHMCS ID chưa cấu hình DTS (vd `4`, `3550`, `3412`).
   * Steps:
   *  1. Vào `?step=validate&whmcsId=4` và đọc hàng `DTS`.
   * Expected:
   *  Badge `Optional`, mô tả `"DTS system has not been configured yet."`
   */
  test(
    'TC-ONB-041 — DTS badge reads Optional when DTS is not configured',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage, page }) => {
      await openPanel(onboardingPage, ONBOARDING_SAMPLE_IDS.DTS_OPTIONAL);

      await expect(statusBadge(page, 'DTS')).toHaveText('Optional');
      await expect(
        onboardingPage.integrationDescription(INTEGRATION_DESCRIPTIONS.DTS_OPTIONAL),
      ).toBeVisible({ timeout: Timeouts.LONG });
    },
  );

  /**
   * TC-ONB-042 — Trạng thái `DTS = Ready`
   * Preconditions: WHMCS ID đã có DTS (vd `3660`, `100004`, `999999`).
   * Steps:
   *  1. Vào `?step=validate&whmcsId=3660` và đọc hàng `DTS`.
   * Expected:
   *  Badge `Ready`, mô tả `"Merchant has been created in the DTS system."`
   */
  test(
    'TC-ONB-042 — DTS badge reads Ready when the merchant exists in DTS',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage, page }) => {
      await waitForPanel(onboardingPage);

      await expect(statusBadge(page, 'DTS')).toHaveText('Ready');
      await expect(
        onboardingPage.integrationDescription(INTEGRATION_DESCRIPTIONS.DTS_READY),
      ).toBeVisible({ timeout: Timeouts.LONG });
    },
  );

  /**
   * TC-ONB-043 — Trạng thái `Business App = Ready`
   * Steps:
   *  1. Vào `?step=validate&whmcsId=3660` và đọc hàng `Business App`.
   * Expected:
   *  Badge `Ready`, mô tả `"Owner merchant login has been verified."`
   */
  test(
    'TC-ONB-043 — Business App badge reads Ready',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage, page }) => {
      await waitForPanel(onboardingPage);

      await expect(statusBadge(page, 'Business App')).toHaveText('Ready');
      await expect(
        onboardingPage.integrationDescription(INTEGRATION_DESCRIPTIONS.BUSINESS_APP_READY),
      ).toBeVisible({ timeout: Timeouts.LONG });
    },
  );

  /**
   * TC-ONB-044 — Trạng thái `Business App = Not Ready`
   * Steps:
   *  1. Vào `?step=validate&whmcsId=3412` và đọc hàng `Business App`.
   * Expected:
   *  Badge `Not Ready`, mô tả `"Owner merchant login has not been completed."`
   */
  test(
    'TC-ONB-044 — Business App badge reads Not Ready',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage, page }) => {
      await openPanel(onboardingPage, ONBOARDING_SAMPLE_IDS.BUSINESS_APP_NOT_READY);

      await expect(statusBadge(page, 'Business App')).toHaveText('Not Ready');
      await expect(
        onboardingPage.integrationDescription(INTEGRATION_DESCRIPTIONS.BUSINESS_APP_NOT_READY),
      ).toBeVisible({ timeout: Timeouts.LONG });
    },
  );

  /**
   * TC-ONB-045 — Trạng thái `Fastboypay = Ready`
   * Steps:
   *  1. Vào `?step=validate&whmcsId=3412` và đọc hàng `Fastboypay`.
   * Expected:
   *  Badge `Ready`, mô tả `"Payment setup is ready and configured."`
   */
  test(
    'TC-ONB-045 — Fastboypay badge reads Ready',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage, page }) => {
      await openPanel(onboardingPage, ONBOARDING_SAMPLE_IDS.BUSINESS_APP_NOT_READY);

      await expect(statusBadge(page, 'Fastboypay')).toHaveText('Ready');
      await expect(
        onboardingPage.integrationDescription(INTEGRATION_DESCRIPTIONS.FASTBOYPAY_READY),
      ).toBeVisible({ timeout: Timeouts.LONG });
    },
  );

  /**
   * TC-ONB-046 — `Fastboypay = Not Ready` với lý do `Whmcs ID not found.`
   * Steps:
   *  1. Vào `?step=validate&whmcsId=99999999` và đọc hàng `Fastboypay`.
   * Expected:
   *  Badge `Not Ready`, mô tả đúng `"Whmcs ID not found."` (thông điệp do API trả).
   */
  test(
    'TC-ONB-046 — Fastboypay is Not Ready with the API reason "Whmcs ID not found."',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage, page }) => {
      await openPanel(onboardingPage, ONBOARDING_SAMPLE_IDS.ID_NOT_FOUND);

      await expect(statusBadge(page, 'Fastboypay')).toHaveText('Not Ready');
      await expect(
        onboardingPage.integrationDescription(INTEGRATION_DESCRIPTIONS.FASTBOYPAY_ID_NOT_FOUND),
      ).toBeVisible({ timeout: Timeouts.LONG });
    },
  );

  /**
   * TC-ONB-047 — `Fastboypay = Not Ready` với lý do `Merchant not found.`
   * Steps:
   *  1. Vào `?step=validate&whmcsId=999999` và đọc hàng `Fastboypay`.
   * Expected:
   *  Badge `Not Ready`, mô tả `"Merchant not found."` — xác nhận UI hiển thị
   *  **nguyên văn** lý do từ backend chứ không dùng câu mặc định.
   */
  test(
    'TC-ONB-047 — Fastboypay prints the backend reason "Merchant not found." verbatim',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage, page }) => {
      await openPanel(onboardingPage, ONBOARDING_SAMPLE_IDS.MERCHANT_NOT_FOUND);

      await expect(statusBadge(page, 'Fastboypay')).toHaveText('Not Ready');
      await expect(
        onboardingPage.integrationDescription(
          INTEGRATION_DESCRIPTIONS.FASTBOYPAY_MERCHANT_NOT_FOUND,
        ),
      ).toBeVisible({ timeout: Timeouts.LONG });
      // The API reason replaces the built-in fallback sentence, it is not appended.
      await expect(
        onboardingPage.integrationDescription(INTEGRATION_DESCRIPTIONS.FASTBOYPAY_NO_INTEGRATION),
      ).toHaveCount(0);
    },
  );

  /**
   * TC-ONB-048 — Câu mặc định khi thiếu tích hợp thanh toán
   * Steps:
   *  1. Mock/route response `merchant_onboarding` với `payment_system_registered=false`
   *     và **không** kèm message.
   * Expected:
   *  Hiển thị câu mặc định trong code `"No supported payment integration was found in
   *  FastboyPay. Please integrate Magensa or Bamboo before continuing."`
   */
  // TODO(manual/setup): needs a `page.route` stub of GET /merchant_onboarding/<id>
  // returning `payment_system_registered=false` with no message. The scan never
  // captured the response schema and no DEV merchant reaches this fallback branch,
  // so the stub cannot be written without guessing a shape the app may reject.
  test.fixme(
    'TC-ONB-048 — default sentence when the API reports no payment integration and no message',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * TC-ONB-049 — Câu tổng kết khi sẵn sàng
   * Steps:
   *  1. Vào `?step=validate&whmcsId=3660`; đọc đoạn text dưới danh sách hệ thống.
   * Expected:
   *  `"Required systems are ready. You can proceed to create the merchant."`
   */
  test(
    'TC-ONB-049 — ready summary sentence is shown',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      await expect(onboardingPage.readySummary).toBeVisible({ timeout: Timeouts.LONG });
      await expect(onboardingPage.readySummary).toHaveText(INTEGRATION_SUMMARIES.READY);
      await expect(onboardingPage.notReadySummary).toHaveCount(0);
    },
  );

  /**
   * TC-ONB-050 — Câu tổng kết khi chưa sẵn sàng
   * Steps:
   *  1. Vào `?step=validate&whmcsId=3412`; đọc đoạn text tổng kết.
   * Expected:
   *  `"Merchant is not ready for onboarding. Please ensure all required systems are
   *  configured before proceeding."`
   */
  test(
    'TC-ONB-050 — not-ready summary sentence is shown',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      await openPanel(onboardingPage, ONBOARDING_SAMPLE_IDS.BUSINESS_APP_NOT_READY);

      await expect(onboardingPage.notReadySummary).toBeVisible({ timeout: Timeouts.LONG });
      await expect(onboardingPage.notReadySummary).toHaveText(INTEGRATION_SUMMARIES.NOT_READY);
      await expect(onboardingPage.readySummary).toHaveCount(0);
    },
  );

  /**
   * TC-ONB-051 — `Create Merchant` bị disable khi chưa sẵn sàng
   * Steps:
   *  1. Lần lượt vào `?step=validate&whmcsId=` với `3412`, `999999`, `99999999`;
   *     kiểm tra nút `"Create Merchant"`.
   * Expected:
   *  Cả 3 trường hợp nút `"Create Merchant"` đều `disabled`.
   *
   * The button is only ever inspected — clicking it would write to DEV.
   */
  test(
    'TC-ONB-051 — Create Merchant stays disabled while a required system is not ready',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      test.slow(); // three extra full page loads at 7-12 s each on DEV.

      const notReadyIds = [
        ONBOARDING_SAMPLE_IDS.BUSINESS_APP_NOT_READY,
        ONBOARDING_SAMPLE_IDS.MERCHANT_NOT_FOUND,
        ONBOARDING_SAMPLE_IDS.ID_NOT_FOUND,
      ];

      for (const id of notReadyIds) {
        await openPanel(onboardingPage, id);
        await expect(onboardingPage.createMerchantButton, `whmcsId=${id}`).toBeVisible({
          timeout: Timeouts.LONG,
        });
        await expect(onboardingPage.createMerchantButton, `whmcsId=${id}`).toBeDisabled();
      }
    },
  );

  /**
   * TC-ONB-052 — `Create Merchant` enable khi Business App + Fastboypay = Ready
   * Steps:
   *  1. Lần lượt vào `?step=validate&whmcsId=` với `4`, `3550`, `3660`, `100004`;
   *     kiểm tra nút.
   * Expected:
   *  Nút `"Create Merchant"` enabled ở cả 4 trường hợp.
   *
   * Enabled state only — the button is never clicked, it writes to DEV.
   */
  test(
    'TC-ONB-052 — Create Merchant is enabled when Business App and Fastboypay are ready',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      test.slow(); // four extra full page loads at 7-12 s each on DEV.

      const readyIds = [
        ONBOARDING_SAMPLE_IDS.DTS_OPTIONAL,
        ONBOARDING_SAMPLE_IDS.READY_ALT,
        WHMCS_ID,
        ONBOARDING_SAMPLE_IDS.READY_DTS,
      ];

      for (const id of readyIds) {
        await openPanel(onboardingPage, id);
        await expect(onboardingPage.createMerchantButton, `whmcsId=${id}`).toBeVisible({
          timeout: Timeouts.LONG,
        });
        await expect(onboardingPage.createMerchantButton, `whmcsId=${id}`).toBeEnabled();
      }
    },
  );

  /**
   * TC-ONB-053 — `DTS = Optional` không chặn việc tạo merchant
   * Steps:
   *  1. Vào `?step=validate&whmcsId=4` (DTS `Optional`, hai hệ thống còn lại `Ready`).
   * Expected:
   *  Câu tổng kết là "ready" và `"Create Merchant"` enabled → xác nhận DTS là điều
   *  kiện **tuỳ chọn**.
   */
  test(
    'TC-ONB-053 — DTS Optional does not block merchant creation',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage, page }) => {
      await openPanel(onboardingPage, ONBOARDING_SAMPLE_IDS.DTS_OPTIONAL);

      await expect(statusBadge(page, 'DTS')).toHaveText('Optional');
      await expect(onboardingPage.readySummary).toBeVisible({ timeout: Timeouts.LONG });
      await expect(onboardingPage.createMerchantButton).toBeEnabled();
    },
  );

  /**
   * TC-ONB-054 — Nút `Check Again` gọi lại API kiểm tra
   * Steps:
   *  1. Vào `?step=validate&whmcsId=3412`.
   *  2. Bật theo dõi network.
   *  3. Bấm `"Check Again"`.
   * Expected:
   *  Phát sinh request mới `GET /merchant_onboarding/3412`; panel render lại trạng
   *  thái mới nhất; URL không đổi.
   *
   * `Check Again` only re-reads the integration status, so clicking it is safe.
   */
  test(
    'TC-ONB-054 — Check Again refetches the integration status without changing the URL',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage, page }) => {
      const id = ONBOARDING_SAMPLE_IDS.BUSINESS_APP_NOT_READY;
      await openPanel(onboardingPage, id);
      await expect(onboardingPage.checkAgainButton).toBeVisible({ timeout: Timeouts.LONG });

      const urlBefore = page.url();
      const refetch = page.waitForRequest(
        (request) =>
          request.method() === 'GET' &&
          /merchant[_-]onboarding/i.test(request.url()) &&
          request.url().includes(id),
        { timeout: Timeouts.API },
      );

      await onboardingPage.checkAgainButton.click();
      await refetch;

      await expect(onboardingPage.integrationStatusHeading).toBeVisible({
        timeout: Timeouts.LONG,
      });
      await expect(statusBadge(page, 'Business App')).toHaveText('Not Ready');
      expect(page.url()).toBe(urlBefore);
    },
  );

  /**
   * TC-ONB-055 — Nút `Back` trên panel quay lại form nhập
   * Steps:
   *  1. Vào `?step=validate&whmcsId=99999999`.
   *  2. Bấm `"Back"`.
   * Expected:
   *  Quay lại form `"Enter WHMCS ID"`; tham số `whmcsId` bị gỡ khỏi URL.
   */
  test(
    'TC-ONB-055 — Back returns to the Enter WHMCS ID form and drops whmcsId',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage, page }) => {
      await openPanel(onboardingPage, ONBOARDING_SAMPLE_IDS.ID_NOT_FOUND);
      await expect(onboardingPage.backButton).toBeVisible({ timeout: Timeouts.LONG });

      await onboardingPage.backButton.click();

      await expect(onboardingPage.enterWhmcsIdHeading).toBeVisible({ timeout: Timeouts.LONG });
      await expect(onboardingPage.whmcsIdInput).toBeVisible();
      await expect(page).toHaveURL(/\/pos\/nail\/admin\/onboarding/);
      await expect(page).not.toHaveURL(/[?&]whmcsId=/);
      expect(onboardingPage.currentWhmcsId()).toBe('');
    },
  );

  /**
   * TC-ONB-056 — Thẻ tích hợp Magensa / Bamboo
   * Steps:
   *  1. Vào panel với một merchant có `Fastboypay = Not Ready`.
   *  2. Tìm khối `Magensa Integration` / `Bamboo Integration`.
   * Expected:
   *  `[CẦN XÁC MINH]` — các chuỗi này tồn tại trong bundle nhưng **không** xuất hiện
   *  ở mọi lần quét. Cần xác định điều kiện hiển thị; khi hiện phải đúng nội dung:
   *  Magensa → `"Integrated in FastboyPay. Enables Windows POS (B24)."` /
   *  `"Not integrated. Windows POS (B24) will be unavailable."`; Bamboo →
   *  `"Integrated in FastboyPay. Enables Android POS (P8)."` /
   *  `"Not integrated. Android POS (P8) will be unavailable."`
   */
  // TODO(manual/setup): Expected is marked [CẦN XÁC MINH] — the Magensa / Bamboo cards
  // exist in the bundle but were absent from every DOM scan, so the condition that
  // renders them is unknown. Pin it manually before turning this into an assertion.
  test.fixme(
    'TC-ONB-056 — Magensa / Bamboo integration cards render their exact wording',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      await openPanel(onboardingPage, ONBOARDING_SAMPLE_IDS.ID_NOT_FOUND);
    },
  );

  /**
   * TC-ONB-057 — Trạng thái `Failed Connect`
   * Steps:
   *  1. Mock `GET /merchant_onboarding/<id>` trả lỗi kết nối (500 / timeout).
   * Expected:
   *  `[CẦN XÁC MINH]` — kỳ vọng badge `Failed Connect` với câu `"Failed to connect.
   *  Please contact support."`; `"Create Merchant"` disabled.
   */
  // TODO(manual/setup): needs fault injection (a 500 / timeout response) on
  // GET /merchant_onboarding/<id>, and the Expected is marked [CẦN XÁC MINH] — the
  // `Failed Connect` badge was never observed live.
  test.fixme(
    'TC-ONB-057 — Failed Connect badge with Create Merchant disabled on a backend error',
    { tag: [Tag.REGRESSION] },
    async () => {},
  );

  /**
   * TC-ONB-058 — Bấm `Create Merchant` tạo merchant và sang bước 2
   * Preconditions: **WHMCS ID dùng-một-lần** đã sẵn sàng cả Business App lẫn
   *  Fastboypay. **Không** dùng ID của merchant đang có dữ liệu thật.
   * Steps:
   *  1. Vào panel với ID đó.
   *  2. Bấm `"Create Merchant"`.
   *  3. Chờ phản hồi.
   * Expected:
   *  `[CẦN XÁC MINH — hành động ghi]` Toast `"Merchant created successfully"`;
   *  chuyển sang `?step=merchant-info&whmcsId=<id>`; stepper đánh dấu bước 1 hoàn tất.
   */
  // TODO(manual/setup): real write on DEV — needs a single-use WHMCS ID. Clicking
  // `Create Merchant` creates a merchant in the DEV backend, so this case can never
  // run against a shared or already-onboarded id.
  test.fixme(
    'TC-ONB-058 — Create Merchant creates the merchant and advances to step 2',
    { tag: [Tag.REGRESSION] },
    async () => {},
  );
});
