import { test, expect } from '@fixtures/index';
import {
  canon,
  expectUiShows,
  fmtFlag,
  focusCard,
  isOriginal,
  lockHeld,
  ORIGINAL,
  panel,
  readFlag,
  shot,
} from './_shared';

/** VP-4974 PROD read-only: the shared flag equals the original at the end of the run. */
test('final check — merchant_point_payment_config == original', async ({
  page,
  checkoutSettingPage: cs,
}) => {
  await cs.mockSettingWrites(); // safety net: no write can leave this page
  await cs.goto();
  const flag = await readFlag(page);
  console.log('FINAL', flag.updatedAt, canon(flag.value), 'lock dir exists:', lockHeld());
  expect(isOriginal(flag.value), 'flag == original').toBe(true);
  await expectUiShows(cs, ORIGINAL);
  await expect(cs.pointBonusInput).toHaveCount(0);
  await focusCard(cs);
  await panel(page, `FINAL API read-only (updatedAt ${flag.updatedAt})`, fmtFlag(flag.value));
  await shot(
    page,
    'VP-4974_TC21_final_readonly_flag_equals_original',
    'final read-only check: flag = original (Manual · bonus 0 · rates 50/1/200/100 · earn_on_tip true)',
  );
  expect(cs.writes).toHaveLength(0);
});
