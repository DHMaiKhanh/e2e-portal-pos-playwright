import { test, expect } from '@fixtures/index';
import { CheckoutType, type CheckoutSettingPage } from '@pages/settings/CheckoutSettingPage';
import { scrollToTop, shot } from './_shared';

/**
 * VP-4590 PROD #20258 — diagnostic (mocked writes): after a successful Save, does going back to
 * the stored type clear the "Unsaved changes" bar? Variants isolate the trigger.
 */
async function bar(cs: CheckoutSettingPage): Promise<string> {
  await cs.page.waitForTimeout(600);
  return (await cs.saveBar.isVisible())
    ? (await cs.saveBar.innerText()).replace(/\s+/g, ' ')
    : 'HIDDEN';
}

test.describe('diag CHK-PTL-041', () => {
  test.beforeEach(async ({ checkoutSettingPage: cs }) => {
    await cs.mockSettingWrites();
    await cs.goto();
  });

  test('A: stored Manual/0 (real) → Auto → Hybrid → Manual (no save)', async ({
    checkoutSettingPage: cs,
  }) => {
    const log: string[] = [];
    await cs.selectType(CheckoutType.AUTO);
    log.push(`auto: ${await bar(cs)}`);
    await cs.selectType(CheckoutType.HYBRID);
    log.push(`hybrid: ${await bar(cs)}`);
    await cs.selectType(CheckoutType.MANUAL);
    log.push(`manual: ${await bar(cs)}`);
    console.log('A', JSON.stringify(log));
  });

  test('B: stored Manual/0 → Auto abc → Manual → Save → Auto → Manual', async ({
    checkoutSettingPage: cs,
  }) => {
    const log: string[] = [];
    await cs.selectType(CheckoutType.AUTO);
    await cs.fillPointBonus('abc');
    await cs.selectType(CheckoutType.MANUAL);
    log.push(`after abc→manual: ${await bar(cs)}`);
    await cs.saveAndWait();
    log.push(`payload: ${JSON.stringify(cs.lastWrittenConfig())}`);
    log.push(`after save: ${await bar(cs)}`);
    await cs.selectType(CheckoutType.AUTO);
    log.push(`auto: bonus=${await cs.pointBonusInput.inputValue()} ${await bar(cs)}`);
    await cs.selectType(CheckoutType.MANUAL);
    log.push(`manual: ${await bar(cs)}`);
    console.log('B', JSON.stringify(log));
  });

  test('C: seed Manual/8 (2 mocked saves) → Auto → Manual (no abc)', async ({
    checkoutSettingPage: cs,
  }) => {
    const log: string[] = [];
    await cs.seedStoredCheckout(CheckoutType.MANUAL, 8);
    log.push(`after seed: ${await bar(cs)}`);
    await cs.selectType(CheckoutType.AUTO);
    log.push(`auto: bonus=${await cs.pointBonusInput.inputValue()} ${await bar(cs)}`);
    await cs.selectType(CheckoutType.MANUAL);
    log.push(`manual: ${await bar(cs)}`);
    console.log('C', JSON.stringify(log));
  });

  test('D: seed Auto/8 (1 mocked save) → Hybrid → Auto', async ({ checkoutSettingPage: cs }) => {
    const log: string[] = [];
    await cs.seedStoredCheckout(CheckoutType.AUTO, 8);
    log.push(`after seed: ${await bar(cs)}`);
    await cs.selectType(CheckoutType.HYBRID);
    log.push(`hybrid: ${await bar(cs)}`);
    await cs.selectType(CheckoutType.AUTO);
    log.push(`auto: ${await bar(cs)}`);
    await cs.selectType(CheckoutType.MANUAL);
    log.push(`manual: ${await bar(cs)}`);
    await cs.selectType(CheckoutType.AUTO);
    log.push(`auto again: ${await bar(cs)}`);
    console.log('D', JSON.stringify(log));
  });

  test('E: suite 041 flow + Save on leftover bar shows payload', async ({
    checkoutSettingPage: cs,
  }) => {
    const log: string[] = [];
    await cs.seedStoredCheckout(CheckoutType.MANUAL, 8);
    await cs.selectType(CheckoutType.AUTO);
    await cs.fillPointBonus('abc');
    await cs.selectType(CheckoutType.MANUAL);
    await cs.saveAndWait();
    log.push(`payload1: ${JSON.stringify(cs.lastWrittenConfig())}`);
    for (const type of [CheckoutType.AUTO, CheckoutType.HYBRID]) {
      await cs.selectType(type);
      log.push(`${type}: bonus=${await cs.pointBonusInput.inputValue()} ${await bar(cs)}`);
    }
    await cs.selectType(CheckoutType.MANUAL);
    log.push(`manual: ${await bar(cs)}`);
    await scrollToTop(cs.checkoutTitle);
    await shot(
      cs.page,
      'VP-4590_DIAG041_E_leftover_bar',
      'diag (mocked): seed Manual/8 → Auto abc → Manual → Save → Auto → Hybrid → Manual',
    );
    if (await cs.saveBar.isVisible()) {
      await cs.saveAndWait();
      log.push(`payload2: ${JSON.stringify(cs.lastWrittenConfig())}`);
    }
    console.log('E', JSON.stringify(log));
  });
});
