# Users & Roles (Internal RBAC) — Test cases

| Mục         | Giá trị                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Màn hình    | `/pos/nail/admin/users`, `/pos/nail/admin/roles`                                                                                    |
| Môi trường  | DEV — https://v2.dev-fastboypay.com                                                                                                 |
| Page object | `src/pages/users-roles/UsersRolesPage.ts` (fixture `usersRolesPage`)                                                                |
| Specs       | `tests/e2e/users-roles/*.e2e.spec.ts`                                                                                               |
| Phạm vi     | **Read-only.** `blockWrites()` chặn tạo/sửa/gán role, khoá user. Chỉ mở menu/detail rồi đóng; không bao giờ xác nhận thao tác RBAC. |

## Mô tả màn hình (docs 21-users-roles.md)

Chia **Employees / Merchants**, mỗi bên có sub-tab **Users / Roles** kèm badge đếm. Employees: 30 user (User/Role/Status/Last updated), filter Status/Role/Access, Sort. Employee roles: 3 role (Business App, Import/Export, QC Viewer Only v2), form **Add employee role** (Name/Description/Active + ma trận quyền 0/67, submit trống bị chặn bởi native validation). Merchants roles: 37 role (Global Manager/Partner/Viewer). User detail: Role / Super user / Permission overrides.

Bug đã biết: **BUG-21-01** badge tab "Users" luôn hiện 1 dù list 30; **BUG-21-02** chủ tiệm hiện "No merchant".

## Test cases

| ID              | Mô tả                                                                                                       | Spec               |
| --------------- | ----------------------------------------------------------------------------------------------------------- | ------------------ |
| TC-USR-001..005 | Page load / tabs: render Users, tab Employees/Merchants + Users/Roles, reload giữ state, no console/4xx-5xx | page-load-tabs     |
| TC-USR-010..013 | Roles list: render bảng role, "Add employee role" hiện diện (không tạo), duyệt không write                  | roles-list         |
| TC-USR-020..021 | User detail mở (Role/Super user/Permission overrides); không gán role/khoá user                             | user-detail-safety |
| TC-USR-130      | Chưa đăng nhập → `/login`, không lộ email user                                                              | security           |
