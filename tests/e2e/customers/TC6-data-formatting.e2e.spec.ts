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
          expect(phone).toMatch(/^\(\d{3}\) \d{3}-\d{4}$/);
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
      // 12 such customers exist in the store but they are not guaranteed to sit
      // on page 1, which is what the old skip was really reacting to. Scanning
      // makes the case deterministic instead of dataset-dependent.
      const row = await customersPage.findRowAcrossPages(
        (cells) => cells[CustomersPage.Column.LAST_VISIT] === '-',
      );

      expect(row, 'no never-visited customer found in the store').not.toBeNull();
      expect((row as string[])[CustomersPage.Column.LAST_VISIT]).toBe('-');
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
      // useless to the operator — that is the point of the placeholder.
      expect((row as string[])[CustomersPage.Column.PHONE]).toMatch(/^\(\d{3}\) \d{3}-\d{4}$/);
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
      // "Test@@@!`*&^" exists in the store; searching for the punctuation run is
      // the deterministic way to reach it from any page.
      await customersPage.search('@@@!');
      const rows = customersPage.table.rows;

      await expect(rows.first()).toBeVisible();
      await expect(rows.first()).toContainText('@@@!');

      // Layout integrity: the name must not spill the row box.
      const overflow = await rows.first().evaluate((row) => {
        const cell = row.querySelector('td');
        if (!cell) return null;
        return cell.scrollWidth - cell.clientWidth;
      });
      expect(overflow ?? 0).toBeLessThanOrEqual(1);
    },
  );
});
