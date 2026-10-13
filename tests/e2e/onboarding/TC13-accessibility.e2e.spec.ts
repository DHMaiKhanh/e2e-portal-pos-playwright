import type { Page } from '@playwright/test';
import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Timeouts } from '@configs/constants/timeouts';
import {
  ONBOARDING_ERRORS,
  ONBOARDING_SAMPLE_IDS,
  OnboardingStep,
  TIP_TIMING_OPTIONS,
  WEEKDAYS,
} from '@pages/onboarding/OnboardingPage';

/**
 * Merchant Onboarding — `Khả năng tiếp cận (Accessibility)`.
 *
 * The screen is an Internal/admin route and is NOT store-scoped: the path is a
 * bare `/pos/onboarding`, so nothing here may assert `/pos/<id>/` or touch
 * `env.STORE_ID`. Wizard position lives entirely in the query string.
 *
 * Unlike the per-step suites this area has no single landing point — each case
 * audits a different step (the WHMCS ID form, Work Hours, Package, Payment &
 * Transactions, Complete), and two of them walk several steps in one run. So
 * there is deliberately NO navigating `beforeEach`: every test deep-links what
 * it audits, and the multi-navigation cases call `test.slow()` because the
 * screen needs 7-12 s per render on DEV.
 *
 * SAFETY: nothing here writes. `Create Merchant` and `Save Changes` are only
 * ever inspected for their disabled state; the one interaction that clicks
 * anything (the read-only feature dialog on step 5) never reaches a save.
 *
 * `waitForLoadState('networkidle')` returns a blank page on this route, so every
 * wait is an `expect(locator)` with `Timeouts.LONG`.
 */

/** The already-onboarded merchant this file deep-links. Never mutated. */
const WHMCS_ID = '3660';

/** Whether focus currently sits inside the open dialog (TC-ONB-153). */
function focusIsInsideDialog(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const active = document.activeElement;
    return Boolean(dialog && active && dialog.contains(active));
  });
}

/**
 * Level jumps in a heading outline, as readable strings.
 *
 * A document must open at `h1` and may only descend one level at a time, so the
 * walk starts from level 0 — a page whose first heading is an `h3` reports
 * `h0 → h3` (which is exactly what this screen does today, see TC-ONB-155).
 */
function levelSkips(outline: Array<{ level: number; text: string }>): string[] {
  const problems: string[] = [];
  let previous = 0;
  for (const heading of outline) {
    if (heading.level > previous + 1) {
      problems.push(`h${previous} → h${heading.level} at "${heading.text}"`);
    }
    previous = heading.level;
  }
  return problems;
}

/** Level of the first heading matching `matcher` — `0` when there is none. */
function headingLevel(outline: Array<{ level: number; text: string }>, matcher: RegExp): number {
  return outline.find((heading) => matcher.test(heading.text))?.level ?? 0;
}

test.describe('Khả năng tiếp cận (Accessibility) — Onboarding', () => {
  /**
   * TC-ONB-148 — Input WHMCS ID có accessible name
   * Steps:
   *  1. Kiểm tra accessible name của `#whmcsId`.
   * Expected:
   *  Có tên truy cập được (từ `<label>`, `aria-label` hoặc placeholder).
   *  **Ghi chú**: ARIA snapshot chỉ đọc được `textbox "e.g. 12345"` → tên đang lấy
   *  từ placeholder; nên bổ sung `<label>`/`aria-label` rõ ràng.
   *
   * The name is asserted as *descriptive*, not as one literal string: the
   * placeholder satisfies the Expected today, and a proper `WHMCS ID` label —
   * the fix the note asks for — must keep this passing.
   */
  test(
    'TC-ONB-148 — #whmcsId exposes a descriptive accessible name',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage, page }) => {
      await onboardingPage.goto();
      await onboardingPage.waitForValidateForm();
      await expect(onboardingPage.whmcsIdInput).toBeVisible({ timeout: Timeouts.LONG });

      const name = await onboardingPage.accessibleNameOf(onboardingPage.whmcsIdInput);
      expect(name, 'the field must expose some accessible name').not.toBe('');
      expect(name, 'the name must describe the field').toMatch(/whmcs|id|12345/i);

      // Same check through the real accessibility tree: exactly one textbox on
      // step 1 and it is reachable by that name.
      await expect(page.getByRole('textbox', { name: /whmcs|id|12345/i })).toHaveCount(1);
    },
  );

  /**
   * TC-ONB-149 — Lỗi validate được công bố qua `role="alert"`
   * Steps:
   *  1. Submit rỗng và kiểm tra vùng lỗi.
   * Expected:
   *  Thông báo `"WHMCS ID must be numeric"` nằm trong phần tử `role="alert"`;
   *  input có `aria-invalid="true"` và liên kết `aria-describedby` tới thông báo.
   *  `[CẦN XÁC MINH]` phần `aria-describedby`.
   *
   * Submitting an empty field is client-side only — the `^\d+$` check fires
   * before any request, so this never touches the DEV backend.
   *
   * EXPECTED TO FAIL on the last assertion until the input is wired: the alert
   * and `aria-invalid` halves are verified live, the `aria-describedby` link is
   * the `[CẦN XÁC MINH]` half and is asserted as the Expected states it, not
   * softened to match what the screen does today.
   */
  test(
    'TC-ONB-149 — the validate error is announced via role="alert" and wired to the input',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      await onboardingPage.goto();
      await onboardingPage.waitForValidateForm();
      await expect(onboardingPage.validateButton).toBeVisible({ timeout: Timeouts.LONG });

      await onboardingPage.validateButton.click();

      await expect(onboardingPage.numericError).toBeVisible({ timeout: Timeouts.MEDIUM });
      await expect(onboardingPage.numericError).toHaveText(ONBOARDING_ERRORS.NUMERIC);
      await expect(onboardingPage.whmcsIdInput).toHaveAttribute('aria-invalid', 'true');

      const described = await onboardingPage.describedByText(onboardingPage.whmcsIdInput);
      expect(described, 'aria-describedby must point at the alert').toContain(
        ONBOARDING_ERRORS.NUMERIC,
      );
    },
  );

  /**
   * TC-ONB-150 — Switch giờ làm việc có nhãn phân biệt được
   * Steps:
   *  1. Đọc accessible name của 7 switch bước 3.
   * Expected:
   *  Mỗi switch có nhãn duy nhất dạng `"<Day> open status"`; không có hai switch
   *  trùng tên.
   */
  test(
    'TC-ONB-150 — each Work Hours switch carries a unique "<Day> open status" name',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      await onboardingPage.gotoStep(OnboardingStep.WORK_HOURS, WHMCS_ID);
      await onboardingPage.waitForReady();
      await expect(onboardingPage.businessHoursHeading).toBeVisible({ timeout: Timeouts.LONG });

      await expect(onboardingPage.workHoursSwitches).toHaveCount(WEEKDAYS.length);
      const names = await onboardingPage.accessibleNames(onboardingPage.workHoursSwitches);

      for (const day of WEEKDAYS) {
        // Resolvable through the accessibility tree by that exact name…
        await expect(onboardingPage.dayOpenSwitch(day), `${day} switch`).toHaveCount(1);
        // …and the day's own switch carries it.
        expect(names, `${day} switch`).toContain(`${day} open status`);
      }

      // No two switches share a name.
      expect(new Set(names).size).toBe(names.length);
    },
  );

  /**
   * TC-ONB-151 — Radiogroup tip có nhãn nhóm
   * Steps:
   *  1. Kiểm tra radiogroup ở bước 6.
   * Expected:
   *  Nhóm có `role="radiogroup"` với accessible name `"Tip timing"`; 2 radio con
   *  có nhãn mô tả đầy đủ.
   */
  test(
    'TC-ONB-151 — the tip radiogroup is named "Tip timing" and holds two labelled radios',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      await onboardingPage.gotoStep(OnboardingStep.PAYMENT_TRANSACTIONS, WHMCS_ID);
      await onboardingPage.waitForReady();
      await expect(onboardingPage.tippingSettingsHeading).toBeVisible({ timeout: Timeouts.LONG });

      // `tipTimingGroup` is `getByRole('radiogroup', { name: /tip timing/i })`,
      // so resolving it at all is the group-name assertion.
      await expect(onboardingPage.tipTimingGroup).toHaveCount(1);
      await expect(onboardingPage.tipTimingRadios).toHaveCount(TIP_TIMING_OPTIONS.length);

      for (const option of TIP_TIMING_OPTIONS) {
        await expect(
          onboardingPage.tipTimingOption(new RegExp(option.label)),
          `${option.label} radio`,
        ).toHaveCount(1);
      }

      const names = await onboardingPage.accessibleNames(onboardingPage.tipTimingRadios);
      for (const name of names) {
        expect(name, 'every radio must carry a label').not.toBe('');
      }
    },
  );

  /**
   * TC-ONB-152 — Nút xoá preset có nhãn mô tả
   * Steps:
   *  1. Đọc accessible name các nút xoá chip.
   * Expected:
   *  Dạng `"Remove 15% tip preset"` — mô tả rõ đối tượng bị xoá, không phải chỉ `"×"`.
   *
   * Read-only: the delete controls are inspected, never clicked.
   */
  test(
    'TC-ONB-152 — preset delete controls are named "Remove <n>% tip preset"',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      await onboardingPage.gotoStep(OnboardingStep.PAYMENT_TRANSACTIONS, WHMCS_ID);
      await onboardingPage.waitForReady();
      await expect(onboardingPage.tipPresetsHeading).toBeVisible({ timeout: Timeouts.LONG });

      await expect(onboardingPage.removePresetButtons.first()).toBeVisible({
        timeout: Timeouts.LONG,
      });

      const names = await onboardingPage.accessibleNames(onboardingPage.removePresetButtons);
      expect(
        names.length,
        'merchant 3660 renders preset chips (~40, see TC-ONB-120)',
      ).toBeGreaterThan(0);
      for (const name of names) {
        expect(name, 'delete control must name what it removes').toMatch(
          /^Remove \d+(?:\.\d+)?% tip preset$/,
        );
      }

      // One delete control per chip — nothing is labelled by a bare glyph.
      await expect(onboardingPage.removePresetButtons).toHaveCount(
        await onboardingPage.tipPresetCount(),
      );
    },
  );

  /**
   * TC-ONB-153 — Dialog feature bẫy focus và trả focus
   * Steps:
   *  1. Dùng bàn phím mở dialog `"View all 62 features"`.
   *  2. Nhấn `Tab` nhiều lần.
   *  3. Nhấn `Escape`.
   * Expected:
   *  Focus quẩn trong dialog, không thoát ra nền; `Escape` đóng dialog và trả
   *  focus về nút đã mở nó.
   *
   * The dialog is read-only (it lists features); `Select This Package` is only
   * ever tabbed past, never activated, so nothing is selected or saved.
   *
   * EXPECTED TO FAIL on the final assertion: the live check on 2026-08-19
   * (recorded in TC8 / TC-ONB-100) found both dismiss routes leave
   * `document.activeElement` on `<body>` instead of returning it to the trigger
   * — a WAI-ARIA dialog-pattern violation. The Expected is asserted as written.
   */
  // PRODUCT GAP (2026-10-11): Escape closes the feature dialog but leaves focus on <body> instead of returning it to the opening trigger — a WAI-ARIA dialog-pattern violation. Re-enable once fixed.
  test.fixme(
    'TC-ONB-153 — the feature dialog traps Tab and hands focus back on Escape',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage, page }) => {
      await onboardingPage.gotoStep(OnboardingStep.POS_PACKAGE, WHMCS_ID);
      await onboardingPage.waitForReady();

      const trigger = onboardingPage.viewAllFeaturesButtons.first();
      await expect(trigger).toBeVisible({ timeout: Timeouts.LONG });

      // Keyboard-only open: focus the trigger, then Enter.
      await trigger.focus();
      await expect(trigger).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(onboardingPage.featureDialog).toBeVisible({ timeout: Timeouts.MEDIUM });

      // Focus must cycle inside the dialog, never onto the page behind it.
      for (let press = 1; press <= 12; press += 1) {
        await page.keyboard.press('Tab');
        expect(
          await focusIsInsideDialog(page),
          `focus escaped the dialog after ${press} Tab press(es)`,
        ).toBe(true);
      }

      await page.keyboard.press('Escape');
      await expect(onboardingPage.featureDialog).toBeHidden({ timeout: Timeouts.MEDIUM });
      await expect(trigger, 'Escape must return focus to the opening trigger').toBeFocused({
        timeout: Timeouts.SHORT,
      });
    },
  );

  /**
   * TC-ONB-154 — Điều khiển toàn bộ wizard bằng bàn phím
   * Steps:
   *  1. Chỉ dùng `Tab`/`Shift+Tab`/`Enter`/`Space`/mũi tên, đi từ bước 1 tới các
   *     nút điều hướng cuối mỗi bước.
   * Expected:
   *  Mọi control (input, switch, combobox, radio, nút) đều nhận được focus theo
   *  thứ tự hợp lý và kích hoạt được bằng bàn phím; vòng focus (focus ring) luôn
   *  nhìn thấy.
   */
  // TODO(manual/setup): walking the wizard end-to-end by keyboard means *activating*
  // each step's footer control — `Create Merchant` on step 1 and `Save Changes` /
  // `Save Changes & Continue` on steps 2-6 — which are real writes on DEV, so this
  // needs a single-use WHMCS ID. The focus-ring half is a visual check (a computed
  // `:focus-visible` outline against the card background) that no assertion covers;
  // audit it manually or with an axe/contrast pass.
  test.fixme(
    'TC-ONB-154 — the whole wizard is operable by keyboard with a visible focus ring',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * TC-ONB-155 — Cấu trúc heading hợp lý
   * Steps:
   *  1. Liệt kê heading trên từng bước.
   * Expected:
   *  Không nhảy cấp bất hợp lý. **Ghi nhận vấn đề**: các bước 1–6 dùng h3
   *  (`Enter WHMCS ID`, `Business Information`, `Business Hours`,
   *  `Business Photos`, `Payment Methods`) trong khi bước 7 dùng h2
   *  (`Merchant Onboarding Complete!`) và tiêu đề trang `"Merchant Onboarding"`
   *  không phải h1 → cần thống nhất phân cấp.
   *
   * EXPECTED TO FAIL until the hierarchy is unified — this is known bug #9 in the
   * test-case doc. The screen renders no `h1` at all (its first heading is an
   * `h3`, so `levelSkips` reports `h0 → h3`) and step 7 heads its card with an
   * `h2` while steps 1-6 use `h3`. Both are asserted as the correct behaviour.
   */
  // PRODUCT GAP (2026-10-11): the screen renders no h1 (first heading is h3, so h0 → h3) and step 7 heads its card with h2 while steps 1-6 use h3; expected a consistent hierarchy starting at h1. Re-enable once fixed.
  test.fixme(
    'TC-ONB-155 — headings start at h1, never skip a level, and keep one card level',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      test.slow(); // three full page loads at 7-12 s each on DEV.

      await onboardingPage.goto();
      await onboardingPage.waitForValidateForm();
      const step1 = await onboardingPage.headingOutline();
      expect(step1.length, 'step 1 renders headings').toBeGreaterThan(0);
      expect(levelSkips(step1), 'step 1 heading levels').toEqual([]);

      const step1Card = headingLevel(step1, /^Enter WHMCS ID$/);
      expect(step1Card, 'step 1 card heading is present').toBeGreaterThan(0);

      await onboardingPage.gotoStep(OnboardingStep.PAYMENT_TRANSACTIONS, WHMCS_ID);
      await onboardingPage.waitForReady();
      await expect(onboardingPage.paymentMethodsHeading).toBeVisible({ timeout: Timeouts.LONG });
      const step6 = await onboardingPage.headingOutline();
      expect(levelSkips(step6), 'step 6 heading levels').toEqual([]);
      expect(headingLevel(step6, /^Payment Methods$/), 'step 6 card heading level').toBe(step1Card);

      await onboardingPage.gotoStep(OnboardingStep.COMPLETE, WHMCS_ID);
      await onboardingPage.waitForReady();
      await expect(onboardingPage.completeHeading).toBeVisible({ timeout: Timeouts.LONG });
      const step7 = await onboardingPage.headingOutline();
      expect(levelSkips(step7), 'step 7 heading levels').toEqual([]);
      expect(
        headingLevel(step7, /Merchant Onboarding Complete/),
        'step 7 must head its card at the same level as steps 1-6',
      ).toBe(step1Card);
    },
  );

  /**
   * TC-ONB-156 — Độ tương phản của badge trạng thái
   * Steps:
   *  1. Kiểm tra tương phản màu của badge `Ready` (success), `Not Ready`
   *     (destructive), `Optional` (muted) ở cả theme sáng và tối.
   * Expected:
   *  Đạt tối thiểu WCAG AA (4.5:1 cho chữ thường); trạng thái không chỉ được
   *  truyền tải bằng màu mà còn bằng text (đã có nhãn chữ — đạt).
   */
  // TODO(manual/setup): needs a colour-contrast audit — the badge's effective
  // background is composited from utility classes over the card, so a ratio has to
  // be measured (axe / Lighthouse), not asserted from a locator, and the dark theme
  // has no toggle exposed on this route or project in playwright.config. The
  // "state is carried by text, not colour alone" half is already covered live by
  // the badge-text assertions in TC4 (TC-ONB-040…047).
  test.fixme(
    'TC-ONB-156 — status badges meet WCAG AA contrast in the light and dark themes',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * TC-ONB-157 — Nút disabled được công bố đúng
   * Steps:
   *  1. Kiểm tra `"Create Merchant"` (khi chưa sẵn sàng) và `"Current Plan"`.
   * Expected:
   *  Có thuộc tính `disabled` thật (không chỉ làm mờ bằng CSS); trình đọc màn hình
   *  công bố là không khả dụng.
   *
   * `Create Merchant` writes to DEV, so it is only ever inspected here — the
   * merchant chosen (`3412`, Business App Not Ready) is one the button is
   * disabled for anyway.
   */
  test(
    'TC-ONB-157 — Create Merchant and Current Plan carry a real disabled attribute',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      test.slow(); // two full page loads at 7-12 s each on DEV.

      await onboardingPage.gotoStep(
        OnboardingStep.VALIDATE,
        ONBOARDING_SAMPLE_IDS.BUSINESS_APP_NOT_READY,
      );
      await onboardingPage.waitForIntegrationPanel();

      await expect(onboardingPage.createMerchantButton).toBeVisible({ timeout: Timeouts.LONG });
      await expect(onboardingPage.createMerchantButton).toBeDisabled();
      expect(
        await onboardingPage.hasDisabledAttribute(onboardingPage.createMerchantButton),
        'Create Merchant must be truly disabled, not just dimmed',
      ).toBe(true);

      await onboardingPage.gotoStep(OnboardingStep.POS_PACKAGE, WHMCS_ID);
      await onboardingPage.waitForReady();

      await expect(onboardingPage.currentPlanButton).toBeVisible({ timeout: Timeouts.LONG });
      await expect(onboardingPage.currentPlanButton).toBeDisabled();
      expect(
        await onboardingPage.hasDisabledAttribute(onboardingPage.currentPlanButton),
        'Current Plan must be truly disabled, not just dimmed',
      ).toBe(true);
    },
  );
});
