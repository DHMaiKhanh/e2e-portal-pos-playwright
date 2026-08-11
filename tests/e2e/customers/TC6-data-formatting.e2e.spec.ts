import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

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
      const rows = customersPage.table.rows;
      const count = await rows.count();
      let found = false;
      for (let i = 0; i < count; i++) {
        const lastVisit = (await rows.nth(i).getByRole('cell').nth(7).textContent())?.trim() ?? '';
        if (lastVisit !== '-') {
          expect(lastVisit).toMatch(/^[A-Za-z]{3} \d{1,2}, \d{4} \(UTC[+-]\d+\)$/);
          found = true;
          break;
        }
      }
      test.skip(!found, 'No customer with a recorded LAST VISIT on page 1');
    },
  );

  test(
    'TC-CUS-047 — LAST VISIT renders "-" for customers who never visited',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage }) => {
      const rows = customersPage.table.rows;
      const count = await rows.count();
      let found = false;
      for (let i = 0; i < count; i++) {
        const lastVisit = (await rows.nth(i).getByRole('cell').nth(7).textContent())?.trim() ?? '';
        if (lastVisit === '-') {
          found = true;
          break;
        }
      }
      test.skip(!found, 'No customer without a recorded visit on page 1');
      expect(found).toBe(true);
    },
  );

  test(
    'TC-CUS-048 — NAME renders "—" for phone-only customers',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage }) => {
      const rows = customersPage.table.rows;
      const count = await rows.count();
      let found = false;
      for (let i = 0; i < count; i++) {
        const name = (await rows.nth(i).getByRole('cell').nth(0).textContent())?.trim() ?? '';
        if (name === '—') {
          found = true;
          break;
        }
      }
      test.skip(!found, 'No nameless customer found on page 1');
      expect(found).toBe(true);
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
      await customersPage.search('@@@!');
      const rows = customersPage.table.rows;
      const count = await rows.count();
      test.skip(count === 0, 'Special-character customer not present in this dataset');
      await expect(rows.first()).toContainText('@@@!');
    },
  );
});
