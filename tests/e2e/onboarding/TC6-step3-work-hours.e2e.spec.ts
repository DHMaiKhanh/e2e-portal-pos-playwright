import type { Locator, Page } from '@playwright/test';
import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Timeouts } from '@configs/constants/timeouts';
import {
  ONBOARDING_TOASTS,
  OnboardingStep,
  TIME_LABEL_PATTERN,
  WEEKDAYS,
  stepUrlPattern,
} from '@pages/onboarding/OnboardingPage';

/**
 * Merchant Onboarding — step 3, `Business Hours`.
 *
 * The screen is an Internal/admin route and is NOT store-scoped: the path is a
 * bare `/pos/onboarding`, so nothing here may assert `/pos/<id>/` or touch
 * `env.STORE_ID`. Wizard position lives entirely in the query string, and steps
 * 2-7 are behind a routing guard that bounces a missing `whmcsId` back to
 * `?step=validate` — so every case deep-links `?step=work-hours&whmcsId=<id>`.
 *
 * SAFETY: `Save Changes` writes to the DEV backend for real. No executable test
 * in this file clicks it — its presence and enabled state are asserted instead.
 * Local form edits (picking a time, flipping a switch) never leave the browser
 * and are safe on the shared merchant; the two cases that need a real write are
 * scaffolds.
 *
 * The screen renders in 7-12 s on DEV and `waitForLoadState('networkidle')`
 * returns a blank page here, so every wait is an `expect(locator)` with
 * `Timeouts.LONG`.
 */

/** The already-onboarded merchant this file deep-links. Never mutated. */
const WHMCS_ID = '3660';

/** POST/PUT/PATCH/DELETE traffic that would mean the step persisted something. */
const SAVE_REQUEST_URL = /merchant|work[-_]?hour|onboard/i;

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/** Every hour the picker's first wheel must offer, sorted as the DOM renders them. */
const PICKER_HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

/** The only minutes the picker may offer — the 15-minute steps of TC-ONB-080. */
const PICKER_MINUTES = ['00', '15', '30', '45'];

/**
 * One weekday's row.
 *
 * `OnboardingPage.dayRow()` / `dayTimeButtons()` do not fit: they take the
 * `.last()` `div` containing the day's switch, which on the live DOM is the
 * inner `flex min-w-0 items-center` block holding only the label and the switch
 * — the two time triggers are one level up, so those members resolve to zero
 * buttons. Adding a second `filter` for a time trigger pins the real row.
 */
const dayRow = (page: Page, day: string): Locator =>
  page
    .locator('div')
    .filter({ has: page.getByRole('switch', { name: `${day} open status` }) })
    .filter({ has: page.getByRole('button', { name: 'Select time' }) })
    .last();

/**
 * A day's two time triggers: [0] opening, [1] closing.
 *
 * Their accessible name is the `aria-label` "Select time" on every row; the
 * chosen time (`9:00 AM`) is only the visible text, which is why the name is
 * matched exactly and the value is read with `allInnerTexts()`.
 */
const dayTimeButtons = (page: Page, day: string): Locator =>
  dayRow(page, day).getByRole('button', { name: 'Select time' });

/** Labels of one day's two time triggers — `['9:00 AM', '5:00 PM']`. */
const dayTimes = async (page: Page, day: string): Promise<string[]> => {
  const labels = await dayTimeButtons(page, day).allInnerTexts();
  return labels.map((label) => label.replace(/\s+/g, ' ').trim());
};

/**
 * The picker's three scroll wheels: hour, minute, meridiem.
 *
 * `OnboardingPage.timePickerColumns` does not fit: `getByRole('list')` resolves
 * to six nodes, because each wheel renders its options twice — once plainly and
 * once inside the highlight band that marks the current value — so the member's
 * 0/1/2 column indexes land on hour, hour-again, minute. The `data-rwp-options`
 * attribute (observed live, 2026-08-19) picks out the three real option lists.
 */
const timeWheels = (page: Page): Locator =>
  page.getByRole('dialog').locator('ul[data-rwp-options]');

/**
 * Every distinct value one wheel offers, sorted.
 *
 * Read straight from the DOM rather than through `getByRole('listitem')`: the
 * wheel is a 3D carousel that sets `visibility: hidden` on the options rotated
 * away from the viewer, and hidden nodes are absent from the accessibility tree
 * — the role-based read returns only the ~11 options currently facing forward.
 */
const wheelValues = async (page: Page, wheel: 0 | 1 | 2): Promise<string[]> =>
  timeWheels(page)
    .nth(wheel)
    .evaluate((list) => {
      const texts = Array.from(list.querySelectorAll('li')).map((item) =>
        (item.textContent ?? '').trim(),
      );
      return [...new Set(texts)].sort();
    });

/**
 * Wait for a wheel's spin animation to come to rest.
 *
 * Not decoration: the carousel only commits a value when its own scroll ends,
 * so clicking the next wheel mid-spin cancels the previous one and it snaps
 * back — picking `10` then `30` without this lands on `9:30 AM`, not `10:30 AM`.
 * Two identical samples of the list's inline `transform` mean it has stopped.
 */
const settleWheel = async (page: Page, wheel: 0 | 1 | 2): Promise<void> => {
  const list = timeWheels(page).nth(wheel);
  let previous = '';
  await expect
    .poll(
      async () => {
        const current = await list.evaluate((node) => node.style.transform);
        const stable = current !== '' && current === previous;
        previous = current;
        return stable;
      },
      { timeout: Timeouts.MEDIUM, intervals: [150] },
    )
    .toBe(true);
};

/**
 * Choose one value on one wheel, then let it settle.
 *
 * `force` is required and is not papering over a flake: the library lays a
 * transparent `div[data-rwp]` drag surface over the whole carousel, so every
 * option legitimately fails the "receives pointer events" check while still
 * handling the click that lands on it. Verified live — clicking `11` on the
 * hour wheel moved a `9:00 AM` trigger to `11:00 AM`.
 */
const pickWheelValue = async (page: Page, wheel: 0 | 1 | 2, value: string): Promise<void> => {
  await timeWheels(page)
    .nth(wheel)
    .locator('li')
    .filter({ hasText: new RegExp(`^${value}$`) })
    .first()
    .click({ force: true });
  await settleWheel(page, wheel);
};

/** Open a day's opening (0) or closing (1) picker and wait for its three wheels. */
const openTimePicker = async (page: Page, day: string, which: 0 | 1): Promise<void> => {
  await dayTimeButtons(page, day).nth(which).click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: Timeouts.MEDIUM });
  await expect(timeWheels(page)).toHaveCount(3);
};

test.describe('Bước 3 — `Work Hours` — Onboarding', () => {
  test.beforeEach(async ({ onboardingPage }) => {
    await onboardingPage.gotoStep(OnboardingStep.WORK_HOURS, WHMCS_ID);
    await onboardingPage.waitForReady();
    await expect(onboardingPage.businessHoursHeading).toBeVisible({ timeout: Timeouts.LONG });
  });

  /**
   * TC-ONB-075 — Bước 3 render đủ 7 ngày
   * Steps:
   *  1. Đọc danh sách các dòng ngày.
   * Expected:
   *  Heading h3 "Business Hours"; đúng 7 dòng theo thứ tự `Monday` → `Sunday`;
   *  mỗi dòng có 1 switch và 2 nút "Select time".
   *
   * Row order is asserted off the switches' `aria-label`s read in DOM order:
   * the day name is only a text node, so the switch is the one handle that is
   * both ordered and uniquely identifying.
   */
  test(
    'TC-ONB-075 — renders Business Hours with 7 day rows, Monday to Sunday',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ onboardingPage, page }) => {
      await expect(onboardingPage.businessHoursHeading).toBeVisible();

      const switchLabels = await page
        .getByRole('switch')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label') ?? ''));
      expect(switchLabels).toEqual(WEEKDAYS.map((day) => `${day} open status`));

      await expect(onboardingPage.timeButtons).toHaveCount(WEEKDAYS.length * 2);
      for (const day of WEEKDAYS) {
        await expect(onboardingPage.dayOpenSwitch(day)).toBeVisible();
        await expect(dayTimeButtons(page, day)).toHaveCount(2);
      }
    },
  );

  /**
   * TC-ONB-076 — Switch từng ngày có accessible name đúng
   * Steps:
   *  1. Đọc `aria-label` của 7 switch.
   * Expected:
   *  Lần lượt "Monday open status", "Tuesday open status", … "Sunday open
   *  status"; mỗi switch có `role="switch"` và trạng thái `checked` đọc được.
   *
   * `dayOpenSwitch()` resolves by role + accessible name, so the locator
   * matching at all proves both halves of the first expectation; `isChecked()`
   * only answers for an element that really carries a checked state, which
   * proves the second without freezing today's open/closed data.
   */
  test(
    'TC-ONB-076 — each day switch exposes "<Day> open status" and a readable checked state',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      for (const day of WEEKDAYS) {
        const daySwitch = onboardingPage.dayOpenSwitch(day);
        await expect(daySwitch).toBeVisible();
        await expect(daySwitch).toHaveAttribute('aria-label', `${day} open status`);
        await expect(daySwitch).toHaveAttribute('aria-checked', /^(true|false)$/);
        expect(typeof (await daySwitch.isChecked())).toBe('boolean');
      }
    },
  );

  /**
   * TC-ONB-077 — Giờ mở/đóng hiển thị định dạng 12 giờ
   * Steps:
   *  1. Đọc nhãn 2 nút "Select time" của một ngày.
   * Expected:
   *  Khớp regex `^\d{1,2}:\d{2}\s(AM|PM)$` (mẫu quét: `9:00 AM` và `5:00 PM`).
   *
   * Format only — never the literal `9:00 AM`, since the merchant's saved hours
   * are live data and may legitimately differ. Checked across all seven rows
   * rather than one, which costs nothing and catches a single bad row.
   */
  test(
    'TC-ONB-077 — open/close labels use 12-hour format',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page }) => {
      for (const day of WEEKDAYS) {
        const times = await dayTimes(page, day);
        expect(times, `${day} should expose an opening and a closing time`).toHaveLength(2);
        for (const label of times) {
          expect(label, `${day} time label`).toMatch(TIME_LABEL_PATTERN);
        }
      }
    },
  );

  /**
   * TC-ONB-078 — Time picker mở đủ 3 cột chọn
   * Steps:
   *  1. Bấm nút "Select time" đầu tiên.
   *  2. Quan sát popup.
   * Expected:
   *  Mở popover/dialog gồm cột giờ (`12`, `01`…`11`), cột phút (`00`, `15`,
   *  `30`, `45`) và cột `AM`/`PM`; giá trị hiện tại được đánh dấu.
   *
   * "Current value is marked" is asserted as the three highlight bands the
   * carousel draws across its centre row — one per wheel — which is the only
   * marker the control renders; no option carries a selected state of its own.
   *
   * Opening the picker is read-only: nothing is chosen and nothing is saved.
   */
  test(
    'TC-ONB-078 — time picker opens with hour / minute / meridiem wheels',
    { tag: [Tag.REGRESSION] },
    async ({ page }) => {
      await openTimePicker(page, 'Monday', 0);

      expect(await wheelValues(page, 0)).toEqual(PICKER_HOURS);
      expect(await wheelValues(page, 1)).toEqual(PICKER_MINUTES);
      expect(await wheelValues(page, 2)).toEqual(['AM', 'PM']);

      await expect(page.getByRole('dialog').locator('[data-rwp-highlight-wrapper]')).toHaveCount(3);
    },
  );

  /**
   * TC-ONB-079 — Chọn giờ mới cập nhật nhãn nút
   * Steps:
   *  1. Mở time picker giờ mở của `Monday`.
   *  2. Chọn `10` : `30` : `AM`.
   *  3. Đóng popup.
   * Expected:
   *  Nhãn nút đổi thành `10:30 AM`; các ngày khác không bị ảnh hưởng.
   *
   * A local form edit only — `Save Changes` is never clicked, so nothing is
   * persisted onto the shared merchant and the test is safe to re-run. Monday's
   * closing time is captured too: picking an opening time must not disturb the
   * other trigger on the same row.
   */
  test(
    'TC-ONB-079 — picking a time updates that trigger and leaves other days alone',
    { tag: [Tag.REGRESSION] },
    async ({ page }) => {
      const mondayBefore = await dayTimes(page, 'Monday');
      const tuesdayBefore = await dayTimes(page, 'Tuesday');

      const opening = dayTimeButtons(page, 'Monday').first();

      await openTimePicker(page, 'Monday', 0);
      await pickWheelValue(page, 0, '10');
      await expect(opening).toHaveText(/^10:\d{2}\s?(AM|PM)$/);
      await pickWheelValue(page, 1, '30');
      await expect(opening).toHaveText(/^10:30\s?(AM|PM)$/);
      await pickWheelValue(page, 2, 'AM');
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden({ timeout: Timeouts.MEDIUM });

      await expect(opening).toHaveText(/^10:30\s?AM$/);
      expect((await dayTimes(page, 'Monday'))[1]).toBe(mondayBefore[1]);
      expect(await dayTimes(page, 'Tuesday')).toEqual(tuesdayBefore);
    },
  );

  /**
   * TC-ONB-080 — Phút chỉ cho chọn bước 15 phút
   * Steps:
   *  1. Mở time picker, đọc danh sách phút.
   * Expected:
   *  Chỉ có 4 giá trị `00`, `15`, `30`, `45` — không nhập được phút tuỳ ý.
   *
   * "No arbitrary entry" is covered by asserting the popup offers nothing to
   * type into, on top of the closed set of four minute options.
   */
  test(
    'TC-ONB-080 — the minute wheel offers only the four 15-minute steps',
    { tag: [Tag.REGRESSION] },
    async ({ page }) => {
      await openTimePicker(page, 'Monday', 0);

      expect(await wheelValues(page, 1)).toEqual(PICKER_MINUTES);

      const dialog = page.getByRole('dialog');
      await expect(dialog.getByRole('textbox')).toHaveCount(0);
      await expect(dialog.getByRole('spinbutton')).toHaveCount(0);
      await expect(dialog.locator('input')).toHaveCount(0);
    },
  );

  /**
   * TC-ONB-081 — Tắt switch của một ngày
   * Steps:
   *  1. Tắt switch "Sunday open status".
   *  2. Quan sát 2 nút giờ của dòng đó.
   * Expected:
   *  [CẦN XÁC MINH] — kỳ vọng 2 nút "Select time" bị ẩn hoặc disable (ngày đóng
   *  cửa); phải nhất quán khi bật lại.
   */
  // TODO(manual/setup): the Expected is [CẦN XÁC MINH] and names two mutually
  // exclusive outcomes — the doc does not know whether closing a day HIDES its
  // two time triggers or merely DISABLES them, and either assertion would be a
  // guess that passes for the wrong reason. Flipping the switch is itself safe
  // (nothing is saved), so this becomes executable the moment a live check
  // settles which behaviour ships; the arrange step below is already correct,
  // and merchant 3660 currently has all seven days open, so the case has never
  // been observed in its closed state.
  test.fixme(
    'TC-ONB-081 — turning a day off hides or disables its time triggers',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage }) => {
      await onboardingPage.dayOpenSwitch('Sunday').click();
    },
  );

  /**
   * TC-ONB-082 — Giờ đóng sớm hơn giờ mở
   * Steps:
   *  1. Đặt `Monday` mở `5:00 PM`, đóng `9:00 AM`.
   *  2. Bấm "Save Changes".
   * Expected:
   *  [CẦN XÁC MINH] — kỳ vọng chặn với thông báo lỗi rõ ràng; nếu lưu được thì
   *  là bug logic cần báo (trừ khi hệ thống cố ý hỗ trợ ca qua đêm — cần xác
   *  nhận với PO).
   */
  // TODO(manual/setup): real write on DEV — needs a single-use WHMCS ID. The
  // case only reaches its expectation by clicking `Save Changes`, which would
  // persist an inverted schedule onto the shared read-only merchant 3660 that
  // every other case in this file reads from. The Expected is [CẦN XÁC MINH]
  // on top of that: whether an overnight shift is a validation error or a
  // supported feature is an open question for the PO, so there is no settled
  // assertion to write even on a disposable merchant. Setting the inverted
  // hours is the safe half and is already possible via `pickWheelValue`.
  test.fixme(
    'TC-ONB-082 — a closing time earlier than the opening time is rejected',
    { tag: [Tag.REGRESSION] },
    async () => {},
  );

  /**
   * TC-ONB-083 — Ba nút điều hướng cuối bước 3
   * Steps:
   *  1. Đọc các nút ở cuối trang.
   * Expected:
   *  Đúng 3 nút theo thứ tự `Back`, `Skip`, `Save Changes`; tất cả enabled.
   *
   * Presence and enabled state only — `Save Changes` is never clicked here.
   */
  test(
    'TC-ONB-083 — footer shows Back, Skip, Save Changes, all enabled',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      await expect(onboardingPage.wizardFooterButtons).toHaveCount(3);
      expect(await onboardingPage.wizardFooterLabels()).toEqual(['Back', 'Skip', 'Save Changes']);

      await expect(onboardingPage.backButton).toBeEnabled();
      await expect(onboardingPage.skipButton).toBeEnabled();
      await expect(onboardingPage.saveChangesButton).toBeEnabled();
    },
  );

  /**
   * TC-ONB-084 — Nút `Skip` bỏ qua bước 3
   * Steps:
   *  1. Ở bước 3, bấm "Skip".
   * Expected:
   *  Chuyển sang `?step=photos&whmcsId=<id>` mà **không** phát sinh request
   *  lưu; không hiện toast.
   *
   * `Skip` advances the wizard without persisting, which is what the request
   * recorder proves: any POST/PUT/PATCH/DELETE at a merchant / work-hours /
   * onboarding URL during the click fails the test. A regression that turned
   * Skip into a silent save is therefore caught here rather than quietly
   * mutating merchant 3660.
   */
  test(
    'TC-ONB-084 — Skip advances to the Photos step without saving',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ onboardingPage, page }) => {
      const writes: string[] = [];
      page.on('request', (request) => {
        const method = request.method().toUpperCase();
        if (WRITE_METHODS.includes(method) && SAVE_REQUEST_URL.test(request.url())) {
          writes.push(`${method} ${request.url()}`);
        }
      });

      await onboardingPage.skipButton.click();

      await expect(page).toHaveURL(stepUrlPattern(OnboardingStep.PHOTOS, WHMCS_ID));
      await expect(onboardingPage.businessPhotosHeading).toBeVisible({ timeout: Timeouts.LONG });

      expect(writes, 'Skip must not persist anything').toEqual([]);
      await expect(page.getByText(ONBOARDING_TOASTS.WORK_HOURS)).toHaveCount(0);
    },
  );

  /**
   * TC-ONB-085 — Lưu giờ làm việc thành công
   * Preconditions: WHMCS ID dùng-một-lần.
   * Steps:
   *  1. Đổi giờ một ngày.
   *  2. Bấm "Save Changes".
   * Expected:
   *  [CẦN XÁC MINH — hành động ghi] Toast "Work hours saved successfully";
   *  chuyển sang bước `Photos`; reload lại bước 3 thấy giá trị đã lưu.
   */
  // TODO(manual/setup): real write on DEV — needs a single-use WHMCS ID. The
  // whole expectation (success toast, advance to Photos, the value surviving a
  // reload) requires clicking `Save Changes`, which persists new business hours
  // onto the shared merchant 3660 that every other case in this file reads
  // from. Unblocked by provisioning a disposable merchant id, then reusing
  // `openTimePicker` / `pickWheelValue` above and asserting
  // `ONBOARDING_TOASTS.WORK_HOURS` plus
  // `stepUrlPattern(OnboardingStep.PHOTOS, <that id>)`.
  test.fixme(
    'TC-ONB-085 — saving work hours toasts and advances to Photos',
    { tag: [Tag.REGRESSION] },
    async () => {},
  );
});
