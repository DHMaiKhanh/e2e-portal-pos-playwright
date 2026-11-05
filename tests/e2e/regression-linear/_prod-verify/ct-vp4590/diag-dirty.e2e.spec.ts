import * as fs from 'fs';
import { test } from '@fixtures/index';
import { OUT_DIR, scrollToTop, shot } from './_shared';

/** VP-4590 PROD #20258 diagnostic (mocked writes): is "dirty = touched" page-wide? */
test('diag: revert on non-checkout controls', async ({ page, checkoutSettingPage: cs }) => {
  await cs.mockSettingWrites();
  await cs.goto();
  const bar = async () => {
    await page.waitForTimeout(700);
    const b = page.getByRole('region', { name: 'Unsaved changes' });
    return (await b.isVisible()) ? (await b.innerText()).replace(/\s+/g, ' ') : 'HIDDEN';
  };
  const out: Record<string, string> = {};
  const tipAcc = page.getByRole('switch', { name: 'Tip acceptance' });
  await tipAcc.click();
  out.tipAcceptanceOff = await bar();
  await tipAcc.click();
  out.tipAcceptanceBackOn = await bar();
  if ((await bar()) !== 'HIDDEN')
    await page
      .getByRole('region', { name: 'Unsaved changes' })
      .getByRole('button', { name: 'Discard' })
      .click();
  const tax = cs.productTaxRateInput;
  const orig = await tax.inputValue();
  await tax.fill('9');
  await tax.blur();
  out.taxChanged = await bar();
  await tax.fill(orig);
  await tax.blur();
  out.taxReverted = await bar();
  await scrollToTop(tax, 300);
  await shot(
    page,
    'VP-4590_DIAG_tax_rate_reverted_bar',
    `diag (mocked): Product tax rate ${orig} → 9 → ${orig} → bar "${out.taxReverted}" (same "touched = dirty" behaviour outside Checkout setting)`,
  );
  if ((await bar()) !== 'HIDDEN')
    await page
      .getByRole('region', { name: 'Unsaved changes' })
      .getByRole('button', { name: 'Discard' })
      .click();
  console.log('DIRTY', JSON.stringify(out), 'writes', cs.writes.length);
  fs.writeFileSync(`${OUT_DIR}/diag-dirty.json`, JSON.stringify(out, null, 2));
});
