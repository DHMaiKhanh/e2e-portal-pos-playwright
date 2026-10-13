import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Timeouts } from '@configs/constants/timeouts';
import {
  PAYMENT_METHODS,
  PERCENT_VALUE_PATTERN,
  TAX_PRICING_FIELDS,
  TIP_PRESET_LABEL_PATTERN,
  TIP_TIMING_OPTIONS,
  OnboardingStep,
} from '@pages/onboarding/OnboardingPage';

/**
 * Bước 6 — `Payment & Transactions` (Merchant Onboarding,
 * `?step=payment-transactions`).
 *
 * Three blocks on one step: `Payment Methods` (4 tender switches),
 * `Tax & Pricing` (3 percentage fields) and `Tipping Settings`
 * (Tip Acceptance switch → Tip Timing radiogroup → Tip Presets chips).
 *
 * Ground rules for this file:
 *  - The route is the bare admin path `/pos/onboarding` — never store-scoped,
 *    so nothing here asserts `/pos/<id>/` or touches `env.STORE_ID`.
 *  - `Save Changes` performs a REAL write on the DEV backend and is NEVER
 *    clicked. Flipping switches, picking radios, switching the preset mode and
 *    removing a chip are wizard-local form state only, so those cases stay
 *    executable; every case whose Expected needs a successful save is a
 *    scaffold.
 *  - DEV data is dirty and time-based: assertions read counts, formats and
 *    behaviour, never a specific stored percentage or preset value.
 *  - The screen renders in 7-12 s on DEV and `waitForLoadState('networkidle')`
 *    returns a blank page here, so the entry wait is an `expect(locator)` with
 *    `Timeouts.LONG`.
 */
test.describe('Bước 6 — `Payment & Transactions` — Onboarding', () => {
  /** Read-only, already-onboarded DEV merchant the whole file deep-links. */
  const WHMCS_ID = '3660';

  test.beforeEach(async ({ onboardingPage }) => {
    await onboardingPage.gotoStep(OnboardingStep.PAYMENT_TRANSACTIONS, WHMCS_ID);
    await onboardingPage.waitForReady();
    // Wait for the first block of the step, never networkidle.
    await expect(onboardingPage.paymentMethodsHeading).toBeVisible({ timeout: Timeouts.LONG });
  });

  /**
   * TC-ONB-106 — Khối `Payment Methods` đủ 4 switch
   * Steps:
   *  1. Đọc các switch trong khối.
   * Expected:
   *  Heading h3 `"Payment Methods"` + mô tả `"Choose which tender types staff
   *  can accept at checkout."`; 4 switch `Credit Card` (`name=card`), `Cash`
   *  (`cash`), `Gift Cards` (`gift_card`), `Others` (`other`) kèm mô tả tương ứng.
   */
  test(
    'TC-ONB-106 — Payment Methods renders 4 tender switches with wire names and descriptions',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ onboardingPage }) => {
      await expect(onboardingPage.paymentMethodsHeading).toBeVisible();
      await expect(onboardingPage.paymentMethodsDescription).toBeVisible();

      // Exactly the four documented tenders — no more, no fewer.
      await expect(onboardingPage.paymentMethodSwitches).toHaveCount(PAYMENT_METHODS.length);

      for (const method of PAYMENT_METHODS) {
        await expect(onboardingPage.paymentMethodSwitch(method.label)).toBeVisible();
        await expect(onboardingPage.paymentMethodDescription(method.description)).toBeVisible();
        // The hidden checkbox proves the name the tender posts under.
        expect(await onboardingPage.paymentMethodInput(method.name).count()).toBeGreaterThan(0);
      }
    },
  );

  /**
   * TC-ONB-107 — Bật/tắt từng phương thức thanh toán
   * Steps:
   *  1. Với mỗi switch: đọc trạng thái ban đầu → click → kiểm tra trạng thái
   *     đảo → click lại.
   * Expected:
   *  `aria-checked` đảo đúng sau mỗi lần click; các switch độc lập, không ảnh
   *  hưởng lẫn nhau.
   */
  test(
    'TC-ONB-107 — each tender switch toggles independently',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      // Wizard-local state only: nothing reaches DEV until Save Changes, which
      // this test never clicks, and every switch is restored on the way out.
      const initial = await onboardingPage.paymentMethodStates();

      for (const method of PAYMENT_METHODS) {
        const control = onboardingPage.paymentMethodSwitch(method.label);

        await onboardingPage.togglePaymentMethod(method.label);
        await expect.poll(() => onboardingPage.isToggleOn(control)).toBe(!initial[method.label]);

        // The other three tenders are untouched by that click.
        const afterToggle = await onboardingPage.paymentMethodStates();
        for (const other of PAYMENT_METHODS) {
          if (other.label === method.label) continue;
          expect(afterToggle[other.label]).toBe(initial[other.label]);
        }

        await onboardingPage.togglePaymentMethod(method.label);
        await expect.poll(() => onboardingPage.isToggleOn(control)).toBe(initial[method.label]);
      }

      expect(await onboardingPage.paymentMethodStates()).toEqual(initial);
    },
  );

  /**
   * TC-ONB-108 — Tắt toàn bộ phương thức thanh toán
   * Steps:
   *  1. Tắt cả 4 switch.
   *  2. Bấm `"Save Changes"`.
   * Expected:
   *  `[CẦN XÁC MINH]` — kỳ vọng bị chặn (merchant phải nhận được ít nhất 1 loại
   *  tender); nếu lưu được thì là lỗ hổng nghiệp vụ cần báo.
   */
  // TODO(manual/setup): real write on DEV — needs a single-use WHMCS ID. The
  // Expected only resolves on submit, and the outcome itself is [CẦN XÁC MINH]:
  // either a validation block or a business-rule gap to report.
  test.fixme(
    'TC-ONB-108 — saving with every tender off is rejected',
    { tag: [Tag.REGRESSION] },
    async () => {},
  );

  /**
   * TC-ONB-109 — Khối `Tax & Pricing` đủ 3 ô nhập
   * Steps:
   *  1. Đọc các input trong khối.
   * Expected:
   *  `Tax Rate (%)` (`#taxPercentage`), `Cash Discount (%)`
   *  (`#cashDiscountPercentage`), `Service Fee (%)` (`#serviceFeePercentage`);
   *  giá trị nạp sẵn từ merchant settings.
   */
  test(
    'TC-ONB-109 — Tax & Pricing renders 3 labelled percentage fields, prefilled',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      await expect(onboardingPage.taxPricingHeading).toBeVisible({ timeout: Timeouts.LONG });

      for (const field of TAX_PRICING_FIELDS) {
        await expect(onboardingPage.taxPricingLabel(field.label)).toBeVisible();
        await expect(onboardingPage.taxPricingField(field.id)).toBeVisible();
      }

      // Prefilled from merchant settings — assert the FORMAT, never the value.
      const values = await onboardingPage.taxPricingValues();
      for (const field of TAX_PRICING_FIELDS) {
        expect(values[field.id]).toMatch(PERCENT_VALUE_PATTERN);
      }
    },
  );

  /**
   * TC-ONB-110 — Nhập phần trăm âm hoặc > 100
   * Steps:
   *  1. Lần lượt nhập `-5`, `150`, `1000` vào `#taxPercentage` rồi lưu.
   * Expected:
   *  `[CẦN XÁC MINH]` — kỳ vọng chặn với lỗi rõ ràng (khoảng hợp lệ 0–100); ô
   *  đang là `type=text` nên nhiều khả năng chưa chặn → cần kiểm và báo.
   */
  // TODO(manual/setup): real write on DEV — needs a single-use WHMCS ID. Typing
  // is safe, but the Expected is decided only by what "rồi lưu" does, and the
  // outcome is [CẦN XÁC MINH].
  test.fixme(
    'TC-ONB-110 — out-of-range tax percentages (-5 / 150 / 1000) are rejected on save',
    { tag: [Tag.REGRESSION] },
    async () => {},
  );

  /**
   * TC-ONB-111 — Nhập chữ vào ô phần trăm
   * Steps:
   *  1. Nhập `abc` vào `#serviceFeePercentage` rồi lưu.
   * Expected:
   *  `[CẦN XÁC MINH]` — kỳ vọng lỗi validate; không được gửi giá trị phi số lên API.
   */
  // TODO(manual/setup): real write on DEV — needs a single-use WHMCS ID; the
  // "không gửi giá trị phi số lên API" half can only be judged on the request
  // an actual save fires.
  test.fixme(
    'TC-ONB-111 — a non-numeric service fee fails validation and is never sent',
    { tag: [Tag.REGRESSION] },
    async () => {},
  );

  /**
   * TC-ONB-112 — Phần trăm dạng thập phân
   * Steps:
   *  1. Nhập `8.25` vào `#taxPercentage` rồi lưu.
   * Expected:
   *  Chấp nhận (thuế US thường có phần thập phân) và hiển thị lại đúng `8.25`
   *  sau khi reload.
   */
  // TODO(manual/setup): real write on DEV — needs a single-use WHMCS ID: the
  // Expected requires a successful save plus a reload to read the value back.
  test.fixme(
    'TC-ONB-112 — a decimal tax rate (8.25) saves and survives a reload',
    { tag: [Tag.REGRESSION] },
    async () => {},
  );

  /**
   * TC-ONB-113 — Switch `Tip Acceptance`
   * Steps:
   *  1. Đọc trạng thái switch `"Tip Acceptance"`.
   *  2. Tắt nó.
   *  3. Quan sát khối `Tip Timing` và `Tip Presets`.
   * Expected:
   *  Khi tắt, hai khối `Tip Timing` và `Tip Presets` bị ẩn hoặc disable (theo mô
   *  tả `"When off, the tip screen is skipped at checkout..."`); bật lại thì
   *  hiện đủ.
   */
  test(
    'TC-ONB-113 — turning Tip Acceptance off hides or disables Tip Timing and Tip Presets',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      const control = onboardingPage.tipAcceptanceSwitch;
      await expect(control).toBeVisible({ timeout: Timeouts.LONG });
      await expect(onboardingPage.tipAcceptanceDescription).toBeVisible();

      // Normalise to ON first — DEV state is not guaranteed. Client-side only.
      if (!(await onboardingPage.isToggleOn(control))) {
        await control.click();
        await expect.poll(() => onboardingPage.isToggleOn(control)).toBe(true);
      }
      await expect(onboardingPage.tipTimingHeading).toBeVisible();
      await expect(onboardingPage.tipPresetsHeading).toBeVisible();

      await control.click();
      await expect.poll(() => onboardingPage.isToggleOn(control)).toBe(false);

      // Either acceptable outcome: the blocks disappear, or they stay put with
      // their controls disabled.
      const timingHidden = !(await onboardingPage.tipTimingHeading.isVisible());
      if (timingHidden) {
        await expect(onboardingPage.tipTimingHeading).toBeHidden();
        await expect(onboardingPage.tipPresetsHeading).toBeHidden();
      } else {
        const radios = await onboardingPage.tipTimingRadios.count();
        expect(radios).toBeGreaterThan(0);
        for (let i = 0; i < radios; i += 1) {
          expect(
            await onboardingPage.hasDisabledAttribute(onboardingPage.tipTimingRadios.nth(i)),
          ).toBe(true);
        }
        expect(await onboardingPage.hasDisabledAttribute(onboardingPage.addPresetButton)).toBe(
          true,
        );
      }

      // Switching back restores both blocks in full.
      await control.click();
      await expect.poll(() => onboardingPage.isToggleOn(control)).toBe(true);
      await expect(onboardingPage.tipTimingHeading).toBeVisible();
      await expect(onboardingPage.tipPresetsHeading).toBeVisible();
      await expect(onboardingPage.tipTimingRadios).toHaveCount(TIP_TIMING_OPTIONS.length);
    },
  );

  /**
   * TC-ONB-114 — Radiogroup `Tip Timing` có đúng 2 lựa chọn
   * Steps:
   *  1. Đọc radiogroup `"Tip timing"`.
   * Expected:
   *  2 radio `name=tipTiming`: value `before_payment` (nhãn `Before Payment`,
   *  badge `SALE`) và `after_payment` (nhãn `After Payment`, badge `AUTHORIZE`);
   *  đúng một cái được chọn.
   */
  test(
    'TC-ONB-114 — Tip Timing offers exactly 2 radios with one selected',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      await expect(onboardingPage.tipTimingGroup).toBeVisible({ timeout: Timeouts.LONG });
      await expect(onboardingPage.tipTimingRadios).toHaveCount(TIP_TIMING_OPTIONS.length);

      for (const option of TIP_TIMING_OPTIONS) {
        await expect(
          onboardingPage.tipTimingOption(new RegExp(option.label)).first(),
        ).toBeVisible();
        await expect(onboardingPage.tipTimingBadge(option.badge).first()).toBeVisible();
        // The posted value lives on the underlying input[name="tipTiming"].
        expect(await onboardingPage.tipTimingInput(option.value).count()).toBeGreaterThan(0);
      }

      // Exactly one of the two reads as checked.
      const checked: string[] = [];
      for (const option of TIP_TIMING_OPTIONS) {
        const radio = onboardingPage.tipTimingOption(new RegExp(option.label)).first();
        if (await onboardingPage.isToggleOn(radio)) checked.push(option.value);
      }
      expect(checked).toHaveLength(1);
      expect(await onboardingPage.selectedTipTiming()).toBe(checked[0]);
    },
  );

  /**
   * TC-ONB-115 — Mô tả và chuỗi giao dịch của từng lựa chọn tip
   * Steps:
   *  1. Đọc nội dung 2 thẻ radio.
   * Expected:
   *  `Before Payment` → `"Tip is collected before the card is charged. Sent as a
   *  Sale — the tip cannot be adjusted after checkout."` + chuỗi
   *  `Order` › `Tip` › `Sale`. `After Payment` → `"Card is authorized for the
   *  order amount, then captured with the final tip included."` + chuỗi `Order`
   *  › `Authorize` › `Tip` › `Capture`.
   */
  test(
    'TC-ONB-115 — each tip-timing card prints its description and processor chain',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      await expect(onboardingPage.tipTimingGroup).toBeVisible({ timeout: Timeouts.LONG });

      for (const [index, option] of TIP_TIMING_OPTIONS.entries()) {
        await expect(onboardingPage.tipTimingDescription(option.description)).toBeVisible();

        // The chain is rendered as a list whose separators may or may not be
        // list items, so assert the steps appear in order rather than 1:1.
        const cardIndex = index === 0 ? 0 : 1;
        const items = onboardingPage.tipTimingChainItems(cardIndex);
        expect(await items.count()).toBeGreaterThanOrEqual(option.chain.length);
        const chainText = (await items.allInnerTexts()).join(' ');
        expect(chainText).toMatch(new RegExp(option.chain.join('[\\s\\S]*')));
      }
    },
  );

  /**
   * TC-ONB-116 — Đổi lựa chọn `Tip Timing`
   * Steps:
   *  1. Đang chọn `After Payment`, bấm `Before Payment`.
   *  2. Quan sát.
   * Expected:
   *  Radio `Before Payment` được chọn, `After Payment` bỏ chọn; viền/highlight
   *  chuyển sang thẻ mới; chỉ 1 lựa chọn tại một thời điểm.
   */
  test(
    'TC-ONB-116 — picking Before Payment deselects After Payment',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      // Wizard-local selection only — nothing is persisted without Save Changes.
      await expect(onboardingPage.tipTimingGroup).toBeVisible({ timeout: Timeouts.LONG });

      // Arrange the precondition the case describes: After Payment selected.
      await onboardingPage.selectTipTiming('After Payment');
      await expect.poll(() => onboardingPage.selectedTipTiming()).toBe('after_payment');

      await onboardingPage.selectTipTiming('Before Payment');
      await expect.poll(() => onboardingPage.selectedTipTiming()).toBe('before_payment');

      // Still exactly one selection.
      const beforeRadio = onboardingPage.tipTimingOption(/Before Payment/).first();
      const afterRadio = onboardingPage.tipTimingOption(/After Payment/).first();
      expect(await onboardingPage.isToggleOn(beforeRadio)).toBe(true);
      expect(await onboardingPage.isToggleOn(afterRadio)).toBe(false);
    },
  );

  /**
   * TC-ONB-117 — Chuyển kiểu preset `Percentage` ↔ `Fixed Amount`
   * Steps:
   *  1. Đọc nhóm nút `"Tip type"`.
   *  2. Bấm `"Fixed Amount"`.
   *  3. Quan sát các chip preset.
   * Expected:
   *  `Fixed Amount` chuyển sang `pressed`, `Percentage` bỏ `pressed`; các chip
   *  preset đổi từ dạng `%` sang dạng số tiền (`$`). `[CẦN XÁC MINH]` định dạng
   *  chính xác của chip khi ở chế độ `Fixed Amount`.
   *
   * The exact `Fixed Amount` chip format was never observed, so this asserts
   * only what the Expected states without it: the chips must LEAVE the `n%`
   * form while the same number of presets survives. That half is
   * `[CẦN XÁC MINH]` and is EXPECTED TO FAIL if the toggle turns out to affect
   * newly added presets only.
   */
  test(
    'TC-ONB-117 — the Tip type toggle swaps pressed state and reformats the chips',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      // Client-side wizard state only — no save is performed.
      await expect(onboardingPage.tipTypeGroup).toBeVisible({ timeout: Timeouts.LONG });
      expect(await onboardingPage.tipTypePressed('Percentage')).toBe(true);
      expect(await onboardingPage.tipTypePressed('Fixed Amount')).toBe(false);

      const presetCount = await onboardingPage.tipPresetCount();
      const removeControls = await onboardingPage.removePresetButtons.count();
      expect(presetCount).toBeGreaterThan(0);

      await onboardingPage.selectTipType('Fixed Amount');
      await expect.poll(() => onboardingPage.tipTypePressed('Fixed Amount')).toBe(true);
      expect(await onboardingPage.tipTypePressed('Percentage')).toBe(false);

      // Same presets, no longer rendered as `n%`.
      await expect(onboardingPage.removePresetButtons).toHaveCount(removeControls);
      await expect(onboardingPage.tipPresetChips).toHaveCount(0);

      // Back to Percentage restores the `n%` chips.
      await onboardingPage.selectTipType('Percentage');
      await expect.poll(() => onboardingPage.tipTypePressed('Percentage')).toBe(true);
      await expect(onboardingPage.tipPresetChips).toHaveCount(presetCount);
    },
  );

  /**
   * TC-ONB-118 — Thêm preset mới bằng nút `Add`
   * Steps:
   *  1. Bấm `"Add"`.
   *  2. Nhập một giá trị mới (vd `30`).
   *  3. Xác nhận.
   * Expected:
   *  Xuất hiện chip `30%` kèm nút `"Remove 30% tip preset"`. `[CẦN XÁC MINH]`
   *  cơ chế nhập (inline input hay dialog).
   */
  // TODO(manual/setup): the Add mechanism is unverified — no scan ever clicked
  // it, so whether it reveals an inline input or opens a dialog is unknown and
  // no selector for the entry field can be written without inventing one.
  test.fixme(
    'TC-ONB-118 — Add creates a new 30% preset chip with its Remove control',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      // Best-effort arrange: the control the flow starts from does exist.
      await expect(onboardingPage.addPresetButton).toBeVisible({ timeout: Timeouts.LONG });
    },
  );

  /**
   * TC-ONB-119 — Xoá preset
   * Steps:
   *  1. Đếm số chip hiện có.
   *  2. Bấm `"Remove 10% tip preset"`.
   * Expected:
   *  Chip `10%` biến mất, số chip giảm đúng 1; các chip khác giữ nguyên.
   */
  test(
    'TC-ONB-119 — removing a preset drops exactly one chip and leaves the rest',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      // Removal is wizard-local: without Save Changes the DEV preset list is
      // untouched, so this is safe to run against the shared merchant.
      await expect(onboardingPage.tipPresetChips.first()).toBeVisible({ timeout: Timeouts.LONG });

      const before = await onboardingPage.tipPresetLabels();
      expect(before.length).toBeGreaterThan(0);

      // Merchant 3660 carries duplicated chips (TC-ONB-120), so target the
      // first chip's own percentage and take the first matching control.
      const target = before[0];
      const percent = target.replace('%', '');
      await onboardingPage.removePresetButton(percent).first().click();

      await expect(onboardingPage.tipPresetChips).toHaveCount(before.length - 1);

      const expectedRemaining = [...before];
      expectedRemaining.splice(expectedRemaining.indexOf(target), 1);
      const after = await onboardingPage.tipPresetLabels();
      expect([...after].sort()).toEqual([...expectedRemaining].sort());
    },
  );

  /**
   * TC-ONB-120 — Thêm preset trùng giá trị
   * Steps:
   *  1. Bấm `"Add"`, nhập một giá trị đã tồn tại (vd `20`).
   *  2. Xác nhận.
   * Expected:
   *  `[CẦN XÁC MINH]` — kỳ vọng bị chặn/gộp. Dữ liệu quét của merchant `3660`
   *  cho thấy **~40 chip trùng lặp** (`15%`, `18%`, `20%`, `25%` lặp nhiều lần)
   *  → nghi thiếu chống trùng, cần kiểm và báo.
   *
   * KNOWN BUG — this asserts the CORRECT behaviour (a preset value appears at
   * most once) and is therefore EXPECTED TO FAIL until de-duplication lands:
   * merchant 3660 currently renders ~40 chips with `15%` / `18%` / `20%` / `25%`
   * repeated. The `Add` half of the flow cannot be automated (see TC-ONB-118),
   * so the duplicate state is read straight off the rendered list.
   */
  // PRODUCT GAP (2026-10-11): merchant 3660 renders ~40 tip-preset chips with 15%/18%/20%/25% duplicated — no de-duplication; expected each preset value to appear at most once. Re-enable once fixed.
  test.fixme(
    'TC-ONB-120 — preset values are unique (3660 renders ~40 duplicates)',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      await expect(onboardingPage.tipPresetChips.first()).toBeVisible({ timeout: Timeouts.LONG });

      const labels = await onboardingPage.tipPresetLabels();
      expect(labels.length).toBeGreaterThan(0);
      for (const label of labels) {
        expect(label).toMatch(TIP_PRESET_LABEL_PATTERN);
      }

      expect(await onboardingPage.duplicateTipPresetLabels()).toEqual([]);
    },
  );

  /**
   * TC-ONB-121 — Preset giá trị biên
   * Steps:
   *  1. Thử thêm `0`, `-5`, `101`, `999`, `abc`.
   * Expected:
   *  `[CẦN XÁC MINH]` — kỳ vọng chỉ chấp nhận số nguyên/thập phân trong khoảng
   *  hợp lệ; giá trị âm và phi số phải bị từ chối.
   */
  // TODO(manual/setup): depends on the unverified Add mechanism (TC-ONB-118) —
  // there is no known entry field to type these boundary values into, and the
  // accepted range is itself [CẦN XÁC MINH].
  test.fixme(
    'TC-ONB-121 — boundary preset values (0 / -5 / 101 / 999 / abc) are rejected',
    { tag: [Tag.REGRESSION] },
    async () => {},
  );

  /**
   * TC-ONB-122 — Xoá hết preset
   * Steps:
   *  1. Xoá lần lượt toàn bộ chip preset rồi lưu.
   * Expected:
   *  `[CẦN XÁC MINH]` — kỳ vọng vẫn lưu được (khách nhập tip thủ công) hoặc có
   *  thông báo rõ nếu bắt buộc tối thiểu 1 preset.
   */
  // TODO(manual/setup): real write on DEV — needs a single-use WHMCS ID. Only
  // the save decides between the two [CẦN XÁC MINH] outcomes (empty preset list
  // accepted vs. a minimum-one-preset error).
  test.fixme(
    'TC-ONB-122 — saving with every preset removed is accepted or clearly blocked',
    { tag: [Tag.REGRESSION] },
    async () => {},
  );

  /**
   * TC-ONB-123 — Ba nút điều hướng cuối bước 6
   * Steps:
   *  1. Đọc các nút ở cuối trang.
   * Expected:
   *  `Back`, `Skip`, `Save Changes` — đúng thứ tự, tất cả enabled.
   */
  test(
    'TC-ONB-123 — footer shows Back, Skip, Save Changes in order, all enabled',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      await expect(onboardingPage.saveChangesButton).toBeVisible({ timeout: Timeouts.LONG });

      // Presence and order only — Save Changes is never clicked here.
      expect(await onboardingPage.wizardFooterLabels()).toEqual(['Back', 'Skip', 'Save Changes']);

      await expect(onboardingPage.backButton).toBeEnabled();
      await expect(onboardingPage.skipButton).toBeEnabled();
      await expect(onboardingPage.saveChangesButton).toBeEnabled();
    },
  );

  /**
   * TC-ONB-124 — Lưu cấu hình thanh toán thành công
   * Steps:
   *  1. Đổi một vài thiết lập.
   *  2. Bấm `"Save Changes"`.
   * Expected:
   *  `[CẦN XÁC MINH — hành động ghi]` Toast `"Payment settings saved
   *  successfully"`; chuyển sang `?step=complete&whmcsId=<id>`.
   *
   * Preconditions: WHMCS ID dùng-một-lần.
   */
  // TODO(manual/setup): real write on DEV — needs a single-use WHMCS ID
  test.fixme(
    'TC-ONB-124 — saving payment settings toasts and advances to complete',
    { tag: [Tag.REGRESSION] },
    async () => {},
  );
});
