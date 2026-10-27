# All Orders (Internal, cross-merchant) — Test cases

| Mục         | Giá trị                                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Màn hình    | `/pos/nail/admin/orders` (admin, NOT store-scoped)                                                                                                      |
| Môi trường  | DEV — https://v2.dev-fastboypay.com                                                                                                                     |
| Page object | `src/pages/orders/AllOrdersPage.ts` (fixture `allOrdersPage`)                                                                                           |
| Specs       | `tests/e2e/all-orders/*.e2e.spec.ts`                                                                                                                    |
| Phạm vi     | **Read-only.** `blockWrites()` chặn mọi refund/cancel/void/adjust tip. Order detail (mở từ dòng) dùng chung màn merchant — không bao giờ thao tác tiền. |

## Mô tả màn hình (docs 17-all-orders.md)

Danh sách order xuyên merchant. Cột: **Order ID / Merchant (#id · tên) / Status / Amount / Date-time (UTC+7)**, nút Refresh. Filter **Merchant** (combobox có search theo tên — lưu ý search theo "#14" ra "No merchant found" vì lọc theo tên không theo id), **Staff**, **Payment method** (Card/Cash/Gift card/Other), **Status**. Search theo Order ID / phone / tên. Đếm "X of Y orders". Mặc định loại Pending. Click dòng → điều hướng sang Order detail store-scoped `/pos/nail/<merchantId>/orders/<id>` (cùng màn merchant). **Không có nút Export** (gap). Phone bị mask ở list.

## Test cases

| ID              | Mô tả                                                                                    | Spec                    |
| --------------- | ---------------------------------------------------------------------------------------- | ----------------------- |
| TC-AOR-001..005 | Page load / layout: render list, cột, Refresh, reload giữ state, no console/4xx-5xx      | page-load-layout        |
| TC-AOR-010..014 | Filter Status/Merchant + search thu hẹp (tolerant); `totalResults()` ≥ 0                 | filters-search          |
| TC-AOR-020..021 | Click dòng điều hướng Order detail store-scoped; recorder write rỗng (không action tiền) | order-detail-navigation |
| TC-AOR-130      | Chưa đăng nhập → `/login`, không lộ dữ liệu order                                        | security                |
