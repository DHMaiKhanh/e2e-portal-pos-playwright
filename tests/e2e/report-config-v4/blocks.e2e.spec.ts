import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Timeouts } from '@configs/constants/timeouts';
import { env } from '@configs/env/loadEnv';
import {
  RCV4_META_COLUMNS,
  RCV4_META_LABELS,
  type RcV4Page,
} from '@pages/report-config-v4/RcV4Page';

/**
 * Report Configuration V4 › Blocks — Linear VP-4756 QC bugs (docs/test-cases/report-config-v4.md §C).
 * Each test asserts the EXPECTED result of the bug: it stays red until the bug is fixed.
 * All writes are intercepted (`guardWrites`) — the shared blocks on DEV are never changed.
 */
const issue = (id: string) => ({
  type: 'issue',
  description: `https://linear.app/fastboy/issue/${id}`,
});
const SUMMARY_BLOCK = 'Store Daily Totals'; // Summary · store-range-summary, 4 tiles

/** Open the shared summary block and run its query for the suite merchant. */
async function openBlockForMerchant(rc: RcV4Page): Promise<void> {
  await rc.openRow('blocks', SUMMARY_BLOCK);
  await expect(rc.main.getByRole('button', { name: 'Try query' })).toBeVisible({ timeout: 45_000 });
  const run = rc.page.waitForResponse((r) => /\/report_queries\/[^/]+\/run/.test(r.url()), {
    timeout: Timeouts.LONG,
  });
  await rc.pickMerchant(env.STORE_ID);
  expect((await run).status(), 'query run for the picked merchant').toBe(200);
  await expect(rc.main.getByRole('button', { name: /^Format for / }).first()).toBeVisible({
    timeout: Timeouts.LONG,
  });
}

async function addColumnLabels(rc: RcV4Page): Promise<string[]> {
  await rc.main.getByRole('button', { name: 'Add column' }).click();
  const pop = rc.page
    .locator('[data-radix-popper-content-wrapper]')
    .filter({ visible: true })
    .last();
  await expect(pop.getByRole('checkbox').first()).toBeVisible();
  const names = await pop
    .getByRole('checkbox')
    .evaluateAll((cs) =>
      cs.map((c) => (c.getAttribute('aria-label') ?? '').replace(/^Show /, '').trim()),
    );
  await rc.page.keyboard.press('Escape');
  return names;
}

test.describe('Report Config V4 › Blocks', () => {
  test.beforeEach(async ({ rcV4Page }) => {
    await rcV4Page.guardWrites();
  });

  test(
    'VP-4831 — System block: Try query asks for a merchant, then runs with x-merch-id and lists columns',
    { tag: [Tag.REGRESSION], annotation: issue('VP-4831') },
    async ({ rcV4Page: rc }) => {
      await rc.openRow('blocks', SUMMARY_BLOCK);
      const tryQuery = rc.main.getByRole('button', { name: 'Try query' });
      await expect(tryQuery).toBeVisible({ timeout: 45_000 });
      // Without a merchant the run cannot succeed: it must be blocked with a clear hint,
      // never "ran but returned nothing".
      await expect(rc.main.getByText(/returned nothing/i)).toHaveCount(0);
      if (await tryQuery.isEnabled()) {
        await tryQuery.click();
        await expect(rc.main.getByText(/merchant/i).first()).toBeVisible();
        await expect(rc.main.getByText(/returned nothing/i)).toHaveCount(0);
      } else {
        await expect(rc.main.getByText('Pick a merchant to run this preview')).toBeVisible();
      }
      const req = rc.page.waitForRequest((r) => /\/report_queries\/[^/]+\/run/.test(r.url()));
      await rc.pickMerchant(env.STORE_ID);
      expect((await req).headers()['x-merch-id']).toBe(env.STORE_ID);
      const labels = await addColumnLabels(rc);
      expect(labels.length, 'columns offered after a successful run').toBeGreaterThan(0);
      await expect(rc.page.getByText('Every column is shown.')).toHaveCount(0);
    },
  );

  test(
    'VP-4832 — Add column lists only dataset columns (no response envelope / metadata)',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4832') },
    async ({ rcV4Page: rc }) => {
      await openBlockForMerchant(rc);
      const labels = await addColumnLabels(rc);
      const meta = labels.filter((l) => RCV4_META_LABELS.test(l));
      expect(meta, `metadata offered as columns: ${meta.join(', ')}`).toEqual([]);
    },
  );

  test(
    'VP-4833 — Save changes sends only real dataset columns as items',
    { tag: [Tag.REGRESSION], annotation: issue('VP-4833') },
    async ({ rcV4Page: rc }) => {
      await openBlockForMerchant(rc);
      // make the form dirty without changing meaning: hide then show a tile
      const hide = rc.main.getByRole('button', { name: /^Hide / }).first();
      await hide.click();
      await rc.main
        .getByRole('button', { name: /^(Show|Hide) / })
        .first()
        .click();
      await rc.main.getByRole('button', { name: 'Save changes' }).click();
      await expect
        .poll(() => rc.writesTo('PATCH', /\/v4\/report_blocks\//).length, {
          timeout: Timeouts.MEDIUM,
        })
        .toBe(1);
      const body = rc.writesTo('PATCH', /\/v4\/report_blocks\//)[0].body ?? {};
      const slugs = ((body.items as { slug: string }[] | undefined) ?? []).map((i) => i.slug);
      expect(slugs.length).toBeGreaterThan(0);
      const meta = slugs.filter((s) => RCV4_META_COLUMNS.includes(s));
      expect(meta, `metadata sent as block items: ${meta.join(', ')}`).toEqual([]);
    },
  );

  test(
    'VP-4837 — New block: Report list matches Kind, and a shape error shows the API reason',
    { tag: [Tag.REGRESSION], annotation: issue('VP-4837') },
    async ({ rcV4Page: rc }) => {
      await rc.open('blocks');
      await rc.main.getByRole('button', { name: 'New block' }).click();
      const dialog = rc.page.getByRole('dialog').filter({ hasText: 'New block' });
      await expect(dialog.getByRole('combobox').nth(1)).toHaveText(/Table/);
      await dialog.getByRole('combobox').nth(2).click();
      const options = await rc.page.getByRole('option').allInnerTexts();
      await rc.page.keyboard.press('Escape');
      // Table blocks read collection reports; summary-shaped reports must not be offered
      for (const summaryReport of ['Payroll Totals', 'Store Range Summary']) {
        expect(
          options.map((o) => o.trim()),
          `"${summaryReport}" offered for a Table block`,
        ).not.toContain(summaryReport);
      }

      // And when the API refuses a shape, its reason is shown (not a generic message).
      rc.stubWrite({
        method: 'POST',
        url: /\/v4\/report_blocks$/,
        status: 422,
        body: {
          error: 'E_REFERENCES',
          detail: 'answers the collection response a table block reads',
          references: [
            { kind: 'shape', requirement: 'answers the collection response a table block reads' },
          ],
        },
      });
      await dialog.locator('input[name="name"]').fill('E2E VP-4837');
      await dialog.getByRole('combobox').nth(2).click();
      await rc.page.getByRole('option').first().click();
      await dialog.getByRole('button', { name: 'Create block' }).click();
      await expect.poll(() => rc.writesTo('POST', /\/v4\/report_blocks$/).length).toBe(1);
      await expect(rc.page.getByText(/collection/i).first(), 'API reason shown').toBeVisible({
        timeout: Timeouts.MEDIUM,
      });
      await expect(rc.page.getByText('The report request is missing required fields.')).toHaveCount(
        0,
      );
    },
  );

  test(
    'VP-4842 — New block validation: Report is required, errors clear as soon as the input is valid',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4842') },
    async ({ rcV4Page: rc }) => {
      await rc.open('blocks');
      await rc.main.getByRole('button', { name: 'New block' }).click();
      const dialog = rc.page.getByRole('dialog').filter({ hasText: 'New block' });
      await dialog.getByRole('button', { name: 'Create block' }).click();
      await expect(dialog.getByText('Name is required')).toBeVisible();
      await expect(
        dialog.getByText(/report is required|select a report|pick a report/i),
        'Report required error',
      ).toBeVisible();
      await dialog.locator('input[name="name"]').fill('E2E Valid Name');
      await expect(dialog.locator('input[name="slug"]')).toHaveValue('e2e-valid-name');
      await expect(dialog.getByText('Name is required')).toHaveCount(0);
      await expect(dialog.getByText('Key is required')).toHaveCount(0);
      await expect(dialog.getByText(/Key must be kebab-case/)).toHaveCount(0);
      expect(rc.writesTo('POST', /\/v4\/report_blocks$/)).toHaveLength(0);
    },
  );

  test(
    'VP-4842 — a block with every column hidden cannot be saved',
    { tag: [Tag.REGRESSION], annotation: issue('VP-4842') },
    async ({ rcV4Page: rc }) => {
      await openBlockForMerchant(rc);
      // Each "Hide <col>" toggles to "Show <col>": click every Hide button once.
      const labels = await rc.main
        .getByRole('button', { name: /^Hide / })
        .evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label') ?? ''));
      expect(labels.length).toBeGreaterThan(0);
      for (const label of labels) {
        const btn = rc.main.getByRole('button', { name: label, exact: true });
        if (await btn.isEnabled()) await btn.click();
      }
      // If the UI refuses to hide the last column, that IS the expected protection.
      if ((await rc.main.getByRole('button', { name: /^Hide / }).count()) > 0) return;
      await rc.main.getByRole('button', { name: 'Save changes' }).click();
      await rc.page.waitForTimeout(Timeouts.ANIMATION * 3);
      expect(
        rc.writesTo('PATCH', /\/v4\/report_blocks\//),
        'saved with zero visible columns',
      ).toHaveLength(0);
    },
  );

  test(
    'VP-4843 — changing a column Format updates the preview immediately',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4843') },
    async ({ rcV4Page: rc }) => {
      await openBlockForMerchant(rc);
      // The preview tile of "Total Orders" is the card holding its "Format for" button; its value is
      // the first numeric/currency line of that card.
      const fmtButton = rc.main.getByRole('button', { name: 'Format for Total Orders' });
      const tileValue = () =>
        fmtButton.evaluate((b) => {
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
      const setFormat = async (fmt: string) => {
        await fmtButton.click();
        await rc.page.getByRole('menuitemradio', { name: fmt, exact: true }).click();
      };
      await setFormat('Currency');
      await expect.poll(tileValue, { message: 'Currency' }).toMatch(/^[-−]?\$[\d,]+\.\d{2}$/);
      await setFormat('Number (2 decimals)');
      await expect
        .poll(tileValue, { message: 'Number (2 decimals)' })
        .toMatch(/^[-−]?[\d,]+\.\d{2}$/);
      await setFormat('Number');
      await expect.poll(tileValue, { message: 'Number' }).toMatch(/^[-−]?[\d,]+$/);
      expect(rc.writes, 'format change alone saves nothing').toHaveLength(0);
    },
  );

  test(
    'VP-4847 — Blocks list paginates 30 rows per page',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4847') },
    async ({ rcV4Page: rc }) => {
      await rc.open('blocks');
      const range = rc.main.locator('[data-slot="pos-pagination-range"]').first();
      const m = /^(\d+)–(\d+) of (\d+)$/.exec((await range.innerText()).trim());
      expect(m).not.toBeNull();
      const total = Number(m![3]);
      expect(total).toBeGreaterThan(30);
      await expect(rc.main.locator('tbody tr')).toHaveCount(30);
      const first = await rc.main.locator('tbody tr').first().innerText();
      await rc.main.getByRole('button', { name: 'Next page' }).click();
      await expect(range).toHaveText(`31–${Math.min(60, total)} of ${total}`);
      await expect(rc.main.locator('tbody tr')).toHaveCount(Math.min(30, total - 30));
      await expect(rc.main.locator('tbody tr').first()).not.toHaveText(first);
    },
  );
});
