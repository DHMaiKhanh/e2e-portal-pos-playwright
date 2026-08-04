# Test case: Màn hình Customers (Khách hàng)

- **Route**: `/pos/14/customers` → chuyển hướng tới `/pos/14/customers?page=1&orderCreatedAt=desc`
- **Ngày quét**: 2026-08-04
- **Nguồn**: `_scan/customers.json` (+ ảnh chụp `_scan/customers.png`)

## 1. Kiểm kê tính năng (Feature inventory)

- **Chrome toàn cục**: sidebar trái (nhóm POS: Overview, Orders, Payroll, Batch History; nhóm Management: Staffs, Services, **Customers** (đang active), Customer Groups, Income Reports, Report Config, Settings; nhóm Admin: Onboarding, Merchants, Support 360, Orders, Packages, Devices, Monitor, Versions, Settings); top bar: nút chuyển store `"Volt POS 14 Dev #14"`, `"Toggle Sidebar"`, các tab `"POS"/"Payment"/"Business"/"Gift Card"`, `"Open user menu"`.
- **Tiêu đề trang**: "Customers" (chỉ là text, không có thẻ heading).
- **Ô tìm kiếm**: placeholder `"Search by name, phone..."` — tìm theo tên hoặc số điện thoại.
- **Bộ lọc nhóm**: nút dropdown `"All Groups"` — lọc theo customer group (dữ liệu nhóm lấy từ màn hình Customer Groups).
- **Bảng dữ liệu** với các cột: NAME, PHONE, EMAIL, GROUP, TOTAL VISITS, POINTS, CASHBACK BALANCE, LAST VISIT.
  - 30 dòng/trang, tổng 313 kết quả trên 11 trang (footer: `"Showing 1 to 30 of 313 results"`).
  - Điều hướng trang: nút `"Previous"` (disabled ở trang 1), chỉ số trang dạng text `"1 / 11"`, nút `"Next"`. URL cập nhật theo `?page=N&orderCreatedAt=desc`.
  - Tham số `orderCreatedAt=desc` cho thấy cột LAST VISIT có khả năng sắp xếp mặc định giảm dần; khả năng click-to-sort trên tiêu đề cột khác **chưa xác nhận được qua DOM**.
  - Định dạng dữ liệu: NAME hiển thị `"—"` khi khách hàng không có tên (chỉ có số điện thoại); PHONE định dạng `(XXX) XXX-XXXX`; EMAIL hiển thị `"—"` khi không có; GROUP hiển thị `"—"` khi chưa gán nhóm, hoặc tên nhóm (vd `"test 11111"`); TOTAL VISITS là số nguyên nhưng có sự **không nhất quán** giữa `"—"` và `"0"` cho giá trị 0 (cần xác minh trực tiếp); POINTS là số nguyên, mặc định `0`; CASHBACK BALANCE định dạng tiền tệ `"$0.00"`; LAST VISIT định dạng `"MMM D, YYYY (UTC+7)"` hoặc `"-"` nếu chưa từng ghé thăm.
  - Dữ liệu mẫu có các trường hợp biên: tên chứa ký tự đặc biệt (`"Test@@@!`*&^"`), tên giống số (`"UNKNOWN2227"`), các dòng test trùng lặp (`"test"`, `"test checkin"`), khách hàng có POINTS/TOTAL VISITS rất cao (5515 / 14).
- **Không phát hiện** tab, dialog/modal nào qua scanner; hành vi click vào một dòng để mở chi tiết khách hàng **chưa được xác nhận** — cần kiểm tra trực tiếp trên ứng dụng thật.
- **Không phát hiện** nút hành động chính nào (vd "Add Customer") trong lần quét này — cần xác minh trực tiếp.

> Không có heading tag, không có test id nào được expose trong DOM.

## 2. Test case

### 2.1 Tải trang & bố cục (Page load & layout)

**TC-CUS-001 · Tải màn hình Customers qua điều hướng trực tiếp và chuyển hướng URL chuẩn**

- Mức độ ưu tiên: Cao · Loại: Điều hướng
- Điều kiện tiên quyết: Đã đăng nhập với session hợp lệ; đang ở store "Volt POS 14 Dev #14" (store 14).
- Các bước:
  1. Điều hướng trực tiếp tới `/pos/14/customers`.
  2. Quan sát URL trên thanh địa chỉ.
  3. Chờ trang tải xong.
- Kết quả mong đợi: URL tự cập nhật/chuyển hướng thành `/pos/14/customers?page=1&orderCreatedAt=desc`; trang tải không lỗi và hiển thị đầy đủ nội dung màn hình Customers.

**TC-CUS-002 · Tất cả vùng nội dung của trang hiển thị đầy đủ khi tải lần đầu**

- Mức độ ưu tiên: Cao · Loại: Giao diện
- Điều kiện tiên quyết: Đang ở `/pos/14/customers?page=1&orderCreatedAt=desc` với dữ liệu sẵn có.
- Các bước:
  1. Tải trang Customers và chờ nội dung ổn định.
  2. Kiểm tra khu vực đầu trang.
  3. Kiểm tra khu vực bên dưới tiêu đề.
  4. Kiểm tra khu vực nội dung chính.
- Kết quả mong đợi: Tiêu đề "Customers" hiển thị; ô tìm kiếm với placeholder `"Search by name, phone..."` hiển thị; nút lọc `"All Groups"` hiển thị; bảng dữ liệu với các cột NAME, PHONE, EMAIL, GROUP, TOTAL VISITS, POINTS, CASHBACK BALANCE, LAST VISIT hiển thị; footer phân trang với `"Showing 1 to 30 of 313 results"`, `"Previous"`, `"1 / 11"`, `"Next"` hiển thị đầy đủ.

**TC-CUS-003 · Chrome toàn cục hiển thị đúng, mục "Customers" được đánh dấu active**

- Mức độ ưu tiên: Cao · Loại: Giao diện
- Điều kiện tiên quyết: Đang ở `/pos/14/customers`.
- Các bước:
  1. Tải trang Customers.
  2. Kiểm tra sidebar trái, nhóm "Management".
  3. Kiểm tra top bar.
- Kết quả mong đợi: Sidebar hiển thị đầy đủ nhóm POS và Management với mục "Customers" được đánh dấu active/selected; top bar hiển thị store switcher, "Toggle Sidebar", các tab "POS"/"Payment"/"Business"/"Gift Card", "Open user menu" không bị chồng lấp hoặc thiếu.

**TC-CUS-004 · Bảng dữ liệu hiển thị đúng 30 dòng ở trang đầu với đủ số cột**

- Mức độ ưu tiên: Cao · Loại: Giao diện
- Điều kiện tiên quyết: Dataset có ít nhất 313 bản ghi.
- Các bước:
  1. Tải `/pos/14/customers?page=1&orderCreatedAt=desc`.
  2. Chờ dữ liệu bảng render xong.
  3. Đếm số dòng dữ liệu.
  4. Đếm số cột tiêu đề.
- Kết quả mong đợi: Bảng hiển thị đúng 30 dòng dữ liệu; đúng 8 cột theo thứ tự: NAME, PHONE, EMAIL, GROUP, TOTAL VISITS, POINTS, CASHBACK BALANCE, LAST VISIT; footer đọc `"Showing 1 to 30 of 313 results"`.

**TC-CUS-005 · Hiển thị trạng thái loading/skeleton trước khi dữ liệu bảng sẵn sàng**

- Mức độ ưu tiên: Cao · Loại: Giao diện
- Điều kiện tiên quyết: Có thể giả lập mạng chậm hoặc trì hoãn phản hồi API.
- Các bước:
  1. Giả lập mạng chậm (Slow 3G) hoặc trì hoãn API danh sách khách hàng.
  2. Điều hướng tới `/pos/14/customers`.
  3. Quan sát khu vực bảng ngay sau khi điều hướng, trước khi dữ liệu trả về.
  4. Chờ request hoàn tất và quan sát sự chuyển đổi.
- Kết quả mong đợi: Có chỉ báo loading/skeleton hiển thị trong khu vực bảng trong lúc chờ dữ liệu (không để trống trắng, không giật layout); khi dữ liệu về, skeleton được thay bằng bảng thật không còn sót lại hay chớp giật.

**TC-CUS-006 · Điều khiển phân trang hiển thị đúng trạng thái ban đầu ở trang 1**

- Mức độ ưu tiên: Cao · Loại: Giao diện
- Điều kiện tiên quyết: Đang ở `/pos/14/customers?page=1&orderCreatedAt=desc`.
- Các bước:
  1. Tải trang Customers ở trang 1.
  2. Kiểm tra trạng thái nút "Previous".
  3. Kiểm tra chỉ số trang.
  4. Kiểm tra trạng thái nút "Next".
- Kết quả mong đợi: Nút "Previous" bị disabled; chỉ số trang hiển thị `"1 / 11"`; nút "Next" ở trạng thái enabled; footer đọc `"Showing 1 to 30 of 313 results"`.

**TC-CUS-007 · Tải trực tiếp một trang cụ thể qua query param vẫn hiển thị đúng nội dung**

- Mức độ ưu tiên: Trung bình · Loại: Điều hướng
- Điều kiện tiên quyết: Dataset có 11 trang.
- Các bước:
  1. Điều hướng trực tiếp tới `/pos/14/customers?page=5&orderCreatedAt=desc`.
  2. Chờ trang tải xong.
  3. Kiểm tra bảng và footer phân trang.
- Kết quả mong đợi: Trang tải trực tiếp đến trang 5 mà không bị chuyển về trang 1; bảng hiển thị 30 dòng tương ứng; chỉ số trang đọc `"5 / 11"`; cả "Previous" và "Next" đều enabled; bố cục giống trang 1.

**TC-CUS-008 · Bố cục bảng không vỡ khi thu nhỏ cửa sổ trình duyệt (kiểm tra responsive)**

- Mức độ ưu tiên: Trung bình · Loại: Responsive
- Điều kiện tiên quyết: Đang ở `/pos/14/customers` với dữ liệu đã tải.
- Các bước:
  1. Tải trang ở độ rộng desktop chuẩn (vd 1440px).
  2. Thu nhỏ viewport xuống 1024px rồi 768px.
  3. Quan sát bảng, ô tìm kiếm, dropdown lọc, và footer phân trang ở mỗi độ rộng.
- Kết quả mong đợi: Không có tràn ngang ở body trang; bảng tự cuộn ngang trong khung riêng nếu cột không vừa, không phá vỡ sidebar/top bar; ô tìm kiếm, dropdown "All Groups", và điều khiển phân trang vẫn hiển thị và dùng được ở mọi độ rộng.

**TC-CUS-009 · Bố cục và tiêu đề trang được giữ nguyên sau khi tải lại trình duyệt**

- Mức độ ưu tiên: Trung bình · Loại: Chức năng
- Điều kiện tiên quyết: Đang ở `/pos/14/customers?page=1&orderCreatedAt=desc` với dữ liệu đã tải.
- Các bước:
  1. Tải trang Customers, xác nhận dữ liệu bảng hiển thị.
  2. Tải lại trình duyệt (F5).
  3. Chờ trang tải lại hoàn tất.
- Kết quả mong đợi: URL vẫn là `/pos/14/customers?page=1&orderCreatedAt=desc` sau khi tải lại; tất cả vùng (tiêu đề, tìm kiếm, lọc, bảng, phân trang) render lại đầy đủ; không có skeleton còn sót, không có lỗi console.

**TC-CUS-010 · Cột LAST VISIT phản ánh đúng thứ tự sắp xếp giảm dần mặc định (orderCreatedAt=desc)**

- Mức độ ưu tiên: Trung bình · Loại: Dữ liệu
- Điều kiện tiên quyết: Có nhiều khách hàng với ngày LAST VISIT khác nhau.
- Các bước:
  1. Tải `/pos/14/customers?page=1&orderCreatedAt=desc`.
  2. Kiểm tra tiêu đề cột LAST VISIT xem có chỉ báo sắp xếp (mũi tên/highlight) không.
  3. So sánh giá trị LAST VISIT từ trên xuống dưới các dòng hiển thị.
- Kết quả mong đợi: Cột LAST VISIT hiển thị giá trị giảm dần (mới nhất trước) khớp với tham số URL `orderCreatedAt=desc`; nếu có chỉ báo sắp xếp trực quan trên tiêu đề cột thì phản ánh đúng trạng thái giảm dần.

**TC-CUS-011 · Bảng vẫn hoạt động khi tham số page ngoài phạm vi hợp lệ**

- Mức độ ưu tiên: Thấp · Loại: Biên
- Điều kiện tiên quyết: Dataset có 11 trang.
- Các bước:
  1. Điều hướng trực tiếp tới `/pos/14/customers?page=999&orderCreatedAt=desc`.
  2. Quan sát trạng thái trang và bố cục kết quả.
- Kết quả mong đợi: Ứng dụng xử lý an toàn: hoặc giới hạn về trang hợp lệ cuối (11), hoặc chuyển về trang 1, hoặc hiển thị trạng thái rỗng rõ ràng — không được crash, hiển thị màn hình trắng/vỡ, hay để điều khiển phân trang ở trạng thái không nhất quán.

**TC-CUS-012 · Các ô thiếu dữ liệu hiển thị giá trị mặc định mà không vỡ bố cục dòng**

- Mức độ ưu tiên: Trung bình · Loại: Biên
- Điều kiện tiên quyết: Dataset có khách hàng thiếu NAME, EMAIL, GROUP, hoặc LAST VISIT (theo dữ liệu mẫu đã quét).
- Các bước:
  1. Tải `/pos/14/customers?page=1&orderCreatedAt=desc`.
  2. Tìm các dòng mà NAME, EMAIL, hoặc GROUP trống (khách hàng chỉ có số điện thoại).
  3. Kiểm tra các ô tương ứng.
- Kết quả mong đợi: Các ô không có dữ liệu hiển thị placeholder `"—"` cho NAME, EMAIL, GROUP, và `"-"` cho LAST VISIT khi chưa từng ghé thăm, không làm co lại chiều cao dòng hay lệch cột so với các dòng có đầy đủ dữ liệu.

### 2.2 Điều hướng (Navigation)

**TC-CUS-013 · Điều hướng tới Customers qua sidebar làm nổi bật trạng thái active và tải đúng URL**

- Mức độ ưu tiên: Cao · Loại: Điều hướng
- Điều kiện tiên quyết: Đã đăng nhập; sidebar hiển thị đầy đủ ở một màn hình khác (vd Staffs).
- Các bước:
  1. Click liên kết "Customers" trong nhóm Management của sidebar.
  2. Quan sát URL trình duyệt.
  3. Quan sát trạng thái trực quan của liên kết "Customers" trong sidebar.
- Kết quả mong đợi: URL điều hướng tới `/pos/14/customers` và chuyển hướng thành `/pos/14/customers?page=1&orderCreatedAt=desc`; mục "Customers" được đánh dấu active/highlight trong khi các mục sidebar khác không bị highlight.

**TC-CUS-014 · Chỉ có duy nhất mục Customers được highlight khi đang ở màn hình Customers**

- Mức độ ưu tiên: Trung bình · Loại: Giao diện
- Điều kiện tiên quyết: Đang ở `/pos/14/customers?page=1&orderCreatedAt=desc`.
- Các bước:
  1. Kiểm tra toàn bộ danh sách sidebar ở các nhóm POS, Management, Admin.
  2. Xác định mục nào đang có kiểu active/highlight.
- Kết quả mong đợi: Chỉ có "Customers" hiển thị active; không mục nào khác trong sidebar được highlight.

**TC-CUS-015 · Điều hướng khỏi Customers sang liên kết sidebar khác cập nhật highlight và URL**

- Mức độ ưu tiên: Cao · Loại: Điều hướng
- Điều kiện tiên quyết: Đang ở `/pos/14/customers`.
- Các bước:
  1. Click "Customer Groups" trong nhóm Management của sidebar.
  2. Quan sát URL và highlight sidebar.
  3. Click "Services" trong nhóm Management.
  4. Quan sát URL và highlight sidebar.
- Kết quả mong đợi: Mỗi lần click điều hướng đúng đến route tương ứng (vd `/pos/14/customer-groups`, `/pos/14/services`), highlight sidebar chuyển sang mục vừa click; "Customers" không còn được highlight.

**TC-CUS-016 · Nút Back của trình duyệt sau khi phân trang trả về đúng trạng thái trang trước và URL**

- Mức độ ưu tiên: Cao · Loại: Điều hướng
- Điều kiện tiên quyết: Đang ở `/pos/14/customers?page=1&orderCreatedAt=desc` với 313 kết quả trên 11 trang.
- Các bước:
  1. Click "Next" để tới trang 2 (URL thành `?page=2&orderCreatedAt=desc`).
  2. Click "Next" lần nữa để tới trang 3.
  3. Click nút Back của trình duyệt.
  4. Quan sát URL và chỉ số trang.
- Kết quả mong đợi: URL quay lại `?page=2&orderCreatedAt=desc`, chỉ số trang hiển thị `"2 / 11"`, dữ liệu bảng khớp với trang 2; mục "Customers" trong sidebar vẫn được highlight xuyên suốt.

**TC-CUS-017 · Nút "Toggle Sidebar" thu gọn/mở rộng sidebar mà không rời khỏi trang Customers**

- Mức độ ưu tiên: Cao · Loại: Giao diện
- Điều kiện tiên quyết: Đang ở `/pos/14/customers` với sidebar đang mở rộng.
- Các bước:
  1. Click nút "Toggle Sidebar" trên top bar.
  2. Quan sát chiều rộng/trạng thái sidebar và nội dung trang.
  3. Click "Toggle Sidebar" lần nữa.
- Kết quả mong đợi: Sau lần click đầu, sidebar thu gọn (vd chỉ icon hoặc ẩn) trong khi nội dung Customers và URL không đổi; sau lần click thứ hai, sidebar mở rộng lại đầy đủ với "Customers" vẫn active.

**TC-CUS-018 · Điều hướng trực tiếp bằng URL kèm query param giữ đúng trạng thái và highlight sidebar**

- Mức độ ưu tiên: Trung bình · Loại: Điều hướng
- Điều kiện tiên quyết: Đã đăng nhập.
- Các bước:
  1. Nhập trực tiếp URL `/pos/14/customers?page=3&orderCreatedAt=desc` vào thanh địa chỉ và Enter.
  2. Quan sát chỉ số trang, dữ liệu bảng, và highlight sidebar.
- Kết quả mong đợi: Trang tải hiển thị trang 3 (chỉ số `"3 / 11"`), bảng có dữ liệu tương ứng, liên kết "Customers" trong sidebar được highlight giống như khi điều hướng qua click.

**TC-CUS-019 · Tải lại trình duyệt trên URL có phân trang giữ nguyên trang và trạng thái sidebar**

- Mức độ ưu tiên: Trung bình · Loại: Điều hướng
- Điều kiện tiên quyết: Đang ở `/pos/14/customers?page=4&orderCreatedAt=desc`.
- Các bước:
  1. Tải lại trình duyệt hoàn toàn (F5).
  2. Quan sát URL, chỉ số trang, dữ liệu bảng, và highlight sidebar sau khi tải lại.
- Kết quả mong đợi: Sau khi tải lại, URL vẫn là `/pos/14/customers?page=4&orderCreatedAt=desc`, chỉ số trang vẫn `"4 / 11"`, đúng dữ liệu trang 4, và "Customers" vẫn được highlight.

### 2.3 Hành động chính (Core actions)

**TC-CUS-020 · Mở dropdown Group filter và chọn một nhóm cụ thể để lọc bảng**

- Mức độ ưu tiên: Cao · Loại: Chức năng
- Điều kiện tiên quyết: Đang ở `/pos/14/customers` với bộ lọc mặc định "All Groups" và đầy đủ 313 dòng.
- Các bước:
  1. Điều hướng tới `/pos/14/customers`.
  2. Click nút dropdown "All Groups".
  3. Chọn một nhóm cụ thể (vd "test 11111") từ danh sách.
  4. Quan sát bảng và footer phân trang.
- Kết quả mong đợi: Dropdown mở ra hiển thị danh sách nhóm khách hàng lấy từ màn hình Customer Groups; sau khi chọn, nhãn nút cập nhật thành tên nhóm đã chọn, bảng tải lại chỉ hiển thị khách hàng thuộc nhóm đó, số lượng kết quả ở footer cập nhật, và phân trang reset về trang 1.

**TC-CUS-021 · Đặt lại Group filter về "All Groups" khôi phục toàn bộ dữ liệu**

- Mức độ ưu tiên: Cao · Loại: Chức năng
- Điều kiện tiên quyết: Đang áp dụng một bộ lọc nhóm cụ thể.
- Các bước:
  1. Với bộ lọc nhóm đang áp dụng, click lại dropdown (đang hiển thị tên nhóm).
  2. Chọn "All Groups".
- Kết quả mong đợi: Nhãn nút trở lại "All Groups"; bảng tải lại toàn bộ kết quả không lọc (`"Showing 1 to 30 of 313 results"`); phân trang reset về trang 1.

**TC-CUS-022 · "Previous" bị disabled ở trang 1**

- Mức độ ưu tiên: Cao · Loại: Chức năng
- Điều kiện tiên quyết: Đang ở `/pos/14/customers?page=1&orderCreatedAt=desc`.
- Các bước:
  1. Tải trang Customers (trang 1).
  2. Kiểm tra nút "Previous".
- Kết quả mong đợi: Nút "Previous" hiển thị ở trạng thái disabled (không tương tác được, mờ đi trực quan) và click vào không gây điều hướng hay đổi URL.

**TC-CUS-023 · "Next" điều hướng tới trang 2 và cập nhật URL/bảng**

- Mức độ ưu tiên: Cao · Loại: Chức năng
- Điều kiện tiên quyết: Đang ở trang 1 với 11 trang tổng cộng.
- Các bước:
  1. Click nút "Next".
  2. Quan sát URL, dữ liệu bảng, và chỉ số trang.
- Kết quả mong đợi: URL cập nhật thành `?page=2&orderCreatedAt=desc`; bảng tải lại với 30 dòng tiếp theo (khách hàng 31-60); chỉ số trang cập nhật `"2 / 11"`; footer cập nhật `"Showing 31 to 60 of 313 results"`; nút "Previous" chuyển sang enabled.

**TC-CUS-024 · "Next" bị disabled ở trang cuối (11/11)**

- Mức độ ưu tiên: Cao · Loại: Chức năng
- Điều kiện tiên quyết: Điều hướng trực tiếp tới `/pos/14/customers?page=11&orderCreatedAt=desc`.
- Các bước:
  1. Tải trang 11 (trang cuối, còn lại ~13 kết quả).
  2. Kiểm tra nút "Next".
- Kết quả mong đợi: Nút "Next" bị disabled; click vào (nếu ép buộc) không gây điều hướng quá trang 11; footer hiển thị `"Showing 301 to 313 of 313 results"`.

**TC-CUS-025 · Click vào một dòng khách hàng có điều hướng tới chi tiết hay không**

- Mức độ ưu tiên: Cao · Loại: Điều hướng
- Điều kiện tiên quyết: Đang ở trang Customers với dữ liệu hiển thị.
- Các bước:
  1. Click vào bất kỳ đâu trên một dòng dữ liệu (vd dòng khách hàng "test checkin").
  2. Quan sát URL/trang kết quả.
- Kết quả mong đợi: Ứng dụng điều hướng tới trang/modal chi tiết khách hàng đó (nếu có); nếu chưa triển khai click-to-detail, dòng vẫn giữ nguyên, không có điều hướng hay lỗi xảy ra — cần xác minh hành vi thật trên ứng dụng vì scanner không xác nhận được.

**TC-CUS-026 · Sắp xếp qua tiêu đề cột LAST VISIT (nếu có thể click) đổi chiều sắp xếp**

- Mức độ ưu tiên: Trung bình · Loại: Chức năng
- Điều kiện tiên quyết: Đang ở trang Customers, URL mặc định `orderCreatedAt=desc`.
- Các bước:
  1. Click tiêu đề cột "LAST VISIT".
  2. Quan sát tham số URL và thứ tự dòng.
  3. Click lại tiêu đề "LAST VISIT" lần nữa.
- Kết quả mong đợi: Nếu sortable, lần click đầu cập nhật URL thành `orderCreatedAt=asc` và sắp xếp lại từ cũ đến mới; lần click thứ hai trở lại `desc`. Nếu không thể click/sort, tiêu đề không có phản ứng tương tác — cần xác minh thực tế và ghi nhận kết quả.

### 2.4 Ô tìm kiếm (Search input)

**TC-CUS-027 · Tìm kiếm khách hàng theo tên đầy đủ trả về đúng dòng khớp**

- Mức độ ưu tiên: Cao · Loại: Chức năng
- Điều kiện tiên quyết: Đang ở `/pos/14/customers` với 313 bản ghi đã tải.
- Các bước:
  1. Click vào ô tìm kiếm với placeholder `"Search by name, phone..."`.
  2. Nhập tên đầy đủ đã biết, vd `"test checkin"`.
  3. Chờ kết quả cập nhật.
- Kết quả mong đợi: Bảng làm mới chỉ hiển thị các dòng có NAME khớp `"test checkin"` (không phân biệt hoa/thường, khớp chuỗi con); footer cập nhật số lượng kết quả đã lọc.

**TC-CUS-028 · Tìm kiếm khách hàng theo số điện thoại trả về đúng dòng khớp**

- Mức độ ưu tiên: Cao · Loại: Chức năng
- Điều kiện tiên quyết: Đang ở `/pos/14/customers`.
- Các bước:
  1. Click vào ô tìm kiếm.
  2. Nhập số điện thoại thô (chỉ số) của một khách hàng đã biết.
  3. Chờ kết quả cập nhật.
- Kết quả mong đợi: Bảng lọc ra dòng có PHONE khớp bất kể định dạng hiển thị `(XXX) XXX-XXXX`.

**TC-CUS-029 · Tìm kiếm bằng nhiều biến thể định dạng số điện thoại đều trả về cùng kết quả**

- Mức độ ưu tiên: Cao · Loại: Dữ liệu
- Điều kiện tiên quyết: Biết một khách hàng có số hiển thị dạng `(XXX) XXX-XXXX`.
- Các bước:
  1. Tìm bằng số thô không định dạng, vd `4155550132`, ghi nhận kết quả và số lượng ở footer.
  2. Xóa và tìm bằng định dạng có gạch ngang `415-555-0132`, ghi nhận kết quả.
  3. Xóa và tìm bằng định dạng đầy đủ `(415) 555-0132`, ghi nhận kết quả.
- Kết quả mong đợi: Cả ba lần tìm trả về đúng cùng một dòng và cùng số lượng kết quả, xác nhận việc tìm kiếm chuẩn hóa định dạng số điện thoại một cách nhất quán.

**TC-CUS-030 · Xóa ô tìm kiếm khôi phục lại toàn bộ danh sách**

- Mức độ ưu tiên: Cao · Loại: Chức năng
- Điều kiện tiên quyết: Đã nhập từ khóa tìm kiếm và kết quả đang bị lọc.
- Các bước:
  1. Chọn toàn bộ nội dung ô tìm kiếm (Ctrl+A) và xóa (Delete/Backspace).
  2. Quan sát bảng.
- Kết quả mong đợi: Ô tìm kiếm trống; bảng trở lại danh sách đầy đủ (313 kết quả, 11 trang) theo sắp xếp mặc định `orderCreatedAt=desc`.

**TC-CUS-031 · Tìm kiếm không khớp bất kỳ khách hàng nào hiển thị trạng thái rỗng**

- Mức độ ưu tiên: Cao · Loại: Tiêu cực
- Điều kiện tiên quyết: Đang ở `/pos/14/customers`.
- Các bước:
  1. Nhập chuỗi chắc chắn không khớp bất kỳ khách hàng nào, vd `"zzzzznotarealcustomer999"`.
  2. Chờ kết quả cập nhật.
- Kết quả mong đợi: Bảng hiển thị 0 dòng kèm thông báo rỗng phù hợp; footer phản ánh 0 kết quả; cả "Previous" và "Next" đều disabled; không có lỗi xảy ra.

**TC-CUS-032 · Ô tìm kiếm chấp nhận ký tự đặc biệt có trong dữ liệu thực**

- Mức độ ưu tiên: Trung bình · Loại: Biên
- Điều kiện tiên quyết: Có khách hàng tên `"Test@@@!`*&^"` trong dữ liệu.
- Các bước:
  1. Nhập `"@@@!"` (một phần chuỗi bao gồm ký tự đặc biệt) vào ô tìm kiếm.
  2. Chờ kết quả cập nhật.
- Kết quả mong đợi: Ô tìm kiếm chấp nhận ký tự đặc biệt không gây lỗi phía client; khách hàng `"Test@@@!`*&^"` xuất hiện trong kết quả lọc.

**TC-CUS-033 · Tìm kiếm với khoảng trắng đầu/cuối được tự động cắt bỏ**

- Mức độ ưu tiên: Trung bình · Loại: Biên
- Điều kiện tiên quyết: Có khách hàng tên `"test"` trong dữ liệu.
- Các bước:
  1. Nhập `"   test   "` (có khoảng trắng đầu/cuối) vào ô tìm kiếm.
  2. Chờ kết quả cập nhật.
- Kết quả mong đợi: Tìm kiếm xử lý như chuỗi `"test"` đã cắt khoảng trắng và trả về đúng dòng khớp; không gây kết quả rỗng sai do khoảng trắng thừa.

**TC-CUS-034 · Kết quả tìm kiếm cập nhật ngay khi gõ (debounce) mà không cần nhấn Enter**

- Mức độ ưu tiên: Trung bình · Loại: Chức năng
- Điều kiện tiên quyết: Đang ở `/pos/14/customers`.
- Các bước:
  1. Gõ từng ký tự của tên một phần, vd `"t"`, rồi `"te"`, `"tes"`, `"test"`.
  2. Quan sát bảng sau mỗi lần gõ (cho phép độ trễ debounce).
- Kết quả mong đợi: Kết quả bảng tự động cập nhật khi từ khóa được thu hẹp dần (có hoặc không có debounce ngắn), không cần nhấn Enter hay nút submit; kết quả cuối cùng khớp các khách hàng chứa `"test"`.

**TC-CUS-035 · Kết hợp tìm kiếm với Group filter đang áp dụng thu hẹp kết quả theo cả hai điều kiện**

- Mức độ ưu tiên: Trung bình · Loại: Chức năng
- Điều kiện tiên quyết: Có ít nhất một customer group (vd `"test 11111"`) với thành viên.
- Các bước:
  1. Chọn một nhóm cụ thể trong dropdown "All Groups".
  2. Nhập từ khóa tìm kiếm khớp một khách hàng trong nhóm đó.
  3. Quan sát kết quả lọc.
- Kết quả mong đợi: Bảng hiển thị chỉ những dòng khớp CẢ nhóm đã chọn VÀ từ khóa tìm kiếm; khi xóa ô tìm kiếm, bộ lọc nhóm vẫn được giữ và hiển thị toàn bộ thành viên của nhóm đó.

**TC-CUS-036 · Từ khóa tìm kiếm và nhóm đang lọc vẫn được giữ nguyên khi chuyển trang**

- Mức độ ưu tiên: Cao · Loại: Chức năng
- Điều kiện tiên quyết: Từ khóa tìm kiếm rộng trả về hơn 30 khách hàng khớp.
- Các bước:
  1. Nhập từ khóa rộng cho ra hơn 30 kết quả khớp.
  2. Click "Next" để sang trang 2 của kết quả đã lọc.
  3. Quan sát ô tìm kiếm và nội dung bảng.
- Kết quả mong đợi: Ô tìm kiếm vẫn giữ từ khóa đã nhập; bảng hiển thị trang 2 của tập kết quả ĐÃ LỌC (không phải danh sách đầy đủ); URL phản ánh cả từ khóa tìm kiếm và số trang mới.

### 2.5 Bảng dữ liệu & phân trang (Tables/lists)

**TC-CUS-037 · Bảng khách hàng render đầy đủ các cột theo đúng thứ tự**

- Mức độ ưu tiên: Cao · Loại: Giao diện
- Điều kiện tiên quyết: Đã đăng nhập; điều hướng tới `/pos/14/customers`; store có dữ liệu (313 kết quả).
- Các bước:
  1. Điều hướng tới `/pos/14/customers`.
  2. Chờ chuyển hướng sang `?page=1&orderCreatedAt=desc` hoàn tất.
  3. Kiểm tra dòng tiêu đề bảng.
- Kết quả mong đợi: Tiêu đề bảng hiển thị đúng 8 cột theo thứ tự: NAME, PHONE, EMAIL, GROUP, TOTAL VISITS, POINTS, CASHBACK BALANCE, LAST VISIT.

**TC-CUS-038 · Định dạng dữ liệu dòng cho một bản ghi khách hàng đầy đủ**

- Mức độ ưu tiên: Cao · Loại: Dữ liệu
- Điều kiện tiên quyết: Có ít nhất một dòng khách hàng có đủ dữ liệu ở mọi cột.
- Các bước:
  1. Tìm dòng có tên, phone, email, group, visits, points, cashback, last visit đều có giá trị.
  2. Kiểm tra định dạng ô PHONE.
  3. Kiểm tra định dạng ô CASHBACK BALANCE.
  4. Kiểm tra định dạng ô LAST VISIT.
- Kết quả mong đợi: PHONE hiển thị dạng `(XXX) XXX-XXXX`; CASHBACK BALANCE hiển thị dạng tiền tệ 2 số thập phân (vd `"$0.00"`); LAST VISIT hiển thị dạng `"MMM D, YYYY (UTC+7)"`.

**TC-CUS-039 · Giá trị TOTAL VISITS và POINTS bằng 0 hiển thị nhất quán**

- Mức độ ưu tiên: Trung bình · Loại: Dữ liệu
- Điều kiện tiên quyết: Có ít nhất một dòng khách hàng có TOTAL VISITS và/hoặc POINTS bằng 0.
- Các bước:
  1. Tìm dòng có TOTAL VISITS bằng 0 hoặc không xác định.
  2. Ghi nhận giá trị hiển thị chính xác (vd `"—"` hoặc `"0"`).
  3. Tìm dòng có POINTS bằng 0.
  4. Ghi nhận giá trị hiển thị.
- Kết quả mong đợi: TOTAL VISITS và POINTS sử dụng cùng một cách biểu diễn nhất quán cho giá trị 0 trên mọi dòng (luôn `"0"` hoặc luôn `"—"`, không lẫn lộn); POINTS mặc định là `"0"` khi chưa thiết lập.

**TC-CUS-040 · Điều hướng trực tiếp tới một trang giữa hiển thị đúng dữ liệu và điều khiển**

- Mức độ ưu tiên: Trung bình · Loại: Điều hướng
- Các bước:
  1. Điều hướng trực tiếp tới `/pos/14/customers?page=5&orderCreatedAt=desc`.
  2. Quan sát chỉ số trang, số dòng, và trạng thái nút Previous/Next.
- Kết quả mong đợi: Chỉ số trang hiển thị `"5 / 11"`, 30 dòng được render (dòng 121-150), footer đọc `"Showing 121 to 150 of 313 results"`, cả "Previous" và "Next" đều enabled.

**TC-CUS-041 · Trang cuối hiển thị đúng số dòng còn lại (partial page)**

- Mức độ ưu tiên: Cao · Loại: Biên
- Điều kiện tiên quyết: 313 tổng kết quả trên 11 trang (30/trang, trang cuối còn 13 dòng).
- Các bước:
  1. Điều hướng trực tiếp tới `/pos/14/customers?page=11&orderCreatedAt=desc`.
  2. Quan sát số dòng và footer.
  3. Quan sát trạng thái nút "Next".
- Kết quả mong đợi: Đúng 13 dòng được render, footer đọc `"Showing 301 to 313 of 313 results"`, "Next" bị disabled, chỉ số trang hiển thị `"11 / 11"`.

**TC-CUS-042 · Trạng thái rỗng khi tìm kiếm không có kết quả khớp**

- Mức độ ưu tiên: Cao · Loại: Chức năng
- Các bước:
  1. Nhập chuỗi vô nghĩa vào ô tìm kiếm (vd `"zzzxxxnonexistent999"`).
  2. Chờ bảng cập nhật.
  3. Quan sát nội dung bảng và khu vực footer/phân trang.
- Kết quả mong đợi: Bảng hiển thị thông báo trạng thái rỗng rõ ràng (vd `"No customers found"`) thay vì dòng cũ còn sót lại; footer hiển thị 0 kết quả hoặc bị ẩn/disable; số lượng không hiển thị lại `"313"` cũ.

### 2.6 Định dạng dữ liệu (Data display & formatting)

**TC-CUS-043 · Cột PHONE hiển thị theo đúng định dạng (XXX) XXX-XXXX**

- Mức độ ưu tiên: Cao · Loại: Dữ liệu
- Các bước:
  1. Điều hướng tới `/pos/14/customers`.
  2. Kiểm tra giá trị cột PHONE cho từng dòng ở trang đầu.
- Kết quả mong đợi: Mọi ô PHONE không rỗng hiển thị đúng định dạng `(XXX) XXX-XXXX`, không có chuỗi 10 số thô chưa định dạng và không bị định dạng lặp lại.

**TC-CUS-044 · CASHBACK BALANCE hiển thị đúng định dạng tiền tệ USD với 2 chữ số thập phân**

- Mức độ ưu tiên: Cao · Loại: Dữ liệu
- Các bước:
  1. Điều hướng tới `/pos/14/customers`.
  2. Kiểm tra cột CASHBACK BALANCE cho dòng có số dư 0 và số dư khác 0.
- Kết quả mong đợi: Mọi ô CASHBACK BALANCE có dấu `"$"` đứng đầu và đúng 2 chữ số thập phân (vd `"$0.00"`, `"$125.50"`); không có số thô thiếu `"$"`, không sai số thập phân.

**TC-CUS-045 · POINTS hiển thị dạng số nguyên đơn giản, mặc định 0**

- Mức độ ưu tiên: Trung bình · Loại: Dữ liệu
- Các bước:
  1. Điều hướng tới `/pos/14/customers`.
  2. Tìm dòng khách hàng có 0 điểm.
  3. Tìm dòng có POINTS cao nhất trong dữ liệu (vd 5515).
- Kết quả mong đợi: POINTS hiển thị `"0"` (không phải `"—"` hoặc trống) cho khách hàng không có điểm, và hiển thị đầy đủ số nguyên không có ký hiệu tiền tệ, không có dấu thập phân, không bị định dạng sai.

**TC-CUS-046 · LAST VISIT hiển thị đúng định dạng "MMM D, YYYY (UTC+7)" cho khách hàng đã ghé thăm**

- Mức độ ưu tiên: Cao · Loại: Dữ liệu
- Các bước:
  1. Điều hướng tới `/pos/14/customers`.
  2. Tìm dòng có giá trị LAST VISIT khác dấu gạch ngang.
  3. Kiểm tra định dạng chuỗi chính xác của ô LAST VISIT.
- Kết quả mong đợi: LAST VISIT hiển thị dạng `"MMM D, YYYY (UTC+7)"` (vd `"Aug 3, 2026 (UTC+7)"`) — tháng viết tắt, dấu phẩy trước năm, hậu tố `"(UTC+7)"` rõ ràng trên mọi ô có giá trị.

**TC-CUS-047 · LAST VISIT hiển thị "-" cho khách hàng chưa từng ghé thăm**

- Mức độ ưu tiên: Cao · Loại: Dữ liệu
- Các bước:
  1. Điều hướng tới `/pos/14/customers`.
  2. Tìm dòng khách hàng chưa có lịch sử ghé thăm.
  3. Kiểm tra giá trị ô LAST VISIT.
- Kết quả mong đợi: Ô LAST VISIT hiển thị `"-"`, không phải trống, `"null"`, `"undefined"`, hay `"Invalid Date"`.

**TC-CUS-048 · NAME hiển thị "—" cho khách hàng chỉ có số điện thoại (không có tên)**

- Mức độ ưu tiên: Cao · Loại: Dữ liệu
- Các bước:
  1. Điều hướng tới `/pos/14/customers`.
  2. Tìm dòng khách hàng được tạo chỉ với số điện thoại.
  3. Kiểm tra ô NAME.
- Kết quả mong đợi: Ô NAME hiển thị `"—"`, không phải chuỗi rỗng, `"null"`, hay `"undefined"`.

**TC-CUS-049 · GROUP hiển thị "—" khi chưa gán nhóm, và đúng tên nhóm khi đã gán**

- Mức độ ưu tiên: Trung bình · Loại: Dữ liệu
- Điều kiện tiên quyết: Dataset có cả khách hàng đã và chưa gán nhóm (vd nhóm `"test 11111"`).
- Các bước:
  1. Tìm dòng chưa gán nhóm, xác minh ô GROUP hiển thị `"—"`.
  2. Tìm dòng thuộc nhóm `"test 11111"` (hoặc bất kỳ nhóm nào khác), xác minh ô GROUP hiển thị đúng tên nhóm.
- Kết quả mong đợi: Khách hàng không có nhóm hiển thị `"—"`; khách hàng có nhóm hiển thị đúng tên nhóm khớp với cấu hình ở Customer Groups, không bị cắt ngắn hay lỗi ký tự.

**TC-CUS-050 · Kiểm tra tính nhất quán khi TOTAL VISITS bằng 0 hiển thị "0" vs "—"**

- Mức độ ưu tiên: Cao · Loại: Dữ liệu
- Các bước:
  1. Điều hướng tới `/pos/14/customers`.
  2. Tìm nhiều dòng khách hàng chưa từng ghé thăm (LAST VISIT = `"-"`).
  3. So sánh giá trị TOTAL VISITS giữa các dòng này.
- Kết quả mong đợi: TOTAL VISITS sử dụng một cách biểu diễn thống nhất cho trạng thái "0/không xác định" trên tất cả các dòng tương tự (luôn `"—"` hoặc luôn `"0"`, không lẫn lộn) — cần đánh dấu là lỗi nếu phát hiện không nhất quán.

**TC-CUS-051 · Tên khách hàng chứa ký tự đặc biệt hiển thị đúng, không lỗi/không injection**

- Mức độ ưu tiên: Trung bình · Loại: Biên
- Điều kiện tiên quyết: Dataset có khách hàng tên `"Test@@@!`*&^"`.
- Các bước:
  1. Tìm hoặc tìm kiếm dòng khách hàng `"Test@@@!`*&^"`.
  2. Kiểm tra nội dung ô NAME hiển thị và DOM bên dưới.
- Kết quả mong đợi: Ô NAME hiển thị đúng chuỗi `"Test@@@!`*&^"` (đã escape HTML đúng cách, không vỡ bố cục, không thực thi script, không lỗi ký tự).

### 2.7 Chi tiết khách hàng / Modal (Detail-modals-drawers)

**TC-CUS-052 · Click vào một dòng khách hàng có mở modal/drawer chi tiết hay không**

- Mức độ ưu tiên: Cao · Loại: Chức năng
- Các bước:
  1. Click bất kỳ đâu trên dòng dữ liệu đầu tiên (vd ô NAME).
  2. Quan sát phản hồi của trang.
- Kết quả mong đợi: Modal hoặc drawer chi tiết mở ra hiển thị thông tin khách hàng đã click (hoặc, nếu không có click-to-detail, dòng vẫn giữ nguyên không có điều hướng/lỗi) — cần xác nhận và ghi nhận hành vi thực tế vì scanner không phát hiện được dialog.

**TC-CUS-053 · Nội dung modal/drawer chi tiết khớp chính xác với dữ liệu dòng**

- Mức độ ưu tiên: Cao · Loại: Dữ liệu
- Điều kiện tiên quyết: Có dòng dữ liệu đầy đủ tất cả các cột.
- Các bước:
  1. Ghi nhận giá trị NAME, PHONE, EMAIL, GROUP, TOTAL VISITS, POINTS, CASHBACK BALANCE, LAST VISIT của dòng.
  2. Click vào dòng để mở chi tiết.
  3. So sánh từng trường trong modal/drawer với giá trị đã ghi nhận.
- Kết quả mong đợi: Tất cả các trường trong chi tiết khớp chính xác với giá trị trên bảng, PHONE định dạng `(XXX) XXX-XXXX`, CASHBACK BALANCE dạng tiền tệ, LAST VISIT dạng `"MMM D, YYYY (UTC+7)"`.

**TC-CUS-054 · Đóng modal/drawer chi tiết qua nút đóng rõ ràng**

- Mức độ ưu tiên: Cao · Loại: Chức năng
- Điều kiện tiên quyết: Modal/drawer chi tiết đang mở.
- Các bước:
  1. Tìm nút đóng (icon X, nút "Close", hoặc mũi tên back).
  2. Click vào nút đó.
- Kết quả mong đợi: Modal/drawer đóng lại, quay về bảng Customers giữ nguyên vị trí cuộn, bộ lọc, và số trang đang xem.

**TC-CUS-055 · Đóng modal chi tiết bằng phím Escape**

- Mức độ ưu tiên: Trung bình · Loại: Chức năng
- Điều kiện tiên quyết: Modal/drawer chi tiết đang mở.
- Các bước:
  1. Mở chi tiết một dòng khách hàng.
  2. Nhấn phím Escape.
- Kết quả mong đợi: Modal/drawer đóng lại, focus trở về vị trí hợp lý (dòng đã click hoặc bảng).

### 2.8 Trường hợp tiêu cực & biên (Negative/Edge cases)

**TC-CUS-056 · Trạng thái rỗng chính xác khi tìm kiếm không có kết quả**

- Mức độ ưu tiên: Cao · Loại: Tiêu cực
- Các bước:
  1. Nhập chuỗi không khớp, vd `"zzzzznotexist999"`.
  2. Chờ kết quả cập nhật.
- Kết quả mong đợi: Bảng không hiển thị dòng nào kèm thông báo rỗng rõ ràng thay vì bảng trống trơn, dòng cũ, hay lỗi; footer cập nhật `"Showing 0 to 0 of 0 results"` hoặc tương đương; điều khiển phân trang ẩn/disabled.

**TC-CUS-057 · Xử lý trang cuối với số dòng lẻ (313 kết quả, 30/trang)**

- Mức độ ưu tiên: Cao · Loại: Biên
- Điều kiện tiên quyết: 313 tổng kết quả, 30/trang, trang cuối là trang 11 với 13 dòng còn lại.
- Các bước:
  1. Điều hướng trực tiếp tới `/pos/14/customers?page=11&orderCreatedAt=desc`.
  2. Quan sát số dòng và điều khiển phân trang.
- Kết quả mong đợi: Đúng 13 dòng được render; footer đọc `"Showing 301 to 313 of 313 results"`; chỉ số trang `"11 / 11"`; nút "Next" disabled; "Previous" enabled.

**TC-CUS-058 · Từ chối/giới hạn tham số page ngoài phạm vi**

- Mức độ ưu tiên: Trung bình · Loại: Tiêu cực
- Các bước:
  1. Điều hướng trực tiếp tới `/pos/14/customers?page=999&orderCreatedAt=desc`.
  2. Quan sát kết quả trang và bảng dữ liệu.
- Kết quả mong đợi: Ứng dụng không bị crash hay hiển thị bảng trống/vỡ; ứng dụng giới hạn về trang hợp lệ cuối (11) hoặc chuyển về trang 1, chỉ số phân trang khớp với dữ liệu hiển thị.

**TC-CUS-059 · Từ chối tham số page không hợp lệ (0 hoặc không phải số)**

- Mức độ ưu tiên: Trung bình · Loại: Tiêu cực
- Các bước:
  1. Điều hướng trực tiếp tới `/pos/14/customers?page=0&orderCreatedAt=desc`.
  2. Quan sát hành vi.
  3. Điều hướng trực tiếp tới `/pos/14/customers?page=abc&orderCreatedAt=desc`.
  4. Quan sát hành vi.
- Kết quả mong đợi: Cả hai giá trị không hợp lệ đều được xử lý an toàn — ứng dụng trả về trang 1 với dữ liệu hợp lệ, không lỗi JS, không loading vô hạn, không trang trắng.

**TC-CUS-060 · Khôi phục hợp lý khi API danh sách khách hàng lỗi (network error)**

- Mức độ ưu tiên: Cao · Loại: Tiêu cực
- Điều kiện tiên quyết: Có thể giả lập mất mạng/chặn request API khách hàng.
- Các bước:
  1. Chặn/làm lỗi request lấy danh sách khách hàng (vd chế độ offline devtools hoặc chặn request).
  2. Điều hướng hoặc tải lại `/pos/14/customers?page=1&orderCreatedAt=desc`.
  3. Quan sát trạng thái giao diện.
- Kết quả mong đợi: Giao diện hiển thị trạng thái lỗi rõ ràng (vd thông báo `"Failed to load customers"` kèm nút thử lại) thay vì loading vô hạn, bảng trắng, hay lỗi JS không xử lý; sidebar/top bar vẫn hoạt động bình thường.

**TC-CUS-061 · Ngăn dòng trùng lặp/lệch thứ tự khi phân trang nhanh liên tiếp**

- Mức độ ưu tiên: Trung bình · Loại: Biên
- Điều kiện tiên quyết: 313 kết quả trên 11 trang.
- Các bước:
  1. Ở trang 1, click "Next" nhanh nhiều lần liên tiếp trước khi mỗi trang tải xong.
  2. Quan sát trang cuối cùng đạt được và nội dung dòng dữ liệu.
- Kết quả mong đợi: Ứng dụng ổn định ở một trang duy nhất khớp với URL cuối cùng, với đúng 30 (hoặc số lẻ) dòng cho trang đó — không có dòng trùng lặp/lẫn lộn từ nhiều request, và chỉ số trang khớp với dữ liệu hiển thị.

### 2.9 Responsive / đa thiết bị

**TC-CUS-062 · Hiển thị màn hình Customers ở độ rộng desktop (1920x1080) không tràn ngang**

- Mức độ ưu tiên: Cao · Loại: Responsive
- Các bước:
  1. Tải `/pos/14/customers` ở 1920x1080.
  2. Quan sát sidebar và top bar.
  3. Quan sát bảng dữ liệu với đủ 8 cột.
  4. Kiểm tra body trang có thanh cuộn ngang không.
- Kết quả mong đợi: Sidebar mở rộng đầy đủ nhãn; cả 8 cột bảng hiển thị không bị cắt và vừa trong viewport; không có thanh cuộn ngang ở body trang.

**TC-CUS-063 · Sidebar tự thu gọn ở độ rộng tablet (768x1024, portrait)**

- Mức độ ưu tiên: Cao · Loại: Responsive
- Các bước:
  1. Thu nhỏ viewport xuống 768x1024.
  2. Quan sát trạng thái sidebar.
  3. Click "Toggle Sidebar" nếu sidebar đang thu gọn, để mở rộng lại.
- Kết quả mong đợi: Ở độ rộng tablet, sidebar tự thu gọn (chỉ icon hoặc ẩn sau nút toggle) để dành không gian cho nội dung; nút "Toggle Sidebar" hiện/ẩn sidebar đầy đủ theo yêu cầu mà không gây tràn ngang.

**TC-CUS-064 · Bảng dữ liệu thích ứng ở độ rộng mobile portrait (375x667)**

- Mức độ ưu tiên: Cao · Loại: Responsive
- Các bước:
  1. Thu nhỏ viewport xuống 375x667.
  2. Quan sát sidebar có ẩn/thu gọn mặc định không.
  3. Quan sát bảng dữ liệu — có tự cuộn ngang trong khung riêng hay chuyển sang dạng thẻ (card).
  4. Kiểm tra body trang có tràn ngang không.
- Kết quả mong đợi: Sidebar ẩn/thu gọn mặc định với điều khiển mở lại; bảng cuộn ngang trong khung riêng hoặc chuyển sang bố cục phù hợp mobile — trong mọi trường hợp body trang không bị cuộn ngang hay cắt nội dung.

**TC-CUS-065 · Không tràn ngang khi chuyển đổi động qua các breakpoint**

- Mức độ ưu tiên: Cao · Loại: Responsive
- Các bước:
  1. Bắt đầu ở 1920x1080, xác nhận không tràn ngang.
  2. Thu nhỏ dần qua 1366x768, 1024x768, 768x1024, 375x667 mà không tải lại trang.
  3. Ở mỗi bước, kiểm tra chiều rộng cuộn của body so với viewport.
- Kết quả mong đợi: Ở mọi độ rộng trung gian, chiều rộng cuộn của body không vượt quá viewport; sidebar và bảng tự bố cục lại không cần tải lại trang.

### 2.10 Khả năng tiếp cận (Accessibility)

**TC-CUS-066 · Tab qua toàn bộ chrome và nội dung trang theo đúng thứ tự logic**

- Mức độ ưu tiên: Cao · Loại: Khả năng tiếp cận
- Các bước:
  1. Click vào thanh địa chỉ rồi nhấn Tab liên tục từ đầu trang.
  2. Quan sát chỉ báo focus khi di chuyển qua "Toggle Sidebar", các tab top bar, store switcher, các mục sidebar, rồi vào nội dung trang.
  3. Tiếp tục Tab vào ô tìm kiếm, nút lọc "All Groups", bảng, và điều khiển phân trang.
- Kết quả mong đợi: Thứ tự focus theo đúng bố cục trực quan, có viền focus rõ ràng trên mọi phần tử có thể focus, không phần tử nào bị bỏ qua hoặc nhận focus hai lần bất thường.

**TC-CUS-067 · Ô tìm kiếm có thể thao tác bằng bàn phím với tên truy cập đúng**

- Mức độ ưu tiên: Cao · Loại: Khả năng tiếp cận
- Các bước:
  1. Tab tới ô tìm kiếm với placeholder `"Search by name, phone..."`.
  2. Kiểm tra tên truy cập (accessible name) qua cây accessibility (aria-label, label liên kết, hoặc placeholder).
  3. Gõ `"Nguyen"` chỉ bằng bàn phím.
  4. Nhấn Tab để chuyển focus mà không dùng chuột.
- Kết quả mong đợi: Ô nhập lộ role `"textbox"` với tên truy cập không rỗng; gõ chữ hoạt động bằng bàn phím; focus chuyển sang điều khiển logic tiếp theo (nút "All Groups") khi nhấn Tab.

**TC-CUS-068 · Bảng dữ liệu lộ đúng ngữ nghĩa bảng (role, headers, rows)**

- Mức độ ưu tiên: Cao · Loại: Khả năng tiếp cận
- Các bước:
  1. Kiểm tra cây accessibility/DOM của bảng khách hàng.
  2. Xác minh bảng dùng markup `<table>` ngữ nghĩa (hoặc role='table') với `<thead>/<th>` cho các cột.
  3. Xác minh mỗi `<th>` có scope='col'.
  4. Xác minh mỗi dòng dữ liệu dùng `<tr>/<td>` đúng liên kết với tiêu đề cột.
- Kết quả mong đợi: Bảng lộ role 'table', tiêu đề cột đánh dấu 'columnheader' với scope='col', mỗi dòng lộ role 'row' với 'cell', screen reader đọc được tên cột + giá trị khi duyệt từng ô.

**TC-CUS-069 · Nút phân trang "Previous"/"Next" và chỉ số trang có thể thao tác bằng bàn phím với trạng thái disabled đúng**

- Mức độ ưu tiên: Cao · Loại: Khả năng tiếp cận
- Điều kiện tiên quyết: Đang ở trang 1/11.
- Các bước:
  1. Tab tới nút "Previous" ở trang 1.
  2. Xác minh nó lộ trạng thái disabled (aria-disabled='true' hoặc thuộc tính disabled gốc).
  3. Tab tới "Next" và nhấn Enter/Space để kích hoạt bằng bàn phím.
  4. Sau khi sang trang 2, Tab lại tới "Previous" và xác nhận đã enabled.
- Kết quả mong đợi: "Previous" được thông báo đúng trạng thái disabled trên trang 1; "Next" kích hoạt được bằng bàn phím và chuyển sang trang 2, cập nhật URL; chỉ số trang lộ dưới dạng text đọc được (không phải hình ảnh); focus được giữ ở gần điều khiển phân trang sau khi trang cập nhật.

**TC-CUS-070 · Mục sidebar "Customers" đang active được đánh dấu aria-current='page'**

- Mức độ ưu tiên: Trung bình · Loại: Khả năng tiếp cận
- Các bước:
  1. Tab tới mục "Customers" trong nhóm Management của sidebar.
  2. Kiểm tra thuộc tính ARIA (aria-current).
- Kết quả mong đợi: Liên kết "Customers" đang active lộ `aria-current='page'` để screen reader phân biệt đây là mục đang active so với các mục Management khác.

### 2.11 Hiệu năng (Performance)

**TC-CUS-071 · Tải trang lần đầu đạt ngân sách thời gian với dataset 313 bản ghi**

- Mức độ ưu tiên: Cao · Loại: Hiệu năng
- Điều kiện tiên quyết: Mạng bình thường (không giả lập chậm); store 14 có 313 bản ghi khách hàng.
- Các bước:
  1. Điều hướng trực tiếp tới `/pos/14/customers`.
  2. Bắt đầu tính giờ từ lúc điều hướng.
  3. Quan sát khi chuyển hướng hoàn tất và bảng 30 dòng render đầy đủ.
  4. Dừng tính giờ khi ô LAST VISIT của dòng cuối render xong nội dung.
- Kết quả mong đợi: Trang đạt trạng thái tương tác (ô tìm kiếm dùng được) trong ngân sách thỏa thuận (vd ≤2s TTI) và render đầy đủ bảng 30 dòng trong ngân sách (vd ≤3s), dù tổng dataset là 313 kết quả.

**TC-CUS-072 · Điều hướng phân trang (Next) từ trang 1 sang trang 2 đạt hiệu năng tốt**

- Mức độ ưu tiên: Cao · Loại: Hiệu năng
- Điều kiện tiên quyết: Đang ở trang 1 với toàn bộ 313 kết quả đã tải.
- Các bước:
  1. Ghi nhận thời điểm hiện tại.
  2. Click nút phân trang "Next".
  3. Đo thời gian tới khi URL cập nhật thành `?page=2&orderCreatedAt=desc` và 30 dòng mới render.
  4. Xác minh chỉ số trang cập nhật `"2 / 11"`.
- Kết quả mong đợi: Dữ liệu trang 2 tải và render trong ngân sách ngắn (vd ≤1s), chỉ số trang hiển thị `"2 / 11"`, không xảy ra tải lại toàn trang (chỉ khu vực bảng cập nhật).

**TC-CUS-073 · Kết quả tìm kiếm render nhanh và không gây lệch bố cục (layout shift)**

- Mức độ ưu tiên: Cao · Loại: Hiệu năng
- Điều kiện tiên quyết: Đang ở trang Customers với toàn bộ dữ liệu đã tải.
- Các bước:
  1. Gõ từ khóa tìm kiếm (vd `"test"`) vào ô `"Search by name, phone..."`.
  2. Đo thời gian từ lúc gõ/kích hoạt debounce tới khi kết quả lọc hiển thị.
  3. Quan sát vị trí ô tìm kiếm, nút "All Groups", và tiêu đề cột trong quá trình chuyển đổi.
- Kết quả mong đợi: Kết quả lọc render trong ngân sách (vd ≤1-1.5s sau debounce), độ trễ debounce hợp lý (không kích hoạt trên mỗi ký tự gõ), và không xảy ra lệch bố cục ở phần chrome xung quanh (ô tìm kiếm, nút lọc, tiêu đề) trong quá trình chuyển đổi.

### 2.12 Bảo mật & phân quyền (Security/permissions)

**TC-CUS-074 · Chuyển hướng người dùng chưa đăng nhập từ /pos/14/customers về /login**

- Mức độ ưu tiên: Cao · Loại: Bảo mật
- Điều kiện tiên quyết: Không có session hoạt động (đã đăng xuất, xóa cookie/localStorage).
- Các bước:
  1. Xóa session/cookie để giả lập trạng thái đã đăng xuất.
  2. Điều hướng trực tiếp tới `/pos/14/customers`.
  3. Quan sát URL và nội dung trang kết quả.
- Kết quả mong đợi: Ứng dụng chuyển hướng về `/login` (không hiển thị bảng, ô tìm kiếm, hay dữ liệu Customers nào); không có dữ liệu khách hàng nào lóe lên trước khi chuyển hướng.

**TC-CUS-075 · Phiên hết hạn giữa chừng sẽ chuyển hướng về /login khi thực hiện thao tác tiếp theo**

- Mức độ ưu tiên: Cao · Loại: Bảo mật
- Điều kiện tiên quyết: Đang đăng nhập ở trang Customers; có thể vô hiệu hóa/làm hết hạn session token phía server.
- Các bước:
  1. Tải `/pos/14/customers` thành công với session hợp lệ.
  2. Vô hiệu hóa/làm hết hạn session token (vd qua backend hoặc xóa cookie xác thực trong khi vẫn mở trang).
  3. Tương tác với trang (vd click phân trang "Next" hoặc gõ vào ô tìm kiếm) để kích hoạt một request API mới.
- Kết quả mong đợi: Ứng dụng phát hiện phản hồi unauthorized (401) và chuyển hướng về `/login` thay vì hiển thị dữ liệu khách hàng cũ hoặc một phần.

**TC-CUS-076 · Chặn truy cập dữ liệu khách hàng khi đổi store id trong URL sang store không có quyền**

- Mức độ ưu tiên: Cao · Loại: Bảo mật
- Điều kiện tiên quyết: Đăng nhập với người dùng chỉ có quyền ở store 14 ("Volt POS 14 Dev #14"); tồn tại store khác (vd 15) mà người dùng này không có quyền.
- Các bước:
  1. Xác nhận session hiện tại thuộc store 14 bằng cách tải `/pos/14/customers` thành công.
  2. Sửa thủ công đoạn store id trong URL sang store khác, vd `/pos/15/customers`, và điều hướng.
  3. Quan sát phản hồi: trạng thái trang, nội dung bảng, và mọi lỗi/chuyển hướng.
- Kết quả mong đợi: Ứng dụng từ chối truy cập dữ liệu khách hàng của store khác — chuyển hướng về `/login`, về store 14, hoặc hiển thị trạng thái từ chối truy cập; dữ liệu PHONE/EMAIL/CASHBACK của store 15 không bao giờ được hiển thị hoặc xuất hiện trong network response.

**TC-CUS-077 · Chuyển store qua store switcher chỉ giới hạn dữ liệu Customers của store đang chọn**

- Mức độ ưu tiên: Cao · Loại: Bảo mật
- Điều kiện tiên quyết: Người dùng đã đăng nhập có quyền truy cập nhiều store qua store switcher trên top bar.
- Các bước:
  1. Tải `/pos/14/customers` và ghi nhận vài dòng khách hàng (vd giá trị PHONE/EMAIL cụ thể).
  2. Dùng store switcher để chuyển sang store khác mà người dùng có quyền.
  3. Quan sát URL và nội dung bảng Customers (điều hướng lại Customers cho store mới nếu cần).
- Kết quả mong đợi: URL store id cập nhật khớp store mới chọn, và bảng khách hàng hiển thị tập dữ liệu khác biệt giới hạn theo store đó — không còn dòng dữ liệu dư thừa hay lẫn lộn từ store 14.

## 3. Tổng kết độ phủ (Coverage summary)

**Theo dimension** (13 dimension gốc + 9 khoảng trống được bổ sung sau bước completeness-critic):

| Dimension                                                                         | Số lượng test case (tổng, gốc + bổ sung) |
| --------------------------------------------------------------------------------- | ---------------------------------------- |
| Page-load & layout                                                                | 12                                       |
| Primary navigation                                                                | 7                                        |
| Core actions (incl. gap: create-customer)                                         | 6 + 8 (gap)                              |
| Forms/inputs (search box, incl. gap: phone format variants, orderCreatedAt param) | 14 + 8 + 7 (gap)                         |
| Tables/lists (incl. gap: footer count text)                                       | 5 + 9 (gap)                              |
| Search/filter (incl. gap: group dropdown content)                                 | 15 + 7 (gap)                             |
| Data display/formatting (incl. gap: negative cashback)                            | 13 + 5 (gap)                             |
| Detail modals/drawers (incl. gap: no-detail fallback)                             | 5 + 7 (gap)                              |
| Negative/edge cases                                                               | 5                                        |
| Responsive/cross-device                                                           | 4                                        |
| Accessibility                                                                     | 5                                        |
| Performance                                                                       | 3                                        |
| Security/permissions (incl. gap: store-switch refresh)                            | 3 + 7 (gap)                              |

> Tài liệu này chỉ trình bày một tập con đại diện, đầy đủ nhất theo mỗi nhóm chức năng (danh sách trên là số lượng do các agent sinh ra thực tế trong lần chạy, sau đó được rút gọn có chọn lọc thành các test case TC-CUS-001 → TC-CUS-077 ở trên để tài liệu dễ đọc và bảo trì).

**Theo mức độ ưu tiên** (trong số các test case được chọn ở mục 2): phần lớn là **Cao** (page-load, core actions, search, data formatting, security), còn lại **Trung bình** (responsive, accessibility, một số biên) và **Thấp** (một vài trường hợp biên hiếm gặp).

**Ghi chú cần xác minh trực tiếp trên ứng dụng thật** (chưa xác nhận được qua DOM scan tĩnh):

- Hành vi click vào một dòng khách hàng có mở modal/drawer chi tiết hay không (TC-CUS-025, TC-CUS-052–055).
- Khả năng click-to-sort trên các tiêu đề cột khác ngoài LAST VISIT.
- Sự tồn tại (hoặc không) của nút hành động "Add Customer" trên màn hình này.
- Tính nhất quán giữa `"—"` và `"0"` khi TOTAL VISITS bằng 0 (TC-CUS-039, TC-CUS-050).
- Hành vi thực tế của phân quyền vai trò (role-based) đối với việc xem/ẩn dữ liệu PII nhạy cảm (PHONE/EMAIL/CASHBACK BALANCE).
- Định dạng CASHBACK BALANCE với giá trị âm hoặc rất lớn (hiện dữ liệu mẫu chỉ có `$0.00`).
