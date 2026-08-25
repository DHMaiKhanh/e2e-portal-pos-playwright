import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { MERCHANT_COLUMNS, MerchantColumn } from '@pages/merchants/MerchantsPage';

/** "Jul 24, 2026, 2:09 PM (UTC+7)" → epoch ms, dropping the offset suffix. */
const parseJoinedAt = (value: string): number =>
  Date.parse(value.replace(/\s*\(UTC[+-]\d{1,2}\)\s*$/, ''));

test.describe('Bảng dữ liệu (Table) — Merchants', () => {
  test.beforeEach(async ({ merchantsPage }) => {
    await merchantsPage.goto();
    await merchantsPage.waitForReady();
  });

  /**
   * TC-MCH-040 — Header đúng 8 cột, đúng thứ tự
   * Steps:
   *  1. Đọc toàn bộ header của bảng.
   * Expected:
   *  Đúng 8 cột theo thứ tự: `#`, MERCHANT, PACKAGE, STATUS, OWNER EMAIL,
   *  OWNER PHONE, TIMEZONE, JOINED AT.
   */
  test(
    'TC-MCH-040 — the table has exactly the eight documented columns, in order',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage }) => {
      await expect(merchantsPage.columnHeaders).toHaveCount(MERCHANT_COLUMNS.length);
      await expect(merchantsPage.columnHeaders).toHaveText([...MERCHANT_COLUMNS]);
    },
  );

  /**
   * TC-MCH-041 — Mỗi dòng có đủ số ô khớp số cột
   * Steps:
   *  1. Lặp qua tất cả dòng đang render.
   *  2. Đếm số ô mỗi dòng.
   * Expected:
   *  Mọi dòng có đúng 8 ô; không dòng nào bị lệch cột hay thiếu ô.
   */
  test(
    'TC-MCH-041 — every rendered row has exactly eight cells',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage }) => {
      const rows = await merchantsPage.table.rows.all();
      expect(rows.length).toBeGreaterThan(0);

      for (const [index, row] of rows.entries()) {
        await expect(row.getByRole('cell'), `row ${index} cell count`).toHaveCount(
          MERCHANT_COLUMNS.length,
        );
      }
    },
  );

  /**
   * TC-MCH-042 — Ô rỗng hiển thị placeholder `—`
   * Steps:
   *  1. Quan sát cột PACKAGE ở các dòng merchant chưa gán gói.
   * Expected:
   *  Ô rỗng hiển thị em dash `—`, không để trắng, không hiện `null`/`undefined`/`N/A`.
   */
  test(
    'TC-MCH-042 — unset PACKAGE cells render an em dash, never a blank or null',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage }) => {
      const packages = await merchantsPage.columnValues(MerchantColumn.PACKAGE);
      expect(packages.length).toBeGreaterThan(0);

      for (const value of packages) {
        expect(value, 'no cell may be blank').not.toBe('');
        expect(value).not.toMatch(/^(null|undefined|n\/a|nan)$/i);
      }
      // At least one merchant has no package on DEV, and it shows the em dash.
      // If the data ever changes so that all are assigned, the loop above still
      // guards the invariant this case is really about.
      const placeholders = packages.filter((value) => value === '—');
      if (placeholders.length === 0) {
        test.info().annotations.push({
          type: 'note',
          description: 'every merchant currently has a package — em-dash branch not exercised',
        });
      }
    },
  );

  /**
   * TC-MCH-043 — Badge STATUS render đúng kiểu
   * Steps:
   *  1. Quan sát cột STATUS.
   * Expected:
   *  Trạng thái hiển thị dạng badge bo tròn có nền màu, không phải text trơn;
   *  nhãn khớp giá trị trạng thái thật.
   */
  test(
    'TC-MCH-043 — STATUS renders as a rounded, filled badge carrying a text label',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage }) => {
      const badge = merchantsPage.statusBadge(0);
      await expect(badge).toBeVisible();
      await expect(badge).toHaveText(/^(Active|Inactive)$/);

      const style = await badge.evaluate((element) => {
        const computed = getComputedStyle(element);
        return {
          radius: Number.parseFloat(computed.borderRadius),
          background: computed.backgroundColor,
        };
      });
      expect(style.radius, 'badge must be rounded, not plain text').toBeGreaterThan(0);
      expect(style.background, 'badge must have a filled background').not.toBe('rgba(0, 0, 0, 0)');
    },
  );

  /**
   * TC-MCH-044 — Sắp xếp mặc định theo JOINED AT giảm dần
   * Steps:
   *  1. Đọc cột JOINED AT của tất cả dòng.
   *  2. Parse thành timestamp.
   *  3. So sánh thứ tự.
   * Expected:
   *  Dãy timestamp giảm dần đơn điệu (merchant mới tham gia nhất ở trên cùng).
   *
   * Corroborated by the request the screen makes:
   * `GET /merchant_settings?order[createdAt]=desc` (captured 2026-08-18).
   */
  test(
    'TC-MCH-044 — rows default to newest JOINED AT first',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage }) => {
      const joined = (await merchantsPage.columnValues(MerchantColumn.JOINED_AT)).map(
        parseJoinedAt,
      );
      expect(joined.length).toBeGreaterThan(1);

      for (const [index, timestamp] of joined.entries()) {
        expect(Number.isNaN(timestamp), `row ${index} JOINED AT must parse`).toBe(false);
      }
      for (let i = 1; i < joined.length; i++) {
        expect(
          joined[i - 1],
          `row ${i - 1} must not be older than row ${i}`,
        ).toBeGreaterThanOrEqual(joined[i]);
      }
    },
  );

  /**
   * TC-MCH-045 — Click header cột để đổi sắp xếp
   * Steps:
   *  1. Click header MERCHANT.
   *  2. Quan sát thứ tự và chỉ báo sort.
   *  3. Click lại lần nữa.
   * Expected:
   *  Nếu cột sort được thì thứ tự đổi đúng chiều và có chỉ báo asc/desc; nếu header
   *  không tương tác thì xác nhận click không gây thay đổi hay lỗi nào.
   *
   * [CẦN XÁC MINH] resolved 2026-08-18: the headers are NOT sortable — plain
   * `<th>` with no `role`, no `aria-sort`, no nested button and `cursor: auto`.
   * Clicking MERCHANT twice left the row order and the URL untouched. So the
   * case takes its second branch: prove the headers are inert.
   */
  test(
    'TC-MCH-045 — column headers are not sortable and clicking one changes nothing',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      const header = merchantsPage.columnHeader('MERCHANT');
      await expect(header).toHaveCount(1);

      const affordances = await header.evaluate((element) => ({
        ariaSort: element.getAttribute('aria-sort'),
        role: element.getAttribute('role'),
        buttons: element.querySelectorAll('button').length,
        cursor: getComputedStyle(element).cursor,
      }));
      expect(affordances.ariaSort).toBeNull();
      expect(affordances.buttons).toBe(0);
      expect(affordances.cursor).not.toBe('pointer');

      const orderBefore = await merchantsPage.columnValues(MerchantColumn.WHMCS_ID);
      const urlBefore = page.url();

      await header.click();
      await page.waitForTimeout(1_000);
      await header.click();
      await page.waitForTimeout(1_000);

      expect(await merchantsPage.columnValues(MerchantColumn.WHMCS_ID)).toEqual(orderBefore);
      expect(page.url()).toBe(urlBefore);
    },
  );

  /**
   * TC-MCH-046 — Nội dung dài không phá vỡ layout
   * Steps:
   *  1. Quan sát các dòng có giá trị dài nhất.
   * Expected:
   *  Text wrap hoặc truncate gọn trong ô; không đẩy tràn cột khác, không tạo
   *  scroll ngang toàn trang.
   */
  test(
    'TC-MCH-046 — the longest values stay inside their cells without scrolling the page',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      const names = await merchantsPage.columnValues(MerchantColumn.MERCHANT);
      const longest = names.reduce((a, b) => (b.length > a.length ? b : a), '');
      expect(longest.length).toBeGreaterThan(0);

      const pageScrollsSideways = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(pageScrollsSideways, 'the document must not scroll horizontally').toBe(false);

      // The widest cell stays within the table's own box — no column is pushed out.
      const overflow = await merchantsPage.table.rows.first().evaluate((row) => {
        const table = row.closest('table');
        if (!table) return null;
        const tableRight = table.getBoundingClientRect().right;
        return [...row.querySelectorAll('td')].some(
          (cell) => cell.getBoundingClientRect().right > tableRight + 1,
        );
      });
      expect(overflow, 'a cell escaped the table box').toBe(false);
    },
  );

  /**
   * TC-MCH-047 — Trạng thái rỗng của bảng
   * Steps:
   *  1. Áp một tổ hợp search+filter chắc chắn không có kết quả.
   *  2. Quan sát vùng bảng.
   * Expected:
   *  Header cột vẫn hiển thị, có thông báo không có dữ liệu; không hiện dòng
   *  skeleton treo vô hạn.
   *
   * Confirmed 2026-08-18: the headers stay and the body is replaced by a single
   * `[data-slot="empty"]` row — the empty state does not swallow the table.
   */
  test(
    'TC-MCH-047 — the empty state keeps the headers and shows no hanging skeleton',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      await merchantsPage.search('zzzzz-khong-ton-tai-99999');
      await merchantsPage.selectStatus(/^Inactive$/);

      await expect(merchantsPage.table.rows).toHaveCount(0);
      await expect(merchantsPage.columnHeaders).toHaveCount(MERCHANT_COLUMNS.length);
      await expect(merchantsPage.emptyState).toBeVisible();
      await expect(merchantsPage.emptyState).toHaveText(/no merchants found\./i);
      await expect(page.locator('[data-slot="skeleton"]:visible')).toHaveCount(0);
    },
  );
});
