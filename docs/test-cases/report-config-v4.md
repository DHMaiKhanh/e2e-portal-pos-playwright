# Test case: Report Configuration V4 (Reports / Pages / Blocks / Fields)

- **Route**: `/pos/<seg>/admin/report-config-v4/{reports|pages|blocks|fields}` (DEV: `/pos/nail/admin/report-config-v4/...`) — route **admin**, không gắn store id
- **Nhóm sidebar**: `Internal` → accordion `Report Configuration V4` → `Reports`, `Pages`, `Blocks`, `Fields`
- **Ngày quét**: 2026-10-20 · **Môi trường**: `ENV=stage` (`https://v2.dev-fastboypay.com`), user `Khanh Do (DEV)`, merchant tham chiếu `Test 100004`
- **Cách quét**: Playwright MCP, chỉ đọc — mở dialog rồi Cancel/Escape, **không** Save/Publish/Copy/Delete/Deactivate
- **Liên quan**: màn hiển thị là [reports-v4.md](reports-v4.md) (`/pos/<seg>/<id>/v4/reports/<slug>`). Bản cũ (V3) xem [report-config.md](report-config.md)

> **⚠️ Cấu hình dùng chung cho MỌI merchant.** Scope mặc định `System (all merchants)`: sửa/xoá ở đây làm thay đổi báo cáo của tất cả merchant trên DEV. Test tự động phải chặn request ghi (`page.route` abort/mock 4xx cho non-GET) trừ các case persistence có dữ liệu riêng do test tạo ra (key prefix `e2e-`) và dọn sau khi chạy.

## 0. Test case theo bug Linear (VP-4756) — viết lại 2026-10-20

Nguồn: [VP-4756](https://linear.app/fastboy/issue/VP-4756) (QC Testing) và 17 bug con VP-4830 → VP-4847, cộng VP-4852 (Payroll). Mỗi test kiểm tra **kết quả mong đợi** ghi trong bug, nên **bug chưa sửa → test ĐỎ**, bug đã sửa → test XANH. Không còn `test.fail` che bug.

- Code: `tests/e2e/report-config-v4/` — `fields`, `blocks`, `reports-dialogs`, `pages-write`; Page Object `src/pages/report-config-v4/RcV4Page.ts` (fixture `rcV4Page`).
- **An toàn dữ liệu**: `rcV4Page.guardWrites()` chặn mọi request ghi tới `/v4/**` (chỉ cho chạy query/preview), ghi lại body để kiểm tra payload — Fields/Blocks/Reports/dialog **không tạo/sửa gì** trên DEV. Riêng `pages-write` ghi thật nhưng chỉ page `e2e-rv4-…` scope _This merchant_ (100004) và bản copy merchant 100004 của "QA Claude Test Page"; xoá/revert trong `finally`.

| Bug                                                 | Nội dung                                                         | Test (file)                                             | Kết quả mong đợi được kiểm                                                                                     | Trạng thái 2026-10-20                                                                                                                     |
| --------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [VP-4830](https://linear.app/fastboy/issue/VP-4830) | Save as report lỗi 400 `"required" is unknown`                   | `fields` ×2 (System, By merchant)                       | Body POST `/v4/report_queries` không có key `required`, `scope` đúng                                           | ✅ đã sửa                                                                                                                                 |
| [VP-4831](https://linear.app/fastboy/issue/VP-4831) | Block System: Try query thiếu x-merch-id, báo "returned nothing" | `blocks`                                                | Không có "returned nothing"; có "Pick a merchant…"; chọn merchant → request có `x-merch-id`; Add column có cột | ✅ đã sửa                                                                                                                                 |
| [VP-4832](https://linear.app/fastboy/issue/VP-4832) | Add column liệt kê metadata response                             | `blocks`                                                | Không có Member/Columns/Rows/Currency/Row Count…                                                               | ❌ còn `Currency`, `Rows`                                                                                                                 |
| [VP-4833](https://linear.app/fastboy/issue/VP-4833) | Save block 422 do gửi items metadata                             | `blocks` (PATCH bị chặn, đọc payload)                   | `items[].slug` không chứa key metadata                                                                         | ❌ còn gửi `currencyCode`, `reportRowCount`                                                                                               |
| [VP-4834](https://linear.app/fastboy/issue/VP-4834) | Copy for merchant page Draft → tự Published                      | `pages-write` (ghi thật, revert)                        | Bản copy là Draft, không có trong menu, layout 404                                                             | ❌ bản copy ra **Published v2**, có ngay trong menu 100004                                                                                |
| [VP-4835](https://linear.app/fastboy/issue/VP-4835) | Run preview report lỗi E_PARAM                                   | `reports-dialogs` ×2                                    | System: không còn E_PARAM / tiêu đề sai; bản copy merchant: gửi `x-merch-id` = merchant của dòng               | ✅ đã sửa                                                                                                                                 |
| [VP-4836](https://linear.app/fastboy/issue/VP-4836) | Tick Required làm mất ô param                                    | `reports-dialogs`                                       | Ô `Id` vẫn còn (có dấu *)                                                                                      | ✅ đã sửa                                                                                                                                 |
| [VP-4837](https://linear.app/fastboy/issue/VP-4837) | New block: Report không lọc theo Kind, lỗi chung chung           | `blocks` (POST giả lập 422)                             | Table không liệt kê Payroll Totals / Store Range Summary; hiện lý do từ API                                    | ✅ đã sửa                                                                                                                                 |
| [VP-4838](https://linear.app/fastboy/issue/VP-4838) | ~25 cặp field trùng nhãn (Store income)                          | `fields`                                                | Nhãn Values là duy nhất                                                                                        | ❌ 29 nhãn trùng                                                                                                                          |
| [VP-4839](https://linear.app/fastboy/issue/VP-4839) | Open in legacy trên page chỉ có ở V4                             | `pages-write` + `reports-v4/page-load-navigation` (A06) | Page chỉ-V4: ẩn nút hoặc không lỗi; page có legacy: nút vẫn trỏ `/report-pages/<slug>`                         | ⚠ page chỉ-V4 OK, nhưng **nút bị gỡ khỏi mọi trang** (A06 ×4 đỏ — regression, đã báo [VP-4877](https://linear.app/fastboy/issue/VP-4877)) |
| [VP-4840](https://linear.app/fastboy/issue/VP-4840) | Fields System: Run preview không khoá, tiêu đề lỗi sai           | `fields`                                                | Disable khi 0 field; không có tiêu đề "filter or date range…"                                                  | ✅ đã sửa                                                                                                                                 |
| [VP-4841](https://linear.app/fastboy/issue/VP-4841) | Đổi merchant làm mất lựa chọn                                    | `fields`                                                | Giữ data source + field đã chọn                                                                                | ✅ đã sửa                                                                                                                                 |
| [VP-4842](https://linear.app/fastboy/issue/VP-4842) | Validate New block; lưu block 0 cột                              | `blocks` ×2                                             | Lỗi "Report required"; lỗi Name/Key biến mất khi nhập đúng; không lưu được khi ẩn hết cột                      | ❌ không có lỗi bắt buộc cho Report (phần 0 cột: UI giữ lại 1 cột ✅)                                                                     |
| [VP-4843](https://linear.app/fastboy/issue/VP-4843) | Đổi Format cột không cập nhật Preview                            | `blocks`                                                | Currency → `$x.xx`; Number (2 decimals) → `x.xx`; Number → `x`                                                 | ❌ Number (2 decimals) vẫn hiện `222`                                                                                                     |
| [VP-4844](https://linear.app/fastboy/issue/VP-4844) | Phải bấm Copy 2 lần                                              | `reports-dialogs` (POST giả lập)                        | 1 click → 1 request                                                                                            | ✅ đã sửa                                                                                                                                 |
| [VP-4845](https://linear.app/fastboy/issue/VP-4845) | Publish không có xác nhận                                        | `pages-write`                                           | Có dialog xác nhận, chưa gửi `/publish` trước khi xác nhận                                                     | ✅ đã sửa                                                                                                                                 |
| [VP-4846](https://linear.app/fastboy/issue/VP-4846) | Bộ lọc ngày page tự tạo cho chọn ngày tương lai                  | `pages-write`                                           | Ngày mai bị disable như Daily Sale                                                                             | ❌ page builder vẫn cho chọn 21/10                                                                                                        |
| [VP-4847](https://linear.app/fastboy/issue/VP-4847) | Blocks không phân trang                                          | `blocks`                                                | Trang 1: 30 dòng; trang 2: `31–57`, 27 dòng, dòng đầu khác                                                     | ✅ đã sửa                                                                                                                                 |
| [VP-4852](https://linear.app/fastboy/issue/VP-4852) | Payroll V4 thiếu "Working Days"                                  | `reports-v4/staff-payroll`                              | Mọi breakdown có "Working Days"                                                                                | ❌ thiếu ở thợ hưởng commission                                                                                                           |

### Bug MỚI phát hiện khi quét lại (2026-10-20) — đã tạo trên Linear

| ID                                                          | Mô tả                                                                     | Tái hiện                                                                                                                                                                                                                                                                            | Test                                                  |
| ----------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| [VP-4876](https://linear.app/fastboy/issue/VP-4876) (NEW-1) | **Đóng dialog bằng Esc làm khoá cả trang**                                | Pages/Blocks/Reports → ⋯ của 1 dòng → _Copy for merchant…_ hoặc _Delete…_ → nhấn **Esc**: dialog đóng nhưng `body` giữ `pointer-events: none`, không click được gì đến khi reload (6/6 tổ hợp). Bấm Cancel thì bình thường. Cũng gặp khi đóng dialog **Page filters** trong builder | `reports-dialogs` — 12 test (6 Esc đỏ, 6 Cancel xanh) |
| [VP-4877](https://linear.app/fastboy/issue/VP-4877) (NEW-2) | **"Open in legacy" bị gỡ khỏi mọi trang V4** (regression của fix VP-4839) | `/v4/reports/daily-sale-report` (merchant 100004 và 14): không còn link, dù trang có bản legacy                                                                                                                                                                                     | `reports-v4` RV4-A06 ×4                               |
| NEW-3                                                       | Add column liệt kê **`Gift Card Sale` 2 lần** (cùng họ VP-4838)           | Block Store Daily Totals → chọn merchant → Add column                                                                                                                                                                                                                               | (gộp theo dõi trong VP-4838)                          |

### Ghi chú môi trường

- Store 100004 hiện có **bản copy merchant của Daily Sale Report** (tạo 05:26 UTC, publish v5 07:26 UTC — không do suite tạo) đổi cột thành `Tip-QA`, `Customer Name`, bỏ `Tax`. Các test Reports V4 dựa vào layout mặc định (B12, F02, F06) sẽ báo đỏ với thông điệp `ENV: … merchant override` cho tới khi bản copy đó được revert.

## 1. Tính năng này dùng để làm gì

Report V4 là một **report builder 3 tầng** cho phép team nội bộ tự định nghĩa báo cáo mà không cần code:

| Tầng                    | Màn hình               | Vai trò                                                                                                                                                 | Ví dụ thực tế                                                                                                                       |
| ----------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1. **Report** (dataset) | `Reports`, `Fields`    | Câu truy vấn: chọn _Data source_ → _Group by_ + _Values_ → khoảng ngày, filter, sort, row limit, totals                                                 | `Store Daily Income` (đọc `Store income`), `Payroll Totals`, `Staff Order Detail` — 19 report                                       |
| 2. **Block**            | `Blocks`               | Cách hiển thị 1 report: `Table` / `Summary` (tiles) / `Chart` / `Detail`; cột, tiles per row, row click, children (drill-down), export, totals row      | `Store Daily Totals` (Summary, 4 children theo tile), `Store Daily Sale Report` (Table) — 56 block, có cặp bản thường + bản `(POS)` |
| 3. **Page**             | `Pages` → Page builder | Ghép các block thành trang báo cáo trong menu `Reports V4`; layout riêng cho `Web` / `POS window` / `Mobile`; filter bar, page actions, quyền, passcode | `Daily Sale Report`, `Income Summary`, `Today's Summary`, `Staff Income`, `Staff Income Detail`, `Staff Payroll` — 6 page           |

Thêm 2 cơ chế xuyên suốt:

- **Scope**: `System (all merchants)` = bản mặc định; `By merchant` + chọn merchant = xem "merchant đó thấy gì" và các **bản copy riêng** của merchant (`Copy for merchant…` tạo bản override chỉ cho 1 merchant).
- **Draft / Publish có version** (Page): `Save draft` lưu nháp, `Publish` đẩy ra người dùng (`Published v2`), `View change history` mở Change Logs, `Preview as merchant…` xem trước bản nháp/bản đã publish.

## 2. Kiểm kê tính năng (Feature inventory — quét thực tế)

### 2.1 Khung chung 4 tab

- Breadcrumb `Internal › Report Configuration V4 › <Tab>`, badge `V4`, mô tả 1 dòng, bộ đếm (`19 reports`, `6 pages`, `56 blocks`; khi search: `2 of 56 blocks`).
- Tab link: `Reports | Pages | Blocks | Fields`.
- Search `Search name or key...` (tìm theo tên **và** key) → URL `?search=<q>&page=1`.
- `Scope` dropdown: `System (all merchants)` / `By merchant` → URL `?scope=resolved`; thêm nút `Filter by merchant` (combobox có ô gõ, list `<Tên> #<id>`) → `&merchant=<id>`; khi đã chọn có thêm filter `Show: What this merchant sees`. Chưa chọn merchant → empty state "Pick a merchant to see what it sees and the copies it keeps."
- Filter riêng: Pages có `Layout` (Web / POS window / Mobile); Blocks có `Kind` (Table / Summary / Chart / Detail).
- `Columns` menu (ẩn/hiện cột + `Reset to default`): Reports = Name, Key, Data source, Scope, Active, Updated; Pages = Name, Key, Layouts, Scope, Active, Published; Blocks = Name, Key, Kind, Source, Scope, Active, Updated. Một số cột ghi "Hidden at this width".
- Bảng: Name · Merchant (`All merchants`) · Status (`Active`) · nút `Actions for <name>` → menu `Copy for merchant…` / `Deactivate` / `Delete…`.
- Phân trang 30 dòng/trang: `1–30 of 56`, `1 / 2`, `Previous page` / `Next page`.
- Click dòng → trang chi tiết `/<tab>/<uuid>`.

### 2.2 Dialog dùng chung

- **Copy for merchant**: tiêu đề `Copy "<name>" for a merchant`, combobox `Merchant`, `Cancel` / `Copy`.
- **Delete**: `Delete "<name>" for all merchants?` — "Every merchant loses this page… This cannot be undone." — `Cancel` / `Delete for all merchants`.
- **New page / New block / New report (Save as report)**: Name, Key (chữ thường, số, gạch ngang; không đổi được sau khi tạo), `Who sees it *` (All merchants), `Requires permission` (None, Summary Income, Daily Income, Staff Income, Staff Payroll, Batch History, View Time Tracking), `Requires passcode` (None, Summary Income, Daily Income, Staff Income, Batch History, Staff Payroll, View Order History, Time Tracking), Description. Block thêm `Kind *` và `Report *` (19 report).

### 2.3 Reports (dataset) — chi tiết `/reports/<uuid>`

- Header: tên, `V4`, `All merchants`, "Reads <source>", key (`store-default`), nút `Save`.
- **Details**: Name, Description, Active ("Inactive reports are hidden from blocks for every merchant").
- **Query**: Data source; Group by (n selected, có ô `Find a field`, nhóm theo entity); Values (n selected); `Show technical fields`; **Business date**: Page / Month / Custom / All / Advanced (From/To = Parameter, No default); Fixed / From a parameter; Breakdown (`No breakdown`…); Filters (`Add group`, `Add filter`, operator `is`, Value/Parameter, Required); Value conditions (`Add condition`); Sort (`Add sort`, Asc/Desc); `Advanced — column keys`; Row limit (trống = mọi dòng; preview 100 dòng đầu); Totals row.
- `View JSON`; **Preview**: From–To (`This month`), Break down by, tham số (Id, Period Id), `Run preview`.

### 2.4 Fields (tạo report mới từ field)

- Giống phần Query ở trên nhưng bắt đầu trống, `Save as report` **disabled** cho tới khi chọn ≥1 group-by hoặc value. Hint "Pick at least one field to group by or one value."
- Data sources (12): Payroll periods, Payroll by day (V4) — **`No access`**, Staff income, Staff list, Staff orders, Staff payroll, Staff payroll by day, Staff clock-in sessions, Store appointments, Store income, Store orders.
- Ở scope System, `Run preview` trả lỗi `E_PARAM: A report reads one merchant: send the merchant header (x-merch-id).` — phải chọn `By merchant` + merchant mới preview được (vd. Store income / Daily Sale, Oct 1–20 2026 → `$20,382.04`).

### 2.5 Blocks — chi tiết `/blocks/<uuid>`

- Header: tên, Kind badge, `V4`, key, `Save changes`.
- **Display**: Name (admin label), Display title (trống = không heading), Display description.
- **Data**: report đang dùng (`Store Range Summary (store-range-summary) · summary`), range `This month`, Group by, `Try query` (liệt kê mọi cột report trả về).
- **Preview**: render như người đọc thấy; Table: kéo header để đổi thứ tự / lồng nhóm; `Add column`; Summary: `Tiles per row`.
- **Row click**: "Open a page on row click", map tham số từ dòng.
- **Children** (drill-down): tối đa 5 cấp, 12/node, 200 tổng; mỗi child: Borrowed block / Own dataset / Text, `Opened by tile`, Params (`Add param`; không param = mọi dòng mở cùng dữ liệu); `Where children show` (Below the block / Only where a page places them), `Default tile`, `Shows: Switch by tile`.
- **Table options**: Rows per page (default 30), Readers can download (default CSV và Excel; Off = ẩn Export), When there are no rows (text riêng), Opens sorted by, Totals row (Show the line, Caption).

### 2.6 Pages — Page builder `/pages/<uuid>`

- Header: tên, `V4`, scope, `Published vN`, "Draft saved · 5 days ago", key; nút `Preview as merchant…`, `Page details`, `Save draft`, `Publish`, `View change history` (mở tab mới `/admin/histories?ehEntityId=<uuid>`), `More actions` (Copy for merchant… / Deactivate / Delete…).
- Tab layout `Web` (base layout) / `POS window` (`?variant=pos`, "POS window layout is live. Saving changes POS window only.") / `Mobile`; `Learn more`.
- **Structure** tree: Row → Stack → Rail / Block…, `Collapse`, `Page settings`.
- **Blocks palette**: `Search blocks`, mỗi block có `Drag … onto the canvas` và `Add … to the selected container`, nhãn `Placed` nếu đã có trên trang.
- **Canvas**: Filter bar (control `Report date · date_single`, nút style, gear `Page filters`); block có toolbar `Drag Block`, `Block settings`, `Block style`, `Delete Block`, link `Open <block> in a new tab`.
- **Block settings** (per-layout): breadcrumb Page/Row/Stack/Block, Show more/Show less, Border, Comparison ("vs" badge), Swap the block by a filter, Position in the stack (Move up / Move down / Delete block — chỉ gỡ khỏi layout, block giữ nguyên).
- **Style panel** (control/block): Width (Default, 3/12…12/12), Padding, Gap, Align, Justify, Background, Text colour, Height, Class names, Custom CSS (≤20 declarations, ≤64 ký tự/value).
- **Page settings / Page filters**: Menu icon (per platform), filter list (date, Control Report date, Today button On, Width & style), **Page actions** (Print, Recalculate payroll).
- **Page details** dialog: Name, Parent in the menu (None/top level hoặc page khác), Used as (A page of its own / A fragment of another screen), Hidden in menu, Active, Requires permission, Requires passcode, `Save changes`.
- **Preview as merchant**: chọn Merchant → `Open published` / `Open preview`.

## 3. Test case

Ký hiệu ưu tiên: **P1** cao · **P2** trung bình · **P3** thấp. Cột "Ghi" = có ghi dữ liệu thật (phải dùng dữ liệu test riêng hoặc mock).

### A. Tải trang, điều hướng & quyền

| ID       | Tiêu đề                  | Bước                                                                    | Kết quả mong đợi                                                                                      | Ưu tiên | Ghi |
| -------- | ------------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------- | --- |
| RCV4-A01 | Mở trực tiếp Reports     | Vào `/admin/report-config-v4/reports`                                   | Không về `/login`; heading `Reports` + badge `V4`; đếm `19 reports`; bảng có dòng                     | P1      |     |
| RCV4-A02 | Mở trực tiếp Pages       | `/pages`                                                                | Heading `Pages`, `6 pages`, title `Pages \| Portal`                                                   | P1      |     |
| RCV4-A03 | Mở trực tiếp Blocks      | `/blocks`                                                               | Heading `Blocks`, `56 blocks`, phân trang `1 / 2`                                                     | P1      |     |
| RCV4-A04 | Mở trực tiếp Fields      | `/fields`                                                               | Heading `Fields`; Data source mặc định `Payroll periods`; `Save as report` disabled; "No preview yet" | P1      |     |
| RCV4-A05 | Sidebar accordion        | Click `Report Configuration V4` ở nhóm Internal                         | Mở 4 link Reports/Pages/Blocks/Fields đúng href; link hiện hành được highlight                        | P2      |     |
| RCV4-A06 | Chuyển tab               | Click lần lượt tab `Reports→Pages→Blocks→Fields`                        | URL đổi đúng, giữ `scope`/`merchant` trên query (xác minh)                                            | P2      |     |
| RCV4-A07 | Breadcrumb               | Ở chi tiết page, click `Pages` trên breadcrumb                          | Về danh sách Pages                                                                                    | P3      |     |
| RCV4-A08 | Chưa đăng nhập           | Mở route khi không có session                                           | Redirect `/login?redirect=...`, sau login quay lại đúng trang                                         | P1      |     |
| RCV4-A09 | User không phải internal | Đăng nhập user merchant thường, mở route                                | Bị chặn (403/ẩn menu Internal), không thấy dữ liệu cấu hình                                           | P1      |     |
| RCV4-A10 | UUID không tồn tại       | `/pages/00000000-0000-0000-0000-000000000000` (tương tự reports/blocks) | Thông báo not found rõ ràng, không trắng trang / crash                                                | P2      |     |
| RCV4-A11 | Global search Ctrl+K     | Nhấn `Ctrl+K`, gõ "Report Configuration V4"                             | Có kết quả điều hướng tới các tab V4                                                                  | P3      |     |

### B. Danh sách: search, scope, filter, cột, phân trang (áp dụng cho Reports/Pages/Blocks)

| ID       | Tiêu đề                                  | Bước                                            | Kết quả mong đợi                                                                                           | Ưu tiên | Ghi |
| -------- | ---------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------- | --- |
| RCV4-B01 | Search theo tên                          | Blocks, gõ `Store Daily Sale`                   | Chỉ còn dòng khớp; đếm `n of 56 blocks`; URL `?search=...&page=1`                                          | P1      |     |
| RCV4-B02 | Search theo key                          | Gõ `income-daily-sale`                          | Trả `Store Daily Sale Report` + `(POS)` → `2 of 56`                                                        | P1      |     |
| RCV4-B03 | Search không kết quả                     | Gõ `zzz-not-exist`                              | Empty state, đếm `0 of …`, không lỗi                                                                       | P2      |     |
| RCV4-B04 | Search không phân biệt hoa thường / trim | Gõ `  STORE daily  `                            | Kết quả như chữ thường, không tính khoảng trắng đầu/cuối                                                   | P3      |     |
| RCV4-B05 | Deep-link search                         | Mở `/blocks?search=income-daily-sale`           | Ô search điền sẵn, bảng đã lọc. (Lưu ý `?q=` không có tác dụng)                                            | P2      |     |
| RCV4-B06 | Xoá search                               | Xoá nội dung ô                                  | Trở về đủ danh sách, URL bỏ `search`                                                                       | P2      |     |
| RCV4-B07 | Scope By merchant chưa chọn merchant     | Scope → `By merchant`                           | URL `?scope=resolved`; empty state "Pick a merchant…"                                                      | P1      |     |
| RCV4-B08 | Chọn merchant                            | `Filter by merchant` → gõ `100004` → chọn       | Danh sách lọc còn `Test 100004 #100004`; URL `&merchant=100004`; xuất hiện `Show: What this merchant sees` | P1      |     |
| RCV4-B09 | Merchant picker tìm kiếm                 | Gõ tên / id không tồn tại                       | List lọc theo cả tên & `#id`; không kết quả → thông báo trống                                              | P2      |     |
| RCV4-B10 | Tên merchant rất dài                     | Mở picker                                       | Tên dài (merchant #30) bị cắt/wrap, không vỡ layout                                                        | P3      |     |
| RCV4-B11 | Quay lại System scope                    | Scope → `System (all merchants)`                | Bỏ `merchant`, hiển thị bản mặc định                                                                       | P2      |     |
| RCV4-B12 | Bản copy của merchant hiển thị           | (Sau RCV4-F03) chọn merchant có bản copy        | Dòng copy hiện cột Merchant = tên merchant, khác bản `All merchants`                                       | P1      | Có  |
| RCV4-B13 | Filter Kind (Blocks)                     | Kind = `Table` / `Summary` / `Chart` / `Detail` | Chỉ hiện block đúng loại; đếm cập nhật; bỏ chọn trả lại đủ                                                 | P2      |     |
| RCV4-B14 | Filter Layout (Pages)                    | Layout = `Web` / `POS window` / `Mobile`        | Chỉ page có layout tương ứng                                                                               | P2      |     |
| RCV4-B15 | Columns ẩn/hiện                          | Columns → tắt `Key`, bật `Updated`              | Cột ẩn/hiện ngay; `Reset to default` trả về mặc định                                                       | P2      |     |
| RCV4-B16 | Columns được nhớ                         | Ẩn 1 cột, reload                                | Trạng thái cột được giữ (xác minh: localStorage hay không)                                                 | P3      |     |
| RCV4-B17 | Phân trang                               | Blocks → `Next page`                            | `31–56 of 56`, `2 / 2`; `Next` disabled ở trang cuối, `Previous` disabled ở trang 1                        | P2      |     |
| RCV4-B18 | Search reset trang                       | Đang ở trang 2, gõ search                       | Về `page=1`                                                                                                | P2      |     |
| RCV4-B19 | Thứ tự hiển thị                          | Mở Reports                                      | Thứ tự ổn định giữa các lần reload (không nhảy)                                                            | P3      |     |

### C. Hành động dòng & dialog

| ID       | Tiêu đề                  | Bước                                      | Kết quả mong đợi                                                                                          | Ưu tiên | Ghi               |
| -------- | ------------------------ | ----------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------- | ----------------- |
| RCV4-C01 | Menu Actions             | Click `Actions for Daily Sale Report`     | Menu: `Copy for merchant…`, `Deactivate`, `Delete…`                                                       | P1      |                   |
| RCV4-C02 | Copy dialog – Cancel     | Copy for merchant… → Cancel / Esc / Close | Dialog đóng, không gửi request ghi                                                                        | P1      |                   |
| RCV4-C03 | Copy dialog – validate   | Không chọn merchant, bấm `Copy`           | Nút disabled hoặc báo lỗi bắt buộc                                                                        | P2      |                   |
| RCV4-C04 | Delete dialog – nội dung | Delete…                                   | Tiêu đề `Delete "<name>" for all merchants?`, cảnh báo "cannot be undone", nút `Delete for all merchants` | P1      |                   |
| RCV4-C05 | Delete – Cancel          | Cancel / Esc                              | Không xoá, dòng còn nguyên                                                                                | P1      |                   |
| RCV4-C06 | Deactivate (mock)        | Chặn non-GET, click `Deactivate`          | Có request PATCH/POST đúng id; UI không đổi trạng thái khi request lỗi + có toast lỗi                     | P2      |                   |
| RCV4-C07 | New page dialog – fields | `New page`                                | Name, Key, Who sees it *, Requires permission, Requires passcode, Description; Cancel / Create page       | P1      |                   |
| RCV4-C08 | New page – key validate  | Key `Abc Def!`, `-abc`, trống             | Báo lỗi định dạng (chỉ chữ thường, số, `-`); Create disabled                                              | P1      |                   |
| RCV4-C09 | New page – key trùng     | Key `daily-sale-report`                   | Lỗi trùng key, không tạo                                                                                  | P1      | Có (mock nếu cần) |
| RCV4-C10 | New block dialog         | `New block`                               | Có thêm `Kind *` (Table/Summary/Chart/Detail) và `Report *` (19 report); bắt buộc chọn Report             | P1      |                   |
| RCV4-C11 | Esc/Close giữ dữ liệu?   | Nhập Name rồi Esc, mở lại                 | Form reset (không giữ dữ liệu cũ)                                                                         | P3      |                   |

### D. Reports (dataset) – chi tiết

| ID       | Tiêu đề                    | Bước                                        | Kết quả mong đợi                                                                                                    | Ưu tiên | Ghi |
| -------- | -------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------- | --- |
| RCV4-D01 | Mở chi tiết report         | Click `Store Daily Income`                  | URL `/reports/<uuid>`; header "Reads Store income", key `store-default`; Group by `1 selected`, Values `5 selected` | P1      |     |
| RCV4-D02 | Field search               | `Find a field` gõ `Daily Sale`              | Chỉ hiện field khớp; không khớp → "No matching fields."                                                             | P2      |     |
| RCV4-D03 | Nhãn field trùng           | Xem danh sách Values của Store income       | Không có 2 field cùng nhãn hiển thị (hiện có nhiều cặp trùng: `Card Refund`, `Cash Sale`, `Gift Card Sale` x3…)     | P2      |     |
| RCV4-D04 | Show technical fields      | Bật switch                                  | Hiện thêm id / created / updated                                                                                    | P3      |     |
| RCV4-D05 | Business date modes        | Chọn Page / Month / Custom / All / Advanced | Các ô From/To/Parameter hiện/ẩn đúng mode                                                                           | P2      |     |
| RCV4-D06 | Thêm/xoá filter            | `Add filter`, `Add group`, xoá              | Dòng filter thêm/xoá đúng; Required hiển thị                                                                        | P2      |     |
| RCV4-D07 | Sort                       | `Add sort`, đổi Asc/Desc                    | Lưu vào JSON (View JSON) đúng thứ tự                                                                                | P3      |     |
| RCV4-D08 | View JSON                  | Click `View JSON`                           | Hiện định nghĩa JSON khớp UI                                                                                        | P2      |     |
| RCV4-D09 | Run preview ở scope System | `Run preview`                               | Hiện lỗi rõ ràng `E_PARAM … (x-merch-id)` — nên hướng dẫn chọn merchant thay vì chỉ mã lỗi                          | P2      |     |
| RCV4-D10 | Run preview có merchant    | Scope By merchant 100004 → Run preview      | Trả ≤100 dòng; số liệu khớp màn Reports V4 tương ứng                                                                | P1      |     |
| RCV4-D11 | Thiếu tham số bắt buộc     | Filter Required không nhập → Run preview    | "A filter or the date range is missing a value."                                                                    | P2      |     |
| RCV4-D12 | Row limit / Totals row     | Đặt Row limit 5, bật Totals                 | Preview ≤5 dòng; có dòng tổng                                                                                       | P3      |     |
| RCV4-D13 | Save khi có thay đổi       | Sửa Description → Save (mock)               | Request đúng payload; rời trang khi chưa lưu → cảnh báo unsaved (xác minh)                                          | P2      | Có  |
| RCV4-D14 | Inactive report            | Tắt Active → Save (trên report test)        | Report biến mất khỏi danh sách `Report *` khi tạo block                                                             | P2      | Có  |

### E. Fields (tạo report từ field)

| ID       | Tiêu đề                          | Bước                                                                   | Kết quả mong đợi                                                                                          | Ưu tiên | Ghi |
| -------- | -------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------- | --- |
| RCV4-E01 | Trạng thái ban đầu               | Mở `/fields`                                                           | `Save as report` disabled; hint "Pick at least one field…"                                                | P1      |     |
| RCV4-E02 | Danh sách data source            | Mở combobox Data source                                                | 12 nguồn; `Payroll by day (V4)` mang nhãn `No access` và không chọn được                                  | P1      |     |
| RCV4-E03 | Đổi data source                  | Chọn `Store income`                                                    | Group by / Values đổi theo nguồn, reset lựa chọn cũ                                                       | P1      |     |
| RCV4-E04 | Chọn value bật Save              | Tick `Daily Sale`                                                      | `Save as report` enabled                                                                                  | P1      |     |
| RCV4-E05 | Preview có merchant              | By merchant 100004, Store income, Daily Sale, This month → Run preview | `1 row`, `Oct 1 – 20, 2026`, giá trị tiền định dạng `$20,382.04`                                          | P1      |     |
| RCV4-E06 | Đổi scope làm mất lựa chọn       | Đang chọn field, đổi Scope                                             | (Hiện tại) builder reset về trống — xác nhận đây là hành vi mong muốn hay cần cảnh báo                    | P3      |     |
| RCV4-E07 | Save as report dialog            | Click Save as report                                                   | Dialog `New report` (Name, Key, Who sees it, Requires permission/passcode, Description); Cancel không tạo | P1      |     |
| RCV4-E08 | Tạo report thật                  | Key `e2e-<timestamp>` → Create → kiểm tra trong Reports → Delete       | Report xuất hiện ở Reports; xoá sạch sau test                                                             | P2      | Có  |
| RCV4-E09 | Copy chữ trong dialog New report | Đọc hint permission                                                    | Hiện ghi "Staff without it do not see the **page** on POS" — cần sửa thành report (hoặc xác nhận)         | P3      |     |

### F. Blocks – chi tiết

| ID       | Tiêu đề                      | Bước                                                                | Kết quả mong đợi                                                                                                                                                                      | Ưu tiên | Ghi |
| -------- | ---------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --- |
| RCV4-F01 | Mở block Summary             | `Store Daily Totals`                                                | Kind `Summary`, key `income-daily-kpi`; Data `Store Range Summary`; 4 children (Order Count / Sale Income / Tip / Total Payment by Hour) mở theo tile; Default tile `Daily Sale Sale` | P1      |     |
| RCV4-F02 | Mở block Table               | `Store Daily Sale Report`                                           | Kind `Table`, data `Store Order Detail`; mục Table: Rows per page 30, CSV & Excel, Totals row                                                                                         | P1      |     |
| RCV4-F03 | Copy block cho merchant      | Copy for merchant → 100004 → kiểm tra By merchant → Delete bản copy | Bản copy chỉ ảnh hưởng merchant đó; merchant khác giữ default                                                                                                                         | P1      | Có  |
| RCV4-F04 | Try query                    | Click `Try query`                                                   | Liệt kê mọi cột dataset trả về (cả cột ẩn)                                                                                                                                            | P2      |     |
| RCV4-F05 | Preview khi không có dữ liệu | Table block, range `This month` (scope System)                      | "No rows for this date range. Try a different date range or filter." — **lưu ý** preview scope System luôn 0 rows vì thiếu merchant                                                   | P2      |     |
| RCV4-F06 | Add column / kéo đổi thứ tự  | Add column; kéo header                                              | Preview cập nhật thứ tự; chưa lưu khi chưa bấm Save changes                                                                                                                           | P2      |     |
| RCV4-F07 | Children giới hạn            | Thêm child đến 12 / lồng 6 cấp                                      | Chặn vượt giới hạn 5 cấp, 12/node                                                                                                                                                     | P3      |     |
| RCV4-F08 | Child không params           | Xem cảnh báo                                                        | "No params — this child runs unfiltered…" hiển thị                                                                                                                                    | P3      |     |
| RCV4-F09 | Readers can download = Off   | Đặt Off (block test) → xem trang V4                                 | Nút Export biến mất trên bảng đó                                                                                                                                                      | P2      | Có  |
| RCV4-F10 | Rows per page                | Đặt 10                                                              | Trang V4 phân trang 10 dòng                                                                                                                                                           | P3      | Có  |
| RCV4-F11 | Empty text tuỳ chỉnh         | Nhập text "Không có đơn"                                            | Trang V4 hiển thị đúng text khi 0 dòng                                                                                                                                                | P3      | Có  |

### G. Pages – Page builder

| ID       | Tiêu đề                        | Bước                                                 | Kết quả mong đợi                                                                                                                       | Ưu tiên | Ghi |
| -------- | ------------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------- | --- |
| RCV4-G01 | Mở builder                     | Click `Daily Sale Report`                            | Header `Published v2`, "Draft saved · …", key; các nút Preview/Page details/Save draft/Publish/History/More                            | P1      |     |
| RCV4-G02 | Tab layout                     | Web → POS window → Mobile                            | URL `?variant=pos`…; banner "POS window layout is live. Saving changes POS window only."; structure khác nhau (POS dùng block `(POS)`) | P1      |     |
| RCV4-G03 | Structure tree                 | Collapse/expand Row, Stack; click node               | Node được chọn highlight cả trên canvas                                                                                                | P2      |     |
| RCV4-G04 | Blocks palette search + Placed | Gõ `payroll`                                         | Lọc block; block đã đặt có nhãn `Placed`                                                                                               | P2      |     |
| RCV4-G05 | Add block vào container        | Chọn Stack → `Add <block> to the selected container` | Block xuất hiện trong Stack; trạng thái dirty (Save draft enabled)                                                                     | P1      |     |
| RCV4-G06 | Kéo thả block                  | Kéo từ palette vào canvas                            | Block đặt đúng vị trí thả                                                                                                              | P2      |     |
| RCV4-G07 | Block toolbar                  | Chọn block                                           | Toolbar: Drag, Block settings, Block style, Delete Block; link mở block tab mới                                                        | P2      |     |
| RCV4-G08 | Block settings                 | Mở Block settings                                    | Show more/less, Border, Comparison, Swap by filter, Move up/down, Delete block                                                         | P2      |     |
| RCV4-G09 | Move up/down                   | Move up                                              | Thứ tự trong Stack đổi; Move up disabled ở phần tử đầu                                                                                 | P2      |     |
| RCV4-G10 | Delete block khỏi layout       | Delete Block                                         | Gỡ khỏi canvas; block vẫn còn trong Blocks list                                                                                        | P1      |     |
| RCV4-G11 | Style panel                    | Style Report date → Width 6/12, Custom CSS           | Hint "Now 12/12 (100%) — default"; giới hạn 20 declarations, 64 ký tự                                                                  | P3      |     |
| RCV4-G12 | Page filters                   | Gear `Page filters`                                  | Filter date, Report date, Today button On; Page actions (Print, Recalculate payroll)                                                   | P2      |     |
| RCV4-G13 | Page details                   | Mở dialog                                            | Name, Parent in the menu, Used as (page/fragment), Hidden in menu, Active, Permission (`Daily Income`), Passcode                       | P1      |     |
| RCV4-G14 | Parent in the menu             | Chọn parent khác (mock save)                         | Payload đúng; không cho chọn chính nó làm parent                                                                                       | P3      |     |
| RCV4-G15 | Preview as merchant            | Chọn 100004 → Open preview / Open published          | Mở trang V4 của merchant với bản nháp / bản đã publish                                                                                 | P1      |     |
| RCV4-G16 | View change history            | Click icon history                                   | Tab mới `/admin/histories?ehEntityId=<uuid>` lọc đúng entity                                                                           | P2      |     |
| RCV4-G17 | More actions                   | Click `…`                                            | Copy for merchant… / Deactivate / Delete…                                                                                              | P2      |     |
| RCV4-G18 | Rời trang khi có thay đổi      | Thêm block rồi bấm sang tab khác                     | Cảnh báo unsaved changes (xác minh)                                                                                                    | P2      |     |
| RCV4-G19 | Save draft không publish       | Trên page test: thay đổi → Save draft                | "Draft saved · just now"; trang V4 (published) chưa đổi; Preview thấy thay đổi                                                         | P1      | Có  |
| RCV4-G20 | Publish tăng version           | Page test: Publish                                   | `Published v(N+1)`; trang V4 thấy thay đổi; có bản ghi trong change history                                                            | P1      | Có  |
| RCV4-G21 | Publish an toàn                | Click Publish trên page dùng chung khi đã mock       | Có hộp xác nhận hay gửi ngay? Ghi nhận; test tự động luôn mock                                                                         | P1      |     |

### H. Tạo / sửa / xoá end-to-end (dữ liệu test riêng)

| ID       | Tiêu đề         | Bước                                                                                                                      | Kết quả mong đợi                                                               | Ưu tiên | Ghi |
| -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------- | --- |
| RCV4-H01 | Luồng đầy đủ    | Fields → report `e2e-…` → New block (Table, report đó) → New page `e2e-…` → thêm block → Publish → mở `/v4/reports/e2e-…` | Trang mới hiển thị đúng bảng & số liệu; menu Reports V4 có mục mới             | P1      | Có  |
| RCV4-H02 | Permission gate | Page test với Requires permission `Daily Income`                                                                          | Staff không có quyền không thấy page trên POS                                  | P2      | Có  |
| RCV4-H03 | Deactivate page | Deactivate page test                                                                                                      | Không còn trong menu Reports V4; URL trực tiếp báo không khả dụng              | P1      | Có  |
| RCV4-H04 | Delete dọn dẹp  | Xoá page → block → report test                                                                                            | Xoá thành công theo thứ tự; xoá report đang được block dùng → bị chặn/cảnh báo | P1      | Có  |

### I. Phi chức năng

| ID       | Tiêu đề                    | Bước                                 | Kết quả mong đợi                                                                             | Ưu tiên |
| -------- | -------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------- | ------- |
| RCV4-I01 | Không lỗi console          | Mở 4 tab + 1 trang chi tiết mỗi loại | Không có console error mới (đang có lỗi khi Run preview lỗi)                                 | P2      |
| RCV4-I02 | Responsive 375px           | Mobile viewport                      | Bảng cuộn ngang/ẩn cột "Hidden at this width"; không tràn trang                              | P3      |
| RCV4-I03 | Accessibility              | Kiểm tra nút icon                    | Mọi nút icon có aria-label (đã có: `Actions for …`, `Block settings`, `View change history`) | P3      |
| RCV4-I04 | Hiệu năng                  | Đo tải Blocks (56 dòng) và builder   | Dưới ngưỡng (vd. 3s)                                                                         | P3      |
| RCV4-I05 | Session hết hạn giữa chừng | Để token hết hạn rồi thao tác        | Tự refresh token, không mất trạng thái (đã thấy redirect qua Google rồi quay lại)            | P2      |

## 4. Điểm bất thường phát hiện khi quét (2026-10-20)

1. **Nhãn field trùng** trong Values của `Store income` (vd. `Card Refund`, `Cash Sale`, `Discount`, `Gift Card Sale` x3, `Net Income`…) — admin không phân biệt được field nào.
2. **Preview ở scope System luôn lỗi** `E_PARAM … x-merch-id` (Reports, Fields) và Block preview hiện "No rows" — dễ hiểu nhầm là không có dữ liệu; nên gợi ý chọn merchant.
3. `Payroll by day (V4)` trong Data source hiển thị **`No access`** với tài khoản DEV admin — cần xác nhận quyền.
4. Dialog **New report** dùng câu "do not see the **page** on POS" (copy từ New page).
5. Đổi Scope trên Fields **xoá sạch** các field đã chọn mà không cảnh báo.
6. Mô tả tab Reports: "The numbers and fields a block can show…" OK; tab Blocks hiển thị 56 block gồm cặp thường/(POS) — test nên tách theo layout.

## 5. Lịch sử chạy

Xem bảng trạng thái ở mục 0 (lần chạy 2026-10-20, ENV=stage).
