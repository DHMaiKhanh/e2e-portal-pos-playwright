import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import {
  buildMockOrderListItem,
  buildMockOrdersCollection,
} from '@data/dynamic/factories/mockOrder';

test.describe('Bảng dữ liệu Order History — Orders', () => {
  test.beforeEach(async ({ ordersPage }) => {
    await ordersPage.goto();
  });

  test(
    'TC-ORD-020 — định dạng OD ID đúng chuẩn',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage }) => {
      const rowCount = await ordersPage.rowCount();
      test.skip(rowCount === 0, 'No order rows available to verify OD ID format.');

      const odIdPattern = /^#OD\d{6}-\d+$/;
      const rows = ordersPage.table.rows;
      const count = await rows.count();
      let checked = 0;
      for (let i = 0; i < count; i++) {
        const rowText = (await rows.nth(i).textContent()) ?? '';
        const match = rowText.match(/#OD\d{6}-\d+/);
        if (match) {
          expect(match[0]).toMatch(odIdPattern);
          checked++;
        }
      }
      expect(checked).toBeGreaterThan(0);
    },
  );

  test(
    'TC-ORD-021 — định dạng AMOUNT là tiền tệ USD hợp lệ',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage }) => {
      const rowCount = await ordersPage.rowCount();
      test.skip(rowCount === 0, 'No order rows available to verify AMOUNT format.');

      const rows = ordersPage.table.rows;
      const count = await rows.count();
      let checked = 0;
      for (let i = 0; i < count; i++) {
        const rowText = (await rows.nth(i).textContent()) ?? '';
        expect(rowText).not.toMatch(/NaN|undefined/i);
        const match = rowText.match(/\$[\d,]+\.\d{2}/);
        if (match) {
          expect(match[0]).toMatch(/^\$[\d,]+\.\d{2}$/);
          checked++;
        }
      }
      expect(checked).toBeGreaterThan(0);
    },
  );

  /**
   * Steps:
   * 1. Xác định dòng tương ứng và kiểm tra cột CUSTOMER.
   * Expected:
   * Ô hiển thị ký tự "—" (không phải chuỗi rỗng, "null", hay "undefined").
   */
  test(
    'TC-ORD-022 — cột CUSTOMER hiển thị "—" khi order không gắn khách hàng',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage, page }) => {
      const order = buildMockOrderListItem({ orderCode: 'OD-NOCUST-0001', customerName: '' });
      await page.route('**/volt-pos.**/orders?*', async (route) => {
        await route.fulfill({ json: buildMockOrdersCollection([order]) });
      });

      await ordersPage.goto();

      const customer = await ordersPage.table.cellText(order.orderCode, 3);
      expect(customer).toBe('—');
      expect(customer).not.toMatch(/null|undefined/i);
    },
  );

  /**
   * Steps:
   * 1. Kiểm tra cột STAFF của order đó.
   * Expected:
   * Tên các staff được nối bằng dấu phẩy + khoảng trắng, đúng thứ tự/đầy đủ so với dữ liệu gốc của order.
   */
  test(
    'TC-ORD-023 — cột STAFF hiển thị đúng danh sách nhân viên đồng phục vụ',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage, page }) => {
      const order = buildMockOrderListItem({
        orderCode: 'OD-MULTISTAFF-0001',
        staffs: ['Val', 'Tony', 'Bob'],
      });
      await page.route('**/volt-pos.**/orders?*', async (route) => {
        await route.fulfill({ json: buildMockOrdersCollection([order]) });
      });

      await ordersPage.goto();

      expect(await ordersPage.table.cellText(order.orderCode, 2)).toBe('Val, Tony, Bob');
    },
  );

  /**
   * Steps:
   * 1. Kiểm tra ô PAYMENT METHOD của order đó.
   * Expected:
   * Hiển thị icon thương hiệu thẻ (vd. "Mastercard") kèm text "•••• <4 số cuối>"; order thanh toán Cash/Other chỉ hiển thị text tương ứng, không có icon thẻ.
   */
  test(
    'TC-ORD-024 — cột PAYMENT METHOD hiển thị đúng icon thẻ + 4 số cuối cho thanh toán thẻ',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage, page }) => {
      const cardOrder = buildMockOrderListItem({
        orderCode: 'OD-CARD-0001',
        paymentTypes: ['card'],
        cardInfos: [
          { '@type': 'CardInfo', cardType: 'MasterCard', cardLastFour: '4242', cardHolderName: '' },
        ],
      });
      const cashOrder = buildMockOrderListItem({
        orderCode: 'OD-CASH-0002',
        paymentTypes: ['cash'],
        cardInfos: [],
      });
      await page.route('**/volt-pos.**/orders?*', async (route) => {
        await route.fulfill({ json: buildMockOrdersCollection([cardOrder, cashOrder]) });
      });

      await ordersPage.goto();

      const cardCell = ordersPage.table.rowContaining(cardOrder.orderCode).getByRole('cell').nth(1);
      await expect(cardCell).toContainText(/•••• 4242/);
      await expect(cardCell.getByRole('img')).toBeVisible();

      const cashCell = ordersPage.table.rowContaining(cashOrder.orderCode).getByRole('cell').nth(1);
      await expect(cashCell).toContainText(/cash/i);
      await expect(cashCell.getByRole('img')).toHaveCount(0);
    },
  );
});
