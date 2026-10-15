# Test case: Report Configuration (Pages / Blocks / Sources / Columns)

- **Route**: `/pos/<seg>/<id>/report-config/{pages|blocks|sources|columns}` (DEV: `/pos/nail/14/report-config/...`); route gốc `/report-config` tự chuyển về `/report-config/pages`
- **Nhóm sidebar**: `Management` → accordion `Report Configuration` → `Pages`, `Blocks`, `Sources`, `Columns`
- **Ngày quét**: 2026-10-13 · **Môi trường**: `ENV=stage` (`https://v2.dev-fastboypay.com`, store 14, data host `volt-pos.v2.dev-fastboypay.com`)
- **Nguồn dữ liệu quét**: `_scan/rescan/rc-*.json` + các probe thăm dò tương tác `_scan/rescan/probe-rc-{1..6}.mjs` / `.json`
- **Code test**: `tests/e2e/report-config/` · Page Object `src/pages/report-config/ReportConfigPage.ts` (fixture `reportConfigPage`)
- **Chạy**: `ENV=stage npx playwright test tests/e2e/report-config --workers=6`

> **⚠️ Dữ liệu cấu hình dùng chung, đang chạy thật.** Module này điều khiển các trang báo cáo thật (`/report-pages/<slug>`) của mọi người dùng DEV. Toàn bộ thăm dò và test **không lưu, publish, clone, xoá** bất cứ thứ gì: mọi request ghi (non-GET) tới `volt-pos.*` đều bị chặn (`guardWrites()` → abort) hoặc được trả lời giả lập ngay tại trình duyệt (`mockWrites()` → 422) để kiểm tra payload. Các case cần ghi thật được để `test.fixme` (mục M).
> **Lưu ý đặc biệt**: nút **`Publish`** gửi `POST /report_pages/<id>/publish` **ngay khi click một lần, không có hộp xác nhận** — không bao giờ click khi không có mock.

## 1. Kiểm kê tính năng (Feature inventory)

**Khung chung (cả 4 màn hình)**

- Header `[data-slot="page-title"]` (không phải heading): `Pages` / `Blocks` / `Sources` / `Columns`; `document.title`: `Report Pages | Portal`, `Report Blocks | Portal`, `Report Sources | Portal`, `Report Columns | Portal`.
- Thanh công cụ `[data-slot="filter-bar"]`: ô tìm kiếm (chỉ có placeholder, không label), 1–2 Radix select (`button[role=combobox][aria-label]`), nút `Add …`.
- Bảng `<table>`: ô đầu tiên gồm **tên** (đậm) + **slug** (mono, xám); cột cuối là các nút icon-only có `aria-label` (tooltip).
- Footer: `Showing X to Y of Z results` (≥ 640px) / `X-Y of Z` (mobile), nút `Previous`, chỉ báo `n / m`, nút `Next`. Cỡ trang **cố định 30**, không có control đổi cỡ trang.
- Trạng thái rỗng `[data-slot="empty"]`: `No report pages found.` / `No report blocks found.` / `No report data found.` / `No report columns found.`
- URL lưu trạng thái: `?search=…&page=N` + param filter, khôi phục khi reload / deep link.

| Màn hình | Ô tìm kiếm                           | Bộ lọc (aria-label → option → URL param)                                                                                                                                                                                                                               | Nút thêm                                 | Cột                                                        | Hành động dòng                                       |
| -------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| Pages    | `Search by name or slug...`          | `Layout variant`: `All layouts`, `Web`, `POS Window`, `Mobile` → `variant=web\|pos\|mobile`                                                                                                                                                                            | `Add Page` (dialog)                      | `NAME`, `LAYOUTS`, `STATUS`, `PUBLISHED`                   | `Publish`, `Build layout`, `Edit`, `Clone`, `Delete` |
| Blocks   | `Search by name, slug or dataset...` | `Kind`: `All kinds`, `Table`, `Summary`, `Chart`, `Detail` → `blockKind=…`                                                                                                                                                                                             | `Add Block` (dialog)                     | `NAME`, `STATUS`, `KIND`, `DATASET`                        | `Edit` (trang riêng), `Clone`, `Delete`              |
| Sources  | `Search by name...`                  | `Filter by type`: `All Types` + 10 loại (`Staff Daily Income`, `Staff Order Detail`, `Store Daily Income`, `Store Order Detail`, `Payroll`, `Payroll Daily`, `Payroll Calculation`, `Payroll Daily Calculation`, `Payroll Period`, `Staff List`) → `type=<snake_case>` | `Add Report Data` (trang `/sources/new`) | `NAME`, `TYPE`, `RESPONSE`, `COLUMNS`, `STATUS`, `UPDATED` | `Edit` (trang), `Delete`                             |
| Columns  | `Search by label or slug...`         | `Filter by type` (như Sources) + `Filter by kind`: `All Kinds`, `Column (Leaf)`, `Derived (Formula)`, `Joined`, `Subquery` → `kind=column\|derived\|…`                                                                                                                 | `Add Column` (trang `/columns/new`)      | `NAME`, `TYPE`, `KIND`, `DATA TYPE`                        | `Edit` (trang), `Delete`                             |

**Dữ liệu thấy được (2026-10-13, chỉ để tham khảo — test không hard-code)**: Pages 9 dòng (vd `Daily Sale Report` / `daily-sale-report`, layout `Web` `POS Window` `Mobile`, `Active`, `Published v24`; `Tien Pham` ở trạng thái `Draft`; badge `Hidden in menu`); Blocks 90; Sources 34; Columns 460.

**Định dạng ô**: slug kebab-case (Pages/Blocks/Sources/dataset), camelCase (Columns); `STATUS` là badge `Active`/`Inactive` có `aria-label`; `PUBLISHED` = `Published vN` hoặc `Draft`; `RESPONSE` = `Collection`/`Summary`; `COLUMNS` số nguyên; `UPDATED` = `MMM D, YYYY`; `DATA TYPE` ∈ `Integer`, `Boolean`, `Bigint`, `Numeric`, `String`, `JSONB`, `Timestamp`.

**Dialog / trang con**

- `Add Page` (dialog): `Name` (placeholder `Income Reports`), Slug xem trước (`—` khi rỗng, tự sinh kebab-case), `Used as` (radio `A Page Of Its Own` mặc định / `A Fragment Of Another Screen`), switch `Hidden in menu` (tắt), `Active` (bật), `Requires permission` & `Requires passcode` (mặc định `None`), nút `Cancel` / `Create` / `Close`. Submit rỗng → `Name must contain letters or numbers to make a slug` (chặn phía client).
- `Edit Page` (dialog): như trên, slug chỉ hiển thị dạng text kèm `Published vN` / `System`, nút `Save Changes`.
- `Clone Page` (dialog): `Name` (placeholder `Copy of <tên>`), slug `<slug>-copy`, switch `Also clone the blocks` (tắt) → `POST /report_pages/<id>/clone` body `{"copyBlocks":false}`.
- `Delete Page?` / `Delete Block?` / `Delete Report Data?` / `Delete Column?` (alertdialog, focus mặc định vào `Cancel`).
- `Build layout` / click vào dòng → `/report-config/pages/<uuid>` (`Page Builder | Portal`).
- Badge layout `Web` / `POS Window` / `Mobile` → mở tab mới `/report-pages/<slug>` (`?layout=pos` cho POS Window).
- `Add Block` (dialog): `Name`, `Kind *` (mặc định `Table`), `Dataset *` (`Select dataset`; option dạng `Tên (slug) · collection|summary`). Edit Block → trang `/blocks/<uuid>` (`Edit Report Block | Portal`, có `Clone`, `Deactivate`, `Save Changes`).
- `/sources/new` (`New Report Data | Portal`, `Create Report Data`): Name, Type, Response, Active, bộ chọn cột `Selected (0)` / `Available (N)`, filter thử (`Add filter`, `Try`). Edit → `/sources/<uuid>` (`Edit Report Data | Portal`), header `<tên>` + `<type>/<slug>`.
- `/columns/new` (`New Report Column | Portal`, `Create Column`): Type, Kind (mặc định `Derived (Formula)`), Label, Data Type, Formula (có `Syntax Help`), Aggregation. Edit → `/columns/<uuid>` (`Edit Column`).
- Sources/Columns: nút `Delete` **bị disable** với bản ghi đang được dùng (tooltip chỉ ghi `Delete`).

**Endpoint (data host `volt-pos.*`)**

| Mục đích             | Request                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| Danh sách Pages      | `GET /report_pages.jsonld?itemsPerPage=100&order[slug]=asc` (lọc/tìm/phân trang **phía client**) |
| Danh sách Blocks     | `GET /report_blocks.jsonld?itemsPerPage=100&order[name]=asc` (phía client)                       |
| Danh sách Sources    | `GET /report_data.jsonld?page=N&order[createdAt]=desc[&name[]=…][&type[]=…]` (phía server)       |
| Danh sách Columns    | `GET /report_columns.jsonld?page=N&order[slug]=asc[&label[]=…\|slug[]=…][&type[]=…][&kind[]=…]`  |
| Tạo Page             | `POST /report_pages.jsonld` `{slug,name,hiddenInMenu,usage,active,required}`                     |
| Clone / Publish Page | `POST /report_pages/<id>/clone` · `POST /report_pages/<id>/publish` (không body)                 |
| Xoá Block            | `DELETE /report_blocks/<id>`                                                                     |

## 2. Test case

### A. Tải trang & bố cục (Page load / Layout) — `load-layout.e2e.spec.ts`

**TC-RCF-001 · Tải trực tiếp màn hình Pages** — Mức độ ưu tiên: Cao · Loại: Điều hướng

- Điều kiện tiên quyết: Đã đăng nhập admin (session stage hợp lệ).
- Các bước: 1) Mở `/report-config/pages`. 2) Chờ bảng render.
- Kết quả mong đợi: Không bị đưa về `/login`; `page-title` = `Pages`; `document.title` = `Report Pages | Portal`; có ít nhất 1 dòng.

**TC-RCF-002 · Tải trực tiếp màn hình Blocks** — Cao · Điều hướng — như 001 với `/blocks`, `Blocks`, `Report Blocks | Portal`.

**TC-RCF-003 · Tải trực tiếp màn hình Sources** — Cao · Điều hướng — như 001 với `/sources`, `Sources`, `Report Sources | Portal`.

**TC-RCF-004 · Tải trực tiếp màn hình Columns** — Cao · Điều hướng — như 001 với `/columns`, `Columns`, `Report Columns | Portal`.

**TC-RCF-005 · Route gốc `/report-config` chuyển về Pages** — Trung bình · Điều hướng

- Các bước: Mở `/pos/<seg>/<id>/report-config`.
- Kết quả mong đợi: URL cuối là `/report-config/pages`, màn hình Pages hiển thị.

**TC-RCF-006 · Thanh công cụ đủ control trên cả 4 màn hình** — Cao · Giao diện

- Các bước: Lần lượt mở 4 màn hình, quan sát toolbar.
- Kết quả mong đợi: Ô tìm kiếm đúng placeholder, rỗng, nhập được; mỗi bộ lọc hiện giá trị mặc định (`All layouts` / `All kinds` / `All Types` / `All Types` + `All Kinds`); nút `Add …` enabled.

**TC-RCF-007 · Header bảng đúng nhãn & thứ tự** — Cao · Giao diện

- Kết quả mong đợi: Đúng bộ cột ở bảng mục 1; thêm 1 cột hành động cuối không nhãn.

**TC-RCF-008 · Không lỗi JS / request lỗi khi tải** — Trung bình · Chức năng

- Các bước: Nghe `pageerror` và response; mở lần lượt 4 màn hình.
- Kết quả mong đợi: Không có `pageerror`; không request nào tới `volt-pos.*` trả ≥ 400.

### B. Điều hướng sidebar (Navigation) — `navigation.e2e.spec.ts`

**TC-RCF-010 · Accordion "Report Configuration" mở ra 4 link** — Cao · Điều hướng

- Điều kiện tiên quyết: Đang ở Overview.
- Các bước: 1) Kiểm nhóm đang thu gọn (`aria-expanded="false"`). 2) Click nhóm.
- Kết quả mong đợi: `aria-expanded="true"`; hiện `Pages`, `Blocks`, `Sources`, `Columns` đúng thứ tự, href store-scoped `/pos/<seg>/<id>/report-config/<screen>`.

**TC-RCF-011 · Click từng link điều hướng tới đúng màn hình** — Cao · Điều hướng

- Các bước: Từ Pages click lần lượt `Blocks`, `Sources`, `Columns`, `Pages`.
- Kết quả mong đợi: URL & tiêu đề đổi tương ứng, bảng render (điều hướng client-side).

**TC-RCF-012 · Link active được đánh dấu; nhóm tự mở; thu gọn được** — Trung bình · Giao diện

- Các bước: Mở `/blocks`; quan sát sidebar; click nhóm.
- Kết quả mong đợi: Nhóm mở sẵn; link `Blocks` có `data-active="true"` + `aria-current="page"`, các link khác `data-active="false"`; click nhóm → thu gọn, link ẩn.

### C. Tìm kiếm (Search) — `search.e2e.spec.ts`

**TC-RCF-020 · Pages: tìm theo một phần tên, không phân biệt hoa/thường** — Cao · Chức năng

- Các bước: Lấy từ đầu của tên dòng 1, gõ CHỮ HOA.
- Kết quả mong đợi: URL có `search=<term>`; tổng ≤ ban đầu và > 0; mọi dòng chứa chuỗi (không phân biệt hoa/thường).

**TC-RCF-021 · Blocks: tìm theo dataset và slug** — Trung bình · Chức năng

- Các bước: 1) Tìm giá trị `DATASET` của dòng 1. 2) Xoá, tìm slug dòng 1.
- Kết quả mong đợi: (1) có kết quả chứa dataset đó; (2) dòng đầu có đúng slug đã tìm.

**TC-RCF-022 · Sources: tìm theo tên gửi lên server** — Trung bình · Chức năng

- Kết quả mong đợi: Request `report_data.jsonld?…name[]=<term>`; mọi tên trả về chứa term. _(Ghi chú: tìm theo slug trên Sources không trả kết quả — đúng với placeholder "Search by name...")_

**TC-RCF-023 · Columns: tìm theo label** — Trung bình · Chức năng

- Các bước: Gõ 2 từ đầu label dòng 1 (vd `Add Credit`).
- Kết quả mong đợi: Request mang `label[]=`; mọi dòng chứa chuỗi đó.

**TC-RCF-024 · Columns: tìm theo slug camelCase** — Trung bình · Chức năng

- Kết quả mong đợi: Mọi dòng trả về có slug đúng bằng giá trị đã gõ (cùng slug có thể xuất hiện ở nhiều `TYPE`); ghi nhận app gửi `slug[]` hay `label[]`.

**TC-RCF-025 · Không khớp → empty state riêng từng màn hình** — Cao · Tiêu cực

- Các bước: Trên mỗi màn hình gõ `zzz-no-match-xyz`.
- Kết quả mong đợi: Hiện đúng text empty state; footer `Showing 0 to 0 of 0 results`; chỉ báo `1 / 1`; `Previous`/`Next` disabled.

**TC-RCF-026 · Xoá ô tìm kiếm khôi phục danh sách** — Trung bình · Chức năng

- Kết quả mong đợi: Tổng trở về như ban đầu; URL không còn `search=`.

**TC-RCF-027 · Chuỗi chỉ có khoảng trắng** — Thấp · Biên

- Kết quả mong đợi: Pages/Blocks/Columns coi như rỗng (tổng không đổi). **Sources hiện 0 kết quả** (gửi `name[]=%20%20%20` không trim) → **defect D4**, ghi annotation.

**TC-RCF-028 · Deep link `?search=` khôi phục ô tìm kiếm & kết quả** — Trung bình · Chức năng

- Các bước: Mở `/sources?search=Staff`; reload.
- Kết quả mong đợi: Ô tìm kiếm = `Staff`; mọi tên chứa "staff"; giữ nguyên sau reload.

**TC-RCF-029 · Tìm kiếm đưa về trang 1** — Trung bình · Chức năng

- Các bước: Mở `/columns?page=2`; tìm `Card`.
- Kết quả mong đợi: URL `page=1`, footer bắt đầu từ 1.

### D. Bộ lọc (Filters) — `filters.e2e.spec.ts`

**TC-RCF-040 · Pages: option `Layout variant`** — Trung bình · Giao diện — đúng `All layouts`, `Web`, `POS Window`, `Mobile`; Escape đóng listbox.

**TC-RCF-041 · Pages: lọc `Mobile`** — Cao · Chức năng

- Kết quả mong đợi: URL `variant=mobile`; tổng ≤ ban đầu; mọi dòng có badge `Mobile` trong `LAYOUTS`.

**TC-RCF-042 · Blocks: option `Kind`** — Trung bình · Giao diện — `All kinds`, `Table`, `Summary`, `Chart`, `Detail`.

**TC-RCF-043 · Blocks: lọc `Chart`** — Cao · Chức năng — URL `blockKind=chart`; mọi `KIND` = `Chart`.

**TC-RCF-044 · Sources: option `Filter by type`** — Trung bình · Giao diện — `All Types` + 10 loại theo đúng thứ tự mục 1.

**TC-RCF-045 · Sources: lọc theo Type (phía server)** — Cao · Chức năng

- Các bước: Chọn `Store Daily Income`.
- Kết quả mong đợi: Request mang `type[]=<snake_case>`; URL `type=…`; mọi `TYPE` = `Store Daily Income`.

**TC-RCF-046 · Columns: option Type & Kind** — Trung bình · Giao diện — Type như Sources; Kind `All Kinds`, `Column (Leaf)`, `Derived (Formula)`, `Joined`, `Subquery`.

**TC-RCF-047 · Columns: lọc `Derived (Formula)`** — Cao · Chức năng — URL `kind=derived`; mọi `KIND` = `Derived (Formula)`.

**TC-RCF-048 · Columns: kết hợp Type + Kind (AND)** — Trung bình · Chức năng

- Các bước: Type `Payroll`, Kind `Column (Leaf)`.
- Kết quả mong đợi: URL có cả `type=payroll` và `kind=column`; mọi dòng thoả cả hai.

**TC-RCF-049 · Bộ lọc giữ sau reload** — Trung bình · Chức năng — Blocks `Summary` → reload: URL `blockKind=summary`, trigger `Summary`, tổng không đổi.

**TC-RCF-050 · Bộ lọc + tìm kiếm kết hợp (Blocks)** — Trung bình · Chức năng — Kind `Table` + tìm `demo` → mọi dòng hiển thị chứa "demo" và là `Table`.

**TC-RCF-051 · Chọn lại option mặc định** — Trung bình · Chức năng — `Chart` → `All kinds`: URL bỏ `blockKind`, tổng trở về ban đầu.

**TC-RCF-052 · Giá trị filter không hợp lệ trên URL** — Thấp · Tiêu cực — `?blockKind=bogus`, `?type=bogus` → empty state, không `pageerror`.

### E. Bảng & phân trang (Table / Pagination) — `table-pagination.e2e.spec.ts`

**TC-RCF-060 · Footer & chỉ báo trang khớp số dòng (Pages, Sources, Columns)** — Cao · Dữ liệu

- Kết quả mong đợi: `from = 1`, `to = min(30, total)`; số dòng hiển thị = `to − from + 1`; chỉ báo `1 / ceil(total/30)`; `Previous` disabled; `Next` enabled khi > 30.

**TC-RCF-061 · Columns: Next/Previous (phân trang phía server)** — Cao · Chức năng

- Kết quả mong đợi: Next → request `page=2`, footer `Showing 31 to 60 of N`, chỉ báo `2 / M`, URL `page=2`, dòng đầu khác trang 1; Previous → về `1 to 30`, URL `page=1`.

**TC-RCF-062 · Sources: trang cuối** — Trung bình · Biên — `?page=<cuối>`: `to = total`, `Next` disabled, số dòng đúng.

**TC-RCF-063 · Deep link `?page=2` giữ sau reload** — Trung bình · Chức năng.

**TC-RCF-064 · Blocks: trang 1 phải chỉ hiển thị 30 dòng** — Cao · Dữ liệu — **Defect D1**: footer `Showing 1 to 30 of 90` nhưng bảng render **cả 90 dòng**. Test assert hành vi hiện tại + annotation.

**TC-RCF-065 · Blocks: Next chỉ đổi footer** — Trung bình · Dữ liệu — **Defect D1**: sang trang 2 footer thành `31 to 60` nhưng nội dung bảng không đổi.

**TC-RCF-066 · `?page=999` không được giới hạn** — Thấp · Biên — **Defect D5**: footer `Showing 29941 to 460 of 460 results`, chỉ báo `999 / 16` (Blocks còn hiện đủ 90 dòng). Mong đợi: clamp về trang cuối hoặc trang 1.

**TC-RCF-067 · Cỡ trang cố định 30, không có control đổi cỡ trang** — Thấp · Giao diện.

### F. Hành động dòng & dialog — `row-actions-pages.e2e.spec.ts`, `row-actions-blocks-sources-columns.e2e.spec.ts`

> Mọi case trong mục này cài `guardWrites()` hoặc `mockWrites()` **trước** khi mở dialog và kết thúc bằng kiểm tra không có request ghi ngoài dự kiến.

**TC-RCF-070 · Mỗi dòng Pages có 5 hành động** — Trung bình · Giao diện — `Publish`, `Build layout`, `Edit`, `Clone`, `Delete` trên mọi dòng.

**TC-RCF-071 · Hành động dòng Blocks / Sources / Columns** — Trung bình · Giao diện — Blocks `Edit`/`Clone`/`Delete`; Sources & Columns `Edit`/`Delete`; không có `Publish`/`Build layout`/`Clone` ở nơi không thuộc.

**TC-RCF-072 · Dialog `Add Page`: field & mặc định** — Cao · Giao diện — như mục 1; `Cancel` đóng, không request.

**TC-RCF-073 · Slug tự sinh kebab-case** — Cao · Chức năng — `E2E Probe Page 01` → `e2e-probe-page-01`; ` Mixed CASE  & Symbols!!` → `mixed-case-symbols`.

**TC-RCF-074 · Submit `Add Page` rỗng** — Cao · Tiêu cực — lỗi `Name must contain letters or numbers to make a slug`, dialog giữ nguyên, **không có request ghi**.

**TC-RCF-075 · Tên chỉ có ký hiệu (`!!!`)** — Trung bình · Biên — slug `—`, submit bị chặn với cùng thông báo, không request.

**TC-RCF-076 · Submit hợp lệ (mock 422): kiểm payload** — Cao · Chức năng

- Kết quả mong đợi: Đúng 1 `POST /report_pages.jsonld` body `{"slug":"e2e-probe-page-01","name":"E2E Probe Page 01","hiddenInMenu":false,"usage":"standalone","active":true,"required":{}}`; vi phạm từ server hiện inline dưới `Name`; dialog vẫn mở.

**TC-RCF-077 · `Cancel` / Escape / `Close` đóng dialog không ghi** — Trung bình · Chức năng — **Defect D10**: mở lại `Add Page` sau Cancel vẫn còn nội dung nháp cũ.

**TC-RCF-078 · Dialog `Edit Page`** — Cao · Giao diện — `Name` điền sẵn đúng tên; hiển thị slug + trạng thái publish; slug không phải input (chỉ 1 textbox); nút `Save Changes`; Cancel không ghi.

**TC-RCF-079 · Dialog `Clone Page`** — Trung bình · Giao diện — mô tả `Creates a new custom page from “<tên>”…`; placeholder `Copy of <tên>`; slug `<slug>-copy`; `Also clone the blocks` tắt.

**TC-RCF-080 · Clone (mock): payload** — Trung bình · Chức năng — `POST /report_pages/<uuid>/clone` body chứa `{"copyBlocks":false}`.

**TC-RCF-081 · `Delete Page?` → Cancel** — Cao · Chức năng — text `This will permanently delete the page "<tên>".`; Cancel đóng, tổng không đổi, không request.

**TC-RCF-082 · Xác nhận Delete Block (mock 422)** — Trung bình · Chức năng — gửi `DELETE /report_blocks/<uuid>`; lỗi hiện toast; alertdialog vẫn mở để thử lại/huỷ; dòng còn nguyên.

**TC-RCF-083 · `Publish` gửi request ngay, không xác nhận** — Cao · Chức năng/Rủi ro — click một lần → `POST /report_pages/<uuid>/publish` (mock), không có alertdialog; lỗi hiện toast. **Defect/UX D2**.

**TC-RCF-084 · `Build layout` / click dòng mở Page Builder** — Cao · Điều hướng — URL `/report-config/pages/<uuid>`, title `Page Builder | Portal`, có nút `Page filters`; click ô NAME cũng tới cùng URL.

**TC-RCF-085 · Badge layout mở report thật ở tab mới** — Trung bình · Điều hướng — `Web` (title `Open the page as a Web reader sees it`) → `/report-pages/<slug>`; `POS Window` → `/report-pages/<slug>?layout=pos`; trang danh sách không đổi.

**TC-RCF-086 · Dialog `Add Block`** — Cao · Giao diện — mô tả `The dataset and kind are fixed once the block is created.`; Kind mặc định `Table` (option `Table`, `Summary`, `Chart`, `Detail`); Dataset `Select dataset`, option dạng `Tên (slug) · collection|summary`.

**TC-RCF-087 · Submit `Add Block` rỗng** — Trung bình · Tiêu cực — chặn phía client (`Pick a dataset`), không request. **Defect D3**: hiện thông điệp thô của validator `Too small: expected string to have >=1 characters` và `slug must be kebab-case, starting with a letter`.

**TC-RCF-088 · `Edit` Block mở trang chỉnh sửa** — Trung bình · Điều hướng — `/blocks/<uuid>`, `Edit Report Block | Portal`, có `Clone`/`Deactivate`/`Save Changes` (không click).

**TC-RCF-089 · Dialog `Clone Block`** — Trung bình · Giao diện — `Copy of <tên>`, `<slug>-copy`; Cancel không ghi.

**TC-RCF-090 · `Add Report Data` mở `/sources/new`** — Cao · Điều hướng — title `New Report Data | Portal`, `Create Report Data`, label `Name`/`Type`/`Response`/`Active`, `Selected (0)`, `No columns selected.`, `Available (N)`.

**TC-RCF-091 · `/sources/new`: Create rỗng bị chặn; Cancel về danh sách** — Trung bình · Tiêu cực — lỗi `Required` + `Lowercase letters, numbers and hyphens only`; không request; link `Cancel` → `/report-config/sources`.

**TC-RCF-092 · `Edit` Source / Column mở trang sửa** — Trung bình · Điều hướng — `/sources/<uuid>` (`Edit Report Data | Portal`) và `/columns/<uuid>`; hiển thị `<type>/<slug>` và `Save Changes`.

**TC-RCF-093 · Delete bị khoá với bản ghi đang dùng** — Trung bình · Chức năng — trên Sources/Columns có dòng `Delete` disabled; dòng đầu tiên còn enabled → `Delete Report Data?` / `Delete Column?` nêu đúng tên; Cancel. Ghi nhận UX: tooltip không giải thích vì sao bị khoá.

**TC-RCF-094 · `Add Column` mở `/columns/new`** — Trung bình · Điều hướng — title `New Report Column | Portal`, `Create Column`, label `Type`/`Kind`/`Label`/`Data Type`/`Formula`/`Aggregation`.

**TC-RCF-095 · `/columns/new`: Create rỗng bị chặn** — Trung bình · Tiêu cực — `Required` + `camelCase only — letters and numbers, must start with a lowercase letter`; không request.

### G. Định dạng dữ liệu (Data formatting) — `data-formatting.e2e.spec.ts`

**TC-RCF-110 · Cột NAME: tên + slug đúng quy ước** — Trung bình · Dữ liệu — tên không rỗng; slug kebab-case (Pages/Blocks/Sources), camelCase (Columns).

**TC-RCF-111 · Pages: LAYOUTS / STATUS / PUBLISHED** — Trung bình · Dữ liệu — badge ⊂ {`Web`, `POS Window`, `Mobile`, `Hidden in menu`} và luôn có `Web`; STATUS ∈ {`Active`, `Inactive`}; PUBLISHED `Published vN` hoặc `Draft`.

**TC-RCF-112 · Blocks: STATUS / KIND / DATASET** — Trung bình · Dữ liệu.

**TC-RCF-113 · Sources: TYPE / RESPONSE / COLUMNS / STATUS / UPDATED** — Trung bình · Dữ liệu — UPDATED dạng `MMM D, YYYY`, parse được.

**TC-RCF-114 · Columns: TYPE / KIND / DATA TYPE thuộc tập đã biết** — Trung bình · Dữ liệu.

### H. Tiêu cực & biên (Negative / Edge) — `negative-edge.e2e.spec.ts`

**TC-RCF-120 · API danh sách trả 500** — Cao · Tiêu cực — **Defect D6**: hiện `No report columns found.` như danh sách rỗng thật, không báo lỗi, không `Retry`. Không có `pageerror`.

**TC-RCF-121 · ID không tồn tại trên route chi tiết** — Trung bình · Tiêu cực — `/sources/<uuid-0>` hiện `Error` · `Request failed with status code 404` · `Retry`; `/pages/<uuid-0>` và `/blocks/<uuid-0>` hiện **trang trắng** không thông báo → **Defect D7**.

**TC-RCF-122 · Chuỗi tìm kiếm 300 ký tự** — Thấp · Biên — nhận đủ, empty state, không lỗi.

**TC-RCF-123 · HTML / ký tự đặc biệt trong ô tìm kiếm** — Trung bình · Bảo mật — `<img onerror>` + `' OR 1=1 --` hiển thị như text, không thực thi (cả trước và sau reload từ URL).

### I. Responsive — `responsive.e2e.spec.ts`

**TC-RCF-130 · 390px: không cuộn ngang trang, footer rút gọn** — Trung bình · Responsive — `scrollWidth ≤ innerWidth` cả 4 màn; footer `X-Y of Z`; ô tìm kiếm & nút Add hiển thị (bảng cuộn trong khung riêng).

**TC-RCF-131 · 390px: sidebar thành drawer** — Trung bình · Responsive — nút `Toggle Sidebar` mở drawer có nhóm `Report Configuration` + 4 link, điều hướng được.

**TC-RCF-132 · 390px: nút phân trang mất accessible name** — Trung bình · Khả năng tiếp cận — **Defect D8**: chữ `Previous`/`Next` bị ẩn (`hidden sm:inline`), nút không có `aria-label`; vẫn click được.

### J. Khả năng tiếp cận (Accessibility) — `accessibility.e2e.spec.ts`

**TC-RCF-140 · Nút hành động icon-only có `aria-label`** — Cao · Khả năng tiếp cận — đúng tên hành động trên cả 4 màn.

**TC-RCF-141 · Bộ lọc là combobox có tên, dùng được bằng bàn phím** — Trung bình · Khả năng tiếp cận — focus `Layout variant`, Enter mở, ArrowDown×2, Enter → `POS Window`, URL `variant=pos`.

**TC-RCF-142 · Dialog có tên, focus vào ô Name, Tab không thoát dialog** — Trung bình · Khả năng tiếp cận.

**TC-RCF-143 · Đóng dialog trả focus về nút kích hoạt** — Trung bình · Khả năng tiếp cận — **Defect D9**: focus rơi về `<body>`.

**TC-RCF-144 · Alertdialog Delete focus mặc định vào `Cancel`** — Trung bình · Khả năng tiếp cận — Enter = huỷ, không xoá.

### K. Hiệu năng (Performance) — `performance.e2e.spec.ts`

**TC-RCF-150 · Mỗi màn hình hiện dữ liệu < 10 giây** — Trung bình · Hiệu năng (ghi timing vào annotation).

**TC-RCF-151 · Pages/Blocks tải một lần `itemsPerPage=100`** — Thấp · Hiệu năng/Rủi ro — tổng phải ≤ 100; Blocks đang ở 90/100 → **rủi ro R1**: bản ghi thứ 101 sẽ biến mất khỏi danh sách mà không báo.

### L. Bảo mật (Security) — `security.e2e.spec.ts`

**TC-RCF-160 · Chưa đăng nhập → `/login`** — Cao · Bảo mật — cả 4 màn, không lộ bảng.

**TC-RCF-161 · Session hết hạn (401) khi refetch** — Trung bình · Bảo mật — không retry dồn dập (< 15 request), về `/login` hoặc bảng rỗng; không giữ dữ liệu cũ im lặng.

**TC-RCF-162 · Store không thuộc tài khoản** — Trung bình · Bảo mật — `/pos/nail/99999/report-config/pages` → `This merchant is not available.`, không dòng nào.

**TC-RCF-163 · Tài khoản non-admin** — Cao · Bảo mật — `test.fixme` (cần storageState thứ hai có quyền hạn chế).

**TC-RCF-164 · Mở/đóng mọi dialog không phát sinh request ghi** — Cao · Bảo mật/Toàn vẹn dữ liệu — Add/Edit/Clone/Delete trên Pages & Blocks → 0 request non-GET.

### M. Ghi dữ liệu thật (Persistence) — `persistence.e2e.spec.ts` (toàn bộ `test.fixme`)

**TC-RCF-170 · Tạo Page → xuất hiện (Draft, chỉ layout Web) → xoá** — Cao · Chức năng.

**TC-RCF-171 · Publish tăng `Published vN` → vN+1, report thật nhận layout mới** — Cao · Chức năng.

**TC-RCF-172 · Sửa & lưu Block, giữ sau reload** — Trung bình · Chức năng.

**TC-RCF-173 · API từ chối xoá Source đang được dùng** — Trung bình · Bảo mật/API.

> Lý do fixme: cấu hình DEV là dữ liệu dùng chung đang chạy thật; cần môi trường/tenant cô lập. Hình dạng request đã được khoá bằng các case mock 076, 080, 082, 083.

## 3. Tổng kết độ phủ (Coverage summary)

| Nhóm                       | Số case | Chạy được | fixme |
| -------------------------- | ------: | --------: | ----: |
| A. Tải trang & bố cục      |       8 |         8 |     0 |
| B. Điều hướng sidebar      |       3 |         3 |     0 |
| C. Tìm kiếm                |      10 |        10 |     0 |
| D. Bộ lọc                  |      13 |        13 |     0 |
| E. Bảng & phân trang       |       8 |         8 |     0 |
| F. Hành động dòng & dialog |      26 |        26 |     0 |
| G. Định dạng dữ liệu       |       5 |         5 |     0 |
| H. Tiêu cực & biên         |       4 |         4 |     0 |
| I. Responsive              |       3 |         3 |     0 |
| J. Khả năng tiếp cận       |       5 |         5 |     0 |
| K. Hiệu năng               |       2 |         2 |     0 |
| L. Bảo mật                 |       5 |         4 |     1 |
| M. Ghi dữ liệu thật        |       4 |         0 |     4 |
| **Tổng**                   |  **96** |    **91** | **5** |

### Defect / điểm bất thường của sản phẩm (phát hiện khi thăm dò 2026-10-13)

| ID  | Mức               | Mô tả                                                                                                                                                | Case     |
| --- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| D1  | Cao               | Blocks: phân trang client không áp vào bảng — footer `1 to 30 of 90` nhưng render cả 90 dòng; `Next` chỉ đổi footer                                  | 064, 065 |
| D2  | Cao (UX/rủi ro)   | `Publish` gửi `POST …/publish` ngay khi click, không xác nhận — publish nhầm sẽ đẩy layout ra mọi POS                                                | 083      |
| D3  | Thấp              | `Add Block` hiện thông điệp thô của validator (`Too small: expected string to have >=1 characters`, `slug must be kebab-case…` viết thường)          | 087      |
| D4  | Thấp              | Sources không trim chuỗi tìm kiếm — chỉ khoảng trắng → 0 kết quả (3 màn còn lại bỏ qua)                                                              | 027      |
| D5  | Thấp              | `?page=999` không clamp: `Showing 29941 to 460 of 460 results`, `999 / 16`                                                                           | 066      |
| D6  | Trung bình        | API danh sách lỗi 500 hiển thị như danh sách rỗng (`No report columns found.`), không báo lỗi/Retry                                                  | 120      |
| D7  | Thấp              | ID không tồn tại: Page Builder/Block editor trang trắng; Sources hiện text axios thô `Request failed with status code 404`                           | 121      |
| D8  | Trung bình (a11y) | < 640px nút `Previous`/`Next` chỉ còn icon, không có accessible name                                                                                 | 132      |
| D9  | Thấp (a11y)       | Đóng dialog `Add Page` focus rơi về `<body>` thay vì nút `Add Page`                                                                                  | 143      |
| D10 | Thấp              | Cancel `Add Page` rồi mở lại vẫn giữ nội dung nháp cũ                                                                                                | 077      |
| R1  | Rủi ro            | Pages/Blocks chỉ tải 1 trang `itemsPerPage=100`; Blocks đã 90/100 — vượt 100 sẽ mất bản ghi khỏi danh sách                                           | 151      |
| —   | Ghi chú           | Trong lúc tải, footer hiện `Showing 0 to 0 of 0 results` cùng skeleton (gây hiểu nhầm ngắn); Delete bị khoá chỉ có tooltip `Delete`, không nêu lý do | —        |

Các case chạm defect **assert hành vi hiện tại + ghi annotation `defect`** (theo quy ước repo) để suite không đỏ vì lỗi đã biết nhưng vẫn hiện trong report.

### Cần xác minh thêm

- Quyền: chưa có tài khoản non-admin để kiểm TC-RCF-163.
- Hành vi lưu thật (validation server, slug trùng "Numbered automatically if already taken", version publish) — chỉ kiểm được trên môi trường cô lập (mục M).
- Page Builder / Block editor / form Sources & Columns rất lớn — tài liệu này chỉ bao phần danh sách & lối vào; nên tách thành tài liệu riêng.

## Lịch sử chạy

### 2026-10-13 (UTC+7) — ENV=stage

- Lệnh: `ENV=stage npx playwright test tests/e2e/report-config --workers=6` (headless)
- Kết quả: **91 passed, 0 failed, 5 skipped (fixme: 163, 170–173)** — tổng 96 case (+1 global setup)
- Lần chạy đầu: 5 fail do test (URL `kind=column` cho `Column (Leaf)`, alertdialog giữ mở khi xoá lỗi che bảng khỏi role query, chờ dòng đổi sau Next, timing bàn phím Radix, D10) → đã sửa; lần 2 xanh toàn bộ.
- Không có dữ liệu cấu hình nào bị ghi: mọi request non-GET tới `volt-pos.*` bị abort hoặc mock tại trình duyệt.
- Lần chạy 3 (sau khi tăng thời gian chờ redirect cho TC-RCF-160 — từng flaky 1 lần do redirect `/login` chậm khi chạy song song): **91 passed, 0 failed, 5 skipped**.
