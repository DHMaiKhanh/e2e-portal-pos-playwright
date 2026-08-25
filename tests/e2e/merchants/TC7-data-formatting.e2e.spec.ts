import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { MerchantColumn } from '@pages/merchants/MerchantsPage';

/**
 * Format assertions read whole columns and check every value against a pattern,
 * so they hold as DEV data changes. The em dash `—` is the app's placeholder for
 * a missing value and is accepted wherever the case allows an empty cell.
 */
const EM_DASH = '—';

test.describe('Định dạng dữ liệu (Data formatting) — Merchants', () => {
  test.beforeEach(async ({ merchantsPage }) => {
    await merchantsPage.goto();
    await merchantsPage.waitForReady();
  });

  /**
   * TC-MCH-060 — Định dạng JOINED AT
   * Steps:
   *  1. Đọc toàn bộ giá trị cột JOINED AT.
   * Expected:
   *  Mọi giá trị khớp `^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2} (AM|PM) \(UTC[+-]\d{1,2}\)$`.
   */
  test(
    'TC-MCH-060 — every JOINED AT value matches "MMM D, YYYY, h:mm A (UTC±H)"',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage }) => {
      const values = await merchantsPage.columnValues(MerchantColumn.JOINED_AT);
      expect(values.length).toBeGreaterThan(0);

      const pattern = /^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2} (AM|PM) \(UTC[+-]\d{1,2}\)$/;
      for (const value of values) {
        expect(value, 'JOINED AT format').toMatch(pattern);
      }
    },
  );

  /**
   * TC-MCH-061 — Định dạng OWNER PHONE
   * Steps:
   *  1. Đọc toàn bộ cột OWNER PHONE.
   * Expected:
   *  Mỗi ô hoặc khớp `^\(\d{3}\) \d{3}-\d{4}$`, hoặc là placeholder `—`; không có
   *  số thô chưa format kiểu `2052059929`.
   */
  test(
    'TC-MCH-061 — OWNER PHONE is US-formatted or the em-dash placeholder',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage }) => {
      const values = await merchantsPage.columnValues(MerchantColumn.OWNER_PHONE);
      expect(values.length).toBeGreaterThan(0);

      for (const value of values) {
        if (value === EM_DASH) continue;
        expect(value, 'OWNER PHONE format').toMatch(/^\(\d{3}\) \d{3}-\d{4}$/);
        expect(value, 'raw unformatted digits must not leak through').not.toMatch(/^\d{10,}$/);
      }
    },
  );

  /**
   * TC-MCH-062 — Định dạng OWNER EMAIL
   * Steps:
   *  1. Đọc toàn bộ cột OWNER EMAIL.
   * Expected:
   *  Mỗi ô chứa `@` và có phần domain, hoặc là `—`; email không bị cắt mất phần domain.
   */
  test(
    'TC-MCH-062 — OWNER EMAIL keeps its domain intact, or shows the placeholder',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage }) => {
      const values = await merchantsPage.columnValues(MerchantColumn.OWNER_EMAIL);
      expect(values.length).toBeGreaterThan(0);

      for (const value of values) {
        if (value === EM_DASH) continue;
        expect(value, 'OWNER EMAIL shape').toMatch(/^[^\s@]+@[^\s@]+$/);
        // Not truncated with an ellipsis, and the domain half is non-empty.
        expect(value).not.toMatch(/[…]|\.{3}$/);
        expect(value.split('@')[1]?.length ?? 0).toBeGreaterThan(1);
      }
    },
  );

  /**
   * TC-MCH-063 — Giá trị TIMEZONE hợp lệ
   * Steps:
   *  1. Đọc toàn bộ cột TIMEZONE.
   * Expected:
   *  Mỗi giá trị là chuỗi timezone hợp lệ dạng `Region/City` — kiểm được bằng cách
   *  truyền vào `Intl.DateTimeFormat` mà không throw.
   */
  test(
    'TC-MCH-063 — every TIMEZONE is an IANA zone Intl accepts',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage }) => {
      const values = await merchantsPage.columnValues(MerchantColumn.TIMEZONE);
      expect(values.length).toBeGreaterThan(0);

      for (const value of values) {
        if (value === EM_DASH) continue;
        expect(value, 'Region/City shape').toMatch(/^[A-Za-z_]+\/[A-Za-z_+-]+$/);
        expect(
          () => new Intl.DateTimeFormat('en-US', { timeZone: value }),
          `${value} must be a zone Intl can resolve`,
        ).not.toThrow();
      }
    },
  );

  /**
   * TC-MCH-064 — Cột `#` (WHMCS ID) là số nguyên
   * Steps:
   *  1. Đọc toàn bộ cột `#`.
   * Expected:
   *  Mọi giá trị khớp `^\d+$`; không có ô rỗng; giá trị lớn như `999999`, `100004`
   *  vẫn hiển thị đầy đủ, không bị định dạng dấu phẩy nghìn.
   */
  test(
    'TC-MCH-064 — the # column holds bare integers with no thousands separator',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage }) => {
      const values = await merchantsPage.columnValues(MerchantColumn.WHMCS_ID);
      expect(values.length).toBeGreaterThan(0);

      for (const value of values) {
        expect(value, 'WHMCS id is an identifier and can never be blank').not.toBe('');
        expect(value, 'WHMCS id format').toMatch(/^\d+$/);
        expect(value, 'no thousands grouping').not.toContain(',');
      }
    },
  );

  /**
   * TC-MCH-065 — Định dạng tên PACKAGE
   * Steps:
   *  1. Đọc các ô PACKAGE không rỗng.
   * Expected:
   *  Tên gói hiển thị nhất quán dạng in hoa (`GO POS BASIC`, `GO POS DELUXE`);
   *  không lẫn lộn kiểu chữ giữa các dòng.
   */
  test(
    'TC-MCH-065 — assigned PACKAGE names are consistently uppercase',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage }) => {
      const assigned = (await merchantsPage.columnValues(MerchantColumn.PACKAGE)).filter(
        (value) => value !== EM_DASH && value !== '',
      );
      test.skip(assigned.length === 0, 'no merchant on DEV currently has a package assigned');

      for (const value of assigned) {
        expect(value, `${value} should render uppercase`).toBe(value.toUpperCase());
      }
    },
  );

  /**
   * TC-MCH-066 — UTC offset nhất quán trên toàn bảng
   * Steps:
   *  1. Trích phần `(UTC±H)` từ mọi dòng.
   *  2. So sánh với nhau và với TIMEZONE của cùng dòng.
   * Expected:
   *  Tất cả dòng dùng cùng một offset (theo múi giờ người xem) — bao gồm cả
   *  merchant có TIMEZONE là US/Central hoặc US/Eastern.
   *
   * This is the open business question flagged in the doc, not a settled bug:
   * JOINED AT is rendered in the *viewer's* zone, so a merchant in US/Central
   * still shows (UTC+7) when the suite runs at Asia/Ho_Chi_Minh (playwright
   * config pins `timezoneId`). The test asserts the behaviour as it is —
   * one offset for the whole table, matching the browser zone — and records the
   * mismatch against per-row TIMEZONE as an annotation so the product decision
   * stays visible without turning the suite red.
   */
  test(
    'TC-MCH-066 — JOINED AT uses one viewer-zone offset for every row',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      const joined = await merchantsPage.columnValues(MerchantColumn.JOINED_AT);
      const zones = await merchantsPage.columnValues(MerchantColumn.TIMEZONE);
      expect(joined.length).toBeGreaterThan(1);

      const offsets = joined.map((value) => value.match(/\(UTC([+-]\d{1,2})\)$/)?.[1]);
      for (const [index, offset] of offsets.entries()) {
        expect(offset, `row ${index} carries no UTC offset`).toBeTruthy();
      }
      expect(new Set(offsets).size, 'the table mixes UTC offsets').toBe(1);

      // The single offset is the viewer's, not any particular merchant's.
      const viewerOffsetHours = await page.evaluate(() => -new Date().getTimezoneOffset() / 60);
      expect(Number(offsets[0])).toBe(viewerOffsetHours);

      const divergent = zones.filter((zone, index) => {
        if (zone === EM_DASH) return false;
        const merchantOffset =
          Number(
            new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'shortOffset' })
              .format(new Date())
              .match(/GMT([+-]\d{1,2})/)?.[1] ?? NaN,
          ) || 0;
        return merchantOffset !== Number(offsets[index]);
      });
      if (divergent.length > 0) {
        test.info().annotations.push({
          type: 'business-question',
          description: `${divergent.length} row(s) have a merchant TIMEZONE whose offset differs from the rendered one (${zones.join(', ')} vs UTC${offsets[0]}). Confirm with the team whether JOINED AT should follow the viewer or the merchant zone.`,
        });
      }
    },
  );
});
