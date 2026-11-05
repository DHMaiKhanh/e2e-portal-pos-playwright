import * as fs from 'fs';
import type { Page } from '@playwright/test';
import { test } from '@fixtures/index';
import { CheckoutType } from '@pages/settings/CheckoutSettingPage';
import { OUT_DIR, SHOTS_DIR, stamp } from './_shared';

/** VP-4590 PROD #20258 diagnostic (mocked writes): does the shell jump after Save for a real user? */
const scrolled = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('*'))
      .filter((el) => el.scrollTop > 0)
      .map((el) => ({
        tag: el.tagName,
        cls: (el.className?.toString() ?? '').slice(0, 80),
        slot: el.getAttribute('data-slot'),
        oy: getComputedStyle(el).overflowY,
        top: el.scrollTop,
        h: el.clientHeight,
        sh: el.scrollHeight,
      }))
      .concat([
        {
          tag: 'WINDOW',
          cls: '',
          slot: null,
          oy: '',
          top: window.scrollY,
          h: innerHeight,
          sh: document.documentElement.scrollHeight,
        },
      ]),
  );

test('diag: shell position after Save (wheel scrolling only)', async ({
  page,
  checkoutSettingPage: cs,
}) => {
  await cs.mockSettingWrites();
  await cs.goto();
  await page.mouse.move(900, 600);
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(120);
  }
  const before = await scrolled(page);
  await cs.radio(CheckoutType.AUTO).click();
  const dirty = await scrolled(page);
  await cs.saveButton.click();
  await page.waitForTimeout(1500);
  const after = await scrolled(page);
  await stamp(
    page,
    'diag (mocked): wheel-scrolled like a user → pick Auto → click Save → raw screenshot 1.5s later (no programmatic scroll)',
  );
  await page.screenshot({ path: `${SHOTS_DIR}/VP-4590_DIAG_after_save_raw_user_scroll.png` });
  const out = { before, dirty, after, writes: cs.writes.length };
  fs.writeFileSync(`${OUT_DIR}/diag-scroll.json`, JSON.stringify(out, null, 1));
  console.log('SCROLL', JSON.stringify(out));
});
