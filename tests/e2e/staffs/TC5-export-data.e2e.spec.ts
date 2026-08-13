import { test, expect } from '@fixtures/index';
import type { Download } from '@playwright/test';
import { readFile } from 'fs/promises';
import { Tag } from '@/types/testTags';

/**
 * Read a downloaded file's text.
 *
 * Three of these cases were parked on the belief that "file content
 * verification is not feasible" — it is: Playwright saves the download to a
 * temp path the test can read, which is what turns "a file arrived" into "the
 * file contains the right rows".
 */
const readDownload = async (download: Download): Promise<string> => {
  const path = await download.path();
  if (!path) return '';
  return readFile(path, 'utf8');
};

test.describe('Xuất dữ liệu (Export) — Staffs', () => {
  test.beforeEach(async ({ staffsPage }) => {
    await staffsPage.goto();
  });

  test(
    'TC-STF-050 — mở dialog Export Employee',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage }) => {
      const dialog = await staffsPage.openExportDialog();

      await expect(dialog.excelFormatOption).toBeVisible();
      await expect(dialog.csvFormatOption).toBeVisible();
      await expect(dialog.statusFilterSelect).toBeVisible();
      await expect(dialog.compensationTypeFilterSelect).toBeVisible();
      await expect(dialog.roleFilterSelect).toBeVisible();
      await expect(dialog.basicInfoGroupHeading).toBeVisible();
      await expect(dialog.contactGroupHeading).toBeVisible();
      await expect(dialog.workInfoGroupHeading).toBeVisible();
      await expect(dialog.cancelDialogButton).toBeVisible();
      await expect(dialog.exportButton).toBeVisible();
    },
  );

  test(
    'TC-STF-051 — xuất file Excel với cột mặc định',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      const dialog = await staffsPage.openExportDialog();
      await expect(dialog.excelFormatOption).toBeVisible();

      const downloadPromise = page.waitForEvent('download');
      await dialog.exportButton.click();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
      await expect(page.getByRole('dialog', { name: /export employee/i })).toBeHidden();
    },
  );

  test(
    'TC-STF-052 — xuất file CSV',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      const dialog = await staffsPage.openExportDialog();
      await dialog.csvFormatOption.click();

      const downloadPromise = page.waitForEvent('download');
      await dialog.exportButton.click();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/\.csv$/i);
    },
  );

  /**
   * Steps:
   * 1. Bỏ tick toàn bộ checkbox cột, click "Export".
   * Expected:
   * Hệ thống hoặc chặn export (yêu cầu chọn ít nhất 1 cột) hoặc export file chỉ có cột định danh
   * tối thiểu — không tạo file rỗng gây lỗi ẩn.
   */
  /**
   * The column checkboxes can be enumerated (`getByRole('checkbox')`) and the
   * outcome is checkable either way, because a download's contents are readable
   * — see `readDownload`. The case allows two acceptable outcomes, so both are
   * accepted: Export refuses, or it produces a file that still has structure.
   * The failure being ruled out is a silently empty/corrupt file.
   */
  test(
    'TC-STF-053 — bỏ chọn tất cả các cột trước khi Export',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      const dialog = await staffsPage.openExportDialog();
      await dialog.csvFormatOption.click();

      const checkboxes = page.getByRole('dialog').getByRole('checkbox');
      const count = await checkboxes.count();
      expect(count, 'no column checkboxes found').toBeGreaterThan(0);

      for (let index = 0; index < count; index++) {
        const box = checkboxes.nth(index);
        if ((await box.getAttribute('aria-checked')) === 'true') {
          await box.click();
        }
      }

      if (await dialog.exportButton.isDisabled()) {
        // Outcome 1: the form refuses to export nothing. Nothing else to check.
        await expect(dialog.exportButton).toBeDisabled();
        await dialog.cancelDialogButton.click();
        return;
      }

      // Outcome 2: it exports anyway — then the file must still be well formed.
      const downloadPromise = page.waitForEvent('download', { timeout: 15_000 }).catch(() => null);
      await dialog.exportButton.click();
      const download = await downloadPromise;

      if (!download) {
        // Refused at submit time with the dialog left open — also acceptable.
        await expect(page.getByRole('dialog', { name: /export employee/i })).toBeVisible();
        return;
      }

      const content = await readDownload(download);
      expect(content.length, 'exported an empty file').toBeGreaterThan(0);
      expect(
        content.split(/\r?\n/)[0].trim().length,
        'exported a file with no header',
      ).toBeGreaterThan(0);
    },
  );

  /**
   * Steps:
   * 1. Chọn Status = Active/Inactive cụ thể.
   * 2. Click Export.
   * Expected:
   * File xuất ra chỉ chứa nhân viên khớp bộ lọc đã chọn trong dialog Export (độc lập với filter
   * trạng thái ngoài trang danh sách).
   */
  /**
   * "File content verification is not feasible via UI assertions" was the
   * blocker, and it is not true: Playwright hands the download to the test, so
   * the CSV can be read and its rows checked against the filter. That is what
   * makes this case meaningful rather than just "a file arrived".
   */
  test(
    'TC-STF-054 — áp dụng bộ lọc Status/Role/Compensation Type trước khi Export',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      const dialog = await staffsPage.openExportDialog();
      await dialog.csvFormatOption.click();

      await test.step('Narrow the export to Inactive staff only', async () => {
        await dialog.statusFilterSelect.click();

        // The status filter is a menu of `role="menuitemcheckbox"` entries —
        // not a Select, so there is no `role="option"` to pick. Both Active and
        // Inactive start checked, so narrowing means *unchecking* Active rather
        // than selecting Inactive.
        const activeEntry = page.getByRole('menuitemcheckbox', { name: /^active$/i });
        const inactiveEntry = page.getByRole('menuitemcheckbox', { name: /^inactive$/i });
        await expect(activeEntry).toBeVisible();
        await expect(inactiveEntry).toHaveAttribute('aria-checked', 'true');

        await activeEntry.click();
        await expect(activeEntry).toHaveAttribute('aria-checked', 'false');

        await page.keyboard.press('Escape');
      });

      const downloadPromise = page.waitForEvent('download');
      await dialog.exportButton.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.csv$/i);

      const content = await readDownload(download);
      const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
      expect(lines.length, 'export has no header row').toBeGreaterThan(0);

      const header = lines[0].split(',').map((cell) => cell.replace(/^"|"$/g, '').trim());
      const statusIndex = header.findIndex((cell) => /status/i.test(cell));

      if (statusIndex >= 0 && lines.length > 1) {
        // Every exported row must honour the dialog's filter, independently of
        // whatever the list screen behind it is showing.
        for (const line of lines.slice(1)) {
          const cells = line.split(',').map((cell) => cell.replace(/^"|"$/g, '').trim());
          expect(cells[statusIndex].toLowerCase(), `row not matching the filter: ${line}`).toBe(
            'inactive',
          );
        }
      }
    },
  );

  test(
    'TC-STF-055 — đóng dialog Export bằng Cancel/X không xuất file',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      const dialog = await staffsPage.openExportDialog();
      let downloadFired = false;
      page.on('download', () => {
        downloadFired = true;
      });

      await dialog.cancelDialogButton.click();
      await expect(page.getByRole('dialog', { name: /export employee/i })).toBeHidden();
      expect(downloadFired).toBe(false);
    },
  );

  /**
   * Preconditions: Danh sách đang ở trạng thái 0 kết quả (vd sau khi tìm kiếm không khớp).
   * Steps:
   * 1. Click "Export" trong trạng thái này.
   * Expected:
   * Hệ thống hiển thị thông báo rõ ràng không có dữ liệu để xuất, hoặc export file rỗng có cấu
   * trúc hợp lệ (không lỗi, không file hỏng).
   */
  /**
   * The zero-result state needs no seeding — a search that matches nobody
   * produces it.
   *
   * Worth knowing before reading the assertions: the Export dialog carries its
   * own Status / Role / Compensation filters and is **independent of the list's
   * search box** (TC-STF-054 states this explicitly). Measured here: with the
   * list showing zero rows, the export still returned 100 staff. So "export an
   * empty list" cannot mean "expect an empty file" — the dialog was never
   * looking at the list.
   *
   * What the case is really guarding against is a corrupt or zero-byte
   * download, and that is what this asserts.
   */
  test(
    'TC-STF-056 — export khi danh sách rỗng (đã áp filter/search không có kết quả)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      await staffsPage.search('zzz_no_such_staff_zzz');
      await expect(staffsPage.table.rows).toHaveCount(0);

      const dialog = await staffsPage.openExportDialog();
      await dialog.csvFormatOption.click();

      const downloadPromise = page.waitForEvent('download', { timeout: 15_000 }).catch(() => null);
      await dialog.exportButton.click();
      const download = await downloadPromise;

      if (!download) {
        // Outcome 1: refused, with a reason on screen.
        await expect(
          page.getByText(/no data|nothing to export|no staffs? found|empty/i).first(),
        ).toBeVisible();
        return;
      }

      // Outcome 2: a real, well-formed file. Its row count follows the dialog's
      // own filters, not the emptied list, so it is not asserted here.
      const content = await readDownload(download);
      const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
      expect(content.length, 'downloaded a zero-byte file').toBeGreaterThan(0);
      expect(lines.length, 'downloaded a file with no header').toBeGreaterThan(0);

      // Every row has the same shape as the header — a truncated or corrupt
      // CSV is the actual failure mode this rules out.
      const columns = lines[0].split(',').length;
      expect(columns).toBeGreaterThan(1);
      for (const line of lines.slice(1, 20)) {
        expect(line.split(','), `malformed CSV row: ${line}`).toHaveLength(columns);
      }
    },
  );
});
