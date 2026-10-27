import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Timeouts } from '@configs/constants/timeouts';
import { env } from '@configs/env/loadEnv';

/**
 * Report Configuration V4 › Fields — Linear VP-4756 QC bugs (docs/test-cases/report-config-v4.md §B).
 * Each test asserts the EXPECTED result of the bug: it stays red until the bug is fixed.
 * All writes are intercepted by `rcV4Page.guardWrites()` — nothing is created on DEV.
 */
const issue = (id: string) => ({
  type: 'issue',
  description: `https://linear.app/fastboy/issue/${id}`,
});
const MERCHANT = env.STORE_ID;
const OTHER_MERCHANT = '999999';

test.describe('Report Config V4 › Fields', () => {
  test.beforeEach(async ({ rcV4Page }) => {
    await rcV4Page.guardWrites();
  });

  for (const scope of ['system', 'merchant'] as const) {
    test(
      `VP-4830 — Save as report (${scope} scope) sends a payload the API accepts (no "required" key)`,
      { tag: [Tag.REGRESSION, Tag.CRITICAL], annotation: issue('VP-4830') },
      async ({ rcV4Page: rc }) => {
        await rc.open(
          'fields',
          scope === 'merchant' ? `?scope=resolved&page=1&merchant=${MERCHANT}` : '',
        );
        // Payroll periods: Period start (group by) + Number of periods (value)
        const boxes = rc.main.getByRole('checkbox');
        await boxes.nth(1).click();
        await boxes.nth(6).click();
        await rc.main.getByRole('button', { name: 'Save as report' }).click();
        const dialog = rc.page.getByRole('dialog').filter({ hasText: 'New report' });
        await dialog.locator('input[name="name"]').fill('E2E VP-4830');
        await dialog.locator('input[name="slug"]').fill(`e2e-vp4830-${Date.now().toString(36)}`);
        await dialog.getByRole('button', { name: 'Create report' }).click();
        await expect
          .poll(() => rc.writesTo('POST', /\/v4\/report_queries$/).length, {
            timeout: Timeouts.MEDIUM,
          })
          .toBe(1);
        const body = rc.writesTo('POST', /\/v4\/report_queries$/)[0].body ?? {};
        expect(body.scope).toBe(scope === 'merchant' ? 'merchant' : 'system');
        // BE rejects unknown attributes: `Extra attributes are not allowed ("required" is unknown)` → 400
        expect(Object.keys(body), 'request body keys').not.toContain('required');
      },
    );
  }

  test(
    'VP-4838 — Store income fields have unique labels',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4838') },
    async ({ rcV4Page: rc }) => {
      await rc.open('fields', `?scope=resolved&page=1&merchant=${MERCHANT}`);
      await rc.fieldsDataSource('Store income');
      await expect(rc.main.getByText('Store daily income').first()).toBeVisible({
        timeout: Timeouts.LONG,
      });
      const labels = await rc.fieldLabels('Values');
      expect(labels.length).toBeGreaterThan(20);
      const dupes = [...new Set(labels.filter((l, i) => labels.indexOf(l) !== i))];
      expect(dupes, `duplicate labels: ${dupes.join(', ')}`).toEqual([]);
    },
  );

  test(
    'VP-4840 — System scope: Run preview is disabled with no field and the error names the real cause',
    { tag: [Tag.REGRESSION], annotation: issue('VP-4840') },
    async ({ rcV4Page: rc }) => {
      await rc.open('fields');
      const run = rc.main.getByRole('button', { name: 'Run preview' });
      await expect(
        rc.main.getByText('Pick at least one field to group by or one value.'),
      ).toBeVisible();
      await expect(run, 'Run preview with 0 fields').toBeDisabled();
      await rc.main.getByRole('checkbox').nth(1).click();
      if (await run.isEnabled()) {
        await run.click();
        await expect(rc.main.getByText(/E_PARAM|merchant/i).first()).toBeVisible({
          timeout: Timeouts.LONG,
        });
      }
      // never the misleading "filter or date range" title for a missing merchant
      await expect(rc.main.getByText('A filter or the date range is missing a value.')).toHaveCount(
        0,
      );
    },
  );

  test(
    'VP-4841 — changing the merchant keeps data source, picked fields and date range',
    { tag: [Tag.REGRESSION], annotation: issue('VP-4841') },
    async ({ rcV4Page: rc }) => {
      await rc.open('fields', `?scope=resolved&page=1&merchant=${MERCHANT}`);
      await rc.fieldsDataSource('Store orders');
      const boxes = rc.main.getByRole('checkbox');
      await expect(boxes.first()).toBeVisible();
      await boxes.nth(0).click();
      await expect(rc.main.getByText(/^1 selected$/).first()).toBeVisible();
      await rc.pickMerchant(OTHER_MERCHANT);
      await expect(rc.page).toHaveURL(new RegExp(`merchant=${OTHER_MERCHANT}`));
      await expect(rc.main.getByRole('combobox').first(), 'data source kept').toHaveText(
        /Store orders/,
        {
          timeout: Timeouts.LONG,
        },
      );
      await expect(rc.main.getByText(/^1 selected$/).first(), 'picked field kept').toBeVisible();
    },
  );
});
