# Test case: Màn hình Staffs (Nhân viên)

- **Route danh sách**: `/pos/<STORE_ID>/staffs` (query: `page`, `status`, `orderCreatedAt`, `search`)
- **Route chi tiết**: `/pos/<STORE_ID>/staffs/<staffId>?tab=profile`
- **Ngày quét**: 2026-07-21
- **Nguồn dữ liệu quét**: `docs/test-cases/_scan/staffs.json`, `staffs-interactions.json`, `staffs-interactions2.json` (+ ảnh chụp màn hình cùng thư mục)

## 1. Kiểm kê tính năng (Feature inventory)

**Khung sườn chung**: sidebar trái (POS: Overview/Orders/Payroll/Batch History; Management: Staffs/Services/Customers/Customer Groups/Income Reports/Settings; Admin cho tài khoản admin), thanh trên cùng có bộ chọn store "Volt POS 14 Dev #14", nút "Toggle Sidebar", user menu.

**Trang danh sách "Staffs"**:

- Thanh công cụ: ô tìm kiếm placeholder `"Search by nick name, staff code, phone..."`; combobox lọc trạng thái (mặc định "Active", có option "Inactive"); combobox sắp xếp (mặc định "Newest first", có option "Oldest first"); nút `"Export"`; nút `"Create"`.
- Bảng dữ liệu cột: STAFF, PHONE, EMAIL, CODE, JOINED AT (định dạng `"Jul 21, 2026 (UTC+7)"`), STATUS (badge Active/Inactive). Ô trống hiển thị `"-"`.
- Phân trang: 30 dòng/trang, footer `"Showing X to Y of Z results"`, nút Previous/Next, chỉ số trang dạng `"1 / 7"` (dữ liệu quét được có 196 nhân viên = 7 trang). Previous bị disable ở trang 1.
- Click vào một dòng nhân viên → điều hướng (không phải modal) sang trang chi tiết `/staffs/<uuid>?tab=profile`.
- Tìm kiếm hoạt động theo tên/mã/điện thoại gần như tức thời (đã xác nhận: tìm `"trine"` chỉ trả về đúng 1 dòng khớp); tìm chuỗi không tồn tại trả về bảng rỗng, footer hiển thị `"Showing 0 to 0 of 0 results"`.

**Dialog "Create New Staff"** (mở từ nút Create): tiêu đề + mô tả "Add a new staff member. Fill in all required fields." Các trường: Profile Photo (upload JPG/PNG ≤5MB, nút "Upload"), toggle "Allow Booking", First Name, Last Name, Nick Name, Phone, Email, SSN, Street Address, Country (select, mặc định "Select country"), State (select, mặc định "Select state"), City, Postal/Zip Code, Staff Role (select: Staff/Owner/Manager/Partner, mặc định Staff), Status (select: Active/Inactive, mặc định Active), Staff Code, Color (color picker). Footer: "Cancel", "Create Staff"; có icon Close (X).

**Dialog "Export Employee"** (mở từ nút Export): mô tả "Choose format, filters, and columns to export staff." Export Format: Excel (.xlsx) / CSV (.csv). Bộ lọc: Status (mặc định All), Compensation Type (mặc định All), Role (mặc định All). "Select Columns to Export" theo nhóm: BASIC INFO (First Name, Last Name, Nickname, Code, Status, Allow Booking), CONTACT (Phone, Email, Address, State, City, Country, Zip Code), WORK INFO (Role, SSN, Compensation). Footer: "Cancel", "Export"; có icon Close.

**Trang chi tiết nhân viên** (`?tab=profile`): header hiển thị nick name (vd "Duyduyy"), badge Status (Active), nhãn/toggle "Appointment Staff". Các tab: **Profile**, **Role & Permissions**, **Compensation**, **Service Skills**, **Work Hours** (chuyển tab qua query `?tab=`).

- Tab **Profile**: khối "Profile Information" — ảnh đại diện + nút "Change", các trường giống dialog Create (First/Last/Nick Name, Phone, Email, SSN, Street Address, Country, State, City, Zip Code, Staff Role, Staff Code, Color); footer "Save Changes".
- Tab **Role & Permissions**: có control "Expand All"; footer "Cancel"/"Save Changes".
- Tab **Compensation**, **Service Skills**, **Work Hours**: mỗi tab có footer Cancel/Save Changes riêng (chưa quét chi tiết từng field — cần xác minh trực tiếp).

**Định dạng dữ liệu**: JOINED AT = `"MMM D, YYYY (UTC±H)"`; Phone = định dạng US `"(555) 010-0016"` hoặc rỗng; Email rỗng hiển thị `"-"`; STATUS badge màu xanh cho Active.

**Ghi chú giới hạn quét**: Không có test-id lộ ra trong DOM. Chưa quét sâu field-by-field của 4 tab còn lại (Role & Permissions, Compensation, Service Skills, Work Hours) — cần xác minh trực tiếp trên môi trường thật. ID store nên lấy từ biến môi trường `STORE_ID`, không hard-code `14`.

## 2. Test case

### A. Tải trang & bố cục (Page load / Layout)

**TC-STF-001 · Tải trang Staffs qua điều hướng trực tiếp** — Mức độ ưu tiên: Cao · Loại: Điều hướng

- Điều kiện tiên quyết: Đã đăng nhập với session hợp lệ.
- Các bước:
  1. Điều hướng trực tiếp tới `/pos/<STORE_ID>/staffs`.
  2. Chờ trang tải xong.
- Kết quả mong đợi: URL cuối cùng có dạng `...staffs?page=1&status=active&orderCreatedAt=desc`; tiêu đề "Staffs" hiển thị; bảng dữ liệu và thanh công cụ render đầy đủ, không lỗi console.

**TC-STF-002 · Điều hướng tới Staffs từ sidebar Management** — Mức độ ưu tiên: Cao · Loại: Điều hướng

- Điều kiện tiên quyết: Đang ở màn hình khác (vd Overview).
- Các bước: 1) Click "Staffs" trong nhóm "Management" ở sidebar. 2) Quan sát URL và nội dung.
- Kết quả mong đợi: Điều hướng đến `/pos/<STORE_ID>/staffs`, mục "Staffs" trong sidebar được highlight là active, nội dung trang khớp.

**TC-STF-003 · Reload (F5) giữ nguyên trạng thái trang** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Điều kiện tiên quyết: Đang ở trang Staffs với bộ lọc/tìm kiếm bất kỳ đã áp dụng qua URL.
- Các bước: 1) Áp dụng filter/search (URL có query params). 2) Nhấn F5.
- Kết quả mong đợi: Trang tải lại với cùng URL, session không bị đăng xuất, bộ lọc/tìm kiếm vẫn được áp dụng đúng theo query param.

**TC-STF-004 · Kiểm tra bố cục ở màn hình rộng và hẹp** — Mức độ ưu tiên: Trung bình · Loại: Responsive

- Các bước: 1) Xem trang ở 1920px. 2) Thu nhỏ xuống ~1366px, 1024px.
- Kết quả mong đợi: Thanh công cụ, bảng và phân trang không bị chồng lấp/cắt; không xuất hiện thanh cuộn ngang ngoài ý muốn ở các độ rộng phổ biến.

### B. Bảng danh sách nhân viên (Table)

**TC-STF-010 · Header cột đúng thứ tự và nhãn** — Mức độ ưu tiên: Cao · Loại: Giao diện

- Các bước: Quan sát header bảng.
- Kết quả mong đợi: Đúng 6 cột theo thứ tự STAFF, PHONE, EMAIL, CODE, JOINED AT, STATUS.

**TC-STF-011 · Dữ liệu dòng khớp với thông tin nhân viên thực tế** — Mức độ ưu tiên: Cao · Loại: Dữ liệu

- Các bước: 1) Chọn 1 nhân viên có đủ Phone/Email đã biết. 2) So sánh từng ô với dữ liệu nguồn.
- Kết quả mong đợi: Tên, phone (định dạng `(XXX) XXX-XXXX`), email, code, ngày gia nhập, trạng thái hiển thị chính xác.

**TC-STF-012 · Trường Phone/Email trống hiển thị placeholder** — Mức độ ưu tiên: Trung bình · Loại: Dữ liệu

- Điều kiện tiên quyết: Có nhân viên không có email (vd các dòng "ken5", "gege"...).
- Kết quả mong đợi: Ô Email trống hiển thị `"-"`, không hiển thị `null`/`undefined`.

**TC-STF-013 · Phân trang tới/lui hoạt động đúng** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Điều kiện tiên quyết: Danh sách có nhiều hơn 30 nhân viên (ví dụ 196 kết quả → 7 trang).
- Các bước: 1) Ghi nhận danh sách trang 1. 2) Click "Next". 3) Click "Previous".
- Kết quả mong đợi: Trang 2 hiển thị 30 dòng tiếp theo khác trang 1, chỉ số trang cập nhật (vd "2 / 7"); "Previous" quay lại đúng dữ liệu trang 1; nút "Previous" bị disable ở trang 1, "Next" bị disable ở trang cuối.

**TC-STF-014 · Điều hướng tới trang cuối** — Mức độ ưu tiên: Trung bình · Loại: Biên

- Các bước: Bấm "Next" liên tục tới trang cuối (7/7).
- Kết quả mong đợi: Trang cuối chỉ hiển thị số dòng còn lại (≤30), nút "Next" bị disable.

**TC-STF-015 · Click vào dòng điều hướng sang trang chi tiết đúng nhân viên** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: Click vào một dòng bất kỳ trong bảng.
- Kết quả mong đợi: URL chuyển sang `/pos/<STORE_ID>/staffs/<uuid>?tab=profile`, tab "Profile" hiển thị thông tin đúng của nhân viên vừa click (tên, các field trùng khớp).

### C. Tìm kiếm & lọc (Search / Filter)

**TC-STF-020 · Tìm kiếm theo nick name trả về đúng kết quả** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: Nhập `"trine"` vào ô tìm kiếm.
- Kết quả mong đợi: Bảng chỉ còn dòng có nick name khớp (đã xác minh: chỉ 1 dòng "trine" được trả về), URL cập nhật `search=trine`.

**TC-STF-021 · Tìm kiếm không khớp hiển thị trạng thái rỗng** — Mức độ ưu tiên: Cao · Loại: Tiêu cực

- Các bước: Nhập chuỗi không tồn tại, vd `"zzz_no_such_staff_zzz"`.
- Kết quả mong đợi: Bảng không còn dòng nào, footer hiển thị `"Showing 0 to 0 of 0 results"`, không có lỗi console.

**TC-STF-022 · Xóa nội dung tìm kiếm khôi phục danh sách đầy đủ** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Nhập từ khóa lọc danh sách. 2) Xóa hết nội dung ô tìm kiếm.
- Kết quả mong đợi: Danh sách đầy đủ (196 kết quả / 7 trang) được khôi phục.

**TC-STF-023 · Lọc theo Status = Inactive** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Mở combobox trạng thái (mặc định "Active"). 2) Chọn "Inactive".
- Kết quả mong đợi: URL đổi `status=inactive`, bảng chỉ hiển thị nhân viên có badge "Inactive"; nếu không có nhân viên inactive, hiển thị trạng thái rỗng đúng chuẩn (mục B/TC-STF-021 style).

**TC-STF-024 · Đổi thứ tự sắp xếp Newest/Oldest first** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Mở combobox sắp xếp. 2) Chọn "Oldest first".
- Kết quả mong đợi: URL đổi `orderCreatedAt=asc`, thứ tự dòng theo JOINED AT tăng dần (nhân viên gia nhập sớm nhất hiển thị đầu tiên).

**TC-STF-025 · Kết hợp tìm kiếm + lọc trạng thái (AND)** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Nhập từ khóa khớp nhiều nhân viên ở cả 2 trạng thái. 2) Áp thêm filter Status = Inactive.
- Kết quả mong đợi: Chỉ hiển thị nhân viên vừa khớp từ khóa vừa có status Inactive (giao, không phải hợp).

**TC-STF-026 · Đổi filter/search reset về trang 1** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Điều kiện tiên quyết: Đang ở trang ≥2 của danh sách chưa lọc.
- Các bước: 1) Điều hướng tới trang 2. 2) Nhập từ khóa tìm kiếm mới.
- Kết quả mong đợi: Danh sách tự động quay về `page=1` với kết quả đã lọc, không hiển thị trang trống ngoài phạm vi.

**TC-STF-027 · Tìm kiếm với ký tự đặc biệt không gây lỗi** — Mức độ ưu tiên: Trung bình · Loại: Bảo mật

- Các bước: Nhập chuỗi ký tự đặc biệt, vd `%, _, ', --, <script>` vào ô tìm kiếm.
- Kết quả mong đợi: Ứng dụng xử lý như chuỗi tìm kiếm thông thường, trả về kết quả rỗng hợp lệ, không có lỗi JS/stack trace, không thực thi script.

**TC-STF-028 · Reload trang khi URL có sẵn query params lọc/sắp xếp/tìm kiếm** — Mức độ ưu tiên: Trung bình · Loại: Dữ liệu

- Các bước: 1) Áp dụng search + status + sort. 2) Copy URL, mở tab mới với URL đó.
- Kết quả mong đợi: Trang khôi phục đúng trạng thái lọc/tìm kiếm/sắp xếp theo query param, không có trạng thái lai tạp.

### D. Tạo nhân viên mới (Create)

**TC-STF-030 · Mở dialog "Create New Staff"** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: Click nút "Create".
- Kết quả mong đợi: Dialog mở với tiêu đề "Create New Staff", đầy đủ các trường: Profile Photo, Allow Booking, First/Last/Nick Name, Phone, Email, SSN, Street Address, Country, State, City, Zip Code, Staff Role (mặc định "Staff"), Status (mặc định "Active"), Staff Code, Color; nút "Cancel" và "Create Staff".

**TC-STF-031 · Tạo nhân viên thành công với dữ liệu hợp lệ** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Mở dialog Create. 2) Điền First Name, Last Name, Nick Name và các trường bắt buộc hợp lệ. 3) Click "Create Staff".
- Kết quả mong đợi: Thông báo tạo thành công hiển thị, dialog đóng, nhân viên mới xuất hiện trong danh sách (ở đầu danh sách nếu sort mặc định Newest first).

**TC-STF-032 · Bỏ trống trường bắt buộc khi Create** — Mức độ ưu tiên: Cao · Loại: Tiêu cực

- Các bước: 1) Mở dialog Create. 2) Để trống các trường bắt buộc (vd First Name). 3) Click "Create Staff".
- Kết quả mong đợi: Form không submit, hiển thị lỗi validation dưới trường trống tương ứng.

**TC-STF-033 · Nhập Email/Phone sai định dạng khi Create** — Mức độ ưu tiên: Cao · Loại: Tiêu cực

- Các bước: 1) Nhập email không hợp lệ (vd `abc@`) hoặc phone không hợp lệ. 2) Submit.
- Kết quả mong đợi: Hiển thị lỗi định dạng tương ứng, form không được submit.

**TC-STF-034 · Upload ảnh đại diện đúng định dạng/kích thước** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Click "Upload". 2) Chọn file JPG/PNG < 5MB.
- Kết quả mong đợi: Ảnh preview hiển thị trong dialog thay cho placeholder mặc định.

**TC-STF-035 · Upload ảnh vượt quá 5MB hoặc sai định dạng bị từ chối** — Mức độ ưu tiên: Trung bình · Loại: Biên

- Các bước: Chọn file > 5MB hoặc định dạng không phải JPG/PNG.
- Kết quả mong đợi: Hệ thống từ chối file, hiển thị thông báo lỗi rõ ràng (vd "File quá lớn" / "Định dạng không hỗ trợ"), không crash dialog.

**TC-STF-036 · Chọn Staff Role và Status trong dialog Create** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Mở dropdown Staff Role, chọn từng option (Staff/Owner/Manager/Partner). 2) Mở dropdown Status, chọn "Inactive".
- Kết quả mong đợi: Giá trị chọn được phản ánh đúng trên dropdown và được lưu khi Create thành công.

**TC-STF-037 · Country → State là select phụ thuộc (nếu áp dụng)** — Mức độ ưu tiên: Thấp · Loại: Chức năng

- Các bước: Chọn 1 Country cụ thể, sau đó mở dropdown State.
- Kết quả mong đợi: Danh sách State hiển thị đúng các bang thuộc Country đã chọn (cần xác minh trực tiếp hành vi phụ thuộc này).

**TC-STF-038 · Click "Cancel" hoặc Close (X) huỷ tạo nhân viên** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Điền một số trường trong dialog Create. 2) Click "Cancel" (hoặc icon X).
- Kết quả mong đợi: Dialog đóng, không có nhân viên mới nào được tạo, dữ liệu đã nhập bị huỷ bỏ.

**TC-STF-039 · Đóng dialog Create bằng phím Esc** — Mức độ ưu tiên: Trung bình · Loại: Khả năng tiếp cận

- Các bước: Mở dialog Create, nhấn phím `Esc`.
- Kết quả mong đợi: Dialog đóng tương tự khi bấm Cancel/X, không có thay đổi dữ liệu.

**TC-STF-040 · Staff Code trùng lặp bị từ chối** — Mức độ ưu tiên: Trung bình · Loại: Tiêu cực

- Điều kiện tiên quyết: Biết một Staff Code đã tồn tại (vd `8899`).
- Các bước: Nhập Staff Code trùng khi tạo mới, submit.
- Kết quả mong đợi: Hiển thị lỗi báo trùng mã, không tạo được nhân viên mới với mã đã tồn tại.

### E. Xuất dữ liệu (Export)

**TC-STF-050 · Mở dialog "Export Employee"** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: Click nút "Export".
- Kết quả mong đợi: Dialog mở với Export Format (Excel/CSV), 3 bộ lọc (Status/Compensation Type/Role, mặc định All), danh sách checkbox cột chia 3 nhóm (BASIC INFO, CONTACT, WORK INFO), nút "Cancel"/"Export".

**TC-STF-051 · Xuất file Excel với cột mặc định** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Mở dialog Export. 2) Giữ định dạng Excel mặc định. 3) Click "Export".
- Kết quả mong đợi: File `.xlsx` được tải về (hoặc thông báo đang xử lý export hiển thị); dialog đóng sau khi hoàn tất; không có lỗi.

**TC-STF-052 · Xuất file CSV** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Chọn định dạng "CSV (.csv)". 2) Click "Export".
- Kết quả mong đợi: File `.csv` được tải về đúng định dạng đã chọn.

**TC-STF-053 · Bỏ chọn tất cả các cột trước khi Export** — Mức độ ưu tiên: Thấp · Loại: Biên

- Các bước: Bỏ tick toàn bộ checkbox cột, click "Export".
- Kết quả mong đợi: Hệ thống hoặc chặn export (yêu cầu chọn ít nhất 1 cột) hoặc export file chỉ có cột định danh tối thiểu — không tạo file rỗng gây lỗi ẩn.

**TC-STF-054 · Áp dụng bộ lọc Status/Role/Compensation Type trước khi Export** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Chọn Status = Active/Inactive cụ thể. 2) Click Export.
- Kết quả mong đợi: File xuất ra chỉ chứa nhân viên khớp bộ lọc đã chọn trong dialog Export (độc lập với filter trạng thái ngoài trang danh sách).

**TC-STF-055 · Đóng dialog Export bằng Cancel/X không xuất file** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: Mở dialog Export, click "Cancel" hoặc icon X.
- Kết quả mong đợi: Dialog đóng, không có file nào được tải về.

**TC-STF-056 · Export khi danh sách rỗng (đã áp filter/search không có kết quả)** — Mức độ ưu tiên: Thấp · Loại: Biên

- Điều kiện tiên quyết: Danh sách đang ở trạng thái 0 kết quả (vd sau khi tìm kiếm không khớp).
- Các bước: Click "Export" trong trạng thái này.
- Kết quả mong đợi: Hệ thống hiển thị thông báo rõ ràng không có dữ liệu để xuất, hoặc export file rỗng có cấu trúc hợp lệ (không lỗi, không file hỏng).

### F. Trang chi tiết nhân viên (Detail — tab Profile)

**TC-STF-060 · Tab mặc định khi mở trang chi tiết là Profile** — Mức độ ưu tiên: Cao · Loại: Điều hướng

- Các bước: Click vào 1 dòng nhân viên từ danh sách.
- Kết quả mong đợi: URL có `?tab=profile`, tab "Profile" được highlight active, hiển thị đúng thông tin nhân viên (nick name, status, "Appointment Staff").

**TC-STF-061 · Chuyển đổi giữa các tab (Profile/Role & Permissions/Compensation/Service Skills/Work Hours)** — Mức độ ưu tiên: Cao · Loại: Điều hướng

- Các bước: Lần lượt click từng tab.
- Kết quả mong đợi: Nội dung tab thay đổi tương ứng, URL cập nhật query `?tab=` đúng tên tab, không tải lại toàn trang (route cha giữ nguyên).

**TC-STF-062 · Chỉnh sửa thông tin Profile và Save Changes** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Ở tab Profile, đổi First Name/Last Name/Phone. 2) Click "Save Changes".
- Kết quả mong đợi: Thông báo lưu thành công hiển thị; reload lại trang, thông tin mới vẫn được giữ.

**TC-STF-063 · Sửa thông tin nhưng không lưu, điều hướng ra khỏi trang** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Sửa 1 trường bất kỳ ở tab Profile mà không Save. 2) Điều hướng sang màn hình khác (vd click "Orders").
- Kết quả mong đợi: Hoặc có cảnh báo "thay đổi chưa lưu", hoặc thay đổi bị huỷ bỏ khi quay lại (không lưu ngầm).

**TC-STF-064 · Đổi ảnh đại diện qua nút "Change"** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: Click "Change" cạnh Profile Photo, chọn ảnh hợp lệ.
- Kết quả mong đợi: Ảnh mới hiển thị preview; sau khi "Save Changes", ảnh được cập nhật và hiển thị lại đúng khi tải lại trang.

**TC-STF-065 · Đổi Staff Role tại trang chi tiết** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: 1) Đổi Staff Role từ "Staff" sang "Manager". 2) Save Changes.
- Kết quả mong đợi: Thay đổi được lưu, badge/role hiển thị đúng giá trị mới sau khi tải lại.

**TC-STF-066 · Đổi Status (Active ⇄ Inactive) tại trang chi tiết** — Mức độ ưu tiên: Cao · Loại: Chức năng

- Các bước: 1) Đổi status của nhân viên đang Active sang Inactive. 2) Save Changes. 3) Quay lại danh sách Staffs.
- Kết quả mong đợi: Badge status ở trang chi tiết cập nhật; ở danh sách, nhân viên này không còn hiển thị khi filter = Active và xuất hiện khi filter = Inactive.

**TC-STF-067 · Toggle "Appointment Staff"** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: Bật/tắt toggle "Appointment Staff", lưu thay đổi (nếu có nút save riêng hoặc lưu ngay lập tức — cần xác minh trực tiếp hành vi).
- Kết quả mong đợi: Trạng thái toggle được lưu và phản ánh đúng khi tải lại trang.

**TC-STF-068 · Tab "Role & Permissions" — Expand All** — Mức độ ưu tiên: Trung bình · Loại: Chức năng

- Các bước: Click "Expand All" ở tab Role & Permissions.
- Kết quả mong đợi: Tất cả nhóm quyền/permission được mở rộng hiển thị chi tiết; có thể Save Changes sau khi chỉnh sửa quyền.

**TC-STF-069 · Truy cập trực tiếp URL chi tiết với ID không tồn tại** — Mức độ ưu tiên: Trung bình · Loại: Tiêu cực

- Các bước: Điều hướng tới `/pos/<STORE_ID>/staffs/00000000-0000-0000-0000-000000000000?tab=profile`.
- Kết quả mong đợi: Hiển thị trạng thái lỗi/không tìm thấy rõ ràng (404 hoặc thông báo "Không tìm thấy nhân viên"), không crash trắng trang.

**TC-STF-070 · Truy cập trang chi tiết với `?tab=` giá trị không hợp lệ** — Mức độ ưu tiên: Thấp · Loại: Biên

- Các bước: Điều hướng tới `.../staffs/<uuid>?tab=unknown_tab`.
- Kết quả mong đợi: Ứng dụng fallback về tab mặc định "Profile" thay vì hiển thị màn hình trắng/lỗi.

### G. Bảo mật & phân quyền (Security)

**TC-STF-080 · Truy cập trực tiếp URL Staffs khi chưa đăng nhập** — Mức độ ưu tiên: Cao · Loại: Bảo mật

- Các bước: 1) Xoá session/cookie. 2) Điều hướng trực tiếp tới `/pos/<STORE_ID>/staffs`.
- Kết quả mong đợi: Bị chuyển hướng về trang đăng nhập trước khi bất kỳ dữ liệu nhân viên nào render.

**TC-STF-081 · Tài khoản không có quyền quản lý Staffs** — Mức độ ưu tiên: Cao · Loại: Bảo mật

- Điều kiện tiên quyết: Có tài khoản role giới hạn (không có quyền Staffs).
- Các bước: Đăng nhập tài khoản giới hạn, kiểm tra menu sidebar và truy cập URL trực tiếp.
- Kết quả mong đợi: Mục "Staffs" bị ẩn khỏi sidebar hoặc bị chặn khi truy cập URL trực tiếp (redirect/thông báo lỗi quyền truy cập).

**TC-STF-082 · Không rò rỉ dữ liệu nhân viên của store khác** — Mức độ ưu tiên: Cao · Loại: Bảo mật

- Điều kiện tiên quyết: Tài khoản chỉ có quyền trên Store hiện tại (STORE_ID), tồn tại store khác không thuộc quyền.
- Các bước: Thử sửa store id trong URL/API request sang store không thuộc quyền.
- Kết quả mong đợi: Backend trả về lỗi 403/404, không hiển thị dữ liệu nhân viên của store khác.

### H. Định dạng dữ liệu & trạng thái biên (Data / Edge)

**TC-STF-090 · Định dạng ngày JOINED AT nhất quán** — Mức độ ưu tiên: Trung bình · Loại: Dữ liệu

- Các bước: So sánh định dạng cột JOINED AT giữa nhiều dòng khác tháng/năm.
- Kết quả mong đợi: Tất cả theo cùng định dạng `"MMM D, YYYY (UTC±H)"`, không lẫn định dạng khác.

**TC-STF-091 · Badge Status hiển thị đúng màu theo từng trạng thái** — Mức độ ưu tiên: Trung bình · Loại: Giao diện

- Các bước: So sánh badge của nhân viên Active và Inactive.
- Kết quả mong đợi: Active hiển thị badge xanh; Inactive hiển thị badge với màu/style khác biệt rõ ràng (không trùng màu).

**TC-STF-092 · Tên nhân viên dài bị cắt bớt với dấu "…" và có thể xem đầy đủ** — Mức độ ưu tiên: Thấp · Loại: Giao diện

- Điều kiện tiên quyết: Có nhân viên tên rất dài (vd "E2E Comm Deduct" hoặc dài hơn).
- Các bước: Quan sát cột STAFF, hover vào tên bị cắt (nếu có).
- Kết quả mong đợi: Văn bản dài hiển thị cắt gọn không vỡ layout dòng bảng; tooltip (nếu có) hiển thị đầy đủ tên khi hover.

**TC-STF-093 · Danh sách rỗng khi store mới không có nhân viên nào** — Mức độ ưu tiên: Thấp · Loại: Biên

- Điều kiện tiên quyết: Store test không có bất kỳ nhân viên nào (cần xác minh trực tiếp, khó tái tạo trên store hiện có 196 bản ghi).
- Kết quả mong đợi: Hiển thị empty-state rõ ràng thay vì bảng chỉ có header, không có lỗi phân trang (`0 to 0 of 0`).

## 3. Tổng kết độ phủ (Coverage summary)

**Theo mức độ ưu tiên**: Cao 24 · Trung bình 27 · Thấp 8 (tổng 59 test case).

**Theo loại**:

- Chức năng (Functional): 26
- Điều hướng (Navigation): 5
- Tiêu cực (Negative): 6
- Biên (Edge): 8
- Giao diện (UI): 3
- Dữ liệu (Data): 3
- Bảo mật (Security): 4
- Khả năng tiếp cận (Accessibility): 1
- Responsive: 1

**Phần cần xác minh trực tiếp trên môi trường thật** (chưa quét đủ chi tiết qua DOM tĩnh):

- Field-by-field của 4 tab: Role & Permissions, Compensation, Service Skills, Work Hours (chỉ biết có footer Cancel/Save Changes và nút "Expand All" ở Role & Permissions).
- Hành vi lưu của toggle "Appointment Staff" (lưu ngay lập tức hay cần bấm Save Changes).
- Hành vi thực tế của export file (nội dung, tên file, có polling job xử lý bất đồng bộ hay tải về ngay).
- Ràng buộc phụ thuộc Country → State trong form (nếu có).
- Giới hạn ký tự tối đa/định dạng chính xác cho SSN, Staff Code, Phone.
- Cảnh báo "thay đổi chưa lưu" khi rời trang chi tiết — chưa xác nhận có tồn tại hay không.
- Phân quyền chi tiết theo role (Owner/Manager/Partner/Staff) đối với các action Create/Export/Edit/đổi Status.

## Lịch sử chạy

### 2026-07-22 10:37 (UTC+7)

- Lệnh: `npx playwright test tests/e2e/staffs --reporter=list`
- Kết quả: 14 passed, 17 failed, 25 skipped (tổng 56)
- Fail:
  - TC-STF-001 · Lands on default query params — heading "Staffs" không tìm thấy (`getByRole('heading', { name: /^staffs$/i })` timeout)
  - TC-STF-002 · Navigate từ sidebar Management — cùng lỗi thiếu heading "Staffs"
  - TC-STF-003 · Reload (F5) giữ trạng thái — cùng lỗi thiếu heading "Staffs"
  - TC-STF-013 · Phân trang tới/lui — pagination nav (`role=navigation name=/pagination/i`) không hiển thị trong 10s
  - TC-STF-015 · Click dòng → trang chi tiết — URL không đổi sang `/staffs/<id>?tab=profile`, ở lại trang danh sách
  - TC-STF-023 · Filter Status = Inactive — không tìm được combobox/button Status
  - TC-STF-024 · Đổi sort Oldest first — không tìm được combobox/button sort
  - TC-STF-025 · Search + Status filter (AND) — không tìm được combobox Status
  - TC-STF-028 · Reload với query params có sẵn — không tìm được combobox Status
  - TC-STF-030 · Mở dialog Create — strict mode violation: locator Status select khớp 3 elements (button + span + option ẩn)
  - TC-STF-036 · Chọn Staff Role/Status trong Create — cùng lỗi strict mode violation ở Status select
  - TC-STF-050 · Mở dialog Export Employee — lỗi khi mở dialog (assertion trên phần tử dialog)
  - TC-STF-060 · Detail mặc định vào tab Profile — click dòng không điều hướng, URL vẫn ở `/staffs?...` không có `tab=profile`
  - TC-STF-061 · Chuyển tab Profile/Role & Permissions/... — không tìm thấy tab "Profile" (do chưa vào được trang detail)
  - TC-STF-068 · Expand All ở Role & Permissions — hệ quả từ TC-STF-060/061 chưa vào được trang detail
  - TC-STF-069 · Truy cập ID không tồn tại — chưa xác minh được do lỗi điều hướng detail ở trên
  - TC-STF-090 · JOINED AT format nhất quán — dòng đầu bảng không khớp regex định dạng ngày mong đợi
- Ghi chú: nhiều lỗi có vẻ cùng gốc — locator `StaffsPage.pageTitle`/status filter/sort filter/click-row-to-navigate không khớp DOM thực tế (có thể do đổi selector hoặc trang chưa load xong khi assert). Cần xác minh lại selector trong `src/pages/staffs/` so với DOM thật trước khi chạy lại.

### 2026-07-22 (sau khi fix locator, nhiều vòng chạy lại)

- Lệnh: `npx playwright test tests/e2e/staffs --reporter=list` (chạy lặp lại nhiều lần sau mỗi vòng fix)
- Kết quả cuối: **29 passed, 2 failed, 25 skipped** (tổng 56) — tăng từ 14 passed ban đầu.
- Đã xác minh trực tiếp trên DOM thật (dùng session đã lưu, script Playwright độc lập) và sửa trong `src/pages/staffs/StaffsPage.ts`, `src/components/Pagination.ts`:
  - `pageTitle`: đổi từ `getByRole('heading', {name:/^staffs$/i})` (không tồn tại — trang không dùng thẻ heading cho tiêu đề) sang `[data-slot="page-title"]`.
  - `statusFilter`/`sortFilter`: đổi từ tìm theo tên "status"/"sort" (không khớp accessible name thật, tên thật là giá trị đang chọn như "Active"/"Newest first") sang `getByRole('combobox').filter({hasText: ...})`.
  - `Pagination` root: đổi từ `getByRole('navigation', {name:/pagination/i})` (nav đó là app-switcher, không phải pagination; pagination thực tế không dùng thẻ `<nav>`) sang `div` chứa nút "Previous".
  - `staffRoleSelect`/`statusSelect` (Create dialog): bỏ `.or(getByText(...))` dư thừa gây strict-mode violation (khớp cả button + span + option ẩn).
  - `colorPicker`: đổi từ `getByLabel(/color/i)` (không có label liên kết) sang scope theo `[data-slot="field"]` chứa text "Color".
  - `statusFilterSelect`/`compensationTypeFilterSelect`/`roleFilterSelect` (Export dialog): các dropdown này là `<button aria-haspopup="menu">` chứ không phải `role=combobox` → đổi sang locator theo id ổn định (`#export-statuses`, `#export-compensation-types`, `#export-roles`).
  - `profileTab`/`rolePermissionsTab`/`compensationTab`/`serviceSkillsTab`/`workHoursTab`: bỏ `.or(getByText(...))` dư thừa gây strict-mode violation (tab thật đã khớp `role=tab` tốt).
  - `expandAllButton`: nút thực tế toggle nhãn "Expand All" ⇄ "Collapse All" tuỳ trạng thái (permissions mặc định đã expand sẵn) — mở rộng regex thành `/expand all|collapse all/i`.
  - `StaffsPage.waitForReady()`: thêm chờ `resultsFooter` hiển thị và dòng đầu bảng có nội dung thật (không phải skeleton `animate-pulse`) — nguyên nhân gốc khiến click vào dòng đầu (TC-015/060) và check định dạng ngày (TC-090) fail ngẫu nhiên: dữ liệu bảng còn đang load/skeleton tại thời điểm assert dù ô search đã hiển thị.
  - Sửa 1 chỗ trong test code: `trang-chi-ti-t-nh-n-vi-n-detail-tab-profile.e2e.spec.ts` kỳ vọng sai `tab=role`, query param thật của app là `tab=permissions`.
- **2 lỗi còn lại — nghi là bug thật của ứng dụng, KHÔNG sửa locator để che giấu:**
  - TC-STF-069 (Truy cập ID không tồn tại): khu vực nội dung chính hiển thị **trắng hoàn toàn** (không có heading/text nào ngoài sidebar) khi vào `/staffs/<uuid-không-tồn-tại>?tab=profile` — không có thông báo lỗi/404 nào cả. Cần dev xác nhận đây có phải hành vi mong đợi không.
  - TC-STF-028 (Reload với search "trine" + filter Status=Inactive): sau khi `page.goto(url)` với query params kết hợp search+filter, dòng đầu bảng bị kẹt ở trạng thái skeleton (`animate-pulse`, không có text) quá 15s — nghi ngờ có race condition khi app re-hydrate state search+filter cùng lúc sau reload cứng.
- Report chi tiết: `npm run report` (reports/html); trace từng test tại `test-results/`.
- Report chi tiết: `npm run report` (reports/html); trace từng test tại `test-results/`.

### 2026-07-22 (2 vòng chạy tiếp theo, sau khi sửa strict-mode violation ở `emptyState`)

- Lệnh: `npx playwright test tests/e2e/staffs --reporter=list` (2 lần)
- Kết quả cả 2 lần: **29 passed, 2 failed, 25 skipped** (tổng 56) — không đổi số liệu, nhưng bản chất lỗi TC-STF-028 đã khác.
- Đã sửa `src/pages/staffs/StaffsPage.ts` — `emptyState` getter trước đó là `getByText(/no (staff|results|data)/i).or(locator('[data-slot="empty"]'))`, khớp cả `div[data-slot="empty"]` lẫn `div[data-slot="empty-title"]` con bên trong nó → strict mode violation (2 elements) khi bảng thực sự rỗng. Đổi thành chỉ `locator('[data-slot="empty"]')`.
- Fail còn lại (không đổi so với vòng trước, xác nhận lại là bug ứng dụng thật, không phải lỗi test):
  - TC-STF-028 (Reload search "trine" + Status=Inactive): sau khi sửa locator, lỗi đổi từ strict-mode-violation sang timeout thật — `table.rows.first()` resolve ra 4 `<tr>` nhưng nội dung vẫn rỗng ("") sau 15s. Xác nhận lại nghi vấn race condition: sau hard reload với search+filter kết hợp, hàng bảng bị kẹt ở trạng thái skeleton quá lâu.
  - TC-STF-069 (ID không tồn tại): vẫn hiển thị trắng hoàn toàn ở vùng nội dung chính, không có thông báo lỗi/404 nào.
- Report chi tiết: `npm run report` (reports/html); trace từng test tại `test-results/`.
