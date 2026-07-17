import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { faker } from '@data/dynamic/factories/faker';
import { buildMockOrderDetail, buildMockVoidTransaction } from '@data/dynamic/factories/mockOrder';

/**
 * Mocks the single-order `GET /orders/<uuid>` endpoint and deep-links straight to
 * the detail sub-route, so the page's sections can be asserted deterministically
 * without depending on a specific seeded order in the live backend.
 */
async function mockOrderDetail(
  page: import('@playwright/test').Page,
  id: string,
  body: Record<string, unknown>,
): Promise<void> {
  await page.route(`**/volt-pos.**/orders/${id}`, async (route) => {
    await route.fulfill({ json: body });
  });
}

test.describe('Trang Order Detail — Orders', () => {
  /**
   * Steps:
   * 1. Quan sát toàn bộ trang.
   * Expected:
   * (Xác nhận bằng khám phá trực tiếp) Hiển thị đủ: header "Order #<OD ID>" kèm badge trạng thái
   * (vd. "Canceled"), nút "Receipt" và "Re-Open Order"; khối "Order Information" (Order ID, Order
   * Date, Customer, Order Note); khối "Service Details & Tip" (bảng Staff/Service/Price + Tip
   * Breakdown); khối "Payment Details" (danh sách giao dịch với phương thức, trạng thái voided,
   * received/change, thời gian, số tiền); khối "Activity Log"; khối "Order Summary" (Subtotal,
   * Total Discount, Tax, Tip, Total); và khối "Cancel Information" liệt kê từng credit note
   * (mã CN, Voided Amount, Date & Time, By Staff, Reason).
   */
  test(
    'TC-ORD-030 — trang chi tiết hiển thị đủ các khối thông tin',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage, page }) => {
      const id = faker.string.uuid();
      const orderCode = 'OD-CANCEL-0030';
      const detail = buildMockOrderDetail({
        id,
        orderCode,
        status: 'canceled',
        settled: false,
        tipAmount: 8000,
        orderTransactions: [
          buildMockVoidTransaction({ amount: 4227, reason: 'incorrect_order', staffName: 'Andy' }),
          buildMockVoidTransaction({ amount: 4228, reason: 'incorrect_order', staffName: 'Andy' }),
        ],
      });
      await mockOrderDetail(page, id, detail);

      await ordersPage.gotoOrderDetail(id);

      await expect(ordersPage.orderDetailHeading).toHaveText(new RegExp(`Order #${orderCode}`));
      await expect(page.getByText('Canceled', { exact: true }).first()).toBeVisible();
      await expect(ordersPage.receiptButton).toBeVisible();
      await expect(ordersPage.reOpenOrderButton).toBeVisible();

      await expect(ordersPage.orderInformationSection).toBeVisible();
      await expect(ordersPage.serviceDetailsSection).toBeVisible();
      await expect(ordersPage.paymentDetailsSection).toBeVisible();
      await expect(ordersPage.activityLogSection).toBeVisible();
      await expect(ordersPage.orderSummarySection).toBeVisible();
      await expect(ordersPage.cancelInformationSection).toBeVisible();

      await expect(ordersPage.creditNoteRow(`${orderCode}-1`)).toBeVisible();
      await expect(ordersPage.creditNoteRow(`${orderCode}-2`)).toBeVisible();
      await expect(page.getByText(/incorrect order/i).first()).toBeVisible();
    },
  );

  /**
   * Steps:
   * 1. Quan sát trạng thái nút "Re-Open Order".
   * Expected:
   * Nút ở trạng thái disabled (quan sát trực tiếp: [disabled] trong accessibility tree).
   * (Cần xác minh thêm điều kiện chính xác khi nào nút này được enable.)
   */
  test(
    'TC-ORD-031 — nút "Re-Open Order" bị disabled cho order đã có credit note đầy đủ',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage, page }) => {
      const id = faker.string.uuid();
      const detail = buildMockOrderDetail({
        id,
        orderCode: 'OD-CANCEL-0031',
        status: 'canceled',
        settled: false,
        orderTransactions: [
          buildMockVoidTransaction({ amount: 4227 }),
          buildMockVoidTransaction({ amount: 4228 }),
        ],
      });
      await mockOrderDetail(page, id, detail);

      await ordersPage.gotoOrderDetail(id);

      await expect(ordersPage.reOpenOrderButton).toBeDisabled();
    },
  );

  /**
   * Steps:
   * 1. Kiểm tra khối "Order Information".
   * Expected:
   * Trường Customer hiển thị "No customer is available"; trường Order Note hiển thị
   * "No note is available." — không hiển thị rỗng, "null" hay "undefined" (xác nhận trực tiếp).
   */
  test(
    'TC-ORD-032 — order không có khách hàng/ghi chú hiển thị placeholder rõ ràng',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage, page }) => {
      const id = faker.string.uuid();
      const detail = buildMockOrderDetail({ id, orderCode: 'OD-NOCUST-0032', customerName: '' });
      await mockOrderDetail(page, id, detail);

      await ordersPage.gotoOrderDetail(id);

      await expect(ordersPage.customerPlaceholder).toBeVisible();
      await expect(ordersPage.orderNotePlaceholder).toBeVisible();
      await expect(ordersPage.orderInformationSection).not.toContainText(/null|undefined/i);
    },
  );

  /**
   * Steps:
   * 1. Click nút "Receipt".
   * Expected:
   * Mở modal/tab hiển thị hoá đơn (receipt) khớp với thông tin order (OD ID, dịch vụ, số tiền).
   * (Cần xác minh trực tiếp hành vi cụ thể — chưa click thử trong lần khám phá này.)
   */
  test(
    'TC-ORD-033 — nút "Receipt" mở/hiển thị hoá đơn của order',
    { tag: [Tag.REGRESSION] },
    async ({ ordersPage, page }) => {
      const id = faker.string.uuid();
      const orderCode = 'OD-RECEIPT-0033';
      const detail = buildMockOrderDetail({ id, orderCode });
      await mockOrderDetail(page, id, detail);

      await ordersPage.gotoOrderDetail(id);
      await ordersPage.openReceipt();

      await expect(ordersPage.receiptDialog).toContainText(orderCode);
    },
  );

  /**
   * Steps:
   * 1. Quan sát trang chi tiết.
   * Expected:
   * Không xuất hiện khối "Cancel Information" hay bất kỳ mã CN nào; các khối còn lại
   * (Order Information, Service Details & Tip, Payment Details, Activity Log, Order Summary)
   * vẫn hiển thị đầy đủ.
   */
  test(
    'TC-ORD-034 — order thành công (không huỷ/hoàn) không hiển thị khối "Cancel Information"',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage, page }) => {
      const id = faker.string.uuid();
      const detail = buildMockOrderDetail({
        id,
        orderCode: 'OD-OK-0034',
        status: 'successful',
        settled: true,
      });
      await mockOrderDetail(page, id, detail);

      await ordersPage.gotoOrderDetail(id);

      await expect(ordersPage.cancelInformationSection).toHaveCount(0);
      await expect(ordersPage.orderInformationSection).toBeVisible();
      await expect(ordersPage.serviceDetailsSection).toBeVisible();
      await expect(ordersPage.paymentDetailsSection).toBeVisible();
      await expect(ordersPage.activityLogSection).toBeVisible();
      await expect(ordersPage.orderSummarySection).toBeVisible();
    },
  );
});
