import { test, expect } from '@fixtures/index';
import {
  FONT_SIZE_FLAG,
  type FontSize,
  FontSizeSettingPage,
} from '@pages/settings/FontSizeSettingPage';
import { readSysSetting } from '@pages/settings/SysSettingApi';
import { annotate, assertProdTestStore, shot } from './helpers';

/** VP-4809 PROD — read-only final check that store #20258 is back on its original value. */
test('FINAL — store #20258 font size restored to medium (fresh browser, read-only)', async ({
  page,
}) => {
  assertProdTestStore();
  const fs = new FontSizeSettingPage(page);
  await fs.mockWrites(); // blocks any accidental write
  await fs.goto();
  const flag = await readSysSetting<{ font_size: FontSize }>(page, FONT_SIZE_FLAG);
  console.log('[FINAL]', JSON.stringify({ value: flag.value, updatedAt: flag.updatedAt }));
  expect(flag.value.font_size).toBe('medium');
  await expect(fs.checkedRadio).toHaveAttribute('value', 'medium');
  await fs.card.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await annotate(
    page,
    '[data-slot="settings-card"]:has([role="radiogroup"][aria-label="Font size"])',
  );
  await shot(
    page,
    'VP-4809_FINAL_restored_medium_fresh_session',
    `FINAL re-check: API font_size = "${flag.value.font_size}" (updatedAt ${flag.updatedAt}) · UI = "${await fs.selected()}"`,
  );
  await page.unrouteAll({ behavior: 'ignoreErrors' });
});
