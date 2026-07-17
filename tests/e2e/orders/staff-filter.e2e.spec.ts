import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { faker } from '@data/dynamic/factories/faker';
import {
  buildMockOrderListItem,
  buildMockOrdersCollection,
} from '@data/dynamic/factories/mockOrder';

test.describe('Bộ lọc Staff — Orders', () => {
  test.beforeEach(async ({ ordersPage }) => {
    await ordersPage.goto();
  });

  test(
    'TC-ORD-011 — mở bộ lọc Staff hiển thị danh sách nhân viên',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage }) => {
      await ordersPage.openStaffFilter();

      await expect(ordersPage.staffFilterPanel).toBeVisible();
      await expect(ordersPage.allStaffOption).toBeVisible();
    },
  );

  /**
   * Steps:
   * 1. Quan sát toàn bộ danh sách item trong panel Staff, gồm 2 nhân viên trùng tên hiển thị
   *    nhưng khác id.
   * Expected:
   * Cả 2 nhân viên trùng tên vẫn được hiển thị như 2 dòng riêng biệt trong panel (không bị
   * dedupe/gộp theo tên hiển thị), xác nhận đây là hành vi hiển thị đúng theo dữ liệu, không
   * phải lỗi render trùng lặp DOM.
   */
  test(
    'TC-ORD-012 — 2 staff trùng tên hiển thị vẫn được liệt kê riêng biệt',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage, page }) => {
      const duplicateName = 'Mr. Kevin Vu';
      const staffId1 = faker.string.uuid();
      const staffId2 = faker.string.uuid();

      await page.route('**/volt-pos.**/staffs?*', async (route) => {
        await route.fulfill({
          json: {
            '@context': '/contexts/Staff',
            '@id': '/staffs',
            '@type': 'Collection',
            totalItems: 2,
            member: [
              {
                '@id': `/staffs/${staffId1}`,
                '@type': 'Staff',
                id: staffId1,
                nickname: duplicateName,
                status: 'active',
              },
              {
                '@id': `/staffs/${staffId2}`,
                '@type': 'Staff',
                id: staffId2,
                nickname: duplicateName,
                status: 'active',
              },
            ],
          },
        });
      });

      await ordersPage.goto();
      await ordersPage.openStaffFilter();

      await expect(
        ordersPage.staffFilterPanel.getByRole('option', { name: duplicateName, exact: true }),
      ).toHaveCount(2);
    },
  );

  /**
   * Steps:
   * 1. Bỏ chọn "All staff" (nếu cần) và chọn riêng "Mai".
   * 2. Áp dụng bộ lọc.
   * Expected:
   * Bảng chỉ hiển thị các order có cột STAFF chứa "Mai" (order có nhiều staff đồng phục vụ vẫn hiển thị
   * nếu "Mai" là một trong số đó).
   */
  test(
    'TC-ORD-013 — chọn một staff cụ thể lọc đúng order của staff đó',
    { tag: [Tag.REGRESSION] },
    async ({ ordersPage, page }) => {
      const maiId = faker.string.uuid();
      const orders = [
        buildMockOrderListItem({ orderCode: 'OD-MAI-0001', staffs: ['Mai'] }),
        buildMockOrderListItem({ orderCode: 'OD-MAI-0002', staffs: ['Erin', 'Mai'] }),
        buildMockOrderListItem({ orderCode: 'OD-OTHER-0003', staffs: ['Erin'] }),
      ];

      await page.route('**/volt-pos.**/staffs?*', async (route) => {
        await route.fulfill({
          json: {
            '@context': '/contexts/Staff',
            '@id': '/staffs',
            '@type': 'Collection',
            totalItems: 1,
            member: [
              {
                '@id': `/staffs/${maiId}`,
                '@type': 'Staff',
                id: maiId,
                nickname: 'Mai',
                status: 'active',
              },
            ],
          },
        });
      });
      await page.route('**/volt-pos.**/orders?*', async (route) => {
        const url = new URL(route.request().url());
        const staff = url.searchParams.get('staff');
        const filtered = staff === maiId ? orders.filter((o) => o.staffs.includes('Mai')) : orders;
        await route.fulfill({ json: buildMockOrdersCollection(filtered) });
      });

      await ordersPage.goto();
      await ordersPage.selectStaff('Mai');

      expect(await ordersPage.rowCount()).toBe(2);
      await expect(ordersPage.table.rowContaining('OD-MAI-0001')).toBeVisible();
      await expect(ordersPage.table.rowContaining('OD-MAI-0002')).toBeVisible();
      await expect(ordersPage.table.rowContaining('OD-OTHER-0003')).toHaveCount(0);
    },
  );
});
