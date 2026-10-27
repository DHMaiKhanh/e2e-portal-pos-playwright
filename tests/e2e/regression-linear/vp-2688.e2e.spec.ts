import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { importCsv, openStaffList, rowsWithCode, staffApiUrl, unusedStaffCode } from './helpers';

/**
 * VP-2688 — Employee Phone with more than 10 digits must be refused on import.
 * https://linear.app/fastboy/issue/VP-2688 (child of VP-1168 Import Staff)
 *
 * The bug: a 12-digit phone imported fine and was stored mangled (`3.45679E+11`). Each row here
 * is a brand-new staff (unused 4-digit code) whose only fault is the phone, so a regression would
 * create it — in that case `finally` removes it again and the assertions fail.
 */
test.describe('VP-2688 — import Employee Phone > 10 chữ số phải bị từ chối', () => {
  test.describe.configure({ mode: 'serial' });

  const cases = [
    { id: 'TC-VP2688-01', phone: '+1415555011512', note: '12 chữ số sau +1 (dạng template)' },
    { id: 'TC-VP2688-02', phone: '415555011512', note: '12 chữ số không có +1 (như ticket)' },
  ];

  for (const c of cases) {
    test(
      `${c.id} — phone ${c.note}: server báo lỗi Employee Phone, không tạo staff`,
      { tag: [Tag.REGRESSION] },
      async ({ page, staffsPage }) => {
        const code = await unusedStaffCode(page);
        // Letters and digits only: the server refuses a nickname like "E2E-VP2688-9123" on its own.
        const nickname = `E2EVP${code}`;

        try {
          await openStaffList(page);
          const dialog = await staffsPage.openImportDialog();
          await dialog.chooseCsv(
            `vp-2688-${code}.csv`,
            importCsv([
              {
                firstName: 'E2E',
                lastName: 'Phone',
                nickname,
                code,
                role: 'Technician',
                phone: c.phone,
              },
            ]),
          );

          const result = await dialog.confirmImport();

          await test.step('API: 0 dòng import, lỗi phone "not a valid phone number"', async () => {
            expect(result.importedCount).toBe(0);
            expect(result.failedCount).toBe(1);
            const errors = result.errors.member.flatMap((m) => m.errors);
            expect(errors).toContainEqual(
              expect.objectContaining({
                key: 'phone',
                message: expect.stringMatching(/not a valid phone number/i),
              }),
            );
            expect(errors.map((e) => e.key)).toEqual(['phone']);
          });

          await test.step('UI: banner lỗi + đánh dấu ô Employee Phone', async () => {
            await expect(dialog.errorBanner).toHaveText(/1 of 1 rows have errors/i);
            await expect(dialog.cellErrorButton('Employee Phone (*)')).toBeVisible();
            await expect(dialog.confirmImportButton).toBeDisabled();
          });

          await test.step('không có staff nào mang code mới', async () => {
            expect(await rowsWithCode(page, code)).toBe(0);
          });
        } finally {
          // Only a regression gets here with a row to remove.
          if ((await rowsWithCode(page, code)) > 0) {
            await page.locator('tbody tr').first().getByText(nickname).click();
            await page.waitForURL(/\/staffs\/[0-9a-f-]{20,}/);
            const id = new URL(page.url()).pathname.split('/').pop() as string;
            expect(
              await staffsPage.removeStaffViaApi(staffApiUrl(id)),
              'cleanup of created staff',
            ).toBeTruthy();
          }
        }
      },
    );
  }
});
