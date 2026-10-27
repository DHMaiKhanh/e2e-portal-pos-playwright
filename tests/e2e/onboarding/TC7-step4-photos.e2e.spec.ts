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
});
