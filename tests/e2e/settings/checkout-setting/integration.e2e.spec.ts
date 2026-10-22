import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { env } from '@configs/env/loadEnv';

/**
 * Checkout setting — 6. Khác / Integration (VP-4590).
 * Source: docs/test-cases/checkout-type-setting.md (CHK-PTL-036 … CHK-PTL-040).
 *
 * Read-only (writes intercepted). CHK-PTL-037…039 need a restricted account, the POS app or API
 * checks and stay scaffolded.
 */
const OTHER_STORE_ID = process.env.CHECKOUT_DEFAULT_STORE_ID ?? '30';

test.describe('Checkout setting — Khác / Integration', () => {
  test.beforeEach(async ({ checkoutSettingPage }) => {
    await checkoutSettingPage.mockSettingWrites();
    await checkoutSettingPage.goto();
  });

  test(
    'CHK-PTL-036 — Đổi merchant load đúng setting của từng tiệm',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      const first = await cs.readStoredCheckout();

      await cs.gotoStore(OTHER_STORE_ID);
      const other = await cs.readStoredCheckout();

      await cs.gotoStore(env.STORE_ID);
      expect(await cs.readStoredCheckout()).toEqual(first);

      // And the other store still shows its own value, not a cached one.
      await cs.gotoStore(OTHER_STORE_ID);
      expect(await cs.readStoredCheckout()).toEqual(other);
    },
  );

  test.fixme(
    'CHK-PTL-037 — User không có quyền chỉnh setting',
    { tag: [Tag.REGRESSION] },
    async () => {
      // TODO(setup): needs a storageState for an account with STORE_SETTING_VIEW but not
      // STORE_SETTING_UPDATE; then assert the checkout radios / Point Bonus are disabled and no
      // Save bar appears after clicking a card.
    },
  );

  test.fixme(
    'CHK-PTL-038 — POS nhận đúng type + bonus từ Portal',
    { tag: [Tag.REGRESSION] },
    async () => {
      // TODO(manual/POS): save Auto / 10 on Portal, complete an order on POS (VP-4591) and check
      // the customer earns exactly 10 points. Not reachable from the Portal suite.
    },
  );

  test.fixme(
    'CHK-PTL-039 — Check-in đã checkout trước khi đổi setting không bị tính lại',
    { tag: [Tag.REGRESSION] },
    async () => {
      // TODO(API/POS): needs seeded checked-out check-ins and the points ledger (VP-4554).
    },
  );

  test(
    'CHK-PTL-040 — Responsive / mobile width 375px',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SLOW] },
    async ({ checkoutSettingPage: cs, page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await cs.waitForReady();

      await cs.checkoutTitle.scrollIntoViewIfNeeded();
      await expect(cs.checkoutTitle).toBeVisible();
      await expect(cs.optionCards).toHaveCount(3);

      // Every card fits inside the viewport width (no clipped / overflowing layout).
      for (let i = 0; i < 3; i++) {
        const box = await cs.optionCards.nth(i).boundingBox();
        expect(box, `card ${i} laid out`).toBeTruthy();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(375 + 1);
      }

      // Still usable: a card can be picked and Point Bonus edited.
      const target = cs.bonusTypeOtherThan(await cs.selectedType());
      await cs.selectType(target);
      await cs.fillPointBonus('3');
      await expect(cs.pointBonusInput).toHaveValue('3');
      const input = await cs.pointBonusInput.boundingBox();
      expect(input!.x + input!.width).toBeLessThanOrEqual(375 + 1);

      const pageOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(pageOverflow, 'no horizontal page scroll').toBeLessThanOrEqual(1);
    },
  );
});
