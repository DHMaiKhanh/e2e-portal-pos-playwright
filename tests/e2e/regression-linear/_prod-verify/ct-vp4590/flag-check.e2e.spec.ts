import * as fs from 'fs';
import { test, expect } from '@fixtures/index';
import {
  CheckoutType,
  POINT_CONFIG_FLAG,
  PointMethods,
  type PointPaymentConfigValue,
} from '@pages/settings/CheckoutSettingPage';
import { readSysSetting } from '@pages/settings/SysSettingApi';
import { ORIGINAL, OUT_DIR, canon, isOriginal, lockHeld, scrollToTop, shot } from './_shared';

/**
 * VP-4590 PROD #20258 read-only: the shared flag equals the original value (start / end of run).
 * FLAG_CHECK_LABEL=start|end names the screenshot.
 */
const LABEL = process.env.FLAG_CHECK_LABEL ?? 'start';

test(`flag check (${LABEL})`, async ({ page, checkoutSettingPage: cs }) => {
  await cs.mockSettingWrites(); // safety net: no write can leave this page
  await cs.goto();
  const now = await readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG);
  fs.writeFileSync(`${OUT_DIR}/flag-${LABEL}.json`, JSON.stringify(now, null, 2));
  console.log(
    'FLAG',
    now.id,
    'updatedAt',
    now.updatedAt,
    canon(now.value),
    'default',
    JSON.stringify(now.config?.default_value),
  );
  console.log('LOCK HELD BY SOMEONE', lockHeld());
  console.log('EQUALS ORIGINAL', isOriginal(now.value), 'ORIGINAL', canon(ORIGINAL));
  expect(isOriginal(now.value), 'flag == original').toBe(true);
  await expect(cs.radio(CheckoutType.MANUAL)).toBeChecked();
  await expect(cs.pointBonusInput).toHaveCount(0);
  for (const { label, key } of PointMethods) {
    const shown = Number((await cs.pointInput(label).inputValue()).replace(/\D/g, '') || '0');
    expect(shown, label).toBe(ORIGINAL[key].enabled ? ORIGINAL[key].point : 0);
  }
  await scrollToTop(cs.pointConfigTitle);
  await shot(
    page,
    `VP-4590_FLAG_${LABEL}_original_value`,
    `${LABEL === 'end' ? 'END of run' : 'START of run'}: flag merchant_point_payment_config == original (Manual · bonus 0 · Cash $0.50 · Card $0.01 · Gift $2.00 · Other $1.00 · earn on tip ON)`,
  );
  expect(cs.writes).toHaveLength(0);
});
