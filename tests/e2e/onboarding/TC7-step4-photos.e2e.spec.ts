import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Timeouts } from '@configs/constants/timeouts';
import { OnboardingStep, PHOTO_UPLOADS, stepUrlPattern } from '@pages/onboarding/OnboardingPage';

/**
 * Step 4 — `Photos` of the Merchant Onboarding wizard.
 *
 * The route is the bare, NOT store-scoped `/pos/onboarding`, so nothing here
 * asserts `/pos/<id>/` or touches `env.STORE_ID`. Step 4 is only reachable with
 * a `whmcsId` on the URL — without one the routing guard bounces back to
 * `?step=validate` — so every case deep-links the already-onboarded read-only
 * merchant below.
 *
 * SAFETY: `Save Changes` performs a real write against the DEV backend and is
 * never clicked here. Selecting a file into an upload slot would likewise push
 * bytes at DEV, so the upload cases are scaffolds. `Skip` only navigates and is
 * safe to click.
 *
 * DEV renders this screen in 7–12 s and `waitForLoadState('networkidle')`
 * returns a blank page on it, so the step is awaited via an explicit
 * `expect(...).toBeVisible({ timeout: Timeouts.LONG })` in `beforeEach`.
 */
const WHMCS_ID = '3660';

test.describe('Bước 4 — `Photos` — Onboarding', () => {
  test.beforeEach(async ({ onboardingPage }) => {
    await onboardingPage.gotoStep(OnboardingStep.PHOTOS, WHMCS_ID);
    await onboardingPage.waitForReady();
    await expect(onboardingPage.businessPhotosHeading).toBeVisible({ timeout: Timeouts.LONG });
  });

  /**
   * TC-ONB-086 — Bước 4 render đủ 2 vùng upload
   * Steps:
   *  1. Quan sát nội dung.
   * Expected:
   *  Heading h3 "Business Photos", mô tả "Your branding appears on receipts,
   *  booking pages, and customer communications."; 2 khối `Business logo` và
   *  `Welcome sign image`, mỗi khối có nút "Click to upload".
   */
  test(
    'TC-ONB-086 — renders Business Photos with both upload slots',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ onboardingPage, page }) => {
      await expect(page).toHaveURL(stepUrlPattern(OnboardingStep.PHOTOS, WHMCS_ID));
      await expect(page).not.toHaveURL(/[?&]step=validate/);

      await expect(onboardingPage.businessPhotosHeading).toBeVisible();
      await expect(onboardingPage.businessPhotosDescription.first()).toBeVisible();

      // Each slot renders its own label plus an upload trigger. The trigger's
      // accessible name is the slot label (`aria-label="Business logo"`), while
      // "Click to upload" is only the caption inside it — so the button is
      // addressed by label and the caption asserted within it.
      for (const slot of PHOTO_UPLOADS) {
        await expect(onboardingPage.photoUploadLabel(slot.label).first()).toBeVisible();

        const trigger = page.getByRole('button', { name: slot.label, exact: true });
        await expect(trigger).toHaveCount(1);
        await expect(trigger).toBeVisible();
        await expect(trigger.getByText('Click to upload', { exact: true })).toBeVisible();
      }

      await expect(page.getByText('Click to upload', { exact: true })).toHaveCount(
        PHOTO_UPLOADS.length,
      );
    },
  );

  /**
   * TC-ONB-087 — Chú thích giới hạn file đúng
   * Steps:
   *  1. Đọc dòng chú thích dưới mỗi vùng upload.
   * Expected:
   *  `Business logo` → "PNG or JPG, max 5MB."; `Welcome sign image` →
   *  "Welcome sign image for store. PNG or JPG, max 5MB."
   */
  test(
    'TC-ONB-087 — each slot shows its PNG/JPG max-5MB hint',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      for (const slot of PHOTO_UPLOADS) {
        await expect(onboardingPage.photoUploadHint(slot.hint).first()).toBeVisible({
          timeout: Timeouts.MEDIUM,
        });
        // The hint must actually state the accepted formats and the size cap.
        await expect(onboardingPage.photoUploadHint(slot.hint).first()).toHaveText(
          /PNG or JPG, max 5MB\./,
        );
      }
    },
  );

  /**
   * TC-ONB-088 — Input file có id đúng
   * Steps:
   *  1. Đọc DOM 2 input file.
   * Expected:
   *  `input[type=file]#storeLogoObjFid` và `input[type=file]#coverPhotoObjFid`,
   *  cả hai không disabled.
   */
  test(
    'TC-ONB-088 — both file inputs are present by id and enabled',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ onboardingPage }) => {
      for (const slot of PHOTO_UPLOADS) {
        const input = onboardingPage.photoFileInput(slot.id);
        await expect(input).toHaveCount(1);
        await expect(input).toBeAttached();
        await expect(input).toBeEnabled();
      }

      // The two named getters must resolve to those same inputs.
      await expect(onboardingPage.logoFileInput).toBeAttached();
      await expect(onboardingPage.coverPhotoFileInput).toBeAttached();
    },
  );

  /**
   * TC-ONB-089 — Upload ảnh PNG hợp lệ
   * Steps:
   *  1. `setInputFiles` một file PNG < 5MB vào `#storeLogoObjFid`.
   *  2. Chờ xử lý.
   * Expected:
   *  Hiện preview ảnh (thay cho "Click to upload"); không có lỗi; có tuỳ chọn
   *  xoá/thay ảnh. [CẦN XÁC MINH] nhãn chính xác của nút xoá/thay.
   */
  // TODO(manual/setup): needs a PNG fixture asset (none exists in the repo) and
  // selecting a file pushes the object at the DEV backend; the remove/replace
  // control's label is marked [CẦN XÁC MINH] and cannot be asserted yet.
  test.fixme(
    'TC-ONB-089 — a valid PNG under 5MB shows a preview with remove/replace',
    { tag: [Tag.REGRESSION] },
    async () => {
      // Arrange: place a <5MB PNG fixture on disk, setInputFiles into
      // #storeLogoObjFid, then assert the preview replaces "Click to upload"
      // and the (verified) remove/replace control appears.
    },
  );

  /**
   * TC-ONB-090 — Upload file vượt 5MB bị từ chối
   * Steps:
   *  1. Upload file PNG ~6MB.
   * Expected:
   *  Hiện lỗi/toast báo vượt dung lượng; ảnh **không** được nhận.
   *  [CẦN XÁC MINH] nội dung thông báo.
   */
  // TODO(manual/setup): needs a ~6MB PNG fixture and the rejection message text
  // is marked [CẦN XÁC MINH]; the oversize attempt may still hit the DEV upload
  // endpoint before it is refused.
  test.fixme('TC-ONB-090 — a file above 5MB is rejected', { tag: [Tag.REGRESSION] }, async () => {
    // Arrange: generate a ~6MB PNG, setInputFiles into #storeLogoObjFid, then
    // assert the size error/toast and that no preview is rendered.
  });

  /**
   * TC-ONB-091 — Upload định dạng không hỗ trợ
   * Steps:
   *  1. Lần lượt upload `.pdf`, `.gif`, `.svg`, `.txt`.
   * Expected:
   *  Bị từ chối với thông báo rõ ràng (chỉ chấp nhận PNG/JPG). [CẦN XÁC MINH]
   *  liệu chặn bằng thuộc tính `accept` hay bằng validate sau khi chọn.
   */
  // TODO(manual/setup): needs .pdf/.gif/.svg/.txt fixtures and the doc records
  // it as unverified whether the block is the `accept` attribute or a
  // post-select validation, so there is no message to assert against yet.
  test.fixme(
    'TC-ONB-091 — unsupported file types are rejected',
    { tag: [Tag.REGRESSION] },
    async () => {
      // Arrange: setInputFiles a .pdf, .gif, .svg and .txt in turn and assert
      // each is refused with the PNG/JPG-only message.
    },
  );

  /**
   * TC-ONB-092 — `Skip` ở bước 4
   * Steps:
   *  1. Bấm "Skip".
   * Expected:
   *  Chuyển sang `?step=pos-package&whmcsId=<id>`, không phát sinh request lưu ảnh.
   */
  test(
    'TC-ONB-092 — Skip advances to pos-package without saving photos',
    { tag: [Tag.REGRESSION] },
    async ({ onboardingPage, page }) => {
      const photoWrites: string[] = [];
      page.on('request', (request) => {
        if (request.method() !== 'GET' && /photo|logo|cover/i.test(request.url())) {
          photoWrites.push(`${request.method()} ${request.url()}`);
        }
      });

      await expect(onboardingPage.skipButton).toBeVisible({ timeout: Timeouts.MEDIUM });
      await expect(onboardingPage.skipButton).toBeEnabled();
      await onboardingPage.skipButton.click();

      await expect(page).toHaveURL(/\/pos\/nail\/admin\/onboarding/, { timeout: Timeouts.MEDIUM });
      await expect(page).toHaveURL(/[?&]step=pos-package/, { timeout: Timeouts.MEDIUM });
      expect(onboardingPage.currentStep()).toBe(OnboardingStep.POS_PACKAGE);
      expect(onboardingPage.currentWhmcsId()).toBe(WHMCS_ID);

      // Skipping must not persist anything.
      expect(photoWrites).toEqual([]);
    },
  );

  /**
   * TC-ONB-093 — Lưu ảnh thành công
   * Preconditions: WHMCS ID dùng-một-lần, đã chọn ít nhất 1 ảnh.
   * Steps:
   *  1. Bấm "Save Changes".
   * Expected:
   *  [CẦN XÁC MINH — hành động ghi] Toast "Photos saved successfully"; chuyển
   *  sang bước `Package`.
   */
  // TODO(manual/setup): real write on DEV — needs a single-use WHMCS ID.
  test.fixme(
    'TC-ONB-093 — Save Changes persists photos and advances to Package',
    { tag: [Tag.REGRESSION] },
    async () => {
      // Arrange: deep-link step 4 with a single-use WHMCS ID, attach one photo,
      // click Save Changes, then assert the ONBOARDING_TOASTS.PHOTOS toast and
      // the move to ?step=pos-package.
    },
  );

  /**
   * TC-ONB-094 — Lưu khi chưa chọn ảnh nào
   * Steps:
   *  1. Vào bước 4, không chọn ảnh, bấm "Save Changes".
   * Expected:
   *  [CẦN XÁC MINH] — kỳ vọng cho phép (ảnh là tuỳ chọn, đã có nút `Skip`) và
   *  vẫn chuyển bước, không báo lỗi.
   */
  // TODO(manual/setup): real write on DEV — needs a single-use WHMCS ID; the
  // outcome is additionally marked [CẦN XÁC MINH].
  test.fixme(
    'TC-ONB-094 — Save Changes with no photo selected still advances',
    { tag: [Tag.REGRESSION] },
    async () => {
      // Arrange: deep-link step 4 with a single-use WHMCS ID, attach nothing,
      // click Save Changes, then assert no validation error and the step advance.
    },
  );
});
