import { test, expect } from '@fixtures/index';
import { env } from '@configs/env/loadEnv';
import { blockMutations } from '@helpers/writeGuard';
import { shot } from './_shared';

/** READ-ONLY: how the Add service → Category picker behaves (nothing is submitted; all writes blocked). */
test('add-service category picker (read-only)', async ({ page, productsPage }) => {
  expect(env.STORE_ID).toBe('20258');
  const blocked = await blockMutations(page);
  await productsPage.goto();
  await productsPage.openAddService();
  const dlg = productsPage.serviceDialog;
  const trigger = dlg.locator('#category');
  console.log('TRIGGER before', await trigger.innerText());
  await trigger.click();
  await page.waitForTimeout(800);
  const opts = page.getByRole('option');
  console.log('OPTIONS', (await opts.allInnerTexts()).join(' | '));
  await shot(page, '_probe/probe5_picker_open');
  await page.getByPlaceholder('Search category...').fill('Hand Care');
  await page.waitForTimeout(500);
  console.log('OPTIONS filtered', (await opts.allInnerTexts()).join(' | '));
  await page.getByRole('option', { name: 'Hand Care', exact: true }).click();
  await page.waitForTimeout(800);
  console.log(
    'TRIGGER after',
    await trigger.innerText(),
    'expanded',
    await trigger.getAttribute('aria-expanded'),
  );
  console.log(
    'search still visible',
    await page.getByPlaceholder('Search category...').isVisible(),
  );
  await shot(page, '_probe/probe5_picker_after');
  await productsPage.serviceDialogCancelButton.click();
  console.log('BLOCKED', blocked);
});
