import { test, expect } from '@fixtures/index';
import * as fs from 'fs';
import * as path from 'path';
import { Urls } from '@constants/urls';
import { blockMutations } from '@helpers/writeGuard';

/**
 * PROD read-only discovery for VP-3356 / VP-3891 (ad-hoc, not part of the suite).
 * Records the payroll-period list and network calls of Portal › Payroll › Staff Payroll.
 * Every mutating request except the read-only report query (`…/run`) and token refresh is aborted.
 */
const OUT =
  'D:/Temp/claude/d--3-Portal-POS-e2e-portal-pos-playwright/d3772d06-f595-44d5-b684-dc43edd1d78c/scratchpad/vp3356/data';

const allowed = (u: URL): boolean =>
  /\/v4\/report_queries\/[^/]+\/run$/.test(u.pathname) || /refresh_token/.test(u.pathname);

test('discover staff payroll periods on prod', async ({ page, payrollPage }) => {
  test.setTimeout(180_000);
  const blocked = await blockMutations(page, (u) => !allowed(u));
  const log: { method: string; url: string; status?: number; body?: unknown; post?: unknown }[] =
    [];
  page.on('response', async (r) => {
    const u = new URL(r.url());
    if (!/fastboypay\.com$/.test(u.hostname)) return;
    if (r.request().resourceType() !== 'fetch' && r.request().resourceType() !== 'xhr') return;
    const entry: (typeof log)[number] = {
      method: r.request().method(),
      url: r.url(),
      status: r.status(),
    };
    try {
      entry.post = r.request().postDataJSON();
    } catch {
      /* no body */
    }
    if (/payroll|period|report_queries|staff_payrolls/i.test(u.pathname)) {
      try {
        entry.body = await r.json();
      } catch {
        /* not json */
      }
    }
    log.push(entry);
  });

  await page.goto(`${Urls.PAYROLL}?tab=staff-payroll`, { waitUntil: 'domcontentloaded' });
  await payrollPage.waitForStaffPayrollRows();
  await expect(payrollPage.payPeriodCombobox).toBeVisible();
  const current = await payrollPage.payPeriodCombobox.innerText();
  await payrollPage.payPeriodCombobox.click();
  const options = await page.getByRole('option').allInnerTexts();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(2000);

  fs.writeFileSync(
    path.join(OUT, 'discover.json'),
    JSON.stringify({ url: page.url(), current, options, blocked, log }, null, 2),
  );
  console.log('CURRENT', current);
  console.log('OPTIONS', options.length, options.slice(0, 60));
  console.log('BLOCKED', blocked);
});
