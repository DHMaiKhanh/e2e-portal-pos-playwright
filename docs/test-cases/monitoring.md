# Monitoring — Remote Actions + Change Logs (Internal) — Test cases

| Mục          | Giá trị                                                                                                                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Màn hình     | `/pos/nail/admin/remote-actions`, `/pos/nail/admin/histories`                                                                                                                                             |
| Môi trường   | DEV — https://v2.dev-fastboypay.com                                                                                                                                                                       |
| Page objects | `src/pages/monitor/RemoteActionsPage.ts` (fixture `remoteActionsPage`), `src/pages/monitor/ChangeLogsPage.ts` (fixture `changeLogsPage`)                                                                  |
| Specs        | `tests/e2e/monitoring/*.e2e.spec.ts`                                                                                                                                                                      |
| Phạm vi      | **Read-only.** Remote Actions: `blockWrites()` chặn gửi action tới thiết bị live; chỉ assert nút Send **disabled** khi chưa chọn Action, không bao giờ submit. Change Logs là audit log — không có write. |

## Mô tả màn hình (docs 20-monitoring.md)

- **Remote Actions** (`/admin/remote-actions`): list ~58 action (Merchant / Action / Result / Sent at). Filter Merchant / Action / Result + Refresh. Result = Reported / No device picked it up / Failed on device. Click dòng → detail sheet (Author+Email, Merchant, Device, Sent, Last report, Result, Payload). Form **Send action** tại `/admin/remote-actions/send-action` (Merchant / Action / Device / Delivery); nút Send **disabled** cho tới khi chọn Action (BUG-20-01 đã fix).
- **Change Logs** (`/admin/histories`): 323,668 entry nhóm theo "Today"; filter Merchant / Entity type / Operation / Channel / time; phân trang 1/10,789; entry gộp nhóm nên số entry ≠ số dòng; detail có bảng Field / Before / After.

## Test cases

| ID              | Mô tả                                                                                                  | Spec               |
| --------------- | ------------------------------------------------------------------------------------------------------ | ------------------ |
| TC-RMA-001..005 | Remote Actions: render list, filter Merchant/Action/Result + Refresh, detail sheet; no console/4xx-5xx | remote-actions     |
| TC-RMA-020..022 | Send action form: nút Send disabled khi chưa chọn Action; không gửi action nào                         | send-action-safety |
| TC-CHL-001..004 | Change Logs: render list, filter Merchant/Entity type/Operation, `totalEntries()` lớn, pagination      | change-logs        |
| TC-MON-130..131 | Chưa đăng nhập → `/login` (cả Remote Actions lẫn Change Logs)                                          | security           |
