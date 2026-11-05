# VP-4812 — Setting "Earn points on tip" (Portal)

> Tiệm yêu cầu tiền tip **không** tính điểm. Thêm setting **Earn points on tip** (chỉ cấu hình trên Portal) trong
> Store Settings › Payment & transactions; POS đọc setting này khi cộng điểm. Spec:
> `tests/e2e/regression-linear/vp-4812.e2e.spec.ts`. ID test case: `TC-VP4812-NN`.

|                     |                                                                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ticket**          | [VP-4812](https://linear.app/fastboy/issue/VP-4812) — QC Completed (QC tay 11/11 Pass, POS 1.1.86)                                                         |
| **PR**              | volt-pos #3262 (POS) · backend xong 29/10                                                                                                                  |
| **Màn hình**        | Store Settings › **Payment & transactions** (`/pos/nail/<store>/setting?tab=payment-transactions`), card _Checkout setting_, bước **Tip**                  |
| **Môi trường**      | DEV Portal `https://v2.dev-fastboypay.com`, store `#14`, session `admin.stage.json`                                                                        |
| **Chạy**            | `ENV=stage npx playwright test tests/e2e/regression-linear/vp-4812.e2e.spec.ts`                                                                            |
| **Ghi dữ liệu DEV** | **Không** — dùng `CheckoutSettingPage.mockSettingWrites()`: `PUT /sys_settings` bị chặn, trả 200 giả, và lần GET sau khi lưu được phủ bằng giá trị vừa gửi |
| **Tổng test case**  | 8 tự động (Portal) + 10 POS test tay                                                                                                                       |

---

## A. Phạm vi & dữ liệu

- **Trong phạm vi:** hiển thị switch, trạng thái load từ server, Discard, payload khi Save (bật/tắt), giữ trạng thái
  sau reload, không làm mất `earn_on_tip` khi sửa phần khác của form, lỗi khi lưu thất bại.
- **Test tay (POS, mục B cuối):** POS cộng điểm có/không tính tip theo Cash / Card / Gift card / Other, POS nhận setting
  mới không cần khởi động lại app.
- **Dữ liệu:** đọc flag `merchant_point_payment_config` của store qua `GET /sys_settings?key=…` để biết trạng thái
  đang lưu. Không ghi gì lên DEV.

### Phát hiện khi quét DOM (2026-11-02, chặn mọi request ghi)

- Bước **Tip** nằm trong card _Checkout setting_, dùng chung form với _Setting point config_ và Checkout type.
- Control: `switch "Earn points on tip"` (`#earnOnTip`), mô tả `#earnOnTip-description` = **"Count the tip in the amount
  that earns points."** — mô tả giống nhau ở cả hai trạng thái (QC đã ghi chú: khác mock "Tips don't earn points…").
- Bật/tắt → thanh **Unsaved changes** hiện "1 unsaved change" (Discard / Save).
- Save gửi `PUT /sys_settings/<id>` với toàn bộ flag: `{cash, card, gift_card, other, selected_type, point_bonus,
earn_on_tip}`.
- Trạng thái DEV 02/11: `earn_on_tip = false`.

---

## B. Test case

#### TC-VP4812-01 — Hiển thị bước Tip và switch "Earn points on tip" · High

| Bước | Thao tác                                   | Kết quả mong đợi                                                                                                                     |
| ---- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Mở Store Settings › Payment & transactions | Trong card Checkout setting có bước **Tip**, switch **Earn points on tip** và mô tả "Count the tip in the amount that earns points." |

#### TC-VP4812-02 — Switch hiển thị đúng giá trị đang lưu · High

| Bước | Thao tác                            | Kết quả mong đợi                  |
| ---- | ----------------------------------- | --------------------------------- |
| 1    | Đọc `earn_on_tip` của flag qua API  |                                   |
| 2    | So với trạng thái switch trên trang | Switch bật ⇔ `earn_on_tip = true` |

#### TC-VP4812-03 — Bật/tắt switch hiện thanh Unsaved changes, Discard trả về giá trị cũ · Medium

| Bước | Thao tác              | Kết quả mong đợi                                         |
| ---- | --------------------- | -------------------------------------------------------- |
| 1    | Đổi trạng thái switch | Thanh "1 unsaved change" hiện                            |
| 2    | **Discard**           | Thanh ẩn; switch về trạng thái cũ; không gửi request ghi |

#### TC-VP4812-04 — Bật rồi Save gửi `earn_on_tip: true` · High

| Bước | Thao tác                                      | Kết quả mong đợi                                                                                        |
| ---- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1    | (Nếu đang bật thì tắt + lưu trước) Bật switch | Switch bật                                                                                              |
| 2    | **Save**                                      | `PUT /sys_settings/<id>` có `earn_on_tip: true`; các khoá khác giữ nguyên; toast "Point settings saved" |

#### TC-VP4812-05 — Tắt rồi Save gửi `earn_on_tip: false` · High

| Bước | Thao tác                                      | Kết quả mong đợi                                       |
| ---- | --------------------------------------------- | ------------------------------------------------------ |
| 1    | (Nếu đang tắt thì bật + lưu trước) Tắt switch | Switch tắt                                             |
| 2    | **Save**                                      | Payload `earn_on_tip: false`; các khoá khác giữ nguyên |

#### TC-VP4812-06 — Trạng thái được giữ sau reload · Medium

| Bước | Thao tác          | Kết quả mong đợi                |
| ---- | ----------------- | ------------------------------- |
| 1    | Đổi switch → Save |                                 |
| 2    | Reload trang      | Switch vẫn ở trạng thái vừa lưu |

#### TC-VP4812-07 — Sửa Checkout type không làm mất `earn_on_tip` · High

| Bước | Thao tác                                        | Kết quả mong đợi                                   |
| ---- | ----------------------------------------------- | -------------------------------------------------- |
| 1    | Không đụng switch, đổi Checkout type → **Save** | Payload vẫn có `earn_on_tip` bằng giá trị đang lưu |

#### TC-VP4812-08 — Lưu thất bại không báo thành công · Medium

| Bước | Thao tác                            | Kết quả mong đợi                                                 |
| ---- | ----------------------------------- | ---------------------------------------------------------------- |
| 1    | Giả lập `PUT /sys_settings` trả 500 |                                                                  |
| 2    | Đổi switch → **Save**               | Không có toast "saved"; thanh Unsaved changes vẫn còn để lưu lại |

### POS — cộng điểm có/không tính tip (test tay)

Điều kiện: Point config Cash / Card / Gift card / Other đều _Earning_ 1 điểm = $1.00, thuế 5%. Đổi switch trên Portal
rồi tạo đơn trên POS (vd dịch vụ $60 → $63.00 có thuế), khách chọn tip trên màn hình khách. Đối chiếu "You've earned"
trên màn hình khách với lịch sử điểm của khách trên server.

| TC               | Setting | Kịch bản                                         | Kết quả mong đợi (ví dụ $63.00)             | Ưu tiên |
| ---------------- | ------- | ------------------------------------------------ | ------------------------------------------- | ------- |
| TC-VP4812-POS-01 | Bật     | Cash + tip 20% ($12)                             | +75 điểm (tính cả tip)                      | High    |
| TC-VP4812-POS-02 | Bật     | Card + tip 20% ($12) — $64.89 có phí thẻ         | +76 điểm (tính cả tip)                      | High    |
| TC-VP4812-POS-03 | Tắt     | Cash + tip 20% ($12)                             | +63 điểm (không tính tip)                   | High    |
| TC-VP4812-POS-04 | Tắt     | Card + tip 20% ($12)                             | +64 điểm (không tính tip)                   | High    |
| TC-VP4812-POS-05 | Tắt     | Cash, No Tip                                     | +63 điểm (như bình thường)                  | Medium  |
| TC-VP4812-POS-06 | Bật lại | Cash + tip 15% ($9), **không** khởi động lại POS | +72 điểm — POS nhận setting mới ngay đơn kế | High    |
| TC-VP4812-POS-07 | Bật     | Other + tip 20%                                  | +75 điểm                                    | Medium  |
| TC-VP4812-POS-08 | Bật     | Gift card + tip 20% (gift card trả cả tip)       | +75 điểm                                    | Medium  |
| TC-VP4812-POS-09 | Tắt     | Other + tip 20%                                  | +63 điểm                                    | Medium  |
| TC-VP4812-POS-10 | Tắt     | Gift card + tip 20%                              | +63 điểm                                    | Medium  |

Mỗi ca: số điểm trên màn hình khách = số điểm ghi trên đơn = chênh lệch trong lịch sử điểm của khách.

---

## C. Kết quả QC trên Linear

- **31/10 – 01/11/2026 (POS Windows DEV 1.1.86, store #14): 11/11 PASS.** Portal (TC-01 của QC ≈ TC-VP4812-01…-06) và 10
  ca POS ở trên đều pass; điểm trên màn hình khách khớp log điểm server.
- Ghi chú QC: mô tả dưới toggle luôn là "Count the tip in the amount that earns points." ở cả 2 trạng thái, khác mock
  ("Tips don't earn points…" khi tắt) — chờ PO quyết, không phải lỗi.

---

## D. Chạy test tự động

| Test case          | Tự động               | Ghi chú                                      |
| ------------------ | --------------------- | -------------------------------------------- |
| TC-VP4812-01 … -08 | `vp-4812.e2e.spec.ts` | Không ghi dữ liệu (mock `PUT /sys_settings`) |

```bash
ENV=stage npx playwright test tests/e2e/regression-linear/vp-4812.e2e.spec.ts --reporter=list
```

## Lịch sử chạy

### 2026-11-02 (UTC+7)

- Lệnh: `ENV=stage npx playwright test tests/e2e/regression-linear/vp-5338.e2e.spec.ts tests/e2e/regression-linear/vp-4812.e2e.spec.ts tests/e2e/regression-linear/vp-4809.e2e.spec.ts tests/e2e/regression-linear/vp-3356.e2e.spec.ts --retries=0 --reporter=list` (chạy chung 4 spec: 32 passed, 1 failed)
- Kết quả spec này: **8/8 passed**
- Toast khi chỉ đổi switch Tip: "Point settings saved".
- Dữ liệu DEV sau khi chạy: không đổi (kiểm qua API: không có category `E2E VP5338…`, không category nào bị sửa trong ngày, flag `merchant_point_payment_config` vẫn cập nhật lần cuối 31/10, `earn_on_tip = false`).
