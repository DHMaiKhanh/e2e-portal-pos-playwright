import * as fs from 'fs';
import { test, expect } from '@fixtures/index';
import {
  CheckoutType,
  POINT_CONFIG_FLAG,
  PointMethods,
  type PointPaymentConfigValue,
} from '@pages/settings/CheckoutSettingPage';
import { readSysSetting } from '@pages/settings/SysSettingApi';
import { SHOTS_DIR, scrollToTop, shot } from './_shared';

/** VP-4489 PROD read-only: the flag now equals the backup taken before the real write. */
const canon = (v: unknown): string => {
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canon(o[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v);
};

test('final restore check', async ({ page, checkoutSettingPage: cs }) => {
  await cs.mockSettingWrites(); // safety net: no write can leave this page
  await cs.goto();
  const backup = JSON.parse(
    fs.readFileSync(`${SHOTS_DIR}/../original-flag-backup.json`, 'utf8'),
  ) as { value: PointPaymentConfigValue };
  const now = await readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG);
  console.log('BACKUP', canon(backup.value));
  console.log('NOW   ', canon(now.value), 'updatedAt', now.updatedAt);
  expect(canon(now.value)).toBe(canon(backup.value));
  await expect(cs.radio(backup.value.selected_type)).toBeChecked();
  if (backup.value.selected_type === CheckoutType.MANUAL)
    await expect(cs.pointBonusInput).toHaveCount(0);
  for (const { label, key } of PointMethods) {
    const shown = Number((await cs.pointInput(label).inputValue()).replace(/\D/g, '') || '0');
    expect(shown, label).toBe(backup.value[key].enabled ? backup.value[key].point : 0);
  }
  await scrollToTop(cs.checkoutTitle);
  await shot(
    page,
    'VP-4489_TC10_final_restore_check',
    `final check: flag == pre-test backup (${backup.value.selected_type} · bonus ${backup.value.point_bonus})`,
  );
  expect(cs.writes).toHaveLength(0);
});
