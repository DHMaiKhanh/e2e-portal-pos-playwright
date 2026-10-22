# Test Cases – [Portal] Checkout Type Setting

**Ticket:** [VP-4590](https://linear.app/fastboy/issue/VP-4590/portal-checkout-type-setting) · PR fastboy-portal#776
**Liên quan:** VP-4591 (POS) · VP-4554 (API)

## Điều kiện chung (áp cho mọi TC, trừ khi TC ghi khác)

- Môi trường: https://v2.dev-fastboypay.com
- Đăng nhập Portal bằng account có quyền chỉnh Store Settings.
- Merchant #14 > Store Settings > Payment & transactions.
- Mở DevTools > Network để kiểm tra payload PUT `/sys_settings/{id}` (flag `merchant_point_payment_config`).

**Status:** điền theo kết quả QC Round 2 (DEV, 2026-10-22).

---

## 1. Hiển thị & default

| TC ID       | Title                                             | Priority | Precondition                        | Test Data              | Steps                                                      | Expected Result                                                                                                   | Status                   |
| ----------- | ------------------------------------------------- | -------- | ----------------------------------- | ---------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------ |
| CHK-PTL-001 | Verify hiển thị section Checkout setting          | P1       | —                                   | Merchant #14           | 1. Mở Payment & transactions                               | Có section Checkout setting, nằm ngay dưới Setting point config                                                   | Pass                     |
| CHK-PTL-002 | Verify default khi tiệm chưa lưu Checkout setting | P1       | Tiệm chưa từng lưu Checkout setting | Merchant #30           | 1. Mở Payment & transactions<br>2. Xem Checkout setting    | Chọn sẵn **Manual Checkout**, Point Bonus = 0                                                                     | Pass                     |
| CHK-PTL-003 | Verify load đúng setting đã lưu                   | P1       | Tiệm đã lưu Auto hoặc Hybrid        | Hybrid, bonus 7        | 1. Reload trang                                            | Hiện đúng thẻ Hybrid, bonus 7                                                                                     | Pass                     |
| CHK-PTL-004 | Verify text 3 thẻ khớp spec                       | P2       | —                                   | —                      | 1. Đọc mô tả 3 thẻ                                         | Text tiếng Anh của Manual / Auto / Hybrid khớp spec                                                               | Pass                     |
| CHK-PTL-005 | Verify Manual không có ô Point Bonus              | P1       | —                                   | —                      | 1. Chọn Manual Checkout                                    | Không hiện ô Point Bonus                                                                                          | Pass                     |
| CHK-PTL-006 | Verify Auto có ô Point Bonus và text đúng         | P1       | —                                   | —                      | 1. Chọn Auto Checkout                                      | Có ô Point Bonus + "pts for each completed order, whatever the amount"                                            | Pass                     |
| CHK-PTL-007 | Verify Hybrid có ô Point Bonus và text đúng       | P1       | —                                   | —                      | 1. Chọn Hybrid Checkout                                    | Có ô Point Bonus + "pts for each check-in checked out automatically at 11:59 PM"                                  | Pass                     |
| CHK-PTL-008 | Verify khung Point Config bên dưới các thẻ        | P1       | Point Config đã lưu                 | $1.00 cho cả 4 payment | 1. Xem dưới các thẻ                                        | Có khung Point Config, hiện đúng tỉ lệ đang lưu + ghi chú "Manual and Hybrid Checkout earn points at these rates" | Pass (đã fix từ Round 1) |
| CHK-PTL-009 | Verify click vùng thẻ chọn được thẻ               | P3       | —                                   | —                      | 1. Click vào text/khoảng trống của thẻ (không click radio) | Thẻ được chọn                                                                                                     | Pass                     |

## 2. Point Bonus – validation

| TC ID       | Title                                               | Priority | Precondition     | Test Data                      | Steps                                               | Expected Result                                                            | Status                 |
| ----------- | --------------------------------------------------- | -------- | ---------------- | ------------------------------ | --------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------- |
| CHK-PTL-010 | Verify Point Bonus rỗng không lưu được              | P1       | —                | Ô trống                        | 1. Chọn Auto<br>2. Xoá trống ô<br>3. Save           | Lỗi "Point bonus is required" tại field; không gửi request                 | Pass                   |
| CHK-PTL-011 | Verify Point Bonus âm không lưu được                | P1       | —                | `-1`                           | 1. Chọn Auto<br>2. Nhập -1<br>3. Save               | Lỗi "Point bonus must be a whole number of 0 or more"; không gửi request   | Pass                   |
| CHK-PTL-012 | Verify Point Bonus số lẻ không lưu được             | P1       | —                | `1.5`, `1,5`                   | 1. Chọn Auto<br>2. Nhập số lẻ<br>3. Save            | Báo lỗi tại field; không gửi request                                       | Pass                   |
| CHK-PTL-013 | Verify Point Bonus = 0 lưu được                     | P1       | —                | `0`                            | 1. Chọn Auto<br>2. Nhập 0<br>3. Save                | Save OK, payload `point_bonus: 0`                                          | Pass                   |
| CHK-PTL-014 | Verify giới hạn giá trị lớn nhất                    | P2       | —                | `999999`, `99999999999`        | 1. Nhập từng giá trị<br>2. Save                     | 999999 lưu OK; 99999999999 báo "Point bonus must be 2,147,483,647 or less" | Pass                   |
| CHK-PTL-015 | Verify ký tự không hợp lệ                           | P2       | —                | `abc`, `1e2`, `+5`, `5@#`, `5` | 1. Nhập từng giá trị<br>2. Save                     | Các giá trị chữ/ký tự lạ báo lỗi; `5` (có khoảng trắng) lưu = 5            | Pass                   |
| CHK-PTL-016 | Verify số có 0 ở đầu                                | P3       | —                | `007`                          | 1. Nhập 007<br>2. Save                              | Lưu = 7                                                                    | Pass                   |
| CHK-PTL-017 | Verify giá trị lỗi ở Auto rồi chuyển Manual và Save | P2       | Bonus đã lưu = 5 | `abc`                          | 1. Chọn Auto, nhập abc<br>2. Chọn Manual<br>3. Save | Lỗi ẩn; lưu `point_bonus` = giá trị cũ (5)                                 | Pass (xem CHK-PTL-041) |

## 3. Chuyển thẻ

| TC ID       | Title                                         | Priority | Precondition            | Test Data | Steps                                                       | Expected Result         | Status |
| ----------- | --------------------------------------------- | -------- | ----------------------- | --------- | ----------------------------------------------------------- | ----------------------- | ------ |
| CHK-PTL-018 | Verify Auto → Hybrid giữ giá trị bonus        | P1       | —                       | 10        | 1. Chọn Auto, nhập 10<br>2. Chọn Hybrid                     | Bonus vẫn là 10         | Pass   |
| CHK-PTL-019 | Verify Hybrid → Auto giữ giá trị bonus        | P1       | —                       | 7         | 1. Chọn Hybrid, nhập 7<br>2. Chọn Auto                      | Bonus vẫn là 7          | Pass   |
| CHK-PTL-020 | Verify Auto → Manual → Auto giữ giá trị bonus | P2       | —                       | 12        | 1. Chọn Auto, nhập 12<br>2. Chọn Manual<br>3. Chọn lại Auto | Bonus vẫn là 12         | Pass   |
| CHK-PTL-021 | Verify Discard trả về giá trị đã lưu          | P2       | Đã lưu Manual / bonus 5 | —         | 1. Chọn Auto, nhập 20<br>2. Bấm Discard                     | Trả về Manual / bonus 5 | Pass   |

## 4. Save

| TC ID       | Title                                         | Priority | Precondition            | Test Data | Steps                                                | Expected Result                                                                                      | Status                         |
| ----------- | --------------------------------------------- | -------- | ----------------------- | --------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------ |
| CHK-PTL-022 | Verify đổi Checkout Type và Save              | P1       | Đang là Manual          | Auto      | 1. Chọn Auto<br>2. Save<br>3. Reload                 | Toast "Checkout setting saved."; reload thấy Auto                                                    | Pass                           |
| CHK-PTL-023 | Verify đổi Point Bonus và Save                | P1       | Đang là Hybrid          | Bonus 7   | 1. Nhập 7<br>2. Save<br>3. Reload                    | Reload thấy Hybrid / 7                                                                               | Pass                           |
| CHK-PTL-024 | Verify chọn Manual rồi Save vẫn giữ bonus cũ  | P1       | Đã lưu Hybrid / bonus 7 | —         | 1. Chọn Manual<br>2. Save<br>3. Chọn lại Auto        | Payload `selected_type: payment_method`, `point_bonus: 7`; chọn Auto thấy 7                          | Pass                           |
| CHK-PTL-025 | Verify format payload                         | P1       | —                       | —         | 1. Save với từng type<br>2. Xem payload PUT          | `selected_type` ∈ {`payment_method`, `auto_checkout`, `hybrid_checkout`}; `point_bonus` là số nguyên | Pass                           |
| CHK-PTL-026 | Verify không đổi gì thì không hiện thanh Save | P3       | —                       | —         | 1. Mở trang, không sửa gì                            | Không hiện thanh Save                                                                                | Pass                           |
| CHK-PTL-027 | Verify Save lỗi API                           | P2       | Giả lập API trả 404     | —         | 1. Đổi type<br>2. Save                               | Báo lỗi; không có toast thành công; giữ giá trị đang nhập                                            | Pass (⚠️ toast lỗi hiện 2 lần) |
| CHK-PTL-028 | Verify double-click Save chỉ gửi 1 request    | P2       | —                       | —         | 1. Đổi type<br>2. Double-click Save                  | Chỉ có 1 request PUT                                                                                 | Pass                           |
| CHK-PTL-029 | Verify rời trang khi chưa lưu có cảnh báo     | P2       | —                       | —         | 1. Đổi type, không Save<br>2. Chuyển sang trang khác | Popup "Discard unsaved changes?" (Stay / Discard)                                                    | Pass                           |

## 5. Không ghi đè Point Config (dùng chung flag)

| TC ID       | Title                                                        | Priority | Precondition          | Test Data                            | Steps                                                                       | Expected Result                                                       | Status                   |
| ----------- | ------------------------------------------------------------ | -------- | --------------------- | ------------------------------------ | --------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------ |
| CHK-PTL-030 | Verify lưu Checkout setting không làm mất Point Config       | P1       | Point Config $1.00 x4 | Auto / 8                             | 1. Chỉ sửa Checkout setting<br>2. Save<br>3. Xem payload + reload           | 4 key Point Config giữ nguyên                                         | Pass                     |
| CHK-PTL-031 | Verify lưu Point Config không làm mất Checkout setting       | P1       | Đã lưu Hybrid / 7     | Cash $2.00                           | 1. Chỉ sửa Point Config<br>2. Save<br>3. Xem payload + reload               | `selected_type`, `point_bonus` giữ nguyên                             | Pass                     |
| CHK-PTL-032 | Verify sửa cả 2 form và Save 1 lần                           | P1       | —                     | Card $3.00 + Auto / 8                | 1. Sửa Point Config<br>2. Sửa Checkout setting<br>3. Save 1 lần             | Chỉ 1 PUT chứa đủ cả 2; toast "Point and checkout settings saved."    | Pass                     |
| CHK-PTL-033 | Verify Gift card No points giữ đúng khi đổi Checkout         | P2       | —                     | Gift card $0.00 (No points) + Hybrid | 1. Đặt Gift card = No points<br>2. Chọn Hybrid<br>3. Save                   | `gift_card: {enabled: false, point: 0}` giữ đúng                      | Pass                     |
| CHK-PTL-034 | Verify khung Point Config cập nhật sau khi lưu Point Config  | P2       | —                     | $2.00 / $3.00 / No points            | 1. Lưu Point Config mới<br>2. Xem khung Point Config trong Checkout setting | Khung hiện đúng tỉ lệ mới                                             | Pass (đã fix từ Round 1) |
| CHK-PTL-035 | Verify sửa Product tax rate không ảnh hưởng Checkout setting | P2       | —                     | Product tax rate 6%                  | 1. Sửa Product tax rate<br>2. Save                                          | Không PUT `merchant_point_payment_config`; Checkout setting không đổi | Pass                     |

## 6. Khác / Integration

| TC ID       | Title                                                               | Priority | Precondition                | Test Data          | Steps                                                                     | Expected Result                                                   | Status                       |
| ----------- | ------------------------------------------------------------------- | -------- | --------------------------- | ------------------ | ------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------- |
| CHK-PTL-036 | Verify đổi merchant load đúng setting                               | P2       | 2 tiệm có setting khác nhau | Merchant #14 ↔ #30 | 1. Mở setting tiệm #14<br>2. Chuyển sang #30<br>3. Quay lại #14           | Mỗi tiệm hiện đúng setting của mình                               | Pass                         |
| CHK-PTL-037 | Verify user không có quyền chỉnh setting                            | P2       | Account bị giới hạn quyền   | —                  | 1. Đăng nhập account giới hạn quyền<br>2. Mở Checkout setting             | Không chỉnh / không Save được                                     | Not tested (chưa có account) |
| CHK-PTL-038 | Verify POS nhận đúng type + bonus từ Portal                         | P1       | POS bản VP-4591             | Auto / 10          | 1. Lưu Auto / 10 trên Portal<br>2. Complete order trên POS                | POS cộng đúng 10 điểm (xem VP-4591)                               | Not tested (cần POS)         |
| CHK-PTL-039 | Verify check-in đã checkout trước khi đổi setting không bị tính lại | P2       | Có check-in đã checkout     | —                  | 1. Đổi Checkout Type, Save<br>2. Kiểm tra điểm các check-in cũ            | Check-in cũ không bị tính lại                                     | Not tested (phía API/POS)    |
| CHK-PTL-040 | Verify responsive / mobile width                                    | P3       | —                           | Width 375px        | 1. Mở trang ở mobile width                                                | Layout không vỡ, dùng được                                        | Not tested                   |
| CHK-PTL-041 | Verify form sync lại sau khi Save thành công                        | P1       | Bonus đã lưu = 8            | `abc`              | 1. Chọn Auto, nhập abc<br>2. Chọn Manual, Save<br>3. Chọn lại Auto/Hybrid | Ô Point Bonus = 8 (giá trị DB); không lỗi, không "unsaved change" | **Fail – VP-4974**           |

---

## 7. Chạy test tự động

Tài liệu tính năng: [`docs/features/checkout-type-setting.md`](../features/checkout-type-setting.md).
Page Object: `src/pages/settings/CheckoutSettingPage.ts` (fixture `checkoutSettingPage`).
Spec: `tests/e2e/settings/checkout-setting/`.

| File spec                              | TC                                                    |
| -------------------------------------- | ----------------------------------------------------- |
| `display-defaults.e2e.spec.ts`         | 001 – 009                                             |
| `point-bonus-validation.e2e.spec.ts`   | 010 – 017                                             |
| `switch-type.e2e.spec.ts`              | 018 – 021                                             |
| `save.e2e.spec.ts`                     | 022 – 029, 041                                        |
| `point-config-coexistence.e2e.spec.ts` | 030 – 035                                             |
| `integration.e2e.spec.ts`              | 036 – 040                                             |
| `persistence.e2e.spec.ts` _(opt-in)_   | 003, 022, 023, 024, 030, 031, 034 (ghi thật + reload) |

**An toàn dữ liệu:** mặc định mọi request ghi (`PUT/POST/PATCH/DELETE`) từ trang Settings bị chặn và trả về
200 giả (`mockSettingWrites`) → test kiểm payload / toast / validation mà **không đổi data DEV**.
Các case cần reload để thấy data đã lưu nằm trong `persistence.e2e.spec.ts`, chỉ chạy khi bật
`ALLOW_SETTING_WRITES=1`; spec này chạy tuần tự và trả tiệm về trạng thái ban đầu (đọc lúc bắt đầu) khi kết thúc.

- `CHK-PTL-041` là bug đã biết **VP-4974** → đánh dấu `test.fail()`; khi bug được fix test sẽ báo "unexpected pass" để gỡ annotation.
- `CHK-PTL-037/038/039` là `test.fixme` (cần account giới hạn quyền / POS / API).

```bash
npx playwright test tests/e2e/settings/checkout-setting
```

```bash
ALLOW_SETTING_WRITES=1 npx playwright test tests/e2e/settings/checkout-setting/persistence.e2e.spec.ts --workers=1
```

### Kết quả chạy

| Ngày       | Môi trường                 | Phạm vi                | Kết quả                                                                                                                   |
| ---------- | -------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-22 | stage (DEV), #14, 4 worker | mock writes (mặc định) | **42 pass** · CHK-PTL-041 expected-fail (VP-4974 vẫn tái hiện) · 3 fixme · 7 persistence skip · 1.3 phút                  |
| 2026-10-22 | stage (DEV), #14, 1 worker | persistence (ghi thật) | **7 pass** · 2.1 phút · data #14 trước = sau: Hybrid · bonus 10 · Cash/Card/Other $1.00 · Gift card $0.00 · Product tax 5 |
