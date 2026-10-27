import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Timeouts } from '@configs/constants/timeouts';
import { env } from '@configs/env/loadEnv';
import type { RcV4Tab } from '@pages/report-config-v4/RcV4Page';

/**
 * Report Configuration V4 › Reports & row dialogs — Linear VP-4756 QC bugs + bugs found by the
 * 2026-10-20 re-scan (docs/test-cases/report-config-v4.md §D, §E).
 * Each test asserts the EXPECTED result: it stays red until the bug is fixed.
 * All writes are intercepted (`guardWrites`) — nothing is copied/deleted on DEV.
 */
const issue = (id: string) => ({
  type: 'issue',
  description: `https://linear.app/fastboy/issue/${id}`,
});
const SYSTEM_REPORT = 'Payroll Report';
const QA_MERCHANT = '999999'; // holds the QA merchant copy "Payroll Report QA"

test.describe('Report Config V4 › Reports', () => {
  test.beforeEach(async ({ rcV4Page }) => {
    await rcV4Page.guardWrites();
  });

  test(
    'VP-4835 — System report: Run preview lets you pick a merchant (no misleading E_PARAM error)',
    { tag: [Tag.REGRESSION], annotation: issue('VP-4835') },
    async ({ rcV4Page: rc }) => {
      await rc.openRow('reports', SYSTEM_REPORT);
      const run = rc.main.getByRole('button', { name: 'Run preview' });
      await expect(run).toBeVisible({ timeout: 45_000 });
      const picker = rc.main.getByRole('button', { name: 'Filter by merchant' });
      if (await picker.count()) await rc.pickMerchant(env.STORE_ID);
      await rc.main
        .locator('#report-v4-param-period_id')
        .fill('')
        .catch(() => {});
      await run.click();
      await rc.page.waitForTimeout(Timeouts.DEBOUNCE * 3);
      await expect(rc.main.getByText(/E_PARAM: A report reads one merchant/)).toHaveCount(0);
      await expect(rc.main.getByText('A filter or the date range is missing a value.')).toHaveCount(
        0,
      );
    },
  );

  test(
    'VP-4835 — merchant report copy: Run preview sends that merchant and returns rows',
    { tag: [Tag.REGRESSION], annotation: issue('VP-4835') },
    async ({ rcV4Page: rc }) => {
      await rc.open('reports', `?scope=resolved&page=1&merchant=${QA_MERCHANT}`);
      const copy = rc.main.locator('tbody tr').filter({ hasText: 'This merchant' }).first();
      await expect(copy, `a merchant-owned report copy for #${QA_MERCHANT}`).toHaveCount(1);
      const name = (await copy.locator('td').first().innerText()).trim();
      await rc.main.getByRole('cell', { name, exact: true }).click();
      await rc.page.waitForURL(/\/report-config-v4\/reports\/[0-9a-f-]{36}/, {
        timeout: Timeouts.LONG,
      });
      // Required params (marked "*") must be filled before a preview can run.
      await expect(rc.main.locator('input[id^="report-v4-param-"]').first()).toBeVisible({
        timeout: 45_000,
      });
      for (const input of await rc.main
        .locator('input[id^="report-v4-param-"][aria-required="true"]')
        .all()) {
        if (!(await input.inputValue())) await input.fill('1');
      }
      const req = rc.page.waitForRequest(
        (r) => /\/v4\/report_(runs|queries)/.test(r.url()) && r.method() === 'POST',
        {
          timeout: Timeouts.LONG,
        },
      );
      await rc.main.getByRole('button', { name: 'Run preview' }).click();
      expect((await req).headers()['x-merch-id'], 'row merchant sent as x-merch-id').toBe(
        QA_MERCHANT,
      );
      await expect(rc.main.getByText(/E_PARAM/)).toHaveCount(0);
    },
  );

  test(
    'VP-4836 — a filter marked Required keeps its parameter input in Preview',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4836') },
    async ({ rcV4Page: rc }) => {
      await rc.openRow('reports', SYSTEM_REPORT);
      const idInput = rc.main.locator('#report-v4-param-id');
      await expect(idInput, 'param "id" input before').toBeVisible({ timeout: 45_000 });
      // Filter 1 = "Staff payroll · Payroll id is Parameter id" → tick its Required box (not saved)
      const required = rc.main.getByText('Required', { exact: true }).first();
      await required.click();
      await expect(rc.main.getByRole('checkbox', { checked: true }).first()).toBeVisible();
      await expect(idInput, 'param "id" input after Required').toBeVisible();
      expect(rc.writes, 'nothing saved').toHaveLength(0);
    },
  );
});

test.describe('Report Config V4 › row dialogs', () => {
  test.beforeEach(async ({ rcV4Page }) => {
    await rcV4Page.guardWrites();
  });

  test(
    'VP-4844 — Copy for merchant: one click on Copy sends the copy request',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4844') },
    async ({ rcV4Page: rc }) => {
      rc.stubWrite({
        method: 'POST',
        url: /\/v4\/report_queries\/.+/,
        status: 201,
        body: { id: 'stub' },
      });
      await rc.open('reports');
      await rc.rowMenu(SYSTEM_REPORT, /Copy for merchant/);
      const dialog = rc.page.getByRole('dialog').filter({ hasText: 'for a merchant' });
      await rc.pickMerchant(env.STORE_ID, dialog);
      await dialog.getByRole('button', { name: 'Copy', exact: true }).click();
      await expect
        .poll(() => rc.writes.filter((w) => w.method === 'POST').length, {
          timeout: Timeouts.SHORT,
          message: 'copy request after ONE click',
        })
        .toBe(1);
    },
  );

  // VP-4876 (found in the 2026-10-20 re-scan): closing a dialog that was opened from a
  // row "⋯" menu leaves `body { pointer-events: none }` — the whole page stops responding to clicks
  // until a reload.
  const ROW_DIALOGS: { tab: RcV4Tab; row: string; item: RegExp }[] = [
    { tab: 'reports', row: SYSTEM_REPORT, item: /Copy for merchant/ },
    { tab: 'reports', row: SYSTEM_REPORT, item: /^Delete/ },
    { tab: 'pages', row: 'Daily Sale Report', item: /Copy for merchant/ },
    { tab: 'pages', row: 'Daily Sale Report', item: /^Delete/ },
    { tab: 'blocks', row: 'Store Income Chart', item: /Copy for merchant/ },
    { tab: 'blocks', row: 'Store Income Chart', item: /^Delete/ },
  ];
  for (const d of ROW_DIALOGS) {
    for (const close of ['Cancel', 'Escape'] as const) {
      test(
        `VP-4876 — ${d.tab}: closing "${d.item.source.replace(/[\^/]/g, '')}" with ${close} leaves the page clickable`,
        { tag: [Tag.REGRESSION, Tag.UI] },
        async ({ rcV4Page: rc }) => {
          await rc.open(d.tab);
          await rc.rowMenu(d.row, d.item);
          const dialog = rc.dialog;
          await expect(dialog).toBeVisible();
          if (close === 'Cancel') await dialog.getByRole('button', { name: 'Cancel' }).click();
          else await rc.page.keyboard.press('Escape');
          await expect(dialog).toBeHidden();
          await expect
            .poll(() => rc.isFrozen(), { message: 'body pointer-events stuck at none' })
            .toBe(false);
          // and a normal click still works
          await rc.main
            .getByRole('cell', { name: d.row, exact: true })
            .first()
            .click({ timeout: Timeouts.SHORT });
          await expect(rc.page).toHaveURL(new RegExp(`/report-config-v4/${d.tab}/[0-9a-f-]{36}`));
          expect(rc.writes, 'nothing written').toHaveLength(0);
        },
      );
    }
  }
});
