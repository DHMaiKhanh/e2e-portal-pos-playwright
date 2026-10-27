# System — App Versions / Settings / Feature Flags (Internal) — Test cases

| Mục         | Giá trị                                                                                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Màn hình    | `/pos/nail/admin/versions`, `/pos/nail/admin/setting`, `/pos/nail/admin/features`                                                                                     |
| Môi trường  | DEV — https://v2.dev-fastboypay.com                                                                                                                                   |
| Page object | `src/pages/system/SystemPage.ts` (fixture `systemPage`)                                                                                                               |
| Specs       | `tests/e2e/system/*.e2e.spec.ts`                                                                                                                                      |
| Phạm vi     | **Read-only.** `blockWrites()` chặn publish/pause/deprecate version, Save setting, toggle feature flag (tác động toàn hệ thống). Chỉ assert sự hiện diện của control. |

## Mô tả màn hình (docs 19-system.md)

- **App Versions** (`/admin/versions`): tab **Windows** (46 version 1.1.x — Version/Status/Published at; Published/Deprecated) + tab **Android** (build 0.1.x-bxxx — Build code; Waiting for KPP/Published/Deprecated; action **Upload KPP**). Nút **Fetch versions**. Menu "⋯" mỗi dòng: Pause / Download / View change history / Deprecate.
- **System Settings** (`/admin/setting`): 16 setting global (Setting / key / Value / App / Last updated), Scope Global/Merchant; setting phức tạp mở trang detail `/admin/setting/<id>`. Bug đã biết: Terms of Service URL lưu kèm thẻ `<p>`; Portal URL = domain production.
- **Feature Flags** (`/admin/features`): 9 feature (Enabled/Disabled, Version v1/side_by_side, Scope Global/By merchant) với switch toggle; vd `merchant_report_v4` = side_by_side.

## Test cases

| ID              | Mô tả                                                                                                                                 | Spec                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| TC-SYS-001..006 | Versions: render, tab Windows/Android, Upload KPP (Android), Fetch versions, menu "⋯" (Pause/Download/History/Deprecate); không write | versions             |
| TC-SYS-010..013 | Settings: render bảng sys setting, Scope Global/Merchant, mở không gửi write                                                          | settings             |
| TC-SYS-020..022 | Feature Flags: render list, switch hiện diện (KHÔNG bấm toggle), không write                                                          | feature-flags-safety |
| TC-SYS-130      | Chưa đăng nhập → `/login`, không lộ dữ liệu                                                                                           | security             |
