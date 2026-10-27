# Devices (Internal › Devices) — Task & Bug từ Linear

> Màn hình này chưa có tài liệu test case. File hiện chỉ liệt kê các ticket Linear liên quan, làm căn cứ để quét màn hình (`screen-test-generator`) và viết test case sau.

## Linear — Task & Bug liên quan

> Nguồn: Linear team VP, label `Portal` — lấy ngày 2026-10-20. Bỏ Canceled, TechDebt/CI và Restaurant Portal.
> Thứ tự: Bug → đang QC/Review → đã Prod/Done → Todo/Backlog. **6 issue.**

| ID                                                  | Loại    | Tiêu đề                                                                                    | Trạng thái | Ưu tiên     | Test hiện có                         | E2E được?                | Ghi chú                                             |
| --------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------ | ---------- | ----------- | ------------------------------------ | ------------------------ | --------------------------------------------------- |
| [VP-3942](https://linear.app/fastboy/issue/VP-3942) | Enh     | [PORTAL] Device version filter lists versions per platform                                 | Done       | Medium      | Chưa                                 | Có                       | Filter version theo platform                        |
| [VP-3959](https://linear.app/fastboy/issue/VP-3959) | Enh     | Portal: device list follows the 10-minute online window and gets a cleaner table           | Done       | No priority | Chưa                                 | Có                       | Ngưỡng online 10 phút + bảng gọn hơn                |
| [VP-3831](https://linear.app/fastboy/issue/VP-3831) | Feature | [PORTAL] Show the platform on Device Management with a filter                              | Todo       | High        | Chưa                                 | Chưa (chưa có tính năng) | Cột Device type + filter                            |
| [VP-3954](https://linear.app/fastboy/issue/VP-3954) | Feature | [PORTAL] Fleet summary by device type and version on the merchant Devices tab and Overview | Todo       | High        | Một phần — `overview/device-summary` | Chưa (chưa có tính năng) | Fleet summary trên tab Devices + Overview           |
| [VP-3955](https://linear.app/fastboy/issue/VP-3955) | Enh     | [PORTAL] Show terminal brand and serial on Device Management                               | Todo       | Medium      | Chưa                                 | Chưa (chưa có tính năng) | Brand + serial terminal                             |
| [VP-4793](https://linear.app/fastboy/issue/VP-4793) | Feature | [Cloud Semi] Device roles + pairing — full implementation (semi-auth, app, api, portal)    | Todo       | No priority | Chưa                                 | Chưa (chưa có tính năng) | Device roles + pairing (phần portal) (cha: VP-4698) |

## Test cases (đã có E2E)

| Mục         | Giá trị                                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| Màn hình    | `/pos/nail/admin/devices` (admin, NOT store-scoped)                                                                     |
| Page object | `src/pages/devices/DevicesPage.ts` (fixture `devicesPage`)                                                              |
| Specs       | `tests/e2e/devices/*.e2e.spec.ts`                                                                                       |
| Phạm vi     | **Read-only.** `blockWrites()` chặn approve/deactivate/activate device và send remote action. Chỉ mở menu "⋯" rồi đóng. |

Màn hình: 3 tab **Devices** (mặc định Status=Active / Connection=Online) / **Pending registrations** ("No pending registrations.") / **Device history** (618 assignment — filter State/Type, search, không có filter thời gian). Cột Devices: Merchant / Device / App·OS / Status / Terminal·printer / Last seen. Filter Status / Version (nhóm theo platform) / Connection. Menu "⋯": device Active → View change history / Send remote action / Deactivate…; Inactive → Activate.

| ID              | Mô tả                                                                                       | Spec                  |
| --------------- | ------------------------------------------------------------------------------------------- | --------------------- |
| TC-DEV-001..005 | Page load + 3 tab render, reload giữ state, no console/4xx-5xx                              | page-load-layout-tabs |
| TC-DEV-010..013 | Pending ("No pending registrations.") / History / filters tab Devices                       | tabs-content          |
| TC-DEV-020..021 | Menu "⋯" dòng device (History/Remote action/Deactivate\|Activate); không approve/deactivate | row-menu-safety       |
| TC-DEV-130      | Chưa đăng nhập → `/login`, không lộ dữ liệu device                                          | security              |
