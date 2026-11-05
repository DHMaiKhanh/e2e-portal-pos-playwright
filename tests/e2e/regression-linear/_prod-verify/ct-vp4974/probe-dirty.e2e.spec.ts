import { test, expect } from '@fixtures/index';
import { CheckoutType } from '@pages/settings/CheckoutSettingPage';
import { focusCard, isOriginal, readFlag, saveBarText, shot } from './_shared';

/** Probe (mocked writes): is the "unsaved change" bar sticky after A → B → A, with and without a save? */
const { MANUAL, AUTO, HYBRID } = CheckoutType;

test('probe — dirty bar stickiness', async ({ page, checkoutSettingPage: cs }) => {
  test.setTimeout(120_000);
  await cs.mockSettingWrites();
  await cs.goto();
  expect(isOriginal((await readFlag(page)).value)).toBe(true);
  const log: string[] = [];

  // P1 — no save: Manual → Auto → Manual
  await cs.selectType(AUTO);
  log.push(`P1 Auto: "${await saveBarText(cs)}"`);
  await cs.selectType(MANUAL);
  await page.waitForTimeout(800);
  log.push(`P1 back Manual (no save, no typing): "${await saveBarText(cs)}"`);
  await focusCard(cs);
  await shot(
    page,
    'VP-4974_PROBE_P1_no_save_auto_then_manual_bar',
    `baseline (no save): Manual → Auto → Manual · bar "${await saveBarText(cs)}"`,
  );
  await cs.discardIfDirty();

  // P2 — no save: Auto, type 5 then 0 (back to stored) → Manual
  await cs.selectType(AUTO);
  await cs.fillPointBonus('5');
  await cs.fillPointBonus('0');
  await cs.selectType(MANUAL);
  await page.waitForTimeout(800);
  log.push(`P2 back Manual after 5→0 (no save): "${await saveBarText(cs)}"`);
  await cs.discardIfDirty();

  // P3 — mocked save after "abc", then Hybrid → Manual
  await cs.selectType(AUTO);
  await cs.fillPointBonus('abc');
  await cs.selectType(MANUAL);
  await cs.saveAndWait();
  log.push(`P3 after save: "${await saveBarText(cs)}"`);
  await cs.selectType(HYBRID);
  log.push(
    `P3 Hybrid value="${await cs.pointBonusInput.inputValue()}" bar "${await saveBarText(cs)}"`,
  );
  await cs.selectType(MANUAL);
  await page.waitForTimeout(800);
  log.push(`P3 back Manual: "${await saveBarText(cs)}"`);
  await cs.discardIfDirty();
  log.push(
    `P3 after Discard: "${await saveBarText(cs)}" manual=${await cs.radio(MANUAL).isChecked()}`,
  );

  // P4 — after a save, click Save from Hybrid (should NOT be blocked: bonus is the saved 0)
  await cs.selectType(HYBRID);
  const before = cs.sysSettingWrites().length;
  await cs.save();
  await page.waitForTimeout(1500);
  const after = cs.sysSettingWrites().length;
  log.push(
    `P4 save from Hybrid → writes ${before}→${after}; last=${JSON.stringify(cs.writtenConfigs().at(-1))}; bar "${await saveBarText(cs)}"`,
  );
  console.log(log.join('\n'));
});
