import * as fs from 'fs';
import type { Page } from '@playwright/test';
import { test } from '@fixtures/index';
import { CheckoutType } from '@pages/settings/CheckoutSettingPage';
import { OUT_DIR, SHOTS_DIR, stamp } from './_shared';

/** VP-4590 PROD #20258 diagnostic (mocked writes): which Save makes the pos-shell jump? */
const shellTop = (page: Page) =>
  page.evaluate(() => {
    const s = document.querySelector<HTMLElement>('[data-slot="pos-shell"]');
    const p = document.querySelector<HTMLElement>('[data-slot="pos-page"]');
    return {
      shell: s?.scrollTop ?? -1,
      shellSH: s?.scrollHeight ?? -1,
      page: p?.scrollTop ?? -1,
      active:
        document.activeElement?.tagName +
        '#' +
        (document.activeElement?.id || document.activeElement?.getAttribute('data-slot') || ''),
    };
  });

const wheel = async (page: Page, n: number) => {
  await page.mouse.move(900, 600);
  for (let i = 0; i < n; i++) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(120);
  }
};

test.describe('diag scroll after save', () => {
  test.beforeEach(async ({ checkoutSettingPage: cs }) => {
    await cs.mockSettingWrites();
    await cs.goto();
  });

  test('a: Tip acceptance (top of page, no scroll) → Save', async ({ page }) => {
    await page.getByRole('switch', { name: 'Tip acceptance' }).click();
    const before = await shellTop(page);
    await page
      .getByRole('region', { name: 'Unsaved changes' })
      .getByRole('button', { name: 'Save', exact: true })
      .click();
    await page.waitForTimeout(1500);
    const after = await shellTop(page);
    console.log('A', JSON.stringify({ before, after }));
    fs.writeFileSync(`${OUT_DIR}/diag-scroll2-a.json`, JSON.stringify({ before, after }));
  });

  test('b: Product tax rate (bottom) → Save', async ({ page, checkoutSettingPage: cs }) => {
    await wheel(page, 12);
    await cs.productTaxRateInput.fill('9');
    await cs.productTaxRateInput.blur();
    const before = await shellTop(page);
    await cs.saveButton.click();
    await page.waitForTimeout(1500);
    const after = await shellTop(page);
    console.log('B', JSON.stringify({ before, after }));
    await stamp(
      page,
      `diag (mocked): Product tax rate 8→9 → Save → pos-shell scrollTop ${after.shell}`,
    );
    await page.screenshot({ path: `${SHOTS_DIR}/VP-4590_DIAG_tax_save_shell.png` });
  });

  test('c: Checkout Auto (no wheel, page at top) → Save', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    await cs.radio(CheckoutType.AUTO).click();
    const before = await shellTop(page);
    await cs.saveButton.click();
    await page.waitForTimeout(1500);
    const after = await shellTop(page);
    console.log('C', JSON.stringify({ before, after }));
  });

  test('d: Checkout Auto (wheel) → Save via keyboard Enter', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    await wheel(page, 12);
    await cs.radio(CheckoutType.AUTO).click();
    await cs.saveButton.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
    const after = await shellTop(page);
    console.log('D', JSON.stringify({ after }));
  });
});
