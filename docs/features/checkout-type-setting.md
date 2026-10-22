# Checkout Type Setting (Portal) — Tài liệu tính năng

> Tổng hợp từ ticket Linear **VP-4590** và source Portal đã merge (`FastboyMarketing/fastboy-portal#776`).
> Bộ test case đi kèm: [`docs/test-cases/checkout-type-setting.md`](../test-cases/checkout-type-setting.md).
> Code tự động: `src/pages/settings/CheckoutSettingPage.ts` + `tests/e2e/settings/checkout-setting/`.

|                   |                                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Ticket**        | [VP-4590](https://linear.app/fastboy/issue/VP-4590/portal-checkout-type-setting) — [Portal] Checkout Type Setting                         |
| **Project**       | Checkout Type Setting                                                                                                                     |
| **Liên quan**     | VP-4554 (API, `volt-pos-api#1487`) · VP-4591 (POS Windows + Android) · VP-4974 (bug form không sync sau Save)                             |
| **PR Portal**     | `FastboyMarketing/fastboy-portal#776` — merged 2026-10-20                                                                                 |
| **Màn hình**      | Portal › Store Settings › **Payment & Transactions** › card **Checkout setting** — `/pos/nail/<storeId>/setting?tab=payment-transactions` |
| **Môi trường**    | DEV Portal `https://v2.dev-fastboypay.com` (env `stage`), Merchant #14                                                                    |
| **Trạng thái QC** | Round 2 (DEV, 2026-10-22): 36 pass · 1 fail (VP-4974) · 4 chưa test                                                                       |

## 1. Mục đích & phạm vi

Owner chọn **cách check-in được checkout** và **cách tính điểm** cho tiệm: Manual / Auto / Hybrid, kèm **Point Bonus**.

- **Scope Portal:** chỉ UI setting. Việc checkout và tính điểm nằm ở API (VP-4554) và POS (VP-4591).
- Đổi setting chỉ áp cho check-in **checkout sau thời điểm lưu**; Portal không xử lý lại check-in cũ.

## 2. Vị trí & bố cục

Tab `Payment & Transactions`, cột trái, card **Checkout setting** nằm ngay dưới card **Setting point config**
(cả 2 card chỉ hiện khi flag `merchant_point_payment_config` bật cho tiệm — `SettingFlagGate`).

- Tiêu đề: `Checkout setting`
- Mô tả: _"Choose when check-ins are checked out and how they earn points. Changes apply to check-ins checked out after you save."_
- Bước `Checkout type`: radio group (`aria-label="Checkout type"`) gồm 3 thẻ (`data-slot="merchant-option-card"`, thẻ đang chọn có `data-selected`).
- Bên dưới các thẻ: khung **Point Config** (`role="group"`, `aria-label="Point Config"`) chỉ đọc.

## 3. Field

| Field         | Kiểu                                            | Default         | Rule                                                                                                                        |
| ------------- | ----------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Checkout Type | Chọn 1: Manual / Auto / Hybrid Checkout         | Manual Checkout | Bắt buộc                                                                                                                    |
| Point Bonus   | Số nguyên ≥ 0 (input text, `inputMode=numeric`) | 0               | Chỉ hiện trong thẻ Auto / Hybrid **đang chọn**, bắt buộc. Manual không có ô này, giá trị cũ vẫn giữ. `0` = không cộng điểm. |

## 4. Ba thẻ lựa chọn (UI tiếng Anh)

| Thẻ (`id`)                                        | Mô tả                                                                                                                                                          | Ô Point Bonus (hậu tố)                                        |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Manual Checkout (`checkout-type-payment_method`)  | Check-ins are checked out when their order is completed on POS. Points follow Point Config.                                                                    | Không có                                                      |
| Auto Checkout (`checkout-type-auto_checkout`)     | Check-ins are checked out when their order is completed on POS. Point Config isn't used.                                                                       | `pts for each completed order, whatever the amount`           |
| Hybrid Checkout (`checkout-type-hybrid_checkout`) | Check-ins are checked out when their order is completed on POS, with points from Point Config. Check-ins still open at 11:59 PM are checked out automatically. | `pts for each check-in checked out automatically at 11:59 PM` |

- Point Bonus là **một** giá trị dùng chung cho Auto và Hybrid — đổi thẻ thì giá trị đang nhập đi theo.
- Click vào bất kỳ đâu trong vùng `<label>` của thẻ (text, khoảng trống) đều chọn được thẻ.

## 5. Khung Point Config

- Đọc từ giá trị **đã lưu** của Setting point config (không theo giá trị đang sửa).
- 4 dòng: `Cash`, `Card`, `Gift card`, `Other` — giá trị `1 Point = $x.xx`, hoặc `No points` khi tỉ lệ = 0.
- Ghi chú: _"Saved point conversion rates. Manual and Hybrid Checkout earn points at these rates."_

## 6. Validation Point Bonus (Auto / Hybrid)

Áp khi type ≠ Manual. Giá trị được `trim()` trước khi kiểm tra.

| Input                                                              | Kết quả                                           |
| ------------------------------------------------------------------ | ------------------------------------------------- |
| Rỗng                                                               | `Point bonus is required`                         |
| Không khớp `^\d+$` (`-1`, `1.5`, `1,5`, `abc`, `1e2`, `+5`, `5@#`) | `Point bonus must be a whole number of 0 or more` |
| > 2,147,483,647                                                    | `Point bonus must be 2,147,483,647 or less`       |
| `5` / `007`                                                        | Hợp lệ → lưu `5` / `7`                            |

Lỗi chỉ hiện khi field đã touched; khi form lỗi, Save **không gửi request**. Chuyển sang Manual thì lỗi ẩn.

## 7. Lưu

- Không có nút Save riêng trong card: khi form có thay đổi, thanh nổi **Unsaved changes** (`role="region"`) hiện ở cuối trang
  với `N unsaved change(s)`, nút **Discard** và **Save** (hỗ trợ `Ctrl/Cmd + S`).
- Checkout setting và Setting point config là **một form** → một lần Save = **một** `PUT /sys_settings/{id}` (flag `merchant_point_payment_config`).
- Toast thành công:
  - chỉ đổi Checkout → `Checkout setting saved.`
  - chỉ đổi Point Config → `Point settings saved`
  - đổi cả 2 → `Point and checkout settings saved.`
- Lỗi API → toast lỗi (đã biết: hiện 2 lần), giữ giá trị đang nhập.
- Discard → về giá trị đã lưu. Rời trang khi còn thay đổi → popup **Discard unsaved changes?** (`Stay` / `Discard`).

### Payload

```json
{
  "value": {
    "cash": { "enabled": true, "point": 100 },
    "card": { "enabled": true, "point": 100 },
    "gift_card": { "enabled": false, "point": 0 },
    "other": { "enabled": true, "point": 100 },
    "selected_type": "payment_method | auto_checkout | hybrid_checkout",
    "point_bonus": 7
  }
}
```

- `point` là cents; `enabled = point > 0`.
- Khi Save với **Manual**, `point_bonus` = giá trị **đã lưu** (không lấy giá trị nháp trong ô).
- Hai phần dùng chung flag nên mỗi lần lưu luôn gửi đủ 4 key payment + `selected_type` + `point_bonus` — không bên nào ghi đè mất key của bên kia.
- API (VP-4554) trả 422 cho cả lần save nếu value có key chưa khai báo → deploy API trước Portal.

## 8. Lỗi / ghi chú đã biết (QC Round 2)

| Mã      | Mô tả                                                                                                                                       | Ảnh hưởng test                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| VP-4974 | Save với Manual khi ô Point Bonus đang nháp (vd `abc`) → form không sync về giá trị DB; chọn lại Auto/Hybrid thấy lỗi + `1 unsaved change`. | CHK-PTL-041 (`test.fail`)           |
| —       | Save lỗi API hiện 2 toast lỗi giống nhau.                                                                                                   | CHK-PTL-027 (không assert số toast) |
| —       | Sửa cả Point Config + Checkout vẫn ghi `1 unsaved change` (cùng 1 form).                                                                    | —                                   |
| —       | Toast không đồng nhất dấu chấm (`Point settings saved` vs `Checkout setting saved.`).                                                       | —                                   |

## 9. Dữ liệu của tiệm #14

- Sau QC Round 2 (theo comment Linear): Manual Checkout · Point Bonus 5 · Point Config $1.00 × 4 · Product tax 5%.
- Thực tế lúc chạy persistence (2026-10-22): Hybrid Checkout · Point Bonus 10 · Cash / Card / Other $1.00 · Gift card $0.00 · Product tax 5 — data đã bị đổi sau QC.

Test ghi thật (opt-in) không giả định baseline cố định: mỗi test chụp trạng thái lúc bắt đầu và trả tiệm về đúng trạng thái đó khi kết thúc.
