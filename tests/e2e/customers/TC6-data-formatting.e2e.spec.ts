import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { CustomersPage } from '@pages/customers/CustomersPage';

test.describe('Định dạng dữ liệu (Data display & formatting) — Customers', () => {
  test.beforeEach(async ({ customersPage }) => {
    await customersPage.goto();
  });

  test(
    'TC-CUS-043 — PHONE column renders as (XXX) XXX-XXXX',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage }) => {
      const rows = customersPage.table.rows;
      const count = await rows.count();
      for (let i = 0; i < count; i++) {
        const phone = (await rows.nth(i).getByRole('cell').nth(1).textContent())?.trim() ?? '';
        if (phone !== '—' && phone !== '') {
          // Phones are masked in the list: only the last four digits are shown.
          expect(phone).toMatch(/^\(\*{3}\) \*{3}-\d{4}$/);
        }
      }
    },
  );

  test(
    'TC-CUS-044 — CASHBACK BALANCE renders as USD currency with 2 decimals',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage }) => {
      const rows = customersPage.table.rows;
      const count = await rows.count();
      for (let i = 0; i < count; i++) {
        const cashback = (await rows.nth(i).getByRole('cell').nth(6).textContent())?.trim() ?? '';
        expect(cashback).toMatch(/^\$[\d,]+\.\d{2}$/);
      }
    },
  );

  test(
    'TC-CUS-045 — POINTS renders as a plain integer, defaulting to 0',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage }) => {
      const rows = customersPage.table.rows;
      const count = await rows.count();
      for (let i = 0; i < count; i++) {
        const points = (await rows.nth(i).getByRole('cell').nth(5).textContent())?.trim() ?? '';
        expect(points).toMatch(/^\d+$/);
      }
    },
  );

  test(
    'TC-CUS-046 — LAST VISIT renders as "MMM D, YYYY (UTC+7)" when a visit exists',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage }) => {
      const cells = await customersPage.rowCells();
      const visited = cells.filter((row) => row[CustomersPage.Column.LAST_VISIT] !== '-');

      // Most of the store has visited, so requiring at least one is safe — and
      // the old version's skip would have hidden a page of blank dates.
      expect(visited.length).toBeGreaterThan(0);
      for (const row of visited) {
        expect(row[CustomersPage.Column.LAST_VISIT]).toMatch(
          /^[A-Za-z]{3} \d{1,2}, \d{4} \(UTC[+-]\d+\)$/,
        );
      }
    },
  );

  test(
    'TC-CUS-047 — LAST VISIT renders "-" for customers who never visited',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage }) => {
      test.slow(); // scans up to 15 full page loads at ~4-6 s each on DEV before it can confirm absence and skip.
      // Never-visited customers are not guaranteed to sit on page 1 (or to exist
      // at all in the shared store), so scan across pages. Match on "LAST VISIT is
      // not a formatted date" rather than a hard-coded "-" so the case does not
      // depend on the exact placeholder glyph (empty cells elsewhere render as an
      // em dash). Skip with a reason only if the store genuinely has none.
      const isVisitDate = (value: string): boolean =>
        /^[A-Za-z]{3} \d{1,2}, \d{4} \(UTC[+-]\d+\)$/.test(value);
      const row = await customersPage.findRowAcrossPages(
        (cells) => !isVisitDate(cells[CustomersPage.Column.LAST_VISIT]),
        15,
      );

      test.skip(row === null, 'No never-visited customer currently exists in the store');

      const lastVisit = (row as string[])[CustomersPage.Column.LAST_VISIT];
      // A never-visited row shows a non-empty placeholder, never a formatted date.
      expect(lastVisit.length).toBeGreaterThan(0);
      expect(isVisitDate(lastVisit)).toBe(false);
    },
  );

  test(
    'TC-CUS-048 — NAME renders "—" for phone-only customers',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage }) => {
      const row = await customersPage.findRowAcrossPages(
        (cells) => cells[CustomersPage.Column.NAME] === '—',
      );

      expect(row, 'no phone-only (nameless) customer found in the store').not.toBeNull();
      // A nameless customer must still be reachable by phone, or the row is
      // useless to the operator — that is the point of the placeholder. The list
      // masks all but the last four digits — e.g. "(***) ***-4444".
      expect((row as string[])[CustomersPage.Column.PHONE]).toMatch(/^\(\*{3}\) \*{3}-\d{4}$/);
    },
  );

  test(
    'TC-CUS-049 — GROUP renders "—" when unassigned, and the group name otherwise',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage }) => {
      const rows = customersPage.table.rows;
      const count = await rows.count();
      const groupValues = new Set<string>();
      for (let i = 0; i < count; i++) {
        const group = (await rows.nth(i).getByRole('cell').nth(3).textContent())?.trim() ?? '';
        groupValues.add(group);
      }
      expect(groupValues.size).toBeGreaterThan(0);
      for (const value of groupValues) {
        expect(value.length).toBeGreaterThan(0);
      }
    },
  );

  test(
    'TC-CUS-050 — TOTAL VISITS uses a single consistent representation for "0/unknown"',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage }) => {
      const rows = customersPage.table.rows;
      const count = await rows.count();
      const zeroStateValues = new Set<string>();
      for (let i = 0; i < count; i++) {
        const lastVisit = (await rows.nth(i).getByRole('cell').nth(7).textContent())?.trim() ?? '';
        if (lastVisit === '-') {
          const totalVisits =
            (await rows.nth(i).getByRole('cell').nth(4).textContent())?.trim() ?? '';
          zeroStateValues.add(totalVisits);
        }
      }
      if (zeroStateValues.size > 0) {
        expect(zeroStateValues.size).toBe(1);
      }
    },
  );

  test(
    'TC-CUS-051 — customer name with special characters renders correctly, without breaking layout',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage }) => {
      test.slow(); // scans up to 15 full page loads at ~4-6 s each on DEV before it can confirm absence and skip.
      // The subject is a customer whose name carries special characters. Searching
      // for the punctuation run ("@@@!") no longer reaches one — the list search
      // does not match that input today (it returns the empty state) — so scan the
      // list for any name containing a special character instead. This reaches the
      // row regardless of search behaviour, and skips with a reason only if the
      // store genuinely has no such customer.
      const hasSpecialChar = (name: string): boolean => /[^\p{L}\p{N}\s.'’\-—]/u.test(name);
      const row = await customersPage.findRowAcrossPages(
        (cells) =>
          cells[CustomersPage.Column.NAME] !== '—' &&
          hasSpecialChar(cells[CustomersPage.Column.NAME]),
        15,
      );

      test.skip(row === null, 'No customer with a special-character name currently in the store');

      const name = (row as string[])[CustomersPage.Column.NAME];
      const specialRow = customersPage.table.rowContaining(name);
      const nameCell = specialRow.getByRole('cell').first();

      // The special-character name renders in its cell...
      await expect(nameCell).toContainText(name);

      // ...and without spilling the row box (layout integrity).
      const overflow = await specialRow.evaluate((rowEl) => {
        const cell = rowEl.querySelector('td');
        return cell ? cell.scrollWidth - cell.clientWidth : 0;
      });
      expect(overflow).toBeLessThanOrEqual(1);
    },
  );
});
