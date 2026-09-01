# Test case: Màn hình Merchants (Quản lý Merchant — Internal)

- **Route**: `/pos/merchants` (tự chuẩn hoá thành `/pos/merchants?tab=overview`)
- **Nhóm sidebar**: `Internal` → `Merchants` (route admin, không store-scoped)
- **Ngày quét**: 2026-08-18
- **Nguồn dữ liệu quét**: ảnh chụp màn hình đầy đủ do người dùng cung cấp (2026-08-18) + `docs/test-cases/_scan/merchants.json` (chỉ ghi lại lần redirect về `/login`) + danh sách route sidebar trong `_scan/overview.json`

> **✅ Đã xác minh trực tiếp trên DEV (2026-08-18) — xem mục 4**
> Bản đầu của tài liệu này được dựng từ ảnh chụp màn hình vì session trong `src/data/dynamic/auth/admin.json` đã hết hiệu lực (scanner bị redirect về `/login?redirect=%2Fpos%2Fmerchants`).
> Session đã được cấp lại, màn hình được quét DOM + thăm dò tương tác trực tiếp, nên **toàn bộ 12 điểm `[CẦN XÁC MINH]` đã được chốt** — kết quả ở **mục 4**. Các nhãn `[CẦN XÁC MINH]` trong mục 2 được giữ nguyên để đối chiếu lịch sử; **đọc mục 4 để biết hành vi thật**.
> Code test đã sinh xong: `tests/e2e/merchants/` (82/82 case). Chạy: `npx playwright test tests/e2e/merchants --reporter=list`.

## 1. Kiểm kê tính năng (Feature inventory)

**Khung sườn chung**:

- Thanh icon dọc ngoài cùng bên trái (5 icon: logo `P`, icon cửa hàng — **đang active**, icon `$`, icon ngân hàng, icon thẻ) — bộ chuyển ngữ cảnh sản phẩm (POS / Payment / Business / Gift Card).
- Sidebar điều hướng chia 3 nhóm:
  - **Operations**: `Overview`, `Orders`, `Batch History`, `Income Reports`, `Payroll`
  - **Management**: `Staffs`, `Services`, `Customers`, `Settings`
  - **Internal**: `Merchants` (**đang active**, được highlight nền xám), `Onboarding`, `Packages`, `All Orders`, `Devices`, `Monitor`, `Versions`, `Settings`
- Ghi chú: cấu trúc sidebar này **khác** với bản quét tháng 7 (khi đó là `POS` / `Management` / `Admin`, có `Customer Groups`, và mục admin tên `Orders` thay vì `All Orders`). UI đã thay đổi → lấy ảnh 2026-08-18 làm chuẩn, các route cũ trong `_scan/overview.json` cần xác minh lại.

**Header trang**: tiêu đề `"Merchant Management"`.

**Thanh công cụ** (một hàng, phía trên bảng):

- Ô tìm kiếm có icon kính lúp, placeholder `"Search merchants by name or WHMCS ID..."` → tìm theo **tên merchant** hoặc **WHMCS ID** (giá trị ở cột `#`).
- Combobox lọc trạng thái, giá trị mặc định `"All statuses"` (có icon chevron mở dropdown). Danh sách option đầy đủ **`[CẦN XÁC MINH]`** — suy đoán hợp lý: `All statuses` / `Active` / `Inactive` (mọi dòng quét được đều là `Active`).
- **Không có** nút `Create`, `Export`, hay nút hành động nào khác trên màn hình danh sách (khác với Staffs/Services) — cần xác nhận lại khi có session.

**Bảng dữ liệu** — 8 cột, theo thứ tự:

| Cột           | Nội dung                | Ghi chú                                                                                             |
| ------------- | ----------------------- | --------------------------------------------------------------------------------------------------- |
| `#`           | WHMCS ID                | số nguyên, **không** liên tục và **không** dùng để sắp xếp (4, 3550, 3660, 999999, 100004, 3412, …) |
| `MERCHANT`    | tên merchant            | text, có thể chứa dấu `'`, `-`, hậu tố `LLC`                                                        |
| `PACKAGE`     | tên gói dịch vụ         | phần lớn rỗng → hiển thị `—` (em dash); giá trị thật dạng in hoa: `GO POS BASIC`, `GO POS DELUXE`   |
| `STATUS`      | badge trạng thái        | tất cả dòng quét được đều là `Active` (badge chữ xanh, nền xanh nhạt, bo tròn)                      |
| `OWNER EMAIL` | email chủ merchant      | text nguyên vẹn                                                                                     |
| `OWNER PHONE` | điện thoại chủ merchant | định dạng US `(205) 205-9929`                                                                       |
| `TIMEZONE`    | múi giờ merchant        | dạng IANA `Asia/Saigon`, `Asia/Ho_Chi_Minh` và alias US `US/Central`, `US/Eastern`                  |
| `JOINED AT`   | ngày tham gia           | `"MMM D, YYYY, h:mm A (UTC±H)"` — vd `Jul 24, 2026, 2:09 PM (UTC+7)`                                |

**Dữ liệu quét được** (13 dòng hiển thị, dùng làm mẫu đối chiếu — **không** hard-code vào assertion vì dữ liệu DEV thay đổi):

| #      | MERCHANT                       | PACKAGE       | STATUS | OWNER EMAIL                 | OWNER PHONE    | TIMEZONE         | JOINED AT                      |
| ------ | ------------------------------ | ------------- | ------ | --------------------------- | -------------- | ---------------- | ------------------------------ |
| 4      | Spa And Nails                  | —             | Active | test@email.ccccc            | (205) 205-9929 | Asia/Saigon      | Jul 24, 2026, 2:09 PM (UTC+7)  |
| 3550   | Hihihi hehehe                  | —             | Active | resellerabc@gmail.com       | (205) 549-5896 | Asia/Saigon      | Jul 21, 2026, 5:02 PM (UTC+7)  |
| 3660   | Hair Salon 22                  | —             | Active | nhungkk5@gmail.com          | (408) 269-2000 | Asia/Ho_Chi_Minh | Jul 21, 2026, 10:32 AM (UTC+7) |
| 999999 | Fastboy Markerting             | —             | Active | vuong.pham@fastboy.net      | (205) 205-2052 | Asia/Ho_Chi_Minh | Jul 9, 2026, 4:34 PM (UTC+7)   |
| 100004 | Test 100004                    | —             | Active | loandang@fastboy.com        | (205) 205-9088 | US/Central       | Jun 23, 2026, 10:17 AM (UTC+7) |
| 3412   | Nail's Justice League - QC     | —             | Active | abc12@aa.com                | (205) 205-4444 | Asia/Saigon      | Jun 10, 2026, 8:47 AM (UTC+7)  |
| 2568   | Com Ga Houston - Arlington LLC | —             | Active | comgahouston@gmail.com      | (205) 477-8969 | Asia/Saigon      | May 29, 2026, 11:48 AM (UTC+7) |
| 2618   | Minh Minh                      | —             | Active | minhminh22@gmail.com        | (201) 826-2651 | Asia/Saigon      | May 26, 2026, 5:07 PM (UTC+7)  |
| 12     | Nail Salon 123                 | —             | Active | mongtring@gmail.com         | (205) 205-6768 | Asia/Ho_Chi_Minh | May 22, 2026, 11:50 AM (UTC+7) |
| 2950   | Bleu Ciel Hair Salon           | GO POS BASIC  | Active | trang.nguyen@fastboy.net    | (832) 968-8883 | US/Eastern       | May 6, 2026, 11:30 AM (UTC+7)  |
| 3      | My business                    | —             | Active | myanh143@gmail.com          | (832) 930-3695 | US/Central       | Apr 27, 2026, 11:06 AM (UTC+7) |
| 2502   | Merchant Integrate             | —             | Active | merchantintegrate@gmail.com | (205) 202-1215 | Asia/Saigon      | Apr 27, 2026, 11:04 AM (UTC+7) |
| 14     | Volt POS 14 Dev                | GO POS DELUXE | Active | test@email.cc               | (205) 222-0003 | Asia/Ho_Chi_Minh | Apr 24, 2026, 4:31 PM (UTC+7)  |

**Quan sát hành vi suy ra được từ dữ liệu**:

- Danh sách **sắp xếp mặc định theo `JOINED AT` giảm dần** (mới nhất trước): Jul 24 → Jul 21 → Jul 21 → Jul 9 → Jun 23 → … → Apr 24. Đây là bất biến kiểm được mà không cần dữ liệu cố định.
- Cột `#` **không** dùng để sắp xếp → xác nhận nó là WHMCS ID ngoại lai, không phải khoá tự tăng nội bộ.
- Mọi `JOINED AT` đều hiển thị `(UTC+7)` dù `TIMEZONE` của merchant là `US/Central`/`US/Eastern` → thời gian được render theo **múi giờ người xem/portal**, không theo timezone của merchant. Đây là điểm đáng kiểm tra riêng (xem `TC-MCH-063`, `TC-MCH-066`).
- **Không thấy footer phân trang** trong ảnh (13 dòng, hết bảng là hết trang) → chưa rõ ngưỡng phân trang và có `page` param hay không **`[CẦN XÁC MINH]`**.
- Store đang chọn (`Volt POS 14 Dev`, id 14 — trùng `STORE_ID` trong env) xuất hiện như một dòng trong bảng → màn hình này liệt kê **tất cả** merchant, không lọc theo store hiện tại.

**Ghi chú kỹ thuật cho việc sinh code**:

- Không hard-code `/pos/14/...` — route này là admin, **không** store-scoped; chỉ dùng `/pos/merchants`.
- Chưa có `data-testid` nào được xác nhận → selector nên dựa vào role/label (`getByRole('table')`, `getByPlaceholder('Search merchants by name or WHMCS ID...')`, `getByRole('columnheader', { name: 'OWNER EMAIL' })`).
- Assertion nên bám **định dạng và hành vi** (regex, thứ tự, số cột), **không** bám số liệu/tên merchant cụ thể.
- Chưa có thư mục `tests/e2e/merchants/` — code test sẽ được sinh sau bằng skill `testcase-to-code`.

## 2. Test case

**Chạy toàn bộ test của màn hình** (sau khi đã sinh code): `npx playwright test tests/e2e/merchants --reporter=list`

### A. Tải trang & bố cục (Page load / Layout)

**TC-MCH-001 · Tải trang Merchants qua điều hướng trực tiếp** — Mức độ ưu tiên: Cao · Loại: Điều hướng

- Điều kiện tiên quyết: Đã đăng nhập bằng tài khoản admin với session hợp lệ.
- Các bước:
  1. Điều hướng trực tiếp tới `/pos/merchants`.
  2. Chờ trang tải xong (bảng dữ liệu render).
- Kết quả mong đợi: Trang Merchants hiển thị, **không** bị redirect về `/login`; tiêu đề `"Merchant Management"` hiển thị; thanh công cụ và bảng 8 cột render đầy đủ.

**TC-MCH-002 · URL tự chuẩn hoá thành `?tab=overview`** — Mức độ ưu tiên: Trung bình · Loại: Điều hướng

- Điều kiện tiên quyết: Đã đăng nhập.
- Các bước: 1) Vào `/pos/merchants` (không kèm query). 2) Đọc URL sau khi trang tải xong.
- Kết quả mong đợi: URL trở thành `/pos/merchants?tab=overview`. **`[CẦN XÁC MINH]`** liệu đây là redirect thật hay chỉ là param còn lại từ lần điều hướng trước; nếu có thanh tab thì phải kiểm luôn tab `overview` đang được chọn.

**TC-MCH-003 · Tiêu đề trang hiển thị đúng** — Mức độ ưu tiên: Cao · Loại: Giao diện

- Các bước: Quan sát vùng header nội dung.
- Kết quả mong đợi: Hiển thị đúng chữ `"Merchant Management"`, là heading của trang (kiểm bằng `getByRole('heading')`).

**TC-MCH-004 · Thanh công cụ render đủ 2 control** — Mức độ ưu tiên: Cao · Loại: Giao diện

- Các bước: Quan sát hàng ngay trên bảng.
- Kết quả mong đợi: Có đúng ô tìm kiếm với placeholder `"Search merchants by name or WHMCS ID..."` và combobox trạng thái đang hiển thị `"All statuses"`; cả hai đều enabled.

**TC-MCH-005 · Reload (F5) giữ nguyên trạng thái trang** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Điều kiện tiên quyết: Đang ở trang Merchants.
- Các bước: 1) Nhấn F5. 2) Chờ tải lại.
- Kết quả mong đợi: Trang tải lại cùng URL, session không bị đăng xuất, bảng dữ liệu render lại đầy đủ.

**TC-MCH-006 · Không có lỗi console khi tải trang** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Lắng nghe console/pageerror. 2) Tải `/pos/merchants`. 3) Chờ mạng rảnh.
- Kết quả mong đợi: Không có console error hay uncaught exception; không có request nào trả 4xx/5xx (trừ các call analytics đã biết và được whitelist).

### B. Điều hướng & sidebar (Navigation)

**TC-MCH-010 · Vào Merchants từ sidebar nhóm "Internal"** — Mức độ ưu tiên: Cao · Loại: Điều hướng

- Điều kiện tiên quyết: Đang ở một màn hình khác (vd Overview).
- Các bước: 1) Click `"Merchants"` trong nhóm `"Internal"` ở sidebar. 2) Quan sát URL và nội dung.
- Kết quả mong đợi: Điều hướng tới `/pos/merchants`, tiêu đề `"Merchant Management"` hiển thị.

**TC-MCH-011 · Mục "Merchants" được highlight là active** — Mức độ ưu tiên: Trung bình · Loại: Giao diện

- Các bước: Đang ở trang Merchants, quan sát sidebar.
- Kết quả mong đợi: Mục `"Merchants"` có style active (nền xám nổi bật so với các mục khác); các mục khác trong `Internal` không ở trạng thái active.

**TC-MCH-012 · Sidebar hiển thị đủ 3 nhóm và các mục** — Mức độ ưu tiên: Trung bình · Loại: Giao diện

- Các bước: Quan sát toàn bộ sidebar.
- Kết quả mong đợi: Có 3 nhãn nhóm `"Operations"`, `"Management"`, `"Internal"`; nhóm `Internal` chứa `Merchants`, `Onboarding`, `Packages`, `All Orders`, `Devices`, `Monitor`, `Versions`, `Settings`.

**TC-MCH-013 · Điều hướng qua màn hình Internal khác rồi quay lại** — Mức độ ưu tiên: Trung bình · Loại: Điều hướng

- Các bước: 1) Từ Merchants click `"Packages"`. 2) Click lại `"Merchants"`.
- Kết quả mong đợi: Cả hai lần điều hướng đều thành công, không lỗi; trang Merchants tải lại dữ liệu đúng, không giữ state rác của màn hình trước.

**TC-MCH-014 · Nút Back/Forward của trình duyệt** — Mức độ ưu tiên: Trung bình · Loại: Điều hướng

- Các bước: 1) Vào Merchants. 2) Điều hướng sang `Devices`. 3) Nhấn Back. 4) Nhấn Forward.
- Kết quả mong đợi: Back trở về `/pos/merchants` với bảng render đúng; Forward về `Devices`; không xuất hiện trang trắng hay lỗi hydrate.

**TC-MCH-015 · Thu gọn/mở rộng sidebar** — Mức độ ưu tiên: Thấp · Loại: Giao diện

- Các bước: 1) Toggle sidebar (nếu có nút). 2) Quan sát vùng nội dung.
- Kết quả mong đợi: Bảng và thanh công cụ giãn/co theo, không bị cắt hay chồng lấp; trạng thái thu gọn không làm mất mục active. **`[CẦN XÁC MINH]`** vị trí/nhãn nút toggle.

### C. Tìm kiếm merchant (Search)

**TC-MCH-020 · Tìm theo tên merchant (khớp một phần)** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Điều kiện tiên quyết: Đang ở trang Merchants, bảng đã có dữ liệu.
- Các bước: 1) Gõ một chuỗi con của tên merchant có thật (vd `"Bleu"`). 2) Chờ danh sách cập nhật.
- Kết quả mong đợi: Chỉ còn các dòng có `MERCHANT` chứa chuỗi đã gõ; số dòng giảm so với ban đầu; các dòng còn lại đều thực sự khớp.

**TC-MCH-021 · Tìm theo WHMCS ID (cột `#`)** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Lấy giá trị cột `#` của dòng đầu tiên. 2) Gõ chính xác giá trị đó vào ô tìm kiếm. 3) Chờ cập nhật.
- Kết quả mong đợi: Bảng trả về dòng có `#` đúng bằng giá trị đã gõ (theo placeholder, WHMCS ID là tiêu chí tìm được hỗ trợ).

**TC-MCH-022 · Tìm không phân biệt chữ hoa/thường** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Tìm `"spa"`. 2) Ghi lại kết quả. 3) Xoá, tìm `"SPA"`.
- Kết quả mong đợi: Hai lần tìm trả về **cùng** tập kết quả (tìm kiếm case-insensitive).

**TC-MCH-023 · Tìm chuỗi không tồn tại → trạng thái rỗng** — Mức độ ưu tiên: Cao · Loại: Biên

- Các bước: 1) Gõ `"zzzzz-khong-ton-tai-99999"`. 2) Chờ cập nhật.
- Kết quả mong đợi: Bảng không còn dòng dữ liệu nào; hiển thị thông báo/empty state rõ ràng (không phải bảng trắng không giải thích); không có lỗi console. **`[CẦN XÁC MINH]`** nội dung chính xác của empty state.

**TC-MCH-024 · Xoá nội dung tìm kiếm → danh sách đầy đủ trở lại** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Tìm một chuỗi thu hẹp kết quả. 2) Xoá sạch ô tìm kiếm. 3) Chờ cập nhật.
- Kết quả mong đợi: Danh sách trở về đúng số dòng như trạng thái ban đầu, thứ tự sắp xếp mặc định (`JOINED AT` giảm dần) được giữ.

**TC-MCH-025 · Tìm với khoảng trắng ở đầu/cuối** — Mức độ ưu tiên: Thấp · Loại: Biên

- Các bước: 1) Tìm `"  Minh  "` (có khoảng trắng bao quanh). 2) So sánh với kết quả tìm `"Minh"`.
- Kết quả mong đợi: Chuỗi tìm được trim → hai lần cho cùng kết quả. Nếu không trim, ghi nhận là defect về UX tìm kiếm.

**TC-MCH-026 · Tìm với ký tự đặc biệt trong tên** — Mức độ ưu tiên: Trung bình · Loại: Biên

- Các bước: 1) Tìm `"Nail's"` (có dấu nháy đơn). 2) Tìm `"Arlington LLC"` (có khoảng trắng giữa). 3) Tìm `"- QC"` (có dấu gạch ngang).
- Kết quả mong đợi: Cả 3 trả về dòng khớp tương ứng; không lỗi 500, không lỗi cú pháp query, không thoát ký tự sai làm mất kết quả.

**TC-MCH-027 · Tìm kiếm có debounce, không gọi API mỗi ký tự** — Mức độ ưu tiên: Trung bình · Loại: Hiệu năng

- Các bước: 1) Bắt các network request tới endpoint danh sách merchant. 2) Gõ liên tục 8 ký tự thật nhanh. 3) Đếm số request phát sinh.
- Kết quả mong đợi: Số request **nhỏ hơn đáng kể** số ký tự đã gõ (có debounce/throttle); request cuối cùng mang đúng full keyword.

**TC-MCH-028 · Keyword tìm kiếm có được ghi vào URL** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Tìm một keyword. 2) Đọc URL. 3) Copy URL, mở ở tab mới.
- Kết quả mong đợi: **`[CẦN XÁC MINH]`** — nếu app ghi keyword vào query param (như Staffs dùng `search`), URL mới phải khôi phục đúng kết quả đã lọc; nếu không ghi, ghi nhận rõ là state chỉ tồn tại trong bộ nhớ và deep-link không khả dụng.

### D. Lọc theo trạng thái (Status filter)

**TC-MCH-030 · Mở dropdown trạng thái và liệt kê option** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Click combobox `"All statuses"`. 2) Đọc toàn bộ option.
- Kết quả mong đợi: Dropdown mở ra, hiển thị `"All statuses"` cùng các trạng thái merchant hợp lệ. **`[CẦN XÁC MINH]`** danh sách option chính xác — cần chốt trước khi viết assertion cứng.

**TC-MCH-031 · Lọc theo trạng thái Active** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Chọn option trạng thái `Active`. 2) Chờ bảng cập nhật.
- Kết quả mong đợi: Mọi dòng trong bảng có badge `STATUS` = `Active`; combobox hiển thị giá trị vừa chọn.

**TC-MCH-032 · Lọc theo trạng thái không phải Active** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Chọn một trạng thái khác `Active` (vd `Inactive`). 2) Chờ cập nhật.
- Kết quả mong đợi: Bảng chỉ chứa dòng có đúng trạng thái đó; nếu không có dữ liệu thì hiển thị empty state đúng chứ không phải danh sách cũ. (Dữ liệu DEV quét được toàn `Active` → khả năng cao rơi vào nhánh empty state.)

**TC-MCH-033 · Kết hợp tìm kiếm và lọc trạng thái** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Tìm keyword khớp nhiều dòng. 2) Áp thêm filter trạng thái `Active`. 3) Quan sát.
- Kết quả mong đợi: Hai điều kiện được áp **đồng thời** (AND): mọi dòng vừa khớp keyword vừa đúng trạng thái; đổi filter không xoá keyword và ngược lại.

**TC-MCH-034 · Reset filter về "All statuses"** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Chọn một trạng thái cụ thể. 2) Chọn lại `"All statuses"`.
- Kết quả mong đợi: Bảng trở về tập dữ liệu đầy đủ như ban đầu; không còn dòng nào bị lọc bỏ.

**TC-MCH-035 · Trạng thái filter được ghi vào URL** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Chọn trạng thái `Active`. 2) Đọc URL. 3) Reload trang.
- Kết quả mong đợi: **`[CẦN XÁC MINH]`** — nếu có param (vd `status=active`), sau reload filter phải được giữ; nếu không, filter reset về `All statuses` sau reload và cần ghi chú là hạn chế.

### E. Bảng dữ liệu (Table)

**TC-MCH-040 · Header đúng 8 cột, đúng thứ tự** — Mức độ ưu tiên: Cao · Loại: Giao diện

- Các bước: Đọc toàn bộ header của bảng.
- Kết quả mong đợi: Đúng 8 cột theo thứ tự: `#`, `MERCHANT`, `PACKAGE`, `STATUS`, `OWNER EMAIL`, `OWNER PHONE`, `TIMEZONE`, `JOINED AT`.

**TC-MCH-041 · Mỗi dòng có đủ số ô khớp số cột** — Mức độ ưu tiên: Cao · Loại: Dữ liệu

- Các bước: 1) Lặp qua tất cả dòng đang render. 2) Đếm số ô mỗi dòng.
- Kết quả mong đợi: Mọi dòng có đúng 8 ô; không dòng nào bị lệch cột hay thiếu ô.

**TC-MCH-042 · Ô rỗng hiển thị placeholder `—`** — Mức độ ưu tiên: Trung bình · Loại: Dữ liệu

- Các bước: Quan sát cột `PACKAGE` ở các dòng merchant chưa gán gói.
- Kết quả mong đợi: Ô rỗng hiển thị em dash `—`, **không** để trắng, không hiện `null`/`undefined`/`N/A`.

**TC-MCH-043 · Badge STATUS render đúng kiểu** — Mức độ ưu tiên: Trung bình · Loại: Giao diện

- Các bước: Quan sát cột `STATUS`.
- Kết quả mong đợi: Trạng thái hiển thị dạng badge bo tròn có nền màu (Active = chữ xanh trên nền xanh nhạt), không phải text trơn; nhãn khớp giá trị trạng thái thật.

**TC-MCH-044 · Sắp xếp mặc định theo JOINED AT giảm dần** — Mức độ ưu tiên: Cao · Loại: Dữ liệu

- Các bước: 1) Đọc cột `JOINED AT` của tất cả dòng. 2) Parse thành timestamp. 3) So sánh thứ tự.
- Kết quả mong đợi: Dãy timestamp giảm dần đơn điệu (merchant mới tham gia nhất ở trên cùng) — bất biến đã xác nhận từ dữ liệu quét.

**TC-MCH-045 · Click header cột để đổi sắp xếp** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Click header `MERCHANT`. 2) Quan sát thứ tự và chỉ báo sort. 3) Click lại lần nữa.
- Kết quả mong đợi: **`[CẦN XÁC MINH]`** — nếu cột sort được thì thứ tự đổi đúng chiều và có chỉ báo asc/desc; nếu header không tương tác (ảnh không thấy icon sort) thì xác nhận click **không** gây thay đổi hay lỗi nào.

**TC-MCH-046 · Nội dung dài không phá vỡ layout** — Mức độ ưu tiên: Trung bình · Loại: Giao diện

- Các bước: Quan sát các dòng có giá trị dài nhất (vd `"Com Ga Houston - Arlington LLC"`, `merchantintegrate@gmail.com`).
- Kết quả mong đợi: Text wrap hoặc truncate gọn trong ô; không đẩy tràn cột khác, không tạo scroll ngang toàn trang.

**TC-MCH-047 · Trạng thái rỗng của bảng** — Mức độ ưu tiên: Trung bình · Loại: Biên

- Các bước: 1) Áp một tổ hợp search+filter chắc chắn không có kết quả. 2) Quan sát vùng bảng.
- Kết quả mong đợi: Header cột vẫn hiển thị (hoặc empty state thay thế toàn bảng — chốt theo hành vi thật), có thông báo không có dữ liệu; không hiện dòng skeleton treo vô hạn.

### F. Phân trang & tải danh sách dài (Pagination)

**TC-MCH-050 · Kiểm tra sự tồn tại của phân trang** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Cuộn xuống hết bảng. 2) Quan sát vùng dưới bảng.
- Kết quả mong đợi: **`[CẦN XÁC MINH]`** — ảnh quét (13 dòng) không thấy footer phân trang. Cần chốt: màn hình dùng phân trang (như Staffs: `"Showing X to Y of Z results"` + Previous/Next), infinite scroll, hay hiển thị hết một lần. Toàn bộ TC-MCH-051..055 phụ thuộc kết quả này.

**TC-MCH-051 · Số dòng tối đa mỗi trang** — Mức độ ưu tiên: Trung bình · Loại: Dữ liệu

- Điều kiện tiên quyết: Đã xác nhận có phân trang và tổng số merchant lớn hơn 1 trang.
- Các bước: 1) Đếm số dòng ở trang 1. 2) So với con số ghi trong footer.
- Kết quả mong đợi: Số dòng render bằng page size khai báo (các màn hình khác trong portal dùng 30/trang) và khớp với `"Showing X to Y of Z"`.

**TC-MCH-052 · Chuyển trang bằng Next/Previous** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Ghi lại dòng đầu của trang 1. 2) Click `Next`. 3) Click `Previous`.
- Kết quả mong đợi: Trang 2 hiển thị tập dòng **khác hoàn toàn** trang 1 (không trùng lặp, không bỏ sót); `Previous` đưa về đúng trang 1 với dữ liệu như ban đầu.

**TC-MCH-053 · Nút Previous bị disable ở trang đầu** — Mức độ ưu tiên: Trung bình · Loại: Giao diện

- Các bước: Ở trang 1, quan sát nút `Previous`.
- Kết quả mong đợi: `Previous` ở trạng thái disabled; tương tự `Next` disabled ở trang cuối.

**TC-MCH-054 · Deep-link trực tiếp tới một trang cụ thể** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Mở `/pos/merchants?tab=overview&page=2` (tên param theo thực tế). 2) Quan sát.
- Kết quả mong đợi: Trang 2 được tải trực tiếp, chỉ báo trang hiển thị đúng.

**TC-MCH-055 · Phân trang giữ nguyên search/filter đang áp** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Áp filter/search cho ra nhiều trang. 2) Sang trang 2.
- Kết quả mong đợi: Điều kiện lọc vẫn được áp ở trang 2 (mọi dòng vẫn khớp), tổng số kết quả không đổi khi đổi trang.

### G. Định dạng dữ liệu (Data formatting)

**TC-MCH-060 · Định dạng JOINED AT** — Mức độ ưu tiên: Cao · Loại: Dữ liệu

- Các bước: Đọc toàn bộ giá trị cột `JOINED AT`.
- Kết quả mong đợi: Mọi giá trị khớp regex `^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2} (AM|PM) \(UTC[+-]\d{1,2}\)$` — vd `Jul 24, 2026, 2:09 PM (UTC+7)`.

**TC-MCH-061 · Định dạng OWNER PHONE** — Mức độ ưu tiên: Cao · Loại: Dữ liệu

- Các bước: Đọc toàn bộ cột `OWNER PHONE`.
- Kết quả mong đợi: Mỗi ô hoặc khớp định dạng US `^\(\d{3}\) \d{3}-\d{4}$`, hoặc là placeholder rỗng `—`; không có số thô chưa format kiểu `2052059929`.

**TC-MCH-062 · Định dạng OWNER EMAIL** — Mức độ ưu tiên: Trung bình · Loại: Dữ liệu

- Các bước: Đọc toàn bộ cột `OWNER EMAIL`.
- Kết quả mong đợi: Mỗi ô chứa ký tự `@` và có phần domain, hoặc là `—`; email không bị cắt mất phần domain (kiểm cả trường hợp dài như `merchantintegrate@gmail.com`).

**TC-MCH-063 · Giá trị TIMEZONE hợp lệ** — Mức độ ưu tiên: Trung bình · Loại: Dữ liệu

- Các bước: Đọc toàn bộ cột `TIMEZONE`.
- Kết quả mong đợi: Mỗi giá trị là chuỗi timezone hợp lệ dạng `Region/City` (`Asia/Saigon`, `Asia/Ho_Chi_Minh`, `US/Central`, `US/Eastern`) — kiểm được bằng cách truyền vào `Intl.DateTimeFormat` mà không throw.

**TC-MCH-064 · Cột `#` (WHMCS ID) là số nguyên** — Mức độ ưu tiên: Trung bình · Loại: Dữ liệu

- Các bước: Đọc toàn bộ cột `#`.
- Kết quả mong đợi: Mọi giá trị khớp `^\d+$`; không có ô rỗng (đây là khoá định danh); giá trị lớn như `999999`, `100004` vẫn hiển thị đầy đủ, không bị định dạng dấu phẩy nghìn.

**TC-MCH-065 · Định dạng tên PACKAGE** — Mức độ ưu tiên: Thấp · Loại: Dữ liệu

- Các bước: Đọc các ô `PACKAGE` không rỗng.
- Kết quả mong đợi: Tên gói hiển thị nhất quán dạng in hoa (`GO POS BASIC`, `GO POS DELUXE`); không lẫn lộn kiểu chữ giữa các dòng.

**TC-MCH-066 · UTC offset nhất quán trên toàn bảng** — Mức độ ưu tiên: Trung bình · Loại: Dữ liệu

- Các bước: 1) Trích phần `(UTC±H)` từ mọi dòng. 2) So sánh với nhau và với `TIMEZONE` của cùng dòng.
- Kết quả mong đợi: Tất cả dòng dùng **cùng một** offset (theo múi giờ người xem, đã quan sát là `UTC+7`) — bao gồm cả merchant có `TIMEZONE` là `US/Central`/`US/Eastern`. Nếu yêu cầu nghiệp vụ là render theo timezone của từng merchant thì đây là **defect** cần báo, không phải hành vi đúng.

### H. Hành động trên dòng & chi tiết merchant (Row actions / Detail)

**TC-MCH-070 · Click vào một dòng merchant** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Click vào dòng merchant đầu tiên. 2) Quan sát URL và giao diện.
- Kết quả mong đợi: **`[CẦN XÁC MINH]`** — chốt hành vi thật: điều hướng sang trang chi tiết merchant, mở modal, chuyển ngữ cảnh sang store đó, hay không có hành động nào. Assertion phải viết theo hành vi đã xác nhận, không suy đoán.

**TC-MCH-071 · Click vào ô `#` / tên merchant** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Click riêng vào giá trị cột `#`. 2) Quay lại, click riêng vào tên ở cột `MERCHANT`.
- Kết quả mong đợi: **`[CẦN XÁC MINH]`** — nếu là link thì cả hai dẫn tới cùng đích và có thuộc tính `href`; nếu không phải link thì click không gây điều hướng ngoài ý muốn.

**TC-MCH-072 · Chọn merchant có đổi ngữ cảnh store đang làm việc** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Điều kiện tiên quyết: `STORE_ID` hiện tại là 14 (`Volt POS 14 Dev`).
- Các bước: 1) Chọn một merchant **khác** store hiện tại. 2) Kiểm tra bộ chọn store / các route store-scoped.
- Kết quả mong đợi: **`[CẦN XÁC MINH]`** — nếu màn hình cho phép chuyển ngữ cảnh, các route `/pos/<id>/...` phải trỏ sang id merchant mới. Nếu có, đây là hành vi nhạy cảm cần test riêng vì ảnh hưởng mọi màn hình khác.

**TC-MCH-073 · Xác nhận không có hành động ghi dữ liệu trên màn hình danh sách** — Mức độ ưu tiên: Trung bình · Loại: Giao diện

- Các bước: Quét toàn bộ vùng nội dung tìm các nút hành động.
- Kết quả mong đợi: Không có nút `Create` / `Add` / `Export` / `Delete` nào (khớp ảnh quét) — màn hình này chỉ đọc. Nếu tìm thấy nút, cập nhật lại kiểm kê tính năng và bổ sung test case cho nó.

**TC-MCH-074 · Trạng thái hover của dòng** — Mức độ ưu tiên: Thấp · Loại: Giao diện

- Các bước: Hover chuột lên một dòng.
- Kết quả mong đợi: Có phản hồi thị giác nhất quán (đổi nền hoặc con trỏ) nếu dòng là tương tác được; nếu dòng không tương tác thì con trỏ không nên là `pointer` (tránh gây hiểu sai là click được).

### I. Tham số URL & trạng thái (URL state)

**TC-MCH-080 · `tab=overview` là giá trị mặc định** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Vào `/pos/merchants?tab=overview` trực tiếp. 2) So sánh nội dung với khi vào `/pos/merchants`.
- Kết quả mong đợi: Hai đường dẫn cho nội dung giống nhau (`overview` là mặc định). **`[CẦN XÁC MINH]`** liệu còn giá trị `tab` nào khác được hỗ trợ — ảnh quét không thấy thanh tab hiển thị.

**TC-MCH-081 · Giá trị `tab` không hợp lệ** — Mức độ ưu tiên: Thấp · Loại: Tiêu cực

- Các bước: 1) Mở `/pos/merchants?tab=khong-ton-tai`. 2) Quan sát.
- Kết quả mong đợi: App fallback êm về nội dung mặc định (hoặc chuẩn hoá URL về `tab=overview`); không trang trắng, không crash, không lỗi console.

**TC-MCH-082 · Deep-link kèm nhiều tham số cùng lúc** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Mở URL kèm đồng thời tab + search + status (tên param theo thực tế). 2) Quan sát thanh công cụ và bảng.
- Kết quả mong đợi: Cả ô tìm kiếm và combobox trạng thái hiển thị đúng giá trị từ URL, và bảng đã được lọc tương ứng ngay từ lần render đầu.

**TC-MCH-083 · Tham số không được nhận diện bị bỏ qua an toàn** — Mức độ ưu tiên: Thấp · Loại: Tiêu cực

- Các bước: 1) Mở `/pos/merchants?tab=overview&foo=bar&page=abc`. 2) Quan sát.
- Kết quả mong đợi: Trang tải bình thường với dữ liệu mặc định; param lạ hoặc sai kiểu (`page=abc`) không gây lỗi, không gây request 500.

### J. Trường hợp tiêu cực & biên (Negative / Edge)

**TC-MCH-090 · Keyword tìm kiếm cực dài** — Mức độ ưu tiên: Thấp · Loại: Biên

- Các bước: 1) Dán chuỗi 300+ ký tự vào ô tìm kiếm. 2) Chờ phản hồi.
- Kết quả mong đợi: UI không đứng/tràn layout; request không lỗi 414/500; kết quả rỗng được xử lý như empty state bình thường.

**TC-MCH-091 · Keyword chỉ gồm khoảng trắng** — Mức độ ưu tiên: Thấp · Loại: Biên

- Các bước: 1) Gõ 3 dấu cách vào ô tìm kiếm. 2) Chờ phản hồi.
- Kết quả mong đợi: Được xử lý như tìm kiếm rỗng (hiện danh sách đầy đủ) hoặc trả empty state rõ ràng — không rơi vào loading treo.

**TC-MCH-092 · API danh sách merchant trả lỗi 500** — Mức độ ưu tiên: Cao · Loại: Tiêu cực

- Các bước: 1) Dùng `page.route()` chặn endpoint danh sách, trả 500. 2) Tải trang.
- Kết quả mong đợi: Hiển thị error state/thông báo lỗi cho người dùng; không trang trắng, không skeleton loading vĩnh viễn, không uncaught exception.

**TC-MCH-093 · Mạng chậm & offline** — Mức độ ưu tiên: Trung bình · Loại: Tiêu cực

- Các bước: 1) Làm trễ response ~5s → quan sát trạng thái loading. 2) Abort request → quan sát.
- Kết quả mong đợi: Có chỉ báo loading trong lúc chờ; khi request thất bại có thông báo lỗi (kèm khả năng thử lại nếu app hỗ trợ), không mất khung sườn trang.

**TC-MCH-094 · Số trang vượt quá tổng số trang** — Mức độ ưu tiên: Thấp · Loại: Biên

- Các bước: 1) Mở `/pos/merchants?page=9999`. 2) Quan sát.
- Kết quả mong đợi: Hiển thị empty state hoặc tự kẹp về trang cuối/trang 1; không crash, không lỗi 500.

**TC-MCH-095 · Payload XSS trong ô tìm kiếm** — Mức độ ưu tiên: Cao · Loại: Bảo mật

- Các bước: 1) Gõ `<script>alert(1)</script>` vào ô tìm kiếm. 2) Quan sát trang và dialog.
- Kết quả mong đợi: Chuỗi được xử lý như text thuần (hiển thị escaped nếu được echo lại); **không** có dialog `alert` nào bật lên, không có script được thực thi.

**TC-MCH-096 · Đổi search/filter liên tục thật nhanh (race condition)** — Mức độ ưu tiên: Trung bình · Loại: Biên

- Các bước: 1) Gõ keyword rồi lập tức đổi filter trạng thái rồi lập tức xoá keyword, không chờ giữa các bước. 2) Chờ mạng rảnh. 3) Đối chiếu bảng với trạng thái control.
- Kết quả mong đợi: Bảng khớp với trạng thái **cuối cùng** của các control (response cũ đến muộn không được ghi đè kết quả mới); không nhân đôi dòng.

### K. Responsive

**TC-MCH-100 · Bố cục ở màn hình rộng (1920px)** — Mức độ ưu tiên: Trung bình · Loại: Responsive

- Các bước: Đặt viewport 1920×1080, quan sát trang.
- Kết quả mong đợi: Cả 8 cột hiển thị hết, không scroll ngang; thanh công cụ và bảng canh lề đúng.

**TC-MCH-101 · Bố cục ở 1366px** — Mức độ ưu tiên: Trung bình · Loại: Responsive

- Các bước: Đặt viewport 1366×768, quan sát.
- Kết quả mong đợi: Bảng vẫn đọc được, các cột co lại hoặc bảng có scroll ngang riêng; không có ô nào bị chồng chữ; sidebar không đè lên nội dung.

**TC-MCH-102 · Bố cục ở 1024px** — Mức độ ưu tiên: Trung bình · Loại: Responsive

- Các bước: Đặt viewport 1024×768, quan sát.
- Kết quả mong đợi: Sidebar thu gọn hoặc chuyển sang dạng ẩn/hiện; thanh công cụ có thể xuống dòng nhưng cả 2 control vẫn dùng được; header bảng vẫn khớp cột.

**TC-MCH-103 · Bố cục ở màn hình hẹp (768px)** — Mức độ ưu tiên: Thấp · Loại: Responsive

- Các bước: Đặt viewport 768×1024, quan sát.
- Kết quả mong đợi: Bảng scroll ngang **trong khung riêng** của nó, không làm cả trang scroll ngang; ô tìm kiếm và filter vẫn bấm được; không có chữ bị cắt mất.

### L. Khả năng tiếp cận (Accessibility)

**TC-MCH-110 · Thứ tự Tab hợp lý** — Mức độ ưu tiên: Trung bình · Loại: Khả năng tiếp cận

- Các bước: 1) Focus vào đầu vùng nội dung. 2) Nhấn Tab lần lượt và ghi lại element được focus.
- Kết quả mong đợi: Thứ tự focus đi theo trình tự thị giác: ô tìm kiếm → combobox trạng thái → các phần tử tương tác trong bảng (nếu có); không có bẫy focus, không focus vào element ẩn.

**TC-MCH-111 · Ô tìm kiếm có tên khả truy cập** — Mức độ ưu tiên: Trung bình · Loại: Khả năng tiếp cận

- Các bước: Kiểm accessible name của ô input.
- Kết quả mong đợi: Input có accessible name (từ `aria-label`, `<label>`, hoặc placeholder `"Search merchants by name or WHMCS ID..."`) và có `role="searchbox"`/`type="search"` phù hợp.

**TC-MCH-112 · Điều khiển dropdown trạng thái bằng bàn phím** — Mức độ ưu tiên: Trung bình · Loại: Khả năng tiếp cận

- Các bước: 1) Tab tới combobox. 2) Nhấn Enter/Space để mở. 3) Dùng phím mũi tên chọn option. 4) Nhấn Enter xác nhận. 5) Nhấn Escape để đóng ở lần mở khác.
- Kết quả mong đợi: Mở/chọn/đóng đều làm được hoàn toàn bằng bàn phím; Escape đóng dropdown mà không đổi giá trị; filter áp dụng đúng option đã chọn.

**TC-MCH-113 · Bảng dùng markup semantic** — Mức độ ưu tiên: Trung bình · Loại: Khả năng tiếp cận

- Các bước: Kiểm cấu trúc DOM/ARIA của bảng.
- Kết quả mong đợi: Truy cập được qua `getByRole('table')` với `columnheader` và `row` đúng chuẩn (không phải các `div` xếp cạnh nhau); số `columnheader` = 8.

**TC-MCH-114 · Độ tương phản màu của badge trạng thái** — Mức độ ưu tiên: Thấp · Loại: Khả năng tiếp cận

- Các bước: Đo tương phản chữ/nền của badge `Active`.
- Kết quả mong đợi: Đạt ngưỡng WCAG AA cho text nhỏ (≥ 4.5:1); trạng thái không **chỉ** được phân biệt bằng màu (có kèm nhãn chữ — đã đúng trong ảnh quét).

**TC-MCH-115 · Chỉ báo focus rõ ràng** — Mức độ ưu tiên: Trung bình · Loại: Khả năng tiếp cận

- Các bước: Tab qua lần lượt các control tương tác.
- Kết quả mong đợi: Mỗi control có focus ring/outline thấy rõ; không control nào bị `outline: none` mà không có thay thế.

### M. Hiệu năng (Performance)

**TC-MCH-120 · Thời gian tải trang trong ngưỡng cho phép** — Mức độ ưu tiên: Trung bình · Loại: Hiệu năng

- Các bước: 1) Đo từ lúc điều hướng tới lúc bảng có dòng đầu tiên. 2) Lặp 3 lần, lấy trung vị.
- Kết quả mong đợi: Bảng render trong ngưỡng đã thống nhất cho môi trường DEV (đề xuất ≤ 5s); không có khoảng trắng dài không có chỉ báo loading.

**TC-MCH-121 · Thời gian phản hồi của tìm kiếm** — Mức độ ưu tiên: Trung bình · Loại: Hiệu năng

- Các bước: Đo từ lúc gõ xong keyword đến lúc bảng cập nhật.
- Kết quả mong đợi: Kết quả cập nhật trong ~2s sau debounce; UI không bị khoá trong lúc chờ.

**TC-MCH-122 · Không có request trùng lặp khi tải trang** — Mức độ ưu tiên: Thấp · Loại: Hiệu năng

- Các bước: 1) Ghi lại toàn bộ network request khi tải trang. 2) Nhóm theo URL.
- Kết quả mong đợi: Endpoint danh sách merchant chỉ được gọi **một lần** cho lần render đầu (không double-fetch do StrictMode hay effect chạy hai lần).

### N. Bảo mật & phân quyền (Security)

**TC-MCH-130 · Chưa đăng nhập → redirect về trang login** — Mức độ ưu tiên: Cao · Loại: Bảo mật

- Điều kiện tiên quyết: Context trình duyệt sạch, không có storageState.
- Các bước: 1) Mở `/pos/merchants?tab=overview`. 2) Đọc URL cuối.
- Kết quả mong đợi: Redirect về `/login?redirect=%2Fpos%2Fmerchants`, hiển thị trang đăng nhập (`"Continue with GCI Business"` / `"Continue with Google"`); **không** rò rỉ dữ liệu merchant nào ra HTML. — ✅ _Hành vi này đã được xác minh trực tiếp trong lần quét 2026-08-18._

**TC-MCH-131 · Session hết hạn giữa phiên làm việc** — Mức độ ưu tiên: Cao · Loại: Bảo mật

- Các bước: 1) Vào trang Merchants với session hợp lệ. 2) Xoá/làm hỏng cookie `token` và `refreshToken`. 3) Kích hoạt một lần fetch lại (tìm kiếm hoặc đổi trang).
- Kết quả mong đợi: App xử lý 401 êm — đưa về `/login` hoặc hiện thông báo hết hạn; không hiện dữ liệu cũ như thể còn hợp lệ; không lặp vô hạn request.

**TC-MCH-132 · Tài khoản không phải admin không truy cập được** — Mức độ ưu tiên: Cao · Loại: Bảo mật

- Điều kiện tiên quyết: Có session của tài khoản staff/owner thường (không thuộc nhóm Internal).
- Các bước: 1) Mở trực tiếp `/pos/merchants`. 2) Quan sát.
- Kết quả mong đợi: Bị chặn — 403 / redirect / trang "không có quyền"; nhóm `Internal` **không** hiển thị trong sidebar; không dòng merchant nào của merchant khác bị lộ. Đây là test quan trọng nhất của màn hình vì dữ liệu là cross-tenant.

**TC-MCH-133 · Không lộ thông tin nhạy cảm trong payload** — Mức độ ưu tiên: Trung bình · Loại: Bảo mật

- Các bước: 1) Bắt response của endpoint danh sách merchant. 2) Soi các field trả về.
- Kết quả mong đợi: Response chỉ chứa các field cần cho bảng; không kèm secret (API key, token của merchant, hash mật khẩu, số tài khoản ngân hàng đầy đủ).

**TC-MCH-134 · Token không bị ghi ra console/DOM** — Mức độ ưu tiên: Trung bình · Loại: Bảo mật

- Các bước: 1) Ghi lại toàn bộ console output khi tải và tương tác với trang. 2) Tìm chuỗi giống JWT trong console và trong HTML đã render.
- Kết quả mong đợi: Không có access/refresh token nào bị log ra console hay nhúng vào HTML.

## 3. Tổng kết độ phủ (Coverage summary)

**Tổng số test case: 82**

Theo nhóm (dimension):

| Nhóm                         | Số TC | Dải ID         |
| ---------------------------- | ----- | -------------- |
| A. Tải trang & bố cục        | 6     | TC-MCH-001…006 |
| B. Điều hướng & sidebar      | 6     | TC-MCH-010…015 |
| C. Tìm kiếm merchant         | 9     | TC-MCH-020…028 |
| D. Lọc theo trạng thái       | 6     | TC-MCH-030…035 |
| E. Bảng dữ liệu              | 8     | TC-MCH-040…047 |
| F. Phân trang                | 6     | TC-MCH-050…055 |
| G. Định dạng dữ liệu         | 7     | TC-MCH-060…066 |
| H. Hành động dòng & chi tiết | 5     | TC-MCH-070…074 |
| I. Tham số URL & trạng thái  | 4     | TC-MCH-080…083 |
| J. Tiêu cực & biên           | 7     | TC-MCH-090…096 |
| K. Responsive                | 4     | TC-MCH-100…103 |
| L. Khả năng tiếp cận         | 6     | TC-MCH-110…115 |
| M. Hiệu năng                 | 3     | TC-MCH-120…122 |
| N. Bảo mật & phân quyền      | 5     | TC-MCH-130…134 |

**Các phần còn chưa chắc chắn — cần xác minh trực tiếp trước khi sinh code**

Có **12 test case** mang nhãn `[CẦN XÁC MINH]` trực tiếp (`TC-MCH-002`, `015`, `023`, `028`, `030`, `035`, `045`, `050`, `070`, `071`, `072`, `080`), cộng thêm `TC-MCH-032`, `047`, `082`, `051`…`055` phụ thuộc vào cùng các điểm chưa chốt đó. Ưu tiên chốt theo thứ tự:

1. **Hành vi click dòng** (`TC-MCH-070`, `071`, `072`) — quyết định luôn cần có Page Object cho trang/modal chi tiết hay không. Ảnh hưởng lớn nhất tới khối lượng code.
2. **Cơ chế phân trang** (`TC-MCH-050` → khoá cả `051`…`055`) — 13 dòng trong ảnh không đủ để kết luận; nếu không có phân trang thì bỏ hẳn nhóm F.
3. **Danh sách option của dropdown trạng thái** (`TC-MCH-030`, `032`) — cần tên option thật để viết assertion.
4. **Search/filter có ghi vào URL query hay không** (`TC-MCH-028`, `035`, `082`) — quyết định có test được deep-link không.
5. **Cơ chế tab `?tab=overview`** (`TC-MCH-002`, `080`) — có thanh tab thật hay chỉ là param dư.
6. **Nội dung empty state** (`TC-MCH-023`, `047`) — cần text chính xác.
7. **Header cột có sort được không** (`TC-MCH-045`).
8. **Nút toggle sidebar** (`TC-MCH-015`).

Ngoài ra:

- **Đã xác minh trực tiếp**: chỉ có `TC-MCH-130` (redirect `/login?redirect=%2Fpos%2Fmerchants`, quan sát được trong lần quét thất bại).
- **`TC-MCH-132`** cần một tài khoản non-admin — hiện chưa có trong `configs/env/.env.local`; cần chuẩn bị credential trước khi triển khai.
- **`TC-MCH-066`** (UTC offset) là câu hỏi nghiệp vụ, không chỉ là bug UI: cần xác nhận với team liệu `JOINED AT` nên render theo múi giờ người xem hay theo `TIMEZONE` của từng merchant.
- Cấu trúc sidebar trong ảnh 2026-08-18 khác bản quét tháng 7 → các test dùng route sidebar ở **mọi** màn hình khác nên được rà lại (`All Orders` vs `Orders`, `Customer Groups` đã biến mất).

## 4. Xác minh trực tiếp (2026-08-18)

Nguồn: quét DOM (`.claude/skills/screen-test-generator/scan-screen.mjs`) + 5 lượt thăm dò tương tác (dropdown, search, click dòng, phân trang, deep-link, bàn phím, responsive, payload API). Kết quả thô nằm trong `docs/test-cases/_scan/` (thư mục này bị gitignore) nên các phát hiện được ghi lại ở đây.

### 4.1 Chốt 12 điểm `[CẦN XÁC MINH]`

| Case                       | Câu hỏi treo                                   | Hành vi thật                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TC-MCH-002`, `080`, `081` | `?tab=overview` là redirect thật hay param dư? | **Chuẩn hoá thật**: `/pos/merchants` → `?tab=overview`; `tab` sai (vd `khong-ton-tai`) bị ghi lại về `overview`. Danh sách **không có** thanh tab — `role=tab` chỉ tồn tại trong view chi tiết merchant.                                                                                                                                                                                            |
| `TC-MCH-003`               | Tiêu đề có phải heading?                       | **Không**. Là `div[data-slot="page-title"]` trong `[data-slot="page-header"]`; trang **không có** h1–h6 nào. `document.title` = `Merchant Management                                                                                                                                                                                                                                                | Portal`. |
| `TC-MCH-015`               | Nút toggle sidebar ở đâu?                      | `[data-slot="sidebar-trigger"]` có trong DOM nhưng **ẩn** ở 1920/1366/1024/768. Không có affordance thu gọn ở desktop; ở 375px nút này mở drawer overlay.                                                                                                                                                                                                                                           |
| `TC-MCH-023`, `047`        | Empty state ghi gì?                            | Dòng `[data-slot="empty"]` với text **`No merchants found.`**; 8 header **vẫn hiển thị**; footer `Showing 0 to 0 of 0 results`.                                                                                                                                                                                                                                                                     |
| `TC-MCH-028`               | Search có ghi vào URL?                         | **Có**, param là **`q=`** (không phải `search=` như Staffs). Deep-link `?q=Bleu` khôi phục cả input và kết quả. Term toàn số bị bọc nháy: `q="2950"`.                                                                                                                                                                                                                                               |
| `TC-MCH-030`, `032`        | Option dropdown là gì?                         | Đúng 3 option: **`All statuses`**, **`Active`**, **`Inactive`**. Trigger là `button[role="combobox"][aria-label="Filter by status"]`.                                                                                                                                                                                                                                                               |
| `TC-MCH-035`               | Filter có ghi vào URL?                         | **Có**: `status=active` / `status=inactive`; reset ghi `status=all` (không xoá param). Sống sót qua reload.                                                                                                                                                                                                                                                                                         |
| `TC-MCH-045`               | Header cột sort được?                          | **Không**. `<th>` trơn: không `role`, không `aria-sort`, không `<button>`, `cursor: auto`. Click 2 lần không đổi thứ tự, không đổi URL.                                                                                                                                                                                                                                                             |
| `TC-MCH-050`…`055`         | Có phân trang?                                 | **Có**, giống Staffs: footer `Showing X to Y of Z results` + `Previous`/`Next` + chỉ báo `1 / 1`. **Page size = 30**. DEV có 13 merchant → 1 trang, cả 2 nút disabled.                                                                                                                                                                                                                              |
| `TC-MCH-070`               | Click dòng làm gì?                             | **Không** đổi route, **không** modal. URL giữ `/pos/merchants` + thêm `merchantId="<whmcsId>"`; bảng danh sách **unmount hoàn toàn** (0 `<table>`, 0 ô search) và thay bằng dashboard chi tiết merchant: badge `#<id>`, `Generate Token`, `Open in portal`, 10 tab (Overview/Staff/Services/Orders/Devices/Payroll/Income/Customers/Settings/Report Config). Deep-link được; Back về lại danh sách. |
| `TC-MCH-071`               | Ô `#`/tên có phải link?                        | **Không** — trong `<tr>` không có `a[href]` nào; cả dòng là click target (`cursor: pointer`).                                                                                                                                                                                                                                                                                                       |
| `TC-MCH-072`               | Chọn merchant có đổi ngữ cảnh store?           | **Không tự đổi**: link store-scoped trong sidebar giữ nguyên sau khi chọn. Việc chuyển ngữ cảnh **có**, nhưng là hành động tường minh: link `Open in portal` trong view chi tiết trỏ tới `/pos/<whmcsId>/overview`.                                                                                                                                                                                 |

### 4.2 Thông tin bổ sung thu được

- **Endpoint danh sách**: `GET https://volt-pos.<env>/merchant_settings?order[createdAt]=desc`; search thêm `&search=<term>`. Xác nhận **sort mặc định `createdAt` desc** (`TC-MCH-044`) từ chính request, không chỉ từ dữ liệu hiển thị.
- **Debounce có thật**: gõ 8 ký tự → đúng **1** request. Tải trang → đúng **1** request danh sách (không double-fetch StrictMode).
- **Payload sạch** (`TC-MCH-133`): `member[]` chỉ chứa `@id, @type, id, email, phoneNumber, businessName, legalName, signatureTiming, website, postalCode, address, status, city, country, state, createdAt, updatedAt` — không secret, không JWT. `phoneNumber` trả về E.164 (`+12052059929`), UI tự format `(205) 205-9929`.
- **Console khi tải trang**: có **1 lỗi 401** (`GET /sessions/current` → `POST /refresh_token` → gọi lại OK). Đây là cơ chế refresh token nên đã whitelist trong `TC-MCH-006`.
- **Search biên**: chỉ khoảng trắng → full list (backend trim); 300 ký tự → empty state, không 414/500; XSS payload → không dialog, escaped, empty state; `Nail's` / `Arlington LLC` / `- QC` đều khớp đúng.
- **Responsive**: **không** scroll ngang ở cả 1920/1366/1024/768. Từ 1366 xuống, bảng tự scroll trong `[data-slot="scroll-area-viewport"]`. Sidebar **không** thu gọn ở 1024 (khác kỳ vọng `TC-MCH-102`).
- **Bàn phím** (`TC-MCH-112`): Enter mở listbox (3 option, `aria-expanded=true`), ArrowDown+Enter chọn `Active` → `status=active`, Escape đóng không đổi giá trị. Lưu ý khi viết test: lúc listbox mở, Radix set `aria-hidden` cho phần còn lại của trang → **không** query lại trigger bằng role trong lúc đó; và cần chờ listbox nhận focus trước khi bấm ArrowDown.
- **Focus** (`TC-MCH-110`, `115`): thứ tự Tab = search → status filter → (document) → rail sản phẩm. Focus ring vẽ bằng `box-shadow` (`outline: none`). **Dòng bảng không focus được** (defect D4).
- **Sidebar Internal hrefs**: `Merchants` `/pos/merchants`, `Onboarding` `/pos/onboarding`, `Packages` `/pos/admin/packages`, `All Orders` `/pos/admin/orders`, `Devices` `/pos/admin/devices`, `Monitor` `/pos/admin/monitor`, `Versions` `/pos/admin/versions`, `Settings` `/pos/admin/setting`. Mục active có `aria-current="page"` + `data-active="true"`.

### 4.3 Defect phát hiện trong lúc xác minh

| #      | Mức độ     | Mô tả                                                                                                                                                                                                                                                     | Case liên quan      |
| ------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| **D1** | Cao        | Trên route admin `/pos/merchants`, toàn bộ link store-scoped trong sidebar (nhóm Operations + Management) render thành **`/pos/undefined/<screen>`** — Overview/Orders/Staffs/… là link chết cho tới khi rời màn hình. Chọn merchant cũng không sửa được. | `TC-MCH-072`        |
| **D2** | Cao        | Khi API danh sách trả **500**, app **không** hiện error state: vẫn render header bảng + `Showing 0 to 0 of 0 results`, **không phân biệt được** với "không có merchant nào".                                                                              | `TC-MCH-092`        |
| **D3** | Trung bình | `page` ngoài phạm vi **không bị kẹp**: `?page=2` với 13 kết quả → footer `Showing 31 to 13 of 13 results`, chỉ báo `2 / 1`; `?page=9999` → `Showing 299941 to 13 of 13 results`, chỉ báo `9999 / 1`.                                                      | `TC-MCH-054`, `094` |
| **D4** | Trung bình | Dòng bảng click được (mở chi tiết merchant) nhưng **không focus được** và không có affordance bàn phím → người dùng chỉ dùng bàn phím **không thể** mở merchant nào.                                                                                      | `TC-MCH-110`        |
| **D5** | Trung bình | Badge STATUS: chữ xanh trên nền xanh nhạt alpha 10%, text 12px — tương phản đo được **thấp hơn ngưỡng WCAG AA 4.5:1**. (Vẫn có nhãn chữ nên không vi phạm "chỉ phân biệt bằng màu".)                                                                      | `TC-MCH-114`        |
| **D6** | Thấp       | Ô tìm kiếm là `type="text"`, không `aria-label`, không `<label>`, không `role="searchbox"` — accessible name chỉ đến từ placeholder.                                                                                                                      | `TC-MCH-111`        |
| **D7** | Thấp       | Tiêu đề trang không phải heading (trang không có h1–h6 nào) → screen reader không có landmark tiêu đề.                                                                                                                                                    | `TC-MCH-003`        |

### 4.4 Code test đã sinh

Page Object: `src/pages/merchants/MerchantsPage.ts` — kèm `MerchantDetailView`, `MerchantColumn`, `MERCHANT_COLUMNS`, `MERCHANT_STATUS_OPTIONS`. Fixture: `merchantsPage` (`src/fixtures/pages.fixture.ts`). Route: `Urls.MERCHANTS` (**không** store-scoped).

| File                                                     | Nhóm | Case               |
| -------------------------------------------------------- | ---- | ------------------ |
| `tests/e2e/merchants/TC1-page-load-layout.e2e.spec.ts`   | A    | `TC-MCH-001`…`006` |
| `tests/e2e/merchants/TC2-navigation.e2e.spec.ts`         | B    | `TC-MCH-010`…`015` |
| `tests/e2e/merchants/TC3-search.e2e.spec.ts`             | C    | `TC-MCH-020`…`028` |
| `tests/e2e/merchants/TC4-status-filter.e2e.spec.ts`      | D    | `TC-MCH-030`…`035` |
| `tests/e2e/merchants/TC5-table.e2e.spec.ts`              | E    | `TC-MCH-040`…`047` |
| `tests/e2e/merchants/TC6-pagination.e2e.spec.ts`         | F    | `TC-MCH-050`…`055` |
| `tests/e2e/merchants/TC7-data-formatting.e2e.spec.ts`    | G    | `TC-MCH-060`…`066` |
| `tests/e2e/merchants/TC8-row-actions-detail.e2e.spec.ts` | H    | `TC-MCH-070`…`074` |
| `tests/e2e/merchants/TC9-url-state.e2e.spec.ts`          | I    | `TC-MCH-080`…`083` |
| `tests/e2e/merchants/TC10-negative-edge.e2e.spec.ts`     | J    | `TC-MCH-090`…`096` |
| `tests/e2e/merchants/TC11-responsive.e2e.spec.ts`        | K    | `TC-MCH-100`…`103` |
| `tests/e2e/merchants/TC12-accessibility.e2e.spec.ts`     | L    | `TC-MCH-110`…`115` |
| `tests/e2e/merchants/TC13-performance.e2e.spec.ts`       | M    | `TC-MCH-120`…`122` |
| `tests/e2e/merchants/TC14-security.e2e.spec.ts`          | N    | `TC-MCH-130`…`134` |

**Lưu ý khi bảo trì**:

- `TC-MCH-132` (tài khoản non-admin) là `test.fixme` — cần capture `storageState` thứ hai cho account giới hạn quyền. Đây là case quan trọng nhất còn thiếu vì dữ liệu màn hình này là cross-tenant.
- `TC-MCH-052`, `055` tự `test.skip` khi DEV chỉ có 1 trang dữ liệu (13 < 30 merchant); tự chạy khi vượt 30 merchant, không cần sửa code.
- `TC-MCH-065` tự `test.skip` nếu không merchant nào được gán package.
- `TC-MCH-070`…`072`, `092`, `093`, `131` chạy trên fixture `isolatedPage` vì Portal **ghi nhớ** merchant đang chọn / có thể xoá session — không được để rò sang context dùng chung của worker.
- `TC-MCH-114` đo tương phản thật (paint màu lên canvas 1×1 để quy đổi `oklch`/`oklab` + alpha về sRGB) rồi ghi annotation defect, **không** assert cứng ngưỡng 4.5:1 — D5 là lỗi sản phẩm đang tồn tại. Đổi annotation thành `expect(...).toBeGreaterThanOrEqual(4.5)` sau khi palette được sửa.
- Các case chạm defect D1–D3 assert **hành vi hiện tại** + ghi annotation `defect`, để suite không đỏ vì lỗi sản phẩm đã biết mà vẫn hiện lỗi trong report. Khi app được sửa, annotation tự tắt và assert vẫn đúng.
