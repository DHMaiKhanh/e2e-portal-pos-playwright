import type { Locator } from '@playwright/test';
import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Timeouts } from '@configs/constants/timeouts';
import {
  ONBOARDING_STEP_LABELS,
  ONBOARDING_STEP_SLUGS,
  ONBOARDING_VIEWPORTS,
  OnboardingPage,
  OnboardingStep,
  TAX_PRICING_FIELDS,
} from '@pages/onboarding/OnboardingPage';

/**
 * Responsive — Merchant Onboarding (`/pos/onboarding`).
 *
 * playwright.config ships a single 1920x1080 chromium project, so every width
 * here is applied in-test with `page.setViewportSize`. That is safe: the
 * reuseContext fixture hands each test its own Page (created at the project
 * default) on the worker-shared context, so a resize cannot leak sideways into
 * a sibling test — and it keeps these cases on the warm HTTP cache, which a
 * `test.use({ viewport })` override would throw away.
 *
 * Ground rules this file inherits from the screen:
 *  - NOT store-scoped. The route is the bare admin path `/pos/onboarding`;
 *    nothing here asserts `/pos/<id>/` or touches `env.STORE_ID`.
 *  - `Create Merchant` and `Save Changes` are REAL writes on the DEV backend.
 *    No test below clicks either — the footer cases assert reachability and
 *    enabled state only.
 *  - The app paints in 7-12 s on DEV and `waitForLoadState('networkidle')`
 *    returns a blank page on this route, so every wait is an `expect(locator)`
 *    with `Timeouts.LONG`.
 *
 * Each case drives a different width and a different step, so navigation lives
 * inside the tests rather than in a shared `beforeEach`: the viewport is set
 * FIRST and the page loaded into it, which is how a real device sees the screen.
 */

/** The read-only, already-onboarded DEV merchant every deep-link here uses. */
const WHMCS_ID = '3660';

/** A rendered rectangle, as `boundingBox()` reports it. */
type Box = { x: number; y: number; width: number; height: number };

/** Whether two rectangles share any area (1px of slack for sub-pixel layout drift). */
function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width - 1 &&
    b.x < a.x + a.width - 1 &&
    a.y < b.y + b.height - 1 &&
    b.y < a.y + a.height - 1
  );
}

/**
 * An element each wizard step paints once its own content has rendered — the
 * anchor the layout cases measure the "content pane" by.
 */
function stepContent(onboardingPage: OnboardingPage, step: string): Locator {
  switch (step) {
    case OnboardingStep.VALIDATE:
      // With a `whmcsId` on the URL step 1 renders the Integration Status panel.
      return onboardingPage.integrationStatusHeading;
    case OnboardingStep.MERCHANT_INFO:
      return onboardingPage.businessInformationHeading;
    case OnboardingStep.WORK_HOURS:
      return onboardingPage.businessHoursHeading;
    case OnboardingStep.PHOTOS:
      return onboardingPage.businessPhotosHeading;
    case OnboardingStep.POS_PACKAGE:
      return onboardingPage.viewAllFeaturesButtons.first();
    case OnboardingStep.PAYMENT_TRANSACTIONS:
      return onboardingPage.paymentMethodsHeading;
    default:
      return onboardingPage.completeHeading;
  }
}

test.describe('Responsive — Onboarding', () => {
  /**
   * TC-ONB-142 — Hiển thị ở 1920×1080
   * Steps:
   *  1. Đặt viewport 1920×1080, vào từng bước 1–7.
   * Expected:
   *  Stepper nằm dọc bên trái, nội dung bước bên phải; không tràn ngang;
   *  không chồng lấp.
   */
  test(
    'TC-ONB-142 — at 1920×1080 every step keeps the stepper a left column with content beside it',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ onboardingPage, page }) => {
      // Seven full page loads at 7-12 s each on DEV; the 60 s default is not enough.
      test.setTimeout(240_000);

      await page.setViewportSize(ONBOARDING_VIEWPORTS.DESKTOP);

      for (const step of ONBOARDING_STEP_SLUGS) {
        await onboardingPage.gotoStep(step, WHMCS_ID);
        await onboardingPage.waitForReady();
        await expect(stepContent(onboardingPage, step), `content of ?step=${step}`).toBeVisible({
          timeout: Timeouts.LONG,
        });

        // Vertical: the seven cells occupy one column and seven separate rows,
        // which also proves none of them overlaps another.
        const cells = await onboardingPage.boundingBoxes(onboardingPage.stepperItems);
        expect(cells, `stepper cells on ?step=${step}`).toHaveLength(ONBOARDING_STEP_LABELS.length);
        expect(await onboardingPage.stepperIsHorizontal(), `stepper axis on ?step=${step}`).toBe(
          false,
        );
        expect(
          await onboardingPage.columnCount(onboardingPage.stepperItems),
          `stepper columns on ?step=${step}`,
        ).toBe(1);
        expect(
          await onboardingPage.rowCount(onboardingPage.stepperItems),
          `stepper rows on ?step=${step}`,
        ).toBe(ONBOARDING_STEP_LABELS.length);

        // On the left: the step content starts past the stepper's right edge.
        const stepperRight = Math.max(...cells.map((cell) => cell.x + cell.width));
        const content = await stepContent(onboardingPage, step).boundingBox();
        expect(content, `content box on ?step=${step}`).not.toBeNull();
        expect(content?.x ?? 0, `content left edge on ?step=${step}`).toBeGreaterThanOrEqual(
          stepperRight - 1,
        );

        // Nothing spills sideways at this width.
        expect(
          await onboardingPage.hasHorizontalOverflow(),
          `horizontal overflow on ?step=${step}`,
        ).toBe(false);
      }
    },
  );

  /**
   * TC-ONB-143 — Hiển thị ở 1366×768
   * Steps:
   *  1. Đặt viewport 1366×768, kiểm tra bước 6 (dài nhất).
   * Expected:
   *  Nội dung cuộn dọc bình thường; 3 ô `Tax & Pricing` không bị chồng; các nút
   *  cuối vẫn truy cập được.
   *
   * The footer is only scrolled to and read — `Save Changes` is a real write on
   * DEV and is never clicked.
   */
  test(
    'TC-ONB-143 — at 1366×768 step 6 scrolls vertically with the tax fields apart and the footer reachable',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ onboardingPage, page }) => {
      await page.setViewportSize(ONBOARDING_VIEWPORTS.LAPTOP);
      await onboardingPage.gotoStep(OnboardingStep.PAYMENT_TRANSACTIONS, WHMCS_ID);
      await onboardingPage.waitForReady();
      await expect(onboardingPage.paymentMethodsHeading).toBeVisible({ timeout: Timeouts.LONG });
      await expect(onboardingPage.taxPricingHeading).toBeVisible({ timeout: Timeouts.LONG });

      // The longest step still fits the width...
      expect(await onboardingPage.hasHorizontalOverflow()).toBe(false);

      // ...and is taller than 768px, so it scrolls the normal way. Which element
      // owns the scroll is an implementation detail, so accept the document or
      // any real scroll container.
      const scrollsVertically = await page.evaluate(() => {
        const doc = document.documentElement;
        if (doc.scrollHeight > doc.clientHeight + 1) return true;
        return Array.from(document.querySelectorAll('*')).some((element) => {
          const overflowY = getComputedStyle(element).overflowY;
          return (
            (overflowY === 'auto' || overflowY === 'scroll') &&
            element.scrollHeight > element.clientHeight + 1
          );
        });
      });
      expect(scrollsVertically).toBe(true);

      // The three Tax & Pricing boxes are all rendered and none overlaps another.
      const fieldBoxes: Box[] = [];
      for (const field of TAX_PRICING_FIELDS) {
        const input = onboardingPage.taxPricingField(field.id);
        await expect(input, `${field.label} input`).toBeVisible();
        await expect(onboardingPage.taxPricingLabel(field.label).first()).toBeVisible();
        const box = await input.boundingBox();
        expect(box, `${field.label} box`).not.toBeNull();
        if (box) fieldBoxes.push(box);
      }
      expect(fieldBoxes).toHaveLength(TAX_PRICING_FIELDS.length);
      for (let i = 0; i < fieldBoxes.length; i += 1) {
        for (let j = i + 1; j < fieldBoxes.length; j += 1) {
          expect(
            overlaps(fieldBoxes[i], fieldBoxes[j]),
            `${TAX_PRICING_FIELDS[i].label} overlaps ${TAX_PRICING_FIELDS[j].label}`,
          ).toBe(false);
        }
      }

      // Every footer control can be scrolled to and used — none is clicked.
      expect(await onboardingPage.wizardFooterLabels()).toEqual(['Back', 'Skip', 'Save Changes']);
      for (const button of [
        onboardingPage.backButton,
        onboardingPage.skipButton,
        onboardingPage.saveChangesButton,
      ]) {
        await button.scrollIntoViewIfNeeded();
        await expect(button).toBeInViewport();
        await expect(button).toBeEnabled();
      }
    },
  );

  /**
   * TC-ONB-144 — Stepper chuyển sang bố cục ngang dưới breakpoint `md`
   * Steps:
   *  1. Đặt viewport 768×1024 rồi 375×812; quan sát stepper.
   * Expected:
   *  Theo class trong bundle (`md:flex-col`, `hidden md:inline`), ở màn nhỏ
   *  stepper xếp **ngang** và **chỉ hiện nhãn của bước hiện tại**; các bước khác
   *  chỉ còn số thứ tự.
   *
   * The Expected names the mechanism — Tailwind's `md` variant — so the two
   * widths are asserted against it rather than both being called "small":
   * `md` is `min-width: 768px`, so 768×1024 is the first width at which
   * `md:flex-col` / `md:inline` APPLY (column, all seven labels), and 375×812
   * is below it (row, only the current step's label). Media queries reflow on
   * resize, so both widths are measured on one page load.
   */
  test(
    'TC-ONB-144 — below the md breakpoint the stepper turns horizontal and keeps only the current label',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ onboardingPage, page }) => {
      await page.setViewportSize(ONBOARDING_VIEWPORTS.TABLET);
      await onboardingPage.goto();
      await onboardingPage.waitForReady();
      await expect(onboardingPage.enterWhmcsIdHeading).toBeVisible({ timeout: Timeouts.LONG });
      await expect(onboardingPage.stepperItems).toHaveCount(ONBOARDING_STEP_LABELS.length);

      // 768px is the `md` breakpoint itself: the column layout is in force and
      // every label is rendered.
      expect(await onboardingPage.stepperIsHorizontal(), 'stepper axis at 768px').toBe(false);
      const atTablet = await onboardingPage.stepperCellTexts();
      ONBOARDING_STEP_LABELS.forEach((label, index) => {
        expect(atTablet[index], `stepper cell ${index + 1} at 768px`).toContain(label);
      });

      await page.setViewportSize(ONBOARDING_VIEWPORTS.MOBILE);
      await expect(onboardingPage.stepperItems).toHaveCount(ONBOARDING_STEP_LABELS.length);

      // Below `md` the cells share a row...
      await expect
        .poll(() => onboardingPage.stepperIsHorizontal(), {
          timeout: Timeouts.SHORT,
          message: 'stepper axis at 375px',
        })
        .toBe(true);

      // ...and `hidden md:inline` strips every label but the current step's, so
      // the other six cells read as a bare step number.
      const atMobile = await onboardingPage.stepperCellTexts();
      expect(atMobile).toHaveLength(ONBOARDING_STEP_LABELS.length);
      const labelled = atMobile.filter((text) =>
        ONBOARDING_STEP_LABELS.some((label) => text.includes(label)),
      );
      expect(labelled, 'cells still showing a label at 375px').toHaveLength(1);
      // Step 1 is the current step on a bare `/pos/onboarding`.
      expect(labelled[0]).toContain(ONBOARDING_STEP_LABELS[0]);
      expect(atMobile[0]).toContain(ONBOARDING_STEP_LABELS[0]);
      atMobile.slice(1).forEach((text, index) => {
        expect(text.trim(), `stepper cell ${index + 2} at 375px`).toBe(String(index + 2));
      });
    },
  );

  /**
   * TC-ONB-145 — Lưới gói ở màn hình nhỏ
   * Steps:
   *  1. Ở 375×812, vào `?step=pos-package&whmcsId=3660`.
   * Expected:
   *  Card gói xếp 1 cột, đọc được toàn bộ nội dung; nút `"View all N features"`
   *  và `"Select Plan"` không bị cắt.
   *
   * Package names on DEV are junk, so only the column count, the controls and
   * their geometry are asserted — never a package name.
   */
  test(
    'TC-ONB-145 — at 375px the package grid collapses to one column with its buttons uncut',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ onboardingPage, page }) => {
      await page.setViewportSize(ONBOARDING_VIEWPORTS.MOBILE);
      await onboardingPage.gotoStep(OnboardingStep.POS_PACKAGE, WHMCS_ID);
      await onboardingPage.waitForReady();
      await expect(onboardingPage.viewAllFeaturesButtons.first()).toBeVisible({
        timeout: Timeouts.LONG,
      });

      const cards = await onboardingPage.packageCount();
      expect(cards).toBeGreaterThanOrEqual(1);

      // One card per row: every card's trigger shares the same left edge.
      expect(await onboardingPage.columnCount(onboardingPage.viewAllFeaturesButtons)).toBe(1);
      expect(await onboardingPage.rowCount(onboardingPage.viewAllFeaturesButtons)).toBe(cards);

      // The page itself never scrolls sideways, so nothing is clipped off-screen.
      expect(await onboardingPage.hasHorizontalOverflow()).toBe(false);

      // Both action controls stay wholly inside the 375px width.
      const viewport = ONBOARDING_VIEWPORTS.MOBILE.width;
      const controls: Box[] = [
        ...(await onboardingPage.boundingBoxes(onboardingPage.viewAllFeaturesButtons)),
        ...(await onboardingPage.boundingBoxes(onboardingPage.selectPlanButtons)),
        ...(await onboardingPage.boundingBoxes(onboardingPage.currentPlanButton)),
      ];
      // Exactly one action button per card, plus one "View all N features" each.
      expect(controls).toHaveLength(cards * 2);
      for (const box of controls) {
        expect(box.x).toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport + 1);
        expect(box.width).toBeGreaterThan(0);
        expect(box.height).toBeGreaterThan(0);
      }
    },
  );

  /**
   * TC-ONB-146 — Dialog feature ở màn hình nhỏ
   * Steps:
   *  1. Ở 375×812, mở dialog `"View all 62 features"`.
   * Expected:
   *  Dialog vừa khung nhìn, nội dung cuộn được bên trong, nút `Close` và
   *  `"Select This Package"` luôn với tới được.
   *
   * `62` is DEV data, so the dialog is opened on whichever card advertises the
   * most features — the one that actually forces the list to scroll.
   */
  test(
    'TC-ONB-146 — at 375px the feature dialog fits the viewport and scrolls its own content',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ onboardingPage, page }) => {
      await page.setViewportSize(ONBOARDING_VIEWPORTS.MOBILE);
      await onboardingPage.gotoStep(OnboardingStep.POS_PACKAGE, WHMCS_ID);
      await onboardingPage.waitForReady();
      await expect(onboardingPage.viewAllFeaturesButtons.first()).toBeVisible({
        timeout: Timeouts.LONG,
      });

      // Pick the richest card, the way the sibling step-5 suite does.
      const cards = await onboardingPage.packageCount();
      let richestIndex = 0;
      let richestCount = -1;
      for (let i = 0; i < cards; i += 1) {
        const advertised = await onboardingPage.advertisedFeatureCount(i);
        if (advertised > richestCount) {
          richestCount = advertised;
          richestIndex = i;
        }
      }
      expect(richestCount).toBeGreaterThan(0);

      await onboardingPage.openFeatureDialog(richestIndex);

      // The dialog fits the 375×812 frame on both axes.
      const dialog = onboardingPage.featureDialog.first();
      const box = await dialog.boundingBox();
      expect(box, 'dialog box').not.toBeNull();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width).toBeLessThanOrEqual(ONBOARDING_VIEWPORTS.MOBILE.width + 1);
        expect(box.y).toBeGreaterThanOrEqual(-1);
        expect(box.y + box.height).toBeLessThanOrEqual(ONBOARDING_VIEWPORTS.MOBILE.height + 1);
      }
      expect(await onboardingPage.isWithinViewport(dialog)).toBe(true);

      // The feature list is longer than the frame, so it scrolls INSIDE the
      // dialog rather than pushing the dialog past the viewport.
      const scrollsInside = await dialog.evaluate((element) => {
        const nodes: Element[] = [element, ...Array.from(element.querySelectorAll('*'))];
        return nodes.some((node) => {
          const overflowY = getComputedStyle(node).overflowY;
          return (
            (overflowY === 'auto' || overflowY === 'scroll') &&
            node.scrollHeight > node.clientHeight + 1
          );
        });
      });
      expect(scrollsInside, 'a scroll container inside the dialog').toBe(true);

      // Both controls stay reachable without leaving the frame.
      await expect(onboardingPage.dialogCloseButton.first()).toBeVisible();
      await expect(onboardingPage.dialogCloseButton.first()).toBeInViewport();
      await expect(onboardingPage.selectThisPackageButton).toBeVisible();
      await expect(onboardingPage.selectThisPackageButton).toBeInViewport();

      // Leave the wizard as it was found: dismiss without selecting anything.
      await onboardingPage.dialogCloseButton.first().click();
      await expect(onboardingPage.featureDialog).toBeHidden({ timeout: Timeouts.MEDIUM });
    },
  );

  /**
   * TC-ONB-147 — Chip tip preset xuống dòng
   * Steps:
   *  1. Ở 375×812, vào bước 6 với merchant có nhiều preset.
   * Expected:
   *  Các chip tự xuống dòng (wrap), **không** gây cuộn ngang toàn trang.
   *
   * Merchant 3660 renders ~40 chips (the duplication is TC-ONB-120's subject,
   * not this one), which is exactly the "nhiều preset" this case asks for.
   */
  test(
    'TC-ONB-147 — at 375px the tip preset chips wrap instead of scrolling the page sideways',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ onboardingPage, page }) => {
      await page.setViewportSize(ONBOARDING_VIEWPORTS.MOBILE);
      await onboardingPage.gotoStep(OnboardingStep.PAYMENT_TRANSACTIONS, WHMCS_ID);
      await onboardingPage.waitForReady();
      await expect(onboardingPage.tippingSettingsHeading).toBeVisible({ timeout: Timeouts.LONG });
      await expect(onboardingPage.tipPresetChips.first()).toBeVisible({ timeout: Timeouts.LONG });

      const chips = await onboardingPage.tipPresetCount();
      expect(chips, 'preset chips on this merchant').toBeGreaterThan(1);

      // Wrapped: the chips occupy more than one row at this width.
      expect(await onboardingPage.rowCount(onboardingPage.tipPresetChips)).toBeGreaterThan(1);

      // And every chip stays inside the 375px frame, so nothing forces a
      // page-level sideways scroll.
      const boxes = await onboardingPage.boundingBoxes(onboardingPage.tipPresetChips);
      expect(boxes).toHaveLength(chips);
      for (const box of boxes) {
        expect(box.x).toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width).toBeLessThanOrEqual(ONBOARDING_VIEWPORTS.MOBILE.width + 1);
      }
      expect(await onboardingPage.hasHorizontalOverflow()).toBe(false);
    },
  );
});
