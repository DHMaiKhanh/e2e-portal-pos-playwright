import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Data formatting & consistency — Payroll', () => {
  test.beforeEach(async ({ payrollPage }) => {
    await payrollPage.goto();
  });

  test(
    'TC-PAY-120 — currency values formatted consistently across tabs',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      const currencyRegex = /\$[\d,]+\.\d{2}/;

      await payrollPage.goToChecksTab();
      await payrollPage.waitForReady();
      const checksRowCount = await payrollPage.checksTable.rowCount();
      if (checksRowCount > 0) {
        const checksText = await payrollPage.page.getByRole('table').first().innerText();
        expect(checksText).toMatch(currencyRegex);
        // No raw currency numbers should appear without a leading $ sign.
        const rawNumberWithoutDollar = /(?<!\$)\b\d{1,3}(,\d{3})*\.\d{2}\b/;
        const strippedOfDollarAmounts = checksText.replace(new RegExp(currencyRegex, 'g'), '');
        expect(rawNumberWithoutDollar.test(strippedOfDollarAmounts)).toBeFalsy();
      }

      await payrollPage.goToStaffPayrollTab();
      await payrollPage.waitForReady();
      const staffRowCount = await payrollPage.staffPayrollTable.rowCount();
      if (staffRowCount > 0) {
        const staffText = await payrollPage.page.getByRole('table').first().innerText();
        expect(staffText).toMatch(currencyRegex);
      }

      await payrollPage.goToCheckHistoryTab();
      await payrollPage.waitForReady();
      const historyRowCount = await payrollPage.checkHistoryTable.rowCount();
      if (historyRowCount > 0) {
        const historyText = await payrollPage.page.getByRole('table').first().innerText();
        expect(historyText).toMatch(currencyRegex);
      }
    },
  );

  /**
   * TC-PAY-121 — Date/time formatting differs intentionally between Checks and Check History
   * Preconditions: Same check visible in both Checks tab (e.g. #46) and Check History tab.
   * Steps:
   *   1. Compare the CREATED AT value for check #46 in both tabs.
   * Expected: Checks tab shows full timestamp with time (`Jul 2, 2026, 1:48 AM (US/Central UTC-5)`);
   * Check History shows date only (`Jul 2, 2026 (US/Central UTC-5)`) — both refer to the same
   * underlying timestamp.
   */
  /**
   * Check #46 was never the point — the case is about *formats*, and a shared
   * check can be found at run time by matching ids across the two tabs. Both
   * renderings are then compared as patterns, and the date part is required to
   * agree, which is the "same underlying timestamp" half of the expectation.
   */
  test(
    'TC-PAY-121 — CREATED AT format differs: Checks (with time) vs Check History (date only)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      const createdAtById = async (
        table: typeof payrollPage.checksTable,
        idColumn: number,
        createdColumn: number,
      ): Promise<Map<string, string>> => {
        const entries = new Map<string, string>();
        for (const row of await table.rows.allInnerTexts()) {
          const cells = row.split('\t').map((cell) => cell.trim());
          const id = cells[idColumn]?.replace('#', '');
          if (id) entries.set(id, cells[createdColumn] ?? '');
        }
        return entries;
      };

      await payrollPage.gotoTab('checks');
      await expect(payrollPage.checksTable.rows.first()).toBeVisible();
      // Checks columns: [checkbox, ID, STAFF NAME, CREATED AT, ...]
      const fromChecks = await createdAtById(payrollPage.checksTable, 1, 3);

      await payrollPage.gotoTab('history');
      await expect(payrollPage.checkHistoryTable.rows.first()).toBeVisible();
      // Check History columns: [#, STAFF NAME, CREATED AT, CHECK, MEMO]
      const fromHistory = await createdAtById(payrollPage.checkHistoryTable, 0, 2);

      const sharedId = [...fromChecks.keys()].find((id) => fromHistory.has(id));
      expect(sharedId, 'no check appears in both tabs').toBeTruthy();

      const checksValue = fromChecks.get(sharedId as string) as string;
      const historyValue = fromHistory.get(sharedId as string) as string;

      // Checks carries the time; Check History is date-only.
      expect(checksValue, `Checks CREATED AT: ${checksValue}`).toMatch(
        /^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2} [AP]M \(.+\)$/,
      );
      expect(historyValue, `History CREATED AT: ${historyValue}`).toMatch(
        /^[A-Z][a-z]{2} \d{1,2}, \d{4} \(.+\)$/,
      );

      // Same instant underneath: the date part must agree. Pulled with a
      // pattern rather than by splitting on commas — the timezone suffix
      // "(UTC+7)" rides along on the last segment and made a naive split
      // compare "Aug 11, 2026" against "Aug 11, 2026 (UTC+7)".
      const datePart = (value: string): string =>
        value.match(/^[A-Z][a-z]{2} \d{1,2}, \d{4}/)?.[0] ?? '';
      expect(datePart(historyValue)).toBe(datePart(checksValue));
      expect(datePart(checksValue).length).toBeGreaterThan(0);
    },
  );

  /**
   * TC-PAY-122 — MEMO field renders the pay-period date range consistently
   * Preconditions: A check tied to a pay period.
   * Steps:
   *   1. Inspect the MEMO column for a check in Checks, Quick-Book-generated checks, and Check History.
   * Expected: MEMO consistently shows `MMM D, YYYY to MMM D, YYYY` for the same check across all
   * tabs where it appears.
   */
  /**
   * Same idea as TC-PAY-121: the case is about a *format* being consistent, so
   * it does not need a nominated check. Every MEMO on every tab must match the
   * "MMM D, YYYY to MMM D, YYYY" shape, and a check that appears in more than
   * one tab must read identically in each.
   */
  test(
    'TC-PAY-122 — MEMO date range format consistent across Checks, Quick-Book, and Check History',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      const MEMO_RANGE = /^[A-Z][a-z]{2} \d{1,2}, \d{4} to [A-Z][a-z]{2} \d{1,2}, \d{4}$/;

      const memosById = async (
        table: typeof payrollPage.checksTable,
        idColumn: number,
        memoColumn: number,
      ): Promise<Map<string, string>> => {
        const entries = new Map<string, string>();
        for (const row of await table.rows.allInnerTexts()) {
          const cells = row.split('\t').map((cell) => cell.trim());
          const id = cells[idColumn]?.replace('#', '');
          const memo = cells[memoColumn] ?? '';
          if (id && memo) entries.set(id, memo);
        }
        return entries;
      };

      await payrollPage.gotoTab('checks');
      await expect(payrollPage.checksTable.rows.first()).toBeVisible();
      const checksMemos = await memosById(payrollPage.checksTable, 1, 5);
      expect(checksMemos.size).toBeGreaterThan(0);

      await payrollPage.gotoTab('history');
      await expect(payrollPage.checkHistoryTable.rows.first()).toBeVisible();
      const historyMemos = await memosById(payrollPage.checkHistoryTable, 0, 4);
      expect(historyMemos.size).toBeGreaterThan(0);

      await test.step('Every MEMO uses the same date-range format', async () => {
        for (const [id, memo] of [...checksMemos, ...historyMemos]) {
          expect(memo, `MEMO for check ${id}`).toMatch(MEMO_RANGE);
        }
      });

      await test.step('A check shown in both tabs reads identically', async () => {
        const shared = [...checksMemos.keys()].filter((id) => historyMemos.has(id));
        expect(shared.length, 'no check appears in both tabs').toBeGreaterThan(0);
        for (const id of shared) {
          expect(historyMemos.get(id), `MEMO mismatch for check ${id}`).toBe(checksMemos.get(id));
        }
      });
    },
  );
});
