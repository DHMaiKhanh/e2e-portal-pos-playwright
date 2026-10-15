# Tích hợp dự án E2E vào Jenkins (Windows / WAR)

Hướng dẫn đưa bộ test Playwright này chạy trên Jenkins đang chạy native trên Windows
(`java -jar jenkins.war --httpPort=9090`) — **không dùng Docker**, build chạy ngay trên máy này.

---

## Bối cảnh & 3 điểm cần biết trước

1. **Jenkins WAR native trên Windows** → pipeline dùng lệnh `bat`, `agent any`, không có Docker agent.
2. **Đăng nhập không chạy được headless.** Portal login qua Google OAuth + 2FA
   ([`tests/global.setup.ts`](../tests/global.setup.ts)). Session phải được **capture thủ công 1 lần**
   bằng `npm run auth`, tạo ra file `src/data/dynamic/auth/admin.json`, rồi tái sử dụng.
   File này **bị gitignore** ([`.gitignore`](../.gitignore) dòng 39) và **hết hạn theo thời gian**
   → phải nạp vào Jenkins qua credential và refresh định kỳ.
3. **Node version:** repo pin Node 20 ([`.nvmrc`](../.nvmrc)); Playwright 1.48 hỗ trợ chính thức 18/20/22.
   Nếu máy đang chạy Node 24 mà gặp lỗi lạ, hạ về Node 20 (dùng `nvm`).

> File pipeline: [`Jenkinsfile`](../Jenkinsfile) (đã có sẵn ở root repo).

---

## Bước 0 — Capture auth session (BẮT BUỘC làm trước)

Chạy ở terminal local (không phải trong Jenkins):

```powershell
npm run auth
```

Trình duyệt mở ra → đăng nhập Google + 2FA → session lưu vào `src/data/dynamic/auth/admin.json`.
Bỏ qua bước này thì mọi UI test sẽ fail ở `global.setup`.

---

## Bước 1 — Cài plugin Jenkins

`Manage Jenkins` → **Plugins** → tab _Available_ → cài:

| Plugin                  | Mục đích                                                     |
| ----------------------- | ------------------------------------------------------------ |
| **HTML Publisher**      | Xem Playwright HTML report trên trang build                  |
| **JUnit**               | Hiện pass/fail (thường đã có sẵn)                            |
| **NodeJS** _(tùy chọn)_ | Chỉ cần nếu `node` chưa nằm trên PATH của tiến trình Jenkins |

---

## Bước 2 — Tạo credential chứa session

`Manage Jenkins` → **Credentials** → _(global)_ → **Add Credentials**:

- **Kind:** `Secret file`
- **File:** upload `src\data\dynamic\auth\admin.json` (tạo ở Bước 0)
- **ID:** `portal-auth-state` ← **phải đúng tên này** (Jenkinsfile tham chiếu tới nó)

---

## Bước 3 — Đưa Jenkinsfile vào nơi job đọc được

Job kiểu _Pipeline from SCM_ đọc `Jenkinsfile` từ git. Chọn 1 trong 2:

- **Repo đã push GitHub:**
  ```powershell
  git add Jenkinsfile
  git commit -m "Add Jenkins pipeline for E2E suite"
  git push
  ```
- **Chạy thuần local:** chỉ cần commit; ở job dùng Git URL trỏ vào repo local:
  ```
  file:///D:/Project/Portal_FastboyPay/e2e_portal_fastboy_playwright
  ```

---

## Bước 4 — Cấu hình job `e2e portal pos`

Vào job → **Configure**:

- **Pipeline → Definition:** `Pipeline script from SCM`
- **SCM:** `Git` → Repository URL (URL GitHub hoặc `file:///D:/...` như trên)
- **Branch Specifier:** `*/main`
- **Script Path:** `Jenkinsfile`
- **Save**

---

## Bước 5 — Chạy & xem báo cáo

**Build with Parameters** → chọn `ENV`, nhập `BASE_URL` (URL Portal thật cần test) → **Build**.

Sau khi chạy xong:

- **Test Result** (JUnit) — pass/fail ngay trên trang build
- **Playwright Report** — link ở sidebar build (do HTML Publisher tạo)
- Toàn bộ `reports/**` được archive làm artifact

---

## Lưu ý riêng cho repo này

- Pipeline chạy `npx playwright test` (**không** `npm test`) để né hook `pretest`
  trong [`scripts/check-server.mjs`](../scripts/check-server.mjs) — hook này fail build nếu
  `BASE_URL` không reachable từ máy Jenkins.
- Đặt `CI=true` để [`playwright.config.ts`](../playwright.config.ts) tự bật `retries` + `forbidOnly`.
- Login **không** dùng `ADMIN_USERNAME/PASSWORD` (OAuth thủ công), nên credential duy nhất thật sự
  cần lúc chạy là **file session** — Jenkinsfile đã bỏ username/password cho gọn.

---

## Bảo trì: khi session hết hạn

Triệu chứng: test bắt đầu fail hàng loạt với thông báo _"session has expired"_ ở `global.setup`.

Cách xử lý:

1. Chạy lại `npm run auth` ở máy local để lấy `admin.json` mới.
2. `Manage Jenkins` → **Credentials** → mở `portal-auth-state` → **Update** → upload lại file mới.
3. Chạy lại job.

> Đây là việc định kỳ không tránh được với luồng đăng nhập OAuth + 2FA.

---

## Troubleshooting nhanh

| Lỗi                                | Nguyên nhân                             | Cách xử lý                                                                               |
| ---------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------- |
| `No such DSL method 'publishHTML'` | Thiếu plugin HTML Publisher             | Cài plugin ở Bước 1                                                                      |
| Fail ở stage _Auth session_        | Chưa tạo credential `portal-auth-state` | Làm lại Bước 0 + 2                                                                       |
| `session has expired`              | Session hết hạn                         | Xem mục _Bảo trì_ ở trên                                                                 |
| `'node' is not recognized`         | Jenkins không thấy Node trên PATH       | Cài plugin NodeJS và cấu hình tool, hoặc thêm Node vào PATH hệ thống rồi restart Jenkins |
| `pretest` chặn build               | Dùng nhầm `npm test`                    | Pipeline đã dùng `npx playwright test`; giữ nguyên                                       |
