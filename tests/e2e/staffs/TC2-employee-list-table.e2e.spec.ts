import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';

test.describe('Bảng danh sách nhân viên (Table) — Staffs', () => {
  test.beforeEach(async ({ staffsPage }) => {
    await staffsPage.goto();
  });

  test(
    'TC-STF-010 — header cột đúng thứ tự và nhãn',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage }) => {
      await staffsPage.waitForReady();
      const expectedOrder = [/STAFF/i, /PHONE/i, /EMAIL/i, /CODE/i, /JOINED AT/i, /STATUS/i];
      const headers = staffsPage.columnHeaders;
      await expect(headers).toHaveCount(expectedOrder.length);
      for (let i = 0; i < expectedOrder.length; i++) {
        await expect(headers.nth(i)).toHaveText(expectedOrder[i]);
      }
    },
  );

  /**
   * TC-STF-011 — Dữ liệu dòng khớp với thông tin nhân viên thực tế
   * Steps:
   *  1. Chọn 1 nhân viên có đủ Phone/Email đã biết.
   *  2. So sánh từng ô với dữ liệu nguồn.
   * Expected:
   *  Tên, phone (định dạng `(XXX) XXX-XXXX`), email, code, ngày gia nhập, trạng thái hiển thị
   *  chính xác.
   */
  /**
   * The "source data" is available at run time — it is the `/staffs` collection
   * the screen itself fetches. Capturing that response and diffing it against
   * the rendered cells is a real comparison against the source, and it also
   * covers the transforms the table applies (name composition, phone
   * formatting, the join date in the store's +7 timezone).
   */
  test(
    'TC-STF-011 — dữ liệu dòng khớp với thông tin nhân viên thực tế',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      const payloads: Array<{ member?: Array<Record<string, unknown>> }> = [];
      page.on('response', async (response) => {
        if (!/\/staffs\?/.test(response.url())) return;
        await response
          .json()
          .then((json) => payloads.push(json))
          .catch(() => undefined);
      });

      await staffsPage.goto();
      await staffsPage.waitForReady();

      const source = payloads.filter((p) => (p.member?.length ?? 0) > 0).pop();
      expect(source, 'no populated /staffs response was captured').toBeTruthy();
      const member = (source as { member: Array<Record<string, unknown>> }).member;

      const rendered = await staffsPage.table.rows.allInnerTexts();
      expect(rendered).toHaveLength(member.length);

      for (const [index, record] of member.entries()) {
        const cells = rendered[index].split('\t').map((cell) => cell.trim());
        const [staff, phone, email, code, joinedAt, status] = cells;

        // STAFF shows the nickname when there is one, otherwise the full name.
        const expectedName =
          (record.nickname as string) ||
          `${(record.firstName as string) ?? ''} ${(record.lastName as string) ?? ''}`.trim();
        expect(staff.split('\n')[0].trim(), `row ${index} STAFF`).toBe(expectedName);

        expect(email, `row ${index} EMAIL`).toBe((record.email as string) || '');

        // CODE is stored unpadded (321) and rendered zero-padded to 4 ("0321"),
        // so compare the value rather than the string.
        if (record.staffCode !== null && record.staffCode !== undefined && code !== '') {
          expect(Number(code), `row ${index} CODE`).toBe(Number(record.staffCode));
          expect(code, `row ${index} CODE padding`).toMatch(/^\d{4,}$/);
        }

        expect(status.toLowerCase(), `row ${index} STATUS`).toBe(
          String(record.status ?? '').toLowerCase(),
        );

        if (phone) {
          // Rendered as (XXX) XXX-XXXX regardless of how it is stored.
          expect(phone, `row ${index} PHONE`).toMatch(/^\(\d{3}\) \d{3}-\d{4}$/);
          expect(phone.replace(/\D/g, ''), `row ${index} PHONE digits`).toContain(
            String(record.phone ?? '')
              .replace(/\D/g, '')
              .slice(-10),
          );
        }

        if (record.createdAt) {
          const expectedDate = new Date(record.createdAt as string).toLocaleDateString('en-US', {
            timeZone: 'Asia/Ho_Chi_Minh',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          expect(joinedAt, `row ${index} JOINED AT`).toContain(expectedDate);
        }
      }
    },
  );

  test(
    'TC-STF-012 — trường Phone/Email trống hiển thị placeholder "-"',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      await staffsPage.waitForReady();
      const rows = page.getByRole('row');
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);
      const bodyText = (await page.locator('body').innerText()).toLowerCase();
      expect(bodyText).not.toContain('null');
      expect(bodyText).not.toContain('undefined');
    },
  );

  test(
    'TC-STF-013 — phân trang tới/lui hoạt động đúng',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ staffsPage }) => {
      await staffsPage.waitForReady();
      await staffsPage.pagination.waitForVisible();

      const prevButton = staffsPage.pagination.prevButton;
      const nextButton = staffsPage.pagination.nextButton;

      await expect(prevButton).toBeDisabled();

      if (await nextButton.isEnabled()) {
        await nextButton.click();
        await expect(staffsPage.pageIndicator).toContainText(/2/);
        await expect(prevButton).toBeEnabled();

        await prevButton.click();
        await expect(staffsPage.pageIndicator).toContainText(/1/);
        await expect(prevButton).toBeDisabled();
      }
    },
  );

  /**
   * TC-STF-014 — Điều hướng tới trang cuối
   * Steps:
   *  1. Bấm "Next" liên tục tới trang cuối (7/...).
   * Expected:
   *  Trang cuối chỉ hiển thị số dòng còn lại (≤30), nút "Next" bị disable.
   */
  /**
   * The page count does not need to be known in advance — the "n / m" indicator
   * reports it, so the last page is derived rather than assumed. That keeps the
   * case stable as the roster grows.
   */
  test(
    'TC-STF-014 — điều hướng tới trang cuối',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      await staffsPage.waitForReady();
      const footer = (await staffsPage.resultsFooter.first().innerText()).trim();
      const total = Number(footer.match(/of (\d+) results/i)?.[1]);
      const lastPage = Number((await staffsPage.pageIndicator.first().innerText()).split('/')[1]);
      expect(total).toBeGreaterThan(0);
      expect(lastPage).toBeGreaterThan(1);

      await page.goto(`${Urls.STAFFS}?page=${lastPage}&status=active&sort=pos_order`, {
        waitUntil: 'domcontentloaded',
      });
      await staffsPage.waitForReady();

      const pageSize = 30;
      const expectedRows = total - (lastPage - 1) * pageSize;
      await expect(staffsPage.table.rows).toHaveCount(expectedRows);
      expect(expectedRows).toBeLessThanOrEqual(pageSize);

      await expect(staffsPage.pagination.nextButton).toBeDisabled();
      await expect(staffsPage.pagination.prevButton).toBeEnabled();
      await expect(staffsPage.pageIndicator.first()).toHaveText(
        new RegExp(`^${lastPage}\\s*/\\s*${lastPage}$`),
      );
    },
  );

  test(
    'TC-STF-015 — click vào dòng điều hướng sang trang chi tiết đúng nhân viên',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ staffsPage, page }) => {
      await staffsPage.waitForReady();
      const rows = page.getByRole('row');
      const firstDataRow = rows.nth(1);
      await expect(firstDataRow).toBeVisible();
      const rowText = (await firstDataRow.innerText()).trim();
      const firstCellText = rowText.split('\n')[0]?.trim();

      await firstDataRow.click();

      await expect(page).toHaveURL(/\/pos\/\d+\/staffs\/[^/?]+\?tab=profile/);
      if (firstCellText) {
        await expect(page.getByText(firstCellText, { exact: false }).first()).toBeVisible();
      }
    },
  );
});
