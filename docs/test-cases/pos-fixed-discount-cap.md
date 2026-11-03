# VP-4375 — Giảm giá FIXED vượt phần được giảm: lưu và hiển thị đúng số đã áp (POS)

> Khi giảm giá FIXED (promo nhập tay, campaign FIXED, reward FIXED) lớn hơn phần được giảm (các dòng không phải gift
> card, sau khi trừ giảm giá món), checkout chỉ thu theo số đã giới hạn nhưng lại **lưu và hiển thị số đã nhập**
> (−$30 thay vì −$20, `discountAmount` dòng $30, phí promo staff $15 thay vì $10). Lỗi có từ v1.1.1, trên cả Windows lẫn
> P8D; lộ rõ từ VP-3767 (gift card bị loại khỏi phần được giảm). ID test case: `TC-VP4375-NN`.

|                    |                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **Ticket**         | [VP-4375](https://linear.app/fastboy/issue/VP-4375) — In Review · liên quan [VP-3767](https://linear.app/fastboy/issue/VP-3767) |
| **PR**             | Chưa ghi trên Linear (đang review)                                                                                              |
| **Nền tảng**       | Windows / Android (P8D) — phải ship cùng lúc (lockstep)                                                                         |
| **Màn hình**       | Create Order › **Promotions & Rewards** · Checkout / Payment · Customer Display · Receipt · Order History · Payroll             |
| **Môi trường**     | DEV (POS kết nối dev), tiệm test #14                                                                                            |
| **Tự động hoá**    | Không — app POS, test tay                                                                                                       |
| **Tổng test case** | 12                                                                                                                              |

---

## A. Phạm vi & dữ liệu

- **Trong phạm vi:** số Promotion / Reward đã áp khi giảm FIXED vượt phần được giảm — tiền khách trả, dòng
  Promotion/Reward trên màn checkout, customer display, receipt; `discountAmount` của dòng dịch vụ; phí promo staff
  (income/payroll); các luồng complete: checkout thường, split, reopen; Windows và P8D.
- **Ngoài phạm vi:** sửa dữ liệu các đơn đã lưu sai từ v1.1.1 (ticket chỉ sửa đơn mới — câu hỏi mở cho PO); giảm giá
  theo %.
- **Dữ liệu:**
  - Service Fee = 0, Cash Discount = 0 (cho dễ đọc số); thanh toán Cash.
  - 1 dịch vụ **$20** (staff A), 1 **Gift Card Sale $100**.
  - 1 **campaign FIXED $30**, 1 **reward FIXED $30** đang active; khách đủ điểm đổi reward.
  - Promo chia **Owner 50% / Staff 50%**.
- **Lưu ý khi giảm tay:** dialog đã chặn số lớn hơn phần được giảm ("Discount cannot exceed $20.00") trên Windows
  develop và P8D (develop + production) — chỉ Windows production cho nhập $30. Ở chỗ bị chặn dùng cách ở TC-10. Campaign
  và reward FIXED không qua guard này nên tái hiện được mọi nơi.
- **Câu hỏi mở (chưa chốt):** thứ tự chia ngân sách khi nhiều nguồn cùng vượt — đề xuất promo → reward → cashback, cần PO
  xác nhận. TC-07 dựa trên đề xuất này.

### Bảng kết quả mong đợi (theo ticket)

| Chỗ xem                                 | Đúng ra | Lỗi hiện tại      |
| --------------------------------------- | ------- | ----------------- |
| Tiền khách trả                          | $100    | $100 (đúng)       |
| Dòng Promotion trên màn hình và receipt | −$20    | −$30              |
| `discountAmount` của dòng dịch vụ $20   | $20     | $30               |
| Phí promo staff A chịu (50%)            | $10     | $15 (trừ thừa $5) |

---

## B. Test case

### B1. Gift card $100 + dịch vụ $20, giảm FIXED $30

#### TC-VP4375-01 — Giảm tay FIXED $30: khách trả $100, mọi nơi hiện −$20 · Critical

| Bước | Thao tác                                                                                                  | Kết quả mong đợi                                                            |
| ---- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1    | Tạo order: 1 dịch vụ $20 (staff A) + 1 Gift Card Sale $100                                                |                                                                             |
| 2    | **Promotions & Rewards** → giảm tay (custom) theo **$** → nhập **30** → Owner 50% / Staff 50% → **Apply** | Promo được áp (nếu dialog chặn, xem TC-10)                                  |
| 3    | Vào Checkout, xem dòng Promotion và customer display                                                      | Dòng Promotion **−$20**; tổng phải trả **$100**                             |
| 4    | Trả Cash → Complete                                                                                       | Thanh toán thành công                                                       |
| 5    | Order History → mở order → xem receipt                                                                    | Receipt dòng Promotion **−$20**; các dòng giảm giá cộng lại = dòng Discount |
| 6    | Xem chi tiết dòng dịch vụ                                                                                 | `discountAmount` dòng dịch vụ = **$20** (không lớn hơn giá dòng)            |

#### TC-VP4375-02 — Phí promo staff tính trên số đã áp ($10, không phải $15) · Critical

| Bước | Thao tác                                        | Kết quả mong đợi                                       |
| ---- | ----------------------------------------------- | ------------------------------------------------------ |
| 1    | Dùng order ở TC-01 (chia Owner 50% / Staff 50%) |                                                        |
| 2    | Xem income / payroll của staff A                | Phí promo staff A chịu = **$10**; không bị trừ thừa $5 |

#### TC-VP4375-03 — (a) Campaign FIXED $30 · High

| Bước | Thao tác                                                       | Kết quả mong đợi                                                                                               |
| ---- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1    | Order dịch vụ $20 + Gift Card $100, áp **campaign FIXED $30**  |                                                                                                                |
| 2    | Checkout → Cash → Complete; xem receipt, dòng dịch vụ, payroll | Khách trả $100; Promotion **−$20** trên checkout/customer display/receipt; `discountAmount` $20; phí staff $10 |

#### TC-VP4375-04 — (b) Reward FIXED $30, không có phí staff · High

| Bước | Thao tác                                                                       | Kết quả mong đợi                                                                                  |
| ---- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| 1    | Order dịch vụ $20 + Gift Card $100 cho khách đủ điểm, đổi **reward FIXED $30** |                                                                                                   |
| 2    | Checkout → Cash → Complete; xem receipt, dòng dịch vụ                          | Khách trả $100; dòng Reward **−$20** trên checkout/customer display/receipt; `discountAmount` $20 |
| 3    | Xem payroll staff A                                                            | **Không** có phí promo cho staff (reward không tính phí promo)                                    |

#### TC-VP4375-05 — (c) Chỉ có dịch vụ $20, giảm FIXED $30 · High

| Bước | Thao tác                                                   | Kết quả mong đợi                                                          |
| ---- | ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1    | Order chỉ có dịch vụ $20 (không gift card), giảm FIXED $30 |                                                                           |
| 2    | Checkout → Complete; xem receipt, dòng dịch vụ, payroll    | Khách trả **$0**; Promotion **−$20**; `discountAmount` $20; phí staff $10 |

### B2. Giới hạn chung nhiều nguồn

#### TC-VP4375-06 — (d) Giảm giá món $5 + promo FIXED $18 · Critical

| Bước | Thao tác                                                              | Kết quả mong đợi                                                                    |
| ---- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1    | Order dịch vụ $20, thêm **giảm giá món $5**                           | Phần được giảm còn $15                                                              |
| 2    | Áp custom FIXED **$18** (Owner 50% / Staff 50%) → Checkout → Complete |                                                                                     |
| 3    | Xem receipt, dòng dịch vụ, payroll                                    | Promo đã áp lưu **$15** (không phải $18); phí promo staff **$7.50** (không phải $9) |

#### TC-VP4375-07 — (e) Promo FIXED $15 + reward FIXED $15 trên dịch vụ $20 · Critical

| Bước | Thao tác                                                          | Kết quả mong đợi                                                                                                                             |
| ---- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Order dịch vụ $20, áp custom FIXED **$15** + reward FIXED **$15** |                                                                                                                                              |
| 2    | Checkout → Complete; xem receipt, dòng dịch vụ                    | Tổng promo + reward đã áp = **$20**; `discountAmount` dòng **$20** (không phải $30); các dòng giảm giá trên receipt cộng lại = dòng Discount |
| 3    | Ghi lại cách chia promo / reward                                  | Theo thứ tự đã chốt (đề xuất promo → reward: promo $15, reward $5) — đối chiếu khi PO chốt                                                   |

### B3. Nền tảng, luồng complete và biên

#### TC-VP4375-08 — Kết quả giống hệt trên Android (P8D) · Critical

| Bước | Thao tác                                       | Kết quả mong đợi                                                                         |
| ---- | ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1    | Chạy lại TC-01 → TC-07 trên P8D cùng bản build | Số trên màn Payment, customer display, receipt, `discountAmount`, phí staff khớp Windows |

#### TC-VP4375-09 — Complete bằng split payment và reopen lưu đúng số đã áp · High

| Bước | Thao tác                                                        | Kết quả mong đợi                                    |
| ---- | --------------------------------------------------------------- | --------------------------------------------------- |
| 1    | Order như TC-01 (giảm FIXED $30) → thanh toán **split** 2 check | Tổng các check = $100; Promotion −$20               |
| 2    | Xem receipt / dòng dịch vụ / payroll                            | Promotion −$20; `discountAmount` $20; phí staff $10 |
| 3    | Re-Open order → Re-Open Done                                    | Số đã áp không đổi (vẫn −$20 / $20 / $10)           |

#### TC-VP4375-10 — Dialog giảm tay chặn số vượt; vượt qua bằng cách xoá bớt món · Medium

| Bước | Thao tác                                                           | Kết quả mong đợi                                                                                  |
| ---- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| 1    | Order dịch vụ $20, giảm tay $ nhập **30**                          | Dialog báo "Discount cannot exceed $20.00", không cho Apply (Windows develop, P8D)                |
| 2    | Order **2 dịch vụ $20** → giảm tay **$30** → Apply → xoá 1 dịch vụ | Promo vẫn còn trên order                                                                          |
| 3    | Checkout → Complete; xem receipt, dòng dịch vụ, payroll            | Promotion **−$20**; `discountAmount` $20; phí staff $10 (cách này ticket ghi "chưa thử trên máy") |

#### TC-VP4375-11 — Phí promo staff tính lại khi giỏ thay đổi · High

| Bước | Thao tác                                                         | Kết quả mong đợi                                                                |
| ---- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1    | Áp promo FIXED $30 lên order 2 dịch vụ $20 (staff A), chia 50/50 |                                                                                 |
| 2    | Lần lượt: xoá 1 món / đổi giá món / thêm giảm giá món → Complete | Phí promo staff tính trên phần promo đã áp sau thay đổi, không theo số nhập $30 |

#### TC-VP4375-12 — Giảm FIXED nhỏ hơn hoặc bằng phần được giảm không đổi hành vi · Medium

| Bước | Thao tác                                               | Kết quả mong đợi                                                  |
| ---- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| 1    | Dịch vụ $20, giảm FIXED **$10** → Complete             | Promotion −$10; `discountAmount` $10; phí staff (50%) $5          |
| 2    | Dịch vụ $20, giảm FIXED **$20** (bằng biên) → Complete | Promotion −$20; khách trả $0; `discountAmount` $20; phí staff $10 |

---

## C. Kết quả QC trên Linear

Chưa có kết quả QC. Ticket đang **In Review** (comment 06/10 và 22/10 chỉ nhờ review PR). Mô tả ticket ghi đã xác minh
lỗi ngày 08/10 trên `develop` (`09b4dc827`) bằng cách chạy các hàm dùng chung — cả 4 ca ra đúng bảng "Lỗi hiện tại".

## Lịch sử chạy

_Chưa chạy._
