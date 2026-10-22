import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import {
  CheckoutType,
  PointMethods,
  type CheckoutSettingPage,
  type CheckoutTypeValue,
} from '@pages/settings/CheckoutSettingPage';

/**
 * Checkout setting — persistence after reload (VP-4590), REAL writes to DEV.
 * Source: docs/test-cases/checkout-type-setting.md — the reload halves of CHK-PTL-003, 022, 023,
 * 024, 030, 031 and 034 (the payload/toast halves run mocked in the other specs).
 *
 * Opt-in: runs only with ALLOW_SETTING_WRITES=1, serially. Each test snapshots the store's
 * checkout + point config first and restores it through the UI in `finally`, so the store ends as
 * it started (QC baseline for #14: Manual · bonus 5 · $1.00 × 4).
 */
const allowWrites = process.env.ALLOW_SETTING_WRITES === '1';

interface Snapshot {
  type: CheckoutTypeValue;
  bonus: string;
  rates: Record<string, number>;
}

async function snapshot(cs: CheckoutSettingPage): Promise<Snapshot> {
  const { type, bonus } = await cs.readStoredCheckout();
  const rates: Record<string, number> = {};
  for (const { label } of PointMethods) {
    rates[label] = Number((await cs.pointInput(label).inputValue()).replace(/\D/g, '') || '0');
  }
  return { type, bonus, rates };
}

async function reload(cs: CheckoutSettingPage): Promise<void> {
  await cs.page.reload({ waitUntil: 'domcontentloaded' });
  await cs.waitForReady();
}

/** Save `type` / `bonus` for real. Manual needs the bonus saved first on a bonus type. */
async function saveCheckout(
  cs: CheckoutSettingPage,
  type: CheckoutTypeValue,
  bonus: string,
): Promise<void> {
  await cs.selectType(type === CheckoutType.MANUAL ? CheckoutType.AUTO : type);
  await cs.fillPointBonus(bonus);
  if (await cs.saveBar.isVisible()) await cs.saveToBackend();
  if (type === CheckoutType.MANUAL) {
    await cs.selectType(CheckoutType.MANUAL);
    if (await cs.saveBar.isVisible()) await cs.saveToBackend();
  }
}

async function restore(cs: CheckoutSettingPage, snap: Snapshot): Promise<void> {
  await reload(cs);
  for (const { label } of PointMethods) await cs.setPointRate(label, snap.rates[label]);
  await saveCheckout(cs, snap.type, snap.bonus);
  if (await cs.saveBar.isVisible()) await cs.saveToBackend();
  await reload(cs);
  expect(await snapshot(cs), 'store restored to its starting state').toEqual(snap);
}

test.describe('Checkout setting — Persistence (real writes)', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!allowWrites, 'writes to DEV — set ALLOW_SETTING_WRITES=1 to run');

  let snap: Snapshot;

  test.beforeEach(async ({ checkoutSettingPage: cs }) => {
    await cs.goto();
    snap = await snapshot(cs);
  });

  test.afterEach(async ({ checkoutSettingPage: cs }) => {
    if (snap) await restore(cs, snap);
  });

  test(
    'CHK-PTL-003 — Load đúng setting đã lưu (Hybrid / 7) sau reload',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      await saveCheckout(cs, CheckoutType.HYBRID, '7');
      await reload(cs);
      await expect(cs.radio(CheckoutType.HYBRID)).toBeChecked();
      await expect(cs.pointBonusInput).toHaveValue('7');
    },
  );

  test(
    'CHK-PTL-022 — Đổi Checkout Type và Save: reload thấy Auto',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      await saveCheckout(cs, CheckoutType.MANUAL, snap.bonus);
      await cs.selectType(CheckoutType.AUTO);
      await cs.saveToBackend();
      // The Manual setup save above shows the same toast; check the newest one.
      await expect(cs.toast('Checkout setting saved.').first()).toBeVisible();
      await reload(cs);
      await expect(cs.radio(CheckoutType.AUTO)).toBeChecked();
    },
  );

  test(
    'CHK-PTL-023 — Đổi Point Bonus và Save: reload thấy Hybrid / 7',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      await saveCheckout(cs, CheckoutType.HYBRID, '3');
      await cs.fillPointBonus('7');
      await cs.saveToBackend();
      await reload(cs);
      await expect(cs.radio(CheckoutType.HYBRID)).toBeChecked();
      await expect(cs.pointBonusInput).toHaveValue('7');
    },
  );

  test(
    'CHK-PTL-024 — Chọn Manual rồi Save vẫn giữ bonus cũ (reload)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      await saveCheckout(cs, CheckoutType.HYBRID, '7');
      await cs.selectType(CheckoutType.MANUAL);
      await cs.saveToBackend();
      await reload(cs);
      await expect(cs.radio(CheckoutType.MANUAL)).toBeChecked();
      await cs.selectType(CheckoutType.AUTO);
      await expect(cs.pointBonusInput).toHaveValue('7');
      await cs.discardIfDirty();
    },
  );

  test(
    'CHK-PTL-030 — Lưu Checkout setting không làm mất Point Config (reload)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      await saveCheckout(cs, cs.bonusTypeOtherThan(snap.type), '8');
      await reload(cs);
      expect((await snapshot(cs)).rates).toEqual(snap.rates);
    },
  );

  test(
    'CHK-PTL-031 — Lưu Point Config không làm mất Checkout setting (reload)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      await cs.setPointRate('Cash', snap.rates.Cash === 200 ? 300 : 200);
      await cs.saveToBackend();
      await reload(cs);
      const after = await snapshot(cs);
      expect({ type: after.type, bonus: after.bonus }).toEqual({
        type: snap.type,
        bonus: snap.bonus,
      });
    },
  );

  test(
    'CHK-PTL-034 — Khung Point Config cập nhật sau khi lưu Point Config (reload)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      await cs.setPointRate('Cash', 200);
      await cs.setPointRate('Card', 300);
      await cs.setPointRate('Gift card', 0);
      await cs.saveToBackend();
      await reload(cs);
      expect(await cs.pointConfigBoxValue('Cash')).toBe('1 Point = $2.00');
      expect(await cs.pointConfigBoxValue('Card')).toBe('1 Point = $3.00');
      expect(await cs.pointConfigBoxValue('Gift card')).toBe('No points');
    },
  );
});
