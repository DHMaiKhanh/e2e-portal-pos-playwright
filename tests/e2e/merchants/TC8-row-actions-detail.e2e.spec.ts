import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { MerchantColumn, MerchantsPage } from '@pages/merchants/MerchantsPage';

/**
 * Row-click behaviour, resolved on the DEV Portal 2026-08-18 — this was the
 * biggest open question in the doc, and the answer is none of the three guesses
 * it listed outright:
 *
 * Clicking a row does NOT navigate to a separate route and does NOT open a
 * modal. The URL keeps `/pos/merchants` and gains `merchantId="<whmcsId>"`
 * (JSON-quoted), the table unmounts, and an in-place per-merchant dashboard
 * renders — "<name> #<id>", a status badge, "Generate Token" and "Open in
 * portal" actions, and a tab strip (Overview / Staff / Services / Orders /
 * Devices / Payroll / Income / Customers / Settings / Report Config). The
 * `merchantId` URL is deep-linkable and browser Back returns to the list.
 *
 * Every test that opens the detail view runs on `isolatedPage`: the Portal
 * remembers the selected merchant, and leaking that into the worker-shared
 * context would point later tests at the wrong merchant (see
 * src/fixtures/reuseContext.fixture.ts).
 */
test.describe('Hành động trên dòng & chi tiết merchant (Row actions / Detail) — Merchants', () => {
  /**
   * TC-MCH-070 — Click vào một dòng merchant
   * Steps:
   *  1. Click vào dòng merchant đầu tiên.
   *  2. Quan sát URL và giao diện.
   * Expected:
   *  Chốt hành vi thật: điều hướng sang trang chi tiết, mở modal, chuyển ngữ cảnh
   *  sang store đó, hay không có hành động nào.
   *
   * [CẦN XÁC MINH] resolved: in-place detail view + `merchantId` query param.
   */
  test(
    'TC-MCH-070 — clicking a row opens the in-place merchant detail view via ?merchantId=',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ isolatedPage }) => {
      const merchantsPage = new MerchantsPage(isolatedPage);
      await merchantsPage.goto();
      await merchantsPage.waitForReady();

      const whmcsId = (await merchantsPage.columnValues(MerchantColumn.WHMCS_ID))[0];
      const name = (await merchantsPage.columnValues(MerchantColumn.MERCHANT))[0];

      const detail = await merchantsPage.openMerchantRow(0);

      // Same route, new param — not a separate page and not a dialog.
      await expect(isolatedPage).toHaveURL(/\/pos\/nail\/admin\/merchant\?/);
      await expect(isolatedPage).toHaveURL(new RegExp(`merchantId=%22${whmcsId}%22`));
      await expect(isolatedPage.getByRole('dialog')).toHaveCount(0);

      // The list is genuinely unmounted — its table and search box are gone,
      // replaced by the merchant's own dashboard.
      await expect(isolatedPage.getByRole('table')).toHaveCount(0);
      await expect(merchantsPage.searchInput).toHaveCount(0);
      await expect(detail.whmcsIdLabel(whmcsId)).toBeVisible();
      await expect(isolatedPage.getByText(name).first()).toBeVisible();
      await expect(detail.generateTokenButton).toBeVisible();
      await expect(detail.tab(/^Overview$/)).toBeVisible();

      // Back returns to the list, intact.
      await isolatedPage.goBack();
      await merchantsPage.waitForReady();
      await expect(merchantsPage.searchInput).toBeVisible();
      expect(await merchantsPage.table.rows.count()).toBeGreaterThan(0);
    },
  );

  /**
   * TC-MCH-071 — Click vào ô `#` / tên merchant
   * Steps:
   *  1. Click riêng vào giá trị cột `#`.
   *  2. Quay lại, click riêng vào tên ở cột MERCHANT.
   * Expected:
   *  Nếu là link thì cả hai dẫn tới cùng đích và có thuộc tính `href`; nếu không
   *  phải link thì click không gây điều hướng ngoài ý muốn.
   *
   * [CẦN XÁC MINH] resolved: the cells are not links — a row contains no
   * `a[href]` at all; the whole `<tr>` is the click target (`cursor: pointer`).
   * So both cells lead to the same place, by virtue of being the same row
   * handler, and the "has href" branch does not apply.
   */
  test(
    'TC-MCH-071 — the # and name cells are not links; either one opens the same detail view',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ isolatedPage }) => {
      const merchantsPage = new MerchantsPage(isolatedPage);
      await merchantsPage.goto();
      await merchantsPage.waitForReady();

      const firstRow = merchantsPage.table.rows.first();
      await expect(firstRow.locator('a[href]')).toHaveCount(0);

      const whmcsId = (await merchantsPage.columnValues(MerchantColumn.WHMCS_ID))[0];

      await test.step('click the # cell', async () => {
        await firstRow.getByRole('cell').nth(MerchantColumn.WHMCS_ID).click();
        await expect(isolatedPage).toHaveURL(new RegExp(`merchantId=%22${whmcsId}%22`));
        await expect(isolatedPage.getByRole('button', { name: /generate token/i })).toBeVisible();
      });

      const urlFromIdCell = isolatedPage.url();

      await test.step('go back and click the MERCHANT cell', async () => {
        await isolatedPage.goBack();
        await merchantsPage.waitForReady();

        await merchantsPage.table.rows
          .first()
          .getByRole('cell')
          .nth(MerchantColumn.MERCHANT)
          .click();
        await expect(isolatedPage.getByRole('button', { name: /generate token/i })).toBeVisible();
      });

      // Both cells resolve to the same destination.
      expect(isolatedPage.url()).toBe(urlFromIdCell);
    },
  );

  /**
   * TC-MCH-072 — Chọn merchant có đổi ngữ cảnh store đang làm việc
   * Steps:
   *  1. Chọn một merchant khác store hiện tại.
   *  2. Kiểm tra bộ chọn store / các route store-scoped.
   * Expected:
   *  Nếu màn hình cho phép chuyển ngữ cảnh, các route `/pos/<id>/...` phải trỏ sang
   *  id merchant mới.
   *
   * [CẦN XÁC MINH] resolved 2026-08-18: selecting a merchant does NOT rewrite the
   * store-scoped sidebar links — the working context is unchanged. The switch is
   * available, but only as an explicit action: the detail view's "Open in portal"
   * link targets `/pos/<whmcsId>/overview`, i.e. the user leaves the admin screen
   * on purpose rather than having the sidebar quietly repoint.
   *
   * It also surfaced a defect: on `/pos/merchants` the sidebar's store-scoped
   * links are served as `/pos/undefined/<screen>` both before and after a
   * selection — the admin route has no store id to interpolate, so
   * Overview/Orders/Staffs/… are dead links for as long as the user stays here.
   *
   * The test pins today's behaviour (no context switch, hrefs unchanged by the
   * selection) and records the `/pos/undefined/` links as a defect annotation.
   * It deliberately does not assert that `undefined` is correct: if the app is
   * fixed to interpolate a real id, the equality check still passes and the
   * annotation simply stops firing.
   */
  test(
    'TC-MCH-072 — selecting a merchant does not switch the store-scoped context',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ isolatedPage }) => {
      const merchantsPage = new MerchantsPage(isolatedPage);
      await merchantsPage.goto();
      await merchantsPage.waitForReady();

      const whmcsId = (await merchantsPage.columnValues(MerchantColumn.WHMCS_ID))[0];

      // Scoped to the nav column on purpose: the detail view adds a store-scoped
      // link of its own ("Open in portal"), and sweeping the whole document would
      // read that as the sidebar having changed.
      //
      // Sidebar hrefs carry the vertical segment now, so a nav link is four
      // segments — `/pos/<vertical>/<storeId>/<screen>` (e.g.
      // `/pos/nail/undefined/overview`, `/pos/nail/admin/merchant`) — not three.
      const sidebarStoreLinks = async (): Promise<string[]> =>
        isolatedPage
          .locator('[data-slot="sidebar"] a[href^="/pos/"]')
          .evaluateAll((links) =>
            links
              .map((link) => link.getAttribute('href'))
              .filter(
                (href): href is string => !!href && /^\/pos\/[^/]+\/[^/]+\/[a-z]+$/.test(href),
              ),
          );

      const before = await sidebarStoreLinks();
      expect(before.length).toBeGreaterThan(0);

      const detail = await merchantsPage.openMerchantRow(0);
      const after = await sidebarStoreLinks();

      expect(after, 'the sidebar store context must not silently change').toEqual(before);

      // The context switch exists, but only as an explicit opt-out of the admin
      // screen: "Open in portal" points at that merchant's own store route. The
      // href now carries the vertical segment too — `/pos/<vertical>/<whmcsId>/…`.
      await expect(detail.openInPortalLink).toHaveAttribute(
        'href',
        new RegExp(`^/pos/[^/]+/${whmcsId}/`),
      );

      const brokenLinks = after.filter((href) => href?.startsWith('/pos/nail/undefined/'));
      if (brokenLinks.length > 0) {
        test.info().annotations.push({
          type: 'defect',
          description: `${brokenLinks.length} store-scoped sidebar links render as /pos/undefined/* on the admin Merchants route (e.g. ${brokenLinks[0]}) — they cannot navigate anywhere.`,
        });
      }
    },
  );
});

test.describe('Hành động trên dòng & chi tiết merchant — màn hình danh sách chỉ đọc', () => {
  test.beforeEach(async ({ merchantsPage }) => {
    await merchantsPage.goto();
    await merchantsPage.waitForReady();
  });

  /**
   * TC-MCH-073 — Xác nhận không có hành động ghi dữ liệu trên màn hình danh sách
   * Steps:
   *  1. Quét toàn bộ vùng nội dung tìm các nút hành động.
   * Expected:
   *  Không có nút `Create` / `Add` / `Export` / `Delete` nào — màn hình này chỉ đọc.
   *
   * Confirmed by scan 2026-08-18: the only buttons on the page are the product
   * switcher (POS / Payment / Business / Gift Card), the user menu, the sidebar
   * trigger, the status filter and the two pager arrows.
   */
  test(
    'TC-MCH-073 — the list screen exposes no create/add/export/delete action',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page }) => {
      for (const forbidden of [/^create$/i, /^add\b/i, /^export$/i, /^delete$/i, /^import$/i]) {
        await expect(
          page.getByRole('button', { name: forbidden }),
          `unexpected action button ${forbidden}`,
        ).toHaveCount(0);
      }
      // No hidden write path via a link either.
      await expect(page.getByRole('link', { name: /^(create|add|export)\b/i })).toHaveCount(0);
    },
  );

  /**
   * TC-MCH-074 — Trạng thái hover của dòng
   * Steps:
   *  1. Hover chuột lên một dòng.
   * Expected:
   *  Có phản hồi thị giác nhất quán nếu dòng là tương tác được; nếu dòng không
   *  tương tác thì con trỏ không nên là `pointer`.
   *
   * Rows ARE interactive (TC-MCH-070), and they advertise it: `cursor: pointer`
   * on the `<tr>`. So the case's first branch applies — the affordance must be
   * present and must be the same on every row.
   */
  test(
    'TC-MCH-074 — rows advertise their interactivity with a pointer cursor',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage }) => {
      const firstRow = merchantsPage.table.rows.first();
      await firstRow.hover();

      const cursors = await merchantsPage.table.rows.evaluateAll((rows) =>
        rows.map((row) => getComputedStyle(row).cursor),
      );
      expect(cursors.length).toBeGreaterThan(0);
      for (const cursor of cursors) {
        expect(cursor, 'interactive rows must show a pointer cursor').toBe('pointer');
      }
    },
  );
});
