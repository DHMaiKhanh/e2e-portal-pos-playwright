import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import {
  VALID_PHONE,
  getStaff,
  importCsv,
  openStaffList,
  openStaffWithRole,
  restoreStaff,
  sameStaff,
} from './helpers';

/**
 * VP-2687 — Importing a row whose Employee Code already exists must fail.
 * https://linear.app/fastboy/issue/VP-2687 (child of VP-1168 Import Staff)
 *
 * The bug: the import succeeded and overwrote the existing staff with the file's data. The
 * row here reuses a real staff's code (and its nickname, role and email) with a valid phone, so
 * the only thing wrong with it is the duplicate code. If the bug came back the staff would be
 * overwritten — the snapshot taken first is put back in `finally`.
 */
test.describe('VP-2687 — import trùng Employee Code phải bị từ chối', () => {
  test.describe.configure({ mode: 'serial' });

  test(
    'TC-VP2687-01 — import 1 dòng trùng code: server báo lỗi Employee Code, không import, staff không đổi',
    { tag: [Tag.REGRESSION, Tag.CRITICAL] },
    async ({ page, staffsPage }) => {
      // nth = 1: VP-3787 toggles the first staff with a role in parallel.
      const existing = await openStaffWithRole(page, 1);

      try {
        await openStaffList(page);
        const dialog = await staffsPage.openImportDialog();
        await dialog.chooseCsv(
          'vp-2687-duplicate-code.csv',
          importCsv([
            {
              firstName: existing.firstName || existing.nickname,
              lastName: existing.lastName || 'E2E',
              nickname: existing.nickname,
              code: existing.staffCode,
              role: existing.role?.name ?? 'Technician',
              phone: VALID_PHONE,
              email: existing.email,
            },
          ]),
        );

        const result = await dialog.confirmImport();

        await test.step('API: 0 dòng import, lỗi staffCode "already exists"', async () => {
          expect(result.importedCount).toBe(0);
          expect(result.failedCount).toBe(1);
          const errors = result.errors.member.flatMap((m) => m.errors);
          expect(errors).toContainEqual(
            expect.objectContaining({
              key: 'staffCode',
              message: expect.stringMatching(
                new RegExp(`${existing.staffCode}.*already exists`, 'i'),
              ),
            }),
          );
          // The row must fail for the code only, or the test is not exercising the bug.
          expect(errors.map((e) => e.key)).toEqual(['staffCode']);
        });

        await test.step('UI: banner lỗi + đánh dấu ô Employee Code', async () => {
          await expect(dialog.errorBanner).toHaveText(/1 of 1 rows have errors/i);
          await expect(dialog.cellErrorButton('Employee Code (*)')).toBeVisible();
          await expect(dialog.confirmImportButton).toBeDisabled();
        });

        await test.step('staff có sẵn không bị ghi đè', async () => {
          expect(sameStaff(await getStaff(page, existing.id), existing)).toBeTruthy();
        });
      } finally {
        if (!sameStaff(await getStaff(page, existing.id), existing)) {
          await restoreStaff(page, existing);
        }
      }
    },
  );
});
