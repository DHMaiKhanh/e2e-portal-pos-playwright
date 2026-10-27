import type { Locator } from '@playwright/test';
import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Timeouts } from '@configs/constants/timeouts';
import { env } from '@configs/env/loadEnv';
import { RCV4_META_LABELS, type RcV4Page } from '@pages/report-config-v4/RcV4Page';

/**
 * Report Configuration V4 › block columns & formats — Linear VP-4863 children (VP-4869, 4870, 4873)
 * plus similar cases on the table block. docs/test-cases/report-v4-master.md §D.
 * Every write is intercepted (`guardWrites`); nothing is saved on DEV.
 */
const issue = (id: string) => ({
  type: 'issue',
  description: `https://linear.app/fastboy/issue/${id}`,
});
const TABLE_BLOCK = 'Store Daily Sale Report'; // income-daily-sale
const SUMMARY_BLOCK = 'Store Daily Totals'; // income-daily-kpi

async function openForMerchant(rc: RcV4Page, block: string): Promise<void> {
  await rc.openRow('blocks', block);
  await expect(rc.main.getByRole('button', { name: 'Try query' })).toBeVisible({ timeout: 45_000 });
  const run = rc.page.waitForResponse((r) => /\/report_queries\/[^/]+\/run/.test(r.url()), {
    timeout: Timeouts.LONG,
  });
  await rc.pickMerchant(env.STORE_ID);
  expect((await run).status()).toBe(200);
}

/** Visible values of a preview table column (by header position). */
async function previewColumn(rc: RcV4Page, index: number): Promise<Locator> {
  const table = rc.main.locator('table').filter({ visible: true }).first();
  await expect(table.locator('tbody tr').first()).toBeVisible({ timeout: Timeouts.LONG });
  return table.locator(`tbody tr td:nth-child(${index + 1})`);
}

async function columnMenu(rc: RcV4Page, column: string, item: string): Promise<void> {
  const trigger = rc.main.getByRole('button', { name: `Column settings for ${column}` });
  await expect(async () => {
    if (!(await rc.page.getByRole('menu').first().isVisible())) await trigger.click();
    await expect(rc.page.getByRole('menu').first()).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: Timeouts.MEDIUM });
  // the column menu is long: scroll the option into view first
  const option = rc.page.getByRole('menuitemradio', { name: item, exact: true });
  await option.scrollIntoViewIfNeeded();
  // the scrolling menu re-positions while animating; a DOM click still fires Radix `onSelect`
  await option.evaluate((el) => (el as HTMLElement).click()); // selecting closes the menu
  await rc.page.keyboard.press('Escape');
}

test.describe('Report Config V4 › block columns & formats', () => {
  test.beforeEach(async ({ rcV4Page }) => {
    await rcV4Page.guardWrites();
  });

  test(
    'VP-4869 — renaming a table column keeps focus while typing',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4869') },
    async ({ rcV4Page: rc }) => {
      await openForMerchant(rc, TABLE_BLOCK);
      const input = rc.main.getByLabel('Rename Net total');
      await input.click();
      await input.press('Control+a');
      await rc.page.keyboard.type('Total Amount', { delay: 40 });
      await expect(rc.main.getByLabel(/^Rename Net total/)).toHaveValue('Total Amount');
      expect(rc.writes).toHaveLength(0);
    },
  );

  test(
    'VP-4870 — Value colour Negative (Red) colours the column in the preview',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4870') },
    async ({ rcV4Page: rc }) => {
      await openForMerchant(rc, TABLE_BLOCK);
      await columnMenu(rc, 'Net sale', 'Negative (Red)');
      const cell = (await previewColumn(rc, 1)).first();
      const rgb = await cell.evaluate((td) => {
        const el = (td.querySelector('span,div') as HTMLElement | null) ?? (td as HTMLElement);
        return getComputedStyle(el).color;
      });
      const [r, g, b] = (rgb.match(/\d+/g) ?? []).map(Number);
      expect(r > g + 40 && r > b + 40, `cell colour ${rgb} should be red`).toBe(true);
    },
  );

  test(
    'VP-4873 — Summary tile "Sale Income" with Number (2 decimals) shows dollars (20,382.70), not cents',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4873') },
    async ({ rcV4Page: rc }) => {
      await openForMerchant(rc, SUMMARY_BLOCK);
      const fmt = rc.main.getByRole('button', { name: 'Format for Sale Income' });
      const tileValue = () =>
        fmt.evaluate((b) => {
          let card: HTMLElement | null = b as HTMLElement;
          for (let i = 0; i < 8 && card; i++, card = card.parentElement) {
            const line = card.innerText
              .split('\n')
              .map((l) => l.trim())
              .find((l) => /^[-−]?\$?[\d,]+(\.\d+)?$/.test(l));
            if (line) return line;
          }
          return '';
        });
      const before = await tileValue(); // e.g. "$20,382.70"
      await fmt.click();
      await rc.page
        .getByRole('menuitemradio', { name: 'Number (2 decimals)', exact: true })
        .click();
      await expect
        .poll(tileValue, { message: `was ${before}` })
        .toBe(before.replace(/^([-−]?)\$/, '$1'));
    },
  );

  test(
    'VP-4873 — a money column added to the table is formatted (not raw cents)',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4873') },
    async ({ rcV4Page: rc }) => {
      await openForMerchant(rc, TABLE_BLOCK);
      await rc.main.getByRole('button', { name: 'Add column' }).click();
      const pop = rc.page
        .locator('[data-radix-popper-content-wrapper]')
        .filter({ visible: true })
        .last();
      const tip = pop.getByRole('checkbox', { name: /^Show .*Tip Amount$/ }).first();
      await expect(tip, 'a "Tip Amount" column is offered').toBeVisible();
      await tip.click();
      await rc.page.keyboard.press('Escape');
      // header cells are rename inputs: read their values
      const headers = await rc.main
        .locator('table')
        .filter({ visible: true })
        .first()
        .locator('thead th')
        .evaluateAll((ths) =>
          ths.map(
            (th) =>
              (th.querySelector('input') as HTMLInputElement | null)?.value ?? th.textContent ?? '',
          ),
        );
      const idx = headers.findIndex((h) => /Tip Amount/i.test(h));
      expect(idx, `headers: ${headers.join(' | ')}`).toBeGreaterThanOrEqual(0);
      const values = (await (await previewColumn(rc, idx)).allInnerTexts())
        .map((v) => v.trim())
        .filter(Boolean);
      for (const v of values.slice(0, 10))
        expect(v, 'money cell').toMatch(/^[-−]?\$[\d,]+\.\d{2}$/);
    },
  );

  test(
    'VP-4873 — table column Format "Number (2 decimals)" shows 2 decimals of dollars (not cents)',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4873') },
    async ({ rcV4Page: rc }) => {
      await openForMerchant(rc, TABLE_BLOCK);
      const col = await previewColumn(rc, 4); // Net total
      await expect(col.first()).toHaveText(/\$[\d,]+\.\d{2}/, { timeout: Timeouts.LONG });
      const before = (await col.first().innerText()).trim(); // "$35.00"
      await columnMenu(rc, 'Net total', 'Number (2 decimals)');
      await expect(col.first()).toHaveText(before.replace(/^([-−]?)\$/, '$1'));
    },
  );

  test(
    'SIMILAR (VP-4832) — table block Add column lists no response metadata',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ rcV4Page: rc }) => {
      await openForMerchant(rc, TABLE_BLOCK);
      await rc.main.getByRole('button', { name: 'Add column' }).click();
      const pop = rc.page
        .locator('[data-radix-popper-content-wrapper]')
        .filter({ visible: true })
        .last();
      await expect(pop.getByRole('checkbox').first()).toBeVisible();
      const labels = (
        await pop
          .getByRole('checkbox')
          .evaluateAll((cs) => cs.map((c) => c.getAttribute('aria-label') ?? ''))
      ).map((l) => l.replace(/^Show /, ''));
      await rc.page.keyboard.press('Escape');
      expect(
        labels.filter((l) => RCV4_META_LABELS.test(l)),
        'metadata columns',
      ).toEqual([]);
      const dupes = [...new Set(labels.filter((l, i) => labels.indexOf(l) !== i))];
      expect(dupes, `SIMILAR (VP-4838) duplicate column labels: ${dupes.join(', ')}`).toEqual([]);
    },
  );

  test(
    'VP-4838 — summary block Add column lists each label once (Gift Card Sale)',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4838') },
    async ({ rcV4Page: rc }) => {
      await openForMerchant(rc, SUMMARY_BLOCK);
      await rc.main.getByRole('button', { name: 'Add column' }).click();
      const pop = rc.page
        .locator('[data-radix-popper-content-wrapper]')
        .filter({ visible: true })
        .last();
      await expect(pop.getByRole('checkbox').first()).toBeVisible();
      const labels = (
        await pop
          .getByRole('checkbox')
          .evaluateAll((cs) => cs.map((c) => c.getAttribute('aria-label') ?? ''))
      ).map((l) => l.replace(/^Show /, ''));
      await rc.page.keyboard.press('Escape');
      const dupes = [...new Set(labels.filter((l, i) => labels.indexOf(l) !== i))];
      expect(dupes, `duplicate column labels: ${dupes.join(', ')}`).toEqual([]);
    },
  );
});
