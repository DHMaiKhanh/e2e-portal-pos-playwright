# Packages (Internal › POS Package catalogue) — Test cases

| Mục         | Giá trị                                                                                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Màn hình    | `/pos/nail/admin/packages` (admin, NOT store-scoped)                                                                                                            |
| Môi trường  | DEV — https://v2.dev-fastboypay.com                                                                                                                             |
| Page object | `src/pages/packages/PackagesPage.ts` (fixture `packagesPage`)                                                                                                   |
| Specs       | `tests/e2e/packages/*.e2e.spec.ts`                                                                                                                              |
| Phạm vi     | **Read-only.** Mọi spec gọi `blockWrites()` trước khi điều hướng — Clone/Add/Save package (tác động xuyên merchant) bị chặn & ghi nhận, không bao giờ xác nhận. |

## Mô tả màn hình (docs 16-packages.md)

Danh sách ~19 package POS (3 gói cố định GO POS BASIC/DELUXE/PREMIUM + gói test/clone). Cột: **Package / Description / Enabled features (x/62) / Last updated**, phân trang. Toolbar có **Add package**; mỗi dòng có menu Actions (Edit, Clone package). Edit package mở tab Configuration / Audit log với ma trận feature + thanh "Save changes".

Bug đã biết (chưa chạy write để xác nhận): **BUG-16-01** Clone không ràng buộc tên duy nhất (3 gói "Copy of GO POS BASIC"); **BUG-16-02** gói nháp test hiện cho merchant chọn ở Store Settings.

## Test cases

| ID         | Mô tả                                                                     | Spec                |
| ---------- | ------------------------------------------------------------------------- | ------------------- |
| TC-PKG-001 | Direct nav render danh sách, không redirect `/login`, URL đúng            | page-load-layout    |
| TC-PKG-002 | Cột Package / Description / Enabled features / Last updated hiển thị      | page-load-layout    |
| TC-PKG-003 | Nút "Add package" hiển thị & enabled (không bấm xuyên tạo mới)            | page-load-layout    |
| TC-PKG-004 | Reload giữ URL + session + số dòng                                        | page-load-layout    |
| TC-PKG-005 | Không console error / không 4xx-5xx bất thường (loại 401 refresh session) | page-load-layout    |
| TC-PKG-010 | Cột "Enabled features" đúng định dạng "N / 62" mọi dòng                   | table-search-safety |
| TC-PKG-011 | Search thu hẹp danh sách theo tên package (hoặc empty state)              | table-search-safety |
| TC-PKG-012 | Menu Actions mở ra Edit + Clone, không phát sinh write                    | table-search-safety |
| TC-PKG-013 | Duyệt + search không gửi request mutating nào                             | table-search-safety |
| TC-PKG-130 | Chưa đăng nhập → `/login`, không lộ dữ liệu package                       | security            |
