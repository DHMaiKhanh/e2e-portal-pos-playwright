# Đăng nhập 1 lần & tái sử dụng session (Auth Reuse)

Portal đăng nhập bằng **Google OAuth + 2-Step Verification (thông báo điện thoại)**.
Luồng này **không thể tự động hóa** (Google chặn trình duyệt bot, và 2FA cần bấm
tay trên điện thoại). Vì vậy ta **đăng nhập thủ công 1 lần**, lưu lại phiên đăng
nhập (`storageState`), rồi **mọi test tái sử dụng** — không phải login lại cho tới
khi session hết hạn.

---

## TL;DR

```bash
# 1) Đăng nhập 1 lần (mở trình duyệt, bạn tự login Google + 2FA)
npm run auth

# 2) Chạy test — tự động dùng lại session đã lưu, không cần login
npm test
```

Khi session hết hạn, chỉ cần chạy lại `npm run auth`.

---

## Luồng hoạt động

```
┌─────────────────────────────────────────────────────────────────┐
│  MỘT LẦN DUY NHẤT (hoặc khi hết hạn)                              │
│                                                                   │
│   npm run auth                                                    │
│      │                                                            │
│      ▼                                                            │
│   scripts/capture-auth.mjs  ──►  mở Chrome (headed)               │
│      │                                                            │
│      ▼                                                            │
│   Bạn login: Google → mật khẩu → 2FA (bấm "Yes" trên điện thoại)  │
│      │                                                            │
│      ▼                                                            │
│   Bấm ENTER ở terminal  ──►  lưu cookies + localStorage vào       │
│                              src/data/dynamic/auth/admin.json     │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼  (STORAGE_STATE)
┌─────────────────────────────────────────────────────────────────┐
│  MỖI LẦN CHẠY TEST                                                │
│                                                                   │
│   npm test                                                        │
│      │                                                            │
│      ▼                                                            │
│   project "setup" (tests/global.setup.ts)                         │
│      • kiểm tra file session tồn tại & còn hạn                    │
│      • nếu hết hạn → báo lỗi rõ: "chạy npm run auth"              │
│      │                                                            │
│      ▼                                                            │
│   project "chromium"  ──►  use.storageState = admin.json          │
│      • mọi spec khởi động ĐÃ đăng nhập sẵn, vào thẳng Portal      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Thiết lập lần đầu

1. **Chọn môi trường cần đăng nhập.** `ENV` quyết định file
   `configs/env/.env.<ENV>` nào được nạp (đều gitignored, không commit):

   | `ENV`   | File                                                | `BASE_URL`                               |
   | ------- | --------------------------------------------------- | ---------------------------------------- |
   | `stage` | [configs/env/.env.stage](../configs/env/.env.stage) | `https://v2.dev-fastboypay.com`          |
   | `prod`  | [configs/env/.env.prod](../configs/env/.env.prod)   | `https://v2.fastboypay.com`              |
   | `local` | [configs/env/.env.local](../configs/env/.env.local) | `http://localhost:3000` (app chạy local) |

   Không set `ENV` thì mặc định là `local`.

2. **Cài browser (nếu chưa):**

   ```bash
   npm run setup        # npm install + playwright install chromium
   ```

3. **Đăng nhập & lưu session** — nhắm đúng môi trường bằng `ENV`:

   ```bash
   # Cách gọn (khuyên dùng) — có sẵn script tắt trong package.json
   npm run auth:stage    # → https://v2.dev-fastboypay.com
   # hoặc
   npm run auth:prod     # → https://v2.fastboypay.com
   ```

   Hai lệnh trên tương đương với cách set `ENV` thủ công rồi chạy `npm run auth`:

   ```powershell
   # Stage — https://v2.dev-fastboypay.com/
   $env:ENV="stage"; npm run auth

   # Prod — https://v2.fastboypay.com/
   $env:ENV="prod"; npm run auth
   ```

   - Một cửa sổ Chrome mở ra tại trang `/login` của đúng môi trường đã chọn.
   - Bấm **Continue with Google**, nhập email `@fastboy.net`, mật khẩu.
   - Ở bước **2-Step Verification**, mở điện thoại (Redmi Note 14 / 13C…) bấm
     **"Yes"**. 👉 Nên tick **"Don't ask again on this device"** để lần sau đỡ hỏi.
   - Khi Portal đã vào hẳn, quay lại terminal **bấm ENTER**.
   - Session được lưu vào `src/data/dynamic/auth/admin.json`.

   > Lưu ý: `stage` và `prod` hiện dùng chung `STORAGE_STATE`
   > (`src/data/dynamic/auth/admin.json`). Đổi `ENV` và chạy lại `npm run auth`
   > sẽ **ghi đè** session của môi trường trước đó — chạy test ở môi trường nào
   > thì `npm run auth` lại ở môi trường đó trước.

---

## Cách tái sử dụng

Cấu hình trong [playwright.config.ts](../playwright.config.ts) đã nối sẵn:

```ts
projects: [
  { name: 'setup', testMatch: /global\.setup\.ts/ }, // kiểm tra session
  {
    name: 'chromium',
    dependencies: ['setup'], // chạy setup trước
    use: { storageState: env.STORAGE_STATE }, // ← tái dùng session
  },
];
```

- `setup` chạy trước, xác minh session còn hợp lệ.
- `chromium` nạp `storageState` → **mọi spec bắt đầu đã đăng nhập**, không có bước
  login trong từng test.

---

## Khi session hết hạn

Dấu hiệu: `npm test` fail ở bước `setup` với thông báo:

```
Saved session at "src/data/dynamic/auth/admin.json" has expired.
Refresh it:  npm run auth
```

Xử lý: chạy lại `npm run auth` để đăng nhập & lưu session mới.

> Session sống được bao lâu tùy vào cookie/token phiên của Portal. Tick
> _"Don't ask again on this device"_ ở bước 2FA giúp lần đăng nhập lại nhanh hơn
> (thường không phải xác thực điện thoại lại).

---

## Các file liên quan

| File                                                    | Vai trò                                                               |
| ------------------------------------------------------- | --------------------------------------------------------------------- |
| [scripts/capture-auth.mjs](../scripts/capture-auth.mjs) | Mở browser, cho login thủ công, lưu `storageState`                    |
| [tests/global.setup.ts](../tests/global.setup.ts)       | Kiểm tra session còn hợp lệ trước khi chạy UI tests                   |
| [playwright.config.ts](../playwright.config.ts)         | Nối `setup` → `chromium` qua `dependencies` + `storageState`          |
| [configs/env/.env.local](../configs/env/.env.local)     | `BASE_URL`, `STORAGE_STATE` cho `ENV=local` (gitignored)              |
| [configs/env/.env.stage](../configs/env/.env.stage)     | `BASE_URL=https://v2.dev-fastboypay.com` cho `ENV=stage` (gitignored) |
| [configs/env/.env.prod](../configs/env/.env.prod)       | `BASE_URL=https://v2.fastboypay.com` cho `ENV=prod` (gitignored)      |
| `src/data/dynamic/auth/admin.json`                      | File session được sinh ra (gitignored)                                |

> ⚠️ `src/data/dynamic/auth/` nằm trong `.gitignore` — session **không bao giờ**
> được commit lên repo.

---

## (Tùy chọn) Dùng lại session cho Playwright MCP

Nếu muốn trình duyệt do MCP điều khiển cũng khởi động ở trạng thái đã đăng nhập,
thêm cờ `--storage-state` vào server `playwright` trong [.mcp.json](../.mcp.json):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest",
        "--storage-state",
        "./src/data/dynamic/auth/admin.json"
      ]
    }
  }
}
```

> Chỉ thêm cờ này **sau khi** đã chạy `npm run auth` (file phải tồn tại), nếu không
> MCP server có thể lỗi lúc khởi động. Muốn MCP tự **ghi lại** session (đăng nhập
> trong MCP là nhớ luôn), dùng `--user-data-dir <thư-mục>` thay cho `--storage-state`.

---

## Khắc phục sự cố

| Triệu chứng                                   | Nguyên nhân / Cách xử lý                                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Google báo _"This browser may not be secure"_ | Script ưu tiên Chrome thật (`channel: 'chrome'`). Cài Google Chrome, hoặc thử lại — hosted domain `fastboy.net` thường không bị chặn. |
| `setup` fail: _No saved session_              | Chưa chạy `npm run auth`. Chạy nó trước.                                                                                              |
| `setup` fail: _has expired_                   | Session hết hạn → chạy lại `npm run auth`.                                                                                            |
| Test vẫn bị đá về `/login`                    | `BASE_URL` sai, hoặc `STORAGE_STATE` trỏ nhầm file. Kiểm tra `configs/env/.env.local`.                                                |
| Không nhận thông báo 2FA                      | Trên màn 2FA bấm **"Try another way"** để chọn mã SMS / Authenticator.                                                                |
