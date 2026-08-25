import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { MerchantColumn, MerchantsPage } from '@pages/merchants/MerchantsPage';

/**
 * Search facts confirmed on the DEV Portal, 2026-08-18 — they decide the shape
 * of every assertion here:
 *
 *  - the keyword IS written to the URL, as `q=<term>` (not `search=`, which is
 *    what the Staffs screen uses), and a `?q=` deep link restores both the input
 *    and the filtered result set;
 *  - the app JSON-quotes a purely numeric term, so searching `2950` produces
 *    `q="2950"` in the URL while still matching WHMCS id 2950;
 *  - it is debounced: eight characters typed fast produce ONE
 *    `GET /merchant_settings?search=…`;
 *  - a term matching nothing renders `[data-slot="empty"]` reading
 *    "No merchants found." and a `Showing 0 to 0 of 0 results` footer.
 *
 * Assertions therefore check behaviour and format, never a specific merchant
 * count — DEV data changes. The seed values used as needles ("Bleu", "Minh",
 * "Nail's") are read back out of the table where possible rather than assumed.
 */
test.describe('Tìm kiếm merchant (Search) — Merchants', () => {
  test.beforeEach(async ({ merchantsPage }) => {
    await merchantsPage.goto();
    await merchantsPage.waitForReady();
  });

  /**
   * TC-MCH-020 — Tìm theo tên merchant (khớp một phần)
   * Steps:
   *  1. Gõ một chuỗi con của tên merchant có thật (vd "Bleu").
   *  2. Chờ danh sách cập nhật.
   * Expected:
   *  Chỉ còn các dòng có MERCHANT chứa chuỗi đã gõ; số dòng giảm so với ban đầu;
   *  các dòng còn lại đều thực sự khớp.
   */
  test(
    'TC-MCH-020 — partial name search narrows the list to matching merchants only',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage }) => {
      const totalBefore = await merchantsPage.totalResults();
      expect(totalBefore).toBeGreaterThan(1);

      // Take the needle from live data: the first four letters of a real name.
      const names = await merchantsPage.columnValues(MerchantColumn.MERCHANT);
      const needle = names[0].slice(0, 4);

      await merchantsPage.search(needle);

      const matches = await merchantsPage.columnValues(MerchantColumn.MERCHANT);
      expect(matches.length).toBeGreaterThan(0);
      expect(await merchantsPage.totalResults()).toBeLessThanOrEqual(totalBefore);
      // Every surviving row really does contain the needle. Asserted against the
      // whole row rather than the MERCHANT cell: the placeholder promises name or
      // WHMCS id, and nothing rules out the backend also matching another column,
      // which would make a name-only check fail for a legitimately matching row.
      for (const row of await merchantsPage.table.rows.allTextContents()) {
        expect(row.toLowerCase()).toContain(needle.toLowerCase());
      }
    },
  );

  /**
   * TC-MCH-021 — Tìm theo WHMCS ID (cột `#`)
   * Steps:
   *  1. Lấy giá trị cột `#` của dòng đầu tiên.
   *  2. Gõ chính xác giá trị đó vào ô tìm kiếm.
   *  3. Chờ cập nhật.
   * Expected:
   *  Bảng trả về dòng có `#` đúng bằng giá trị đã gõ.
   */
  test(
    'TC-MCH-021 — searching a WHMCS id returns that merchant',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      const ids = await merchantsPage.columnValues(MerchantColumn.WHMCS_ID);
      const whmcsId = ids[0];
      expect(whmcsId).toMatch(/^\d+$/);

      await merchantsPage.search(whmcsId);

      const returned = await merchantsPage.columnValues(MerchantColumn.WHMCS_ID);
      expect(returned).toContain(whmcsId);
      // A numeric term is quoted by the app before it reaches the URL.
      await expect(page).toHaveURL(new RegExp(`q=(%22)?${whmcsId}(%22)?`));
    },
  );

  /**
   * TC-MCH-022 — Tìm không phân biệt chữ hoa/thường
   * Steps:
   *  1. Tìm "spa".
   *  2. Ghi lại kết quả.
   *  3. Xoá, tìm "SPA".
   * Expected:
   *  Hai lần tìm trả về cùng tập kết quả (case-insensitive).
   */
  test(
    'TC-MCH-022 — search is case-insensitive',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage }) => {
      await merchantsPage.search('spa');
      const lower = await merchantsPage.columnValues(MerchantColumn.MERCHANT);

      await merchantsPage.clearSearch();
      await merchantsPage.search('SPA');
      const upper = await merchantsPage.columnValues(MerchantColumn.MERCHANT);

      expect(upper).toEqual(lower);
    },
  );

  /**
   * TC-MCH-023 — Tìm chuỗi không tồn tại → trạng thái rỗng
   * Steps:
   *  1. Gõ "zzzzz-khong-ton-tai-99999".
   *  2. Chờ cập nhật.
   * Expected:
   *  Bảng không còn dòng dữ liệu nào; hiển thị empty state rõ ràng; không lỗi console.
   *
   * [CẦN XÁC MINH] resolved 2026-08-18: the empty state is a placeholder row
   * `[data-slot="empty"]` reading exactly "No merchants found.", the eight
   * column headers stay on screen, and the footer reports 0 of 0.
   */
  test(
    'TC-MCH-023 — a term with no match shows the "No merchants found." empty state',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error' && !/status of 401/.test(message.text())) {
          consoleErrors.push(message.text());
        }
      });

      await merchantsPage.search('zzzzz-khong-ton-tai-99999');

      await expect(merchantsPage.table.rows).toHaveCount(0);
      await expect(merchantsPage.emptyState).toBeVisible();
      await expect(merchantsPage.emptyState).toHaveText(/no merchants found\./i);
      await expect(merchantsPage.resultsFooter).toHaveText(/showing 0 to 0 of 0 results/i);
      await expect(merchantsPage.columnHeaders).toHaveCount(8);
      expect(consoleErrors).toEqual([]);
    },
  );

  /**
   * TC-MCH-024 — Xoá nội dung tìm kiếm → danh sách đầy đủ trở lại
   * Steps:
   *  1. Tìm một chuỗi thu hẹp kết quả.
   *  2. Xoá sạch ô tìm kiếm.
   *  3. Chờ cập nhật.
   * Expected:
   *  Danh sách trở về đúng số dòng như trạng thái ban đầu, thứ tự sắp xếp mặc
   *  định (JOINED AT giảm dần) được giữ.
   */
  test(
    'TC-MCH-024 — clearing the search restores the full list and its default order',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage }) => {
      const totalBefore = await merchantsPage.totalResults();
      const firstNameBefore = (await merchantsPage.columnValues(MerchantColumn.MERCHANT))[0];

      await merchantsPage.search('zzzzz-khong-ton-tai-99999');
      await expect(merchantsPage.table.rows).toHaveCount(0);

      await merchantsPage.clearSearch();

      expect(await merchantsPage.totalResults()).toBe(totalBefore);
      expect((await merchantsPage.columnValues(MerchantColumn.MERCHANT))[0]).toBe(firstNameBefore);

      // Default order still newest-joined first.
      const joined = (await merchantsPage.columnValues(MerchantColumn.JOINED_AT)).map((value) =>
        Date.parse(value.replace(/\s*\(UTC[+-]\d{1,2}\)\s*$/, '')),
      );
      for (let i = 1; i < joined.length; i++) {
        expect(
          joined[i - 1],
          `row ${i - 1} must not be older than row ${i}`,
        ).toBeGreaterThanOrEqual(joined[i]);
      }
    },
  );

  /**
   * TC-MCH-025 — Tìm với khoảng trắng ở đầu/cuối
   * Steps:
   *  1. Tìm "  Minh  " (có khoảng trắng bao quanh).
   *  2. So sánh với kết quả tìm "Minh".
   * Expected:
   *  Chuỗi tìm được trim → hai lần cho cùng kết quả. Nếu không trim, ghi nhận là
   *  defect về UX tìm kiếm.
   *
   * Measured 2026-08-18: the surrounding spaces are NOT stripped from the URL
   * (`q=+++Minh+++`), but the backend trims before matching, so both spellings
   * return the same rows. The user-visible behaviour the case asks about — same
   * results — holds, so this passes; the un-trimmed query param is cosmetic and
   * noted rather than asserted.
   */
  test(
    'TC-MCH-025 — leading/trailing whitespace does not change the result set',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage }) => {
      await merchantsPage.search('Minh');
      const trimmed = await merchantsPage.columnValues(MerchantColumn.MERCHANT);
      expect(trimmed.length).toBeGreaterThan(0);

      await merchantsPage.clearSearch();
      await merchantsPage.search('  Minh  ');
      const padded = await merchantsPage.columnValues(MerchantColumn.MERCHANT);

      expect(padded).toEqual(trimmed);
    },
  );

  /**
   * TC-MCH-026 — Tìm với ký tự đặc biệt trong tên
   * Steps:
   *  1. Tìm "Nail's" (có dấu nháy đơn).
   *  2. Tìm "Arlington LLC" (có khoảng trắng giữa).
   *  3. Tìm "- QC" (có dấu gạch ngang).
   * Expected:
   *  Cả 3 trả về dòng khớp tương ứng; không lỗi 500, không lỗi cú pháp query.
   */
  test(
    'TC-MCH-026 — quotes, spaces and dashes in a term all match without server errors',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      const serverErrors: string[] = [];
      page.on('response', (response) => {
        if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`);
      });

      for (const term of ["Nail's", 'Arlington LLC', '- QC']) {
        await test.step(`search ${JSON.stringify(term)}`, async () => {
          await merchantsPage.clearSearch();
          await merchantsPage.search(term);

          const names = await merchantsPage.columnValues(MerchantColumn.MERCHANT);
          expect(names.length, `no row matched ${term}`).toBeGreaterThan(0);
          const needle = term.trim().toLowerCase();
          expect(names.some((name) => name.toLowerCase().includes(needle))).toBe(true);
        });
      }

      expect(serverErrors).toEqual([]);
    },
  );

  /**
   * TC-MCH-027 — Tìm kiếm có debounce, không gọi API mỗi ký tự
   * Steps:
   *  1. Bắt các network request tới endpoint danh sách merchant.
   *  2. Gõ liên tục 8 ký tự thật nhanh.
   *  3. Đếm số request phát sinh.
   * Expected:
   *  Số request nhỏ hơn đáng kể số ký tự đã gõ; request cuối cùng mang đúng full keyword.
   *
   * The list endpoint is `GET …/merchant_settings?search=<term>&order[createdAt]=desc`
   * on the `volt-pos` data host (captured 2026-08-18). Typing "Merchant" — eight
   * characters — produced exactly one request.
   */
  test(
    'TC-MCH-027 — typing eight characters fires far fewer than eight list requests',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ merchantsPage, page }) => {
      const keyword = 'Merchant';
      const requests: string[] = [];
      page.on('request', (request) => {
        if (/\/merchant_settings/.test(request.url())) requests.push(request.url());
      });

      await merchantsPage.searchInput.pressSequentially(keyword, { delay: 40 });
      await page.waitForTimeout(3_000);

      expect(requests.length, `one request per keystroke would be ${keyword.length}`).toBeLessThan(
        keyword.length,
      );
      expect(requests.length).toBeGreaterThan(0);
      // The settled request carries the whole keyword, not a prefix.
      expect(decodeURIComponent(requests[requests.length - 1])).toContain(`search=${keyword}`);
    },
  );

  /**
   * TC-MCH-028 — Keyword tìm kiếm có được ghi vào URL
   * Steps:
   *  1. Tìm một keyword.
   *  2. Đọc URL.
   *  3. Copy URL, mở ở tab mới.
   * Expected:
   *  Nếu app ghi keyword vào query param, URL mới phải khôi phục đúng kết quả đã lọc.
   *
   * [CẦN XÁC MINH] resolved 2026-08-18: it does write the keyword, as `q=`, and
   * the deep link is fully restorable — so the case takes its positive branch.
   */
  test(
    'TC-MCH-028 — the keyword is written to ?q= and the URL is deep-linkable',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      await merchantsPage.search('Bleu');
      await expect(page).toHaveURL(/[?&]q=Bleu/);

      const filteredNames = await merchantsPage.columnValues(MerchantColumn.MERCHANT);
      const deepLink = page.url();

      const secondTab = await page.context().newPage();
      try {
        // A page object rather than raw locators: `waitForReady` blocks until the
        // fetch has resolved and `columnValues` skips skeleton rows. Reading
        // `tbody tr` directly returns a column of empty strings while the tab is
        // still rendering placeholders.
        const secondTabPage = new MerchantsPage(secondTab);
        await secondTab.goto(deepLink, { waitUntil: 'domcontentloaded' });
        await secondTabPage.waitForReady();

        await expect(secondTabPage.searchInput).toHaveValue('Bleu');
        const restored = await secondTabPage.columnValues(MerchantColumn.MERCHANT);
        expect(restored).toEqual(filteredNames);
      } finally {
        await secondTab.close();
      }
    },
  );
});
