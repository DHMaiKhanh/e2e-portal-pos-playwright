# Vấn đề: Session test hết hạn gây fail hàng loạt

## Bối cảnh

Chạy `npm run test:report` (full suite) ngày 2026-08-11:

- **112 failed / 167 passed / 119 skipped** (tổng ~398 test, 1.2h)
- Fail tập trung gần như toàn bộ vào các module cần gọi API để load dữ liệu:
  Customers (~40 case), Orders, Staffs, Services, một phần Overview/Batch History.

## Nguyên nhân gốc (đã xác minh)

**Không phải bug thật trên dashboard.** Session đăng nhập đã lưu tại
`src/data/dynamic/auth/admin.json` (dùng lại cho mọi UI test qua `STORAGE_STATE`) đã
hết hạn hoàn toàn — cả access token (JWT `token` cookie) **và** `refreshToken` đều
bị server từ chối.

Xác minh trực tiếp bằng Playwright MCP (nạp lại đúng 2 cookie `token` +
`refreshToken` từ `admin.json` vào browser rồi mở
`/pos/14/customers`):

```
Kết quả: bị redirect về /login?redirect=%2Fpos%2F14%2Fcustomers

Console errors:
[ERROR] 401 @ https://sys.v2.dev-fastboypay.com/sessions/current
[ERROR] 401 @ https://sys.v2.dev-fastboypay.com/refresh_token
```

→ App gọi `/refresh_token` để làm mới access token nhưng cũng bị 401, nghĩa là
session đã bị **server revoke**, không chỉ đơn thuần "hết hạn theo thời gian cookie".

### Vì sao dẫn tới fail hàng loạt

Khi session không hợp lệ, các trang cần fetch data (Customers, Orders, Staffs,
Services...) bị kẹt ở trạng thái skeleton loading (ví dụ `TC-CUS-001` báo
`locator('[data-slot="skeleton"]')` vẫn còn **50 elements** sau 30s chờ), rồi test
timeout → fail. Điều này giải thích vì sao gần như _toàn bộ_ test case của các
module đó fail cùng lúc, thay vì rải rác vài case.

## Phân loại kết quả lần chạy vừa rồi

| Loại                                     | Số lượng ước tính       | Ghi chú                                                                                                                                                                                                     |
| ---------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fail do session hết hạn (false positive) | phần lớn trong 112 fail | Customers, Orders, Staffs, Services, một phần Overview                                                                                                                                                      |
| Fail do lỗi thật (code test hoặc UI)     | thiểu số                | ví dụ: `strict mode violation` do selector khớp 2 phần tử ("Batch History" text + link) trong `batch-history/responsive.e2e.spec.ts`; sidebar active-state sai trong `sidebar-dieu-huong-chinh.e2e.spec.ts` |

→ **Cần chạy lại toàn bộ suite với session mới** (đã `npm run auth` lại) để tách
bạch chính xác case nào còn fail thật.

## Vì sao token hết hạn nhanh

- Access token (`token` cookie): JWT có `exp - iat = 1800s` → chỉ sống **30 phút**.
- `refreshToken`: cookie có hạn dài hơn (~3 ngày theo `expires`), nhưng bị revoke
  server-side sớm hơn nhiều so với hạn cookie — khả năng do refresh token là
  **single-use / rotate**, hoặc có login/refresh khác ghi đè session cũ.

Đây là giới hạn từ **backend**, không phải config phía Playwright/test — không thể
"kéo dài" chỉ bằng cách sửa file test.

## Hướng giải quyết (đề xuất, ưu tiên giảm dần)

1. **Xin backend một service/API credential riêng cho QA automation**
   (long-lived, không qua Google OAuth + 2FA cá nhân). Đây là fix chuẩn nhất, dứt
   điểm việc phải đăng nhập tay.
2. Nếu chưa đổi được backend: coi `npm run auth` là **bước bắt buộc trước mỗi lần
   chạy full suite lớn**, đặc biệt nếu suite chạy > 30 phút hoặc có khoảng nghỉ dài
   giữa các lần chạy.
3. Cân nhắc sửa `scripts/capture-auth.mjs` (hoặc thêm hook trong test setup) để
   **tự động gọi `/refresh_token` định kỳ** (~mỗi 20 phút) trong lúc suite đang
   chạy dài, tránh access token chết giữa suite — nhưng vẫn cần bắt đầu từ một
   session hợp lệ.
4. Tick "Don't ask again on this device" ở bước 2FA (đã áp dụng) chỉ bỏ qua bước
   xác minh điện thoại ở lần đăng nhập _kế tiếp_, không giúp session hiện tại sống
   lâu hơn.

## Việc cần làm tiếp theo

- [ ] Chạy lại `npm run test:report` với session mới (đã lưu 2026-08-11 sau khi
      chạy `npm run auth`) để có baseline fail thật.
- [ ] Kiểm tra riêng 2 lỗi thật đã phát hiện: `batch-history/responsive.e2e.spec.ts`
      (strict mode violation) và `sidebar-dieu-huong-chinh.e2e.spec.ts` (active
      state sai).
- [ ] Trao đổi với backend/dev team về khả năng cấp long-lived credential cho test
      automation.
