import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Timeouts } from '@configs/constants/timeouts';
import { MERCHANT_INFO_FIELDS, OnboardingStep } from '@pages/onboarding/OnboardingPage';

/**
 * Step 2 of the Merchant Onboarding wizard — "Business Information".
 *
 * The screen is NOT store-scoped: the route is a bare `/pos/onboarding` and the
 * step is selected by query (`?step=merchant-info&whmcsId=<id>`), so nothing
 * here may reference `/pos/<storeId>/`.
 *
 * SAFETY: `Save Changes & Continue` performs a real `PATCH` against the DEV
 * backend for the merchant on the URL. No executable test in this file clicks
 * it — asserting its presence/state is fine, and typing into a field or opening
 * a picker is fine because nothing is persisted until that button is pressed.
 * Every case whose Expected requires a successful save is a `test.fixme`.
 *
 * The merchant deep-linked below is already onboarded and is used read-only, so
 * assertions target format and behaviour, never the live values themselves.
 */
const WHMCS_ID = '3660';

/** The three fields whose `type` attribute the doc pins (the rest are plain text). */
const TYPED_FIELDS = MERCHANT_INFO_FIELDS.filter((field) => field.type !== 'text');

/** Fields the scanned merchant record always populates — used for the prefill check. */
const PREFILLED_FIELD_IDS = [
  'businessName',
  'address',
  'city',
  'postalCode',
  'phoneNumber',
  'email',
] as const;

test.describe('Bước 2 — `Business Information` — Onboarding', () => {
  test.beforeEach(async ({ onboardingPage }) => {
    await onboardingPage.gotoStep(OnboardingStep.MERCHANT_INFO, WHMCS_ID);
    await onboardingPage.waitForReady();
    // DEV renders this wizard in 7–12s; keyed on the step's own heading so each
    // test starts with step 2 actually painted, never on the wizard chrome alone.
    await expect(onboardingPage.businessInformationHeading).toBeVisible({
      timeout: Timeouts.LONG,
    });
  });

  /**
   * TC-ONB-059 — Bước 2 render đủ 2 khối và 10 control
   * Steps:
   *  1. Quan sát toàn bộ form.
   * Expected:
   *  Heading "Business Information" với 7 control (`Business Name`, `Legal Name`,
   *  `Address`, `Country`, `State`, `City`, `Zip`); heading "Contact Owner" với
   *  3 control (`Phone`, `Email`, `Website URL`).
   */
  test(
    'TC-ONB-059 — renders both blocks and all 10 controls',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ onboardingPage, page }) => {
      await expect(page).toHaveURL(/\/pos\/nail\/admin\/onboarding/);
      await expect(page).toHaveURL(/[?&]step=merchant-info/);

      await expect(onboardingPage.businessInformationHeading).toBeVisible();
      await expect(onboardingPage.contactOwnerHeading).toBeVisible();

      // 8 text inputs + 2 comboboxes = the 10 controls the case counts.
      for (const field of MERCHANT_INFO_FIELDS) {
        await expect(onboardingPage.merchantInfoField(field.id)).toBeVisible();
        await expect(onboardingPage.merchantInfoField(field.id)).toBeEnabled();
      }
      await expect(onboardingPage.countryCombobox).toBeVisible();
      await expect(onboardingPage.stateCombobox).toBeVisible();
    },
  );

  /**
   * TC-ONB-060 — Thuộc tính và placeholder từng field
   * Steps:
   *  1. Đọc DOM từng input.
   * Expected:
   *  `#businessName` ph `Enter business name`; `#legalName` ph `Enter legal name`;
   *  `#address` ph `Enter address`; `#city` ph `Enter city`; `#postalCode` ph
   *  `Enter zip code`; `#phoneNumber` `type=tel` ph `(205) 555-0123`; `#email`
   *  `type=email` ph `email@example.com`; `#website` `type=url` ph
   *  `https://example.com`.
   */
  test(
    'TC-ONB-060 — each field carries its documented placeholder and type',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      for (const field of MERCHANT_INFO_FIELDS) {
        await expect(onboardingPage.merchantInfoField(field.id)).toHaveAttribute(
          'placeholder',
          field.placeholder,
        );
      }

      // The doc only pins `type` on the three non-text fields; the plain text
      // ones are left unasserted rather than guessing at an implicit default.
      for (const field of TYPED_FIELDS) {
        await expect(onboardingPage.merchantInfoField(field.id)).toHaveAttribute(
          'type',
          field.type,
        );
      }
    },
  );

  /**
   * TC-ONB-061 — Form được prefill từ dữ liệu merchant
   * Steps:
   *  1. Vào `?step=merchant-info&whmcsId=3660`.
   *  2. Đọc `value` các field.
   * Expected:
   *  Các field không rỗng và khớp dữ liệu merchant từ `GET /merchant_settings/3660`;
   *  `Country` = `United States`, `State` = `Texas`. Assertion nên dùng "không rỗng
   *  + đúng định dạng", không hard-code giá trị.
   *
   * Per the Expected's own instruction this asserts presence + shape only —
   * DEV merchant data is dirty and edited by hand, so the sampled literals
   * (`Hair Salon 22`, `Texas`, …) are deliberately NOT asserted.
   */
  test(
    'TC-ONB-061 — the form is prefilled from the merchant record',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      const values = await onboardingPage.merchantInfoValues();

      for (const id of PREFILLED_FIELD_IDS) {
        expect(values[id]?.trim(), `${id} should be prefilled`).not.toBe('');
      }

      expect(values.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(values.postalCode).toMatch(/^\d{5}(-\d{4})?$/);
      // Format varies by record ((408) 269-2000 vs 4082692000), so pin the digit
      // count rather than the punctuation.
      expect(values.phoneNumber.replace(/\D/g, '')).toMatch(/^\d{10,}$/);

      const countryLabel = (await onboardingPage.countryCombobox.innerText()).trim();
      const stateLabel = (await onboardingPage.stateCombobox.innerText()).trim();
      expect(countryLabel).not.toBe('');
      expect(stateLabel).not.toBe('');
    },
  );

  /**
   * TC-ONB-062 — Combobox `State` mở dialog tìm kiếm
   * Steps:
   *  1. Bấm combobox `State`.
   *  2. Quan sát popup.
   * Expected:
   *  Mở `role="dialog"` chứa `textbox "Search state..."` và `listbox "Suggestions"`;
   *  giá trị đang chọn được đánh dấu `selected`.
   */
  test(
    'TC-ONB-062 — the State combobox opens a searchable dialog',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      const search = await onboardingPage.openStatePicker();

      await expect(onboardingPage.pickerDialog).toBeVisible();
      await expect(search).toBeVisible();
      await expect(onboardingPage.suggestionsListbox).toBeVisible();
      // The current value is marked in the a11y tree; it may be scrolled out of
      // the viewport, so assert it exists rather than that it is on screen.
      await expect(onboardingPage.selectedSuggestion.first()).toBeAttached();
    },
  );

  /**
   * TC-ONB-063 — Danh sách bang đầy đủ gồm cả lãnh thổ
   * Steps:
   *  1. Mở combobox `State`, cuộn hết danh sách.
   * Expected:
   *  Có ≥ 60 option, sắp xếp A→Z từ `Alabama` đến `Wyoming`, bao gồm lãnh thổ/đảo
   *  (`Guam`, `Puerto Rico`, `United States Virgin Islands`, `American Samoa`,
   *  `Northern Mariana Islands`, `Wake Island`, `Midway Atoll`…).
   */
  test(
    'TC-ONB-063 — the state list holds 60+ entries A→Z including territories',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      await onboardingPage.openStatePicker();
      // Doubles as the "≥ 60 option" assertion and as the wait for the list to
      // finish rendering, so the snapshot below is never a partial list.
      await expect
        .poll(async () => onboardingPage.suggestionOptions.count(), { timeout: Timeouts.MEDIUM })
        .toBeGreaterThanOrEqual(60);

      const options = (await onboardingPage.suggestionOptions.allInnerTexts()).map((text) =>
        text.replace(/\s+/g, ' ').trim(),
      );

      expect(options[0]).toBe('Alabama');
      expect(options[options.length - 1]).toBe('Wyoming');
      expect(options).toEqual([...options].sort((a, b) => a.localeCompare(b)));

      for (const territory of [
        'Guam',
        'Puerto Rico',
        'United States Virgin Islands',
        'American Samoa',
        'Northern Mariana Islands',
      ]) {
        expect(options, `${territory} should be offered`).toContain(territory);
      }
    },
  );

  /**
   * TC-ONB-064 — Tìm kiếm trong danh sách bang
   * Steps:
   *  1. Mở combobox `State`.
   *  2. Gõ `tex` vào "Search state...".
   * Expected:
   *  Danh sách lọc còn `Texas`; chọn `Texas` thì dialog đóng và combobox hiển thị
   *  `Texas`.
   *
   * Selecting a state edits the form only — nothing is persisted because
   * `Save Changes & Continue` is never pressed, so the merchant is left untouched.
   */
  test(
    'TC-ONB-064 — typing filters the state list and picking one closes the dialog',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      const search = await onboardingPage.openStatePicker();
      await search.fill('tex');

      // The list re-renders a tick after the keystroke, so poll the whole set
      // instead of snapshotting it — a plain `allInnerTexts()` here reads the
      // still-unfiltered list and sees "Alabama".
      await expect
        .poll(
          async () => {
            const texts = await onboardingPage.suggestionOptions.allInnerTexts();
            return texts.length > 0 && texts.every((text) => /tex/i.test(text));
          },
          { timeout: Timeouts.MEDIUM },
        )
        .toBe(true);
      await expect(onboardingPage.suggestionOption(/^Texas$/)).toBeVisible();

      await onboardingPage
        .suggestionOption(/^Texas$/)
        .first()
        .click();

      await expect(onboardingPage.pickerDialog).toBeHidden({ timeout: Timeouts.MEDIUM });
      await expect(onboardingPage.stateCombobox).toContainText('Texas');
    },
  );

  /**
   * TC-ONB-065 — Tìm kiếm không khớp trong danh sách bang
   * Steps:
   *  1. Mở combobox `State`, gõ `zzzzz`.
   * Expected:
   *  Danh sách rỗng và hiển thị trạng thái "không tìm thấy" phù hợp (không crash,
   *  không hiện toàn bộ danh sách).
   *
   * The empty-state wording was never captured by a scan, so this asserts the
   * verifiable half: zero options, the dialog still standing, no error boundary.
   */
  test(
    'TC-ONB-065 — a non-matching search empties the list without crashing',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      const search = await onboardingPage.openStatePicker();
      await search.fill('zzzzz');

      await expect(onboardingPage.suggestionOptions).toHaveCount(0, {
        timeout: Timeouts.MEDIUM,
      });
      await expect(onboardingPage.pickerDialog).toBeVisible();
      await expect(onboardingPage.errorBoundaryTitle).toBeHidden();
    },
  );

  /**
   * TC-ONB-073 — Bước 2 không có nút `Back`/`Skip`
   * Steps:
   *  1. Đọc toàn bộ nút ở cuối bước 2.
   * Expected:
   *  Chỉ có duy nhất "Save Changes & Continue"; không có `Back`, không có `Skip`
   *  (khác hẳn bước 3–6).
   */
  test(
    'TC-ONB-073 — the footer holds only Save Changes & Continue',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      await expect(onboardingPage.saveChangesAndContinueButton).toBeVisible();
      await expect(onboardingPage.saveChangesAndContinueButton).toBeEnabled();

      // Read the whole footer rather than three separate probes, so an extra
      // button appearing here fails too.
      expect(await onboardingPage.wizardFooterLabels()).toEqual(['Save changes & continue']);
      await expect(onboardingPage.backButton).toHaveCount(0);
      await expect(onboardingPage.skipButton).toHaveCount(0);
    },
  );
});
