# Chạy suite E2E trên Jenkins

Pipeline nằm ở [Jenkinsfile](../Jenkinsfile). Nó chạy Playwright trong container
`mcr.microsoft.com/playwright`, nạp cấu hình môi trường + session đăng nhập từ
Jenkins Credentials, rồi publish JUnit / HTML / Allure report.

> Chưa từng dùng Docker/Jenkins? Đọc bản chi tiết từng bước trước:
> [jenkins-getting-started.md](jenkins-getting-started.md). Tài liệu này giả định
> bạn đã quen Jenkins.

## 0. Dựng Jenkins bằng Docker

Nếu chưa có Jenkins sẵn, dùng luôn setup trong [ci/jenkins/](../ci/jenkins/):

```bash
docker compose -f ci/jenkins/docker-compose.yml up -d --build
```

Lần đầu build mất vài phút (cài docker CLI + tải plugin). Xong thì mở
http://localhost:8090 và lấy mật khẩu khởi tạo:

```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Ở màn hình setup chọn **Select plugins to install → None** rồi Install — toàn bộ
plugin ở mục 1 đã được nướng sẵn vào image qua
[ci/jenkins/plugins.txt](../ci/jenkins/plugins.txt), cài thêm bộ "suggested" chỉ
làm chậm và thừa. Sau đó tạo user admin.

Setup này gồm 2 container:

| Container      | Vai trò                                                           |
| -------------- | ----------------------------------------------------------------- |
| `jenkins`      | Controller + UI. Có docker CLI để chạy `agent { docker { ... } }` |
| `jenkins-dind` | Docker daemon riêng cho build, giữ cache image Playwright (~2GB)  |

Dùng Docker-in-Docker thay vì mount `/var/run/docker.sock` là có chủ ý: xem ghi
chú đầu [docker-compose.yml](../ci/jenkins/docker-compose.yml). Tóm tắt: với
socket của host, đường dẫn workspace mà Jenkins bind-mount vào container
Playwright không resolve đúng → checkout rỗng.

Lệnh hay dùng:

```bash
docker compose -f ci/jenkins/docker-compose.yml logs -f jenkins   # xem log
docker compose -f ci/jenkins/docker-compose.yml restart jenkins   # restart
docker compose -f ci/jenkins/docker-compose.yml down              # dừng, GIỮ dữ liệu
docker compose -f ci/jenkins/docker-compose.yml down -v           # xoá sạch cả JENKINS_HOME
```

Suite chạy 8 worker Chromium song song, khá nặng RAM. Trên Docker Desktop nên
cấp cho WSL2 ít nhất 8GB (Settings → Resources), nếu không tab sẽ bị OOM-kill
giữa chừng và test fail rải rác không theo quy luật nào.

## 1. Plugin cần cài

Đi theo mục 0 thì bước này xong rồi — nhảy thẳng xuống mục 2. Phần dưới dành cho
Jenkins dựng sẵn theo cách khác. Manage Jenkins → Plugins:

| Plugin              | Dùng cho                                    |
| ------------------- | ------------------------------------------- |
| Docker Pipeline     | `agent { docker { ... } }`                  |
| Credentials Binding | `withCredentials([file(...)])`              |
| JUnit               | `junit` — biểu đồ pass/fail theo build      |
| HTML Publisher      | Link "Playwright HTML Report" ở trang build |
| Allure              | `allure(...)`                               |
| AnsiColor           | `ansiColor('xterm')` — log có màu           |
| Timestamper         | `timestamps()`                              |

Thiếu AnsiColor hoặc Timestamper thì pipeline **fail ngay ở bước parse**, không
phải lúc chạy — nên cài đủ trước khi tạo job. Nếu không dùng Allure, xoá block
`allure(...)` trong `post` thay vì cài plugin.

Agent chạy job phải có `docker` CLI và truy cập được một Docker daemon.

Allure còn cần một tool tên `allure` ở Manage Jenkins → Tools → Allure
Commandline (chọn "Install automatically", bản 2.30.x cho khớp
`allure-commandline` trong `package.json`).

## 2. Credentials cần tạo

Suite này **không tự đăng nhập được**: Portal dùng Google OAuth + 2-Step
Verification, không drive headless được (chi tiết: [authentication.md](authentication.md)).
Session phải chụp thủ công một lần rồi nạp vào Jenkins. Kèm theo đó, các file
`configs/env/.env.*` bị gitignore nên cũng phải cấp qua credential.

Manage Jenkins → Credentials → (global) → Add Credentials, tạo **2 credential cho
mỗi môi trường**:

### `portal-pos-env-<env>` — Kind: **Secret file**

Nội dung là chính file `configs/env/.env.<env>` mà bạn đang dùng ở máy local. Xem
khung mẫu ở [configs/env/.env.example](../configs/env/.env.example); tối thiểu cần:

```
ENV=stage
HEADLESS=true
BASE_URL=https://<portal-host>
API_URL=https://<api-host>
ADMIN_USERNAME=<user>
ADMIN_PASSWORD=<pass>
STORE_ID=<id>
STORAGE_STATE=src/data/dynamic/auth/admin.json
```

Đóng gói cả file thay vì tách từng biến thành credential riêng là có chủ ý: thêm
biến mới sau này chỉ cần sửa file trên Jenkins, không phải đụng vào Jenkinsfile.

> Nếu không nạp file này, `loadEnv` rơi về `.env.example` → `BASE_URL` thành
> `http://localhost:3000` và **cả suite fail** mà không rõ lý do.

### `portal-pos-storage-state-<env>` — Kind: **Secret file**

Upload file `src/data/dynamic/auth/admin.json` sinh ra bởi:

```bash
npm run auth          # mở browser, bạn tự đăng nhập, session được lưu lại
```

`<env>` khớp với tham số `TARGET_ENV` của job: `stage`, `prod`, `local`.

Chưa có `.env.stage` thì cứ chạy `TARGET_ENV=local` cho lần đầu: `.env.local` trỏ
vào Portal DEV thật (không phải localhost) nên container trên Jenkins gọi tới được,
và `npm run auth` cũng ghim `ENV=local` — session chụp ra khớp luôn môi trường đó.

## 3. Tạo job

New Item → **Pipeline** (hoặc Multibranch Pipeline nếu muốn build theo branch):

- Definition: **Pipeline script from SCM**
- SCM: Git → Repository URL `https://github.com/DHMaiKhanh/e2e-portal-pos-playwright.git`
- Credentials: Personal Access Token của GitHub (kind **Username with password**,
  password = token) nếu repo private
- Branch: `*/main`
- Script Path: `Jenkinsfile`

Phải là URL remote, **không** trỏ vào `D:.Portal_POS\...`: Jenkins chạy trong
container Linux, không nhìn thấy ổ đĩa Windows.

Build lần đầu sẽ chỉ nạp tham số rồi dừng (hành vi bình thường của Jenkins với
job có `parameters`). Từ lần thứ hai trở đi dùng **Build with Parameters**.

## 4. Tham số khi build

| Tham số       | Mặc định | Ghi chú                                                             |
| ------------- | -------- | ------------------------------------------------------------------- |
| `TARGET_ENV`  | `stage`  | Chọn cặp credential được nạp và giá trị `ENV` truyền cho Playwright |
| `TEST_PATH`   | _(rỗng)_ | Thu hẹp phạm vi, vd `tests/e2e/customers`. Rỗng = chạy hết          |
| `GREP`        | _(rỗng)_ | `--grep`, vd `@smoke`                                               |
| `WORKERS`     | `8`      | Điểm bão hoà đã đo — xem chú thích trong `playwright.config.ts`     |
| `TRACE`       | `off`    | Bật `retain-on-failure` khi cần điều tra; nó làm chậm ~25% cả suite |
| `RUN_QUALITY` | `true`   | Chạy `lint` + `typecheck` trước                                     |

## 5. Đọc kết quả build

- **Test Result** (JUnit) — số pass/fail, xu hướng theo build
- **Playwright HTML Report** — link ở sidebar trang build
- **Allure Report** — link ở sidebar
- **Artifacts** — `results.json`, screenshot / video / trace của test fail

Quy ước trạng thái build:

| Trạng thái | Nghĩa là                                                             |
| ---------- | -------------------------------------------------------------------- |
| `SUCCESS`  | Toàn bộ test pass                                                    |
| `UNSTABLE` | Có test fail — lỗi nằm ở app hoặc ở test, xem report                 |
| `FAILURE`  | Hỏng trước khi test chạy: install, lint/typecheck, hoặc Preflight đỏ |

Tách `UNSTABLE` khỏi `FAILURE` là để phân biệt "test tìm ra vấn đề" với "pipeline
không chạy nổi" — hai thứ này cần người khác nhau xử lý.

## 6. Session hết hạn — lỗi hay gặp nhất

Stage **Preflight** chạy riêng project `setup` trước khi vào suite chính, đúng để
bắt trường hợp này. Khi session bị server thu hồi, build fail ngay ở đó với hướng
dẫn thay vì để hàng trăm test timeout trong 1 tiếng (đã từng xảy ra:
[auth-session-expiry-issue.md](auth-session-expiry-issue.md) — 112 fail chỉ vì
session chết).

Cách xử lý:

```bash
npm run auth    # trên máy dev, đăng nhập lại
```

rồi upload lại `src/data/dynamic/auth/admin.json` vào credential
`portal-pos-storage-state-<env>` và build lại.

Đây cũng là lý do `triggers { cron(...) }` bị comment sẵn trong Jenkinsfile: build
theo lịch sẽ đỏ hàng loạt ngay khi session hết hạn. Chỉ bật khi đã có cách làm mới
session tự động (service account bỏ được 2FA, hoặc refresh token dài hạn).

## 7. Khi nâng version Playwright

Tag image trong Jenkinsfile phải khớp `@playwright/test` trong
`package-lock.json`:

```groovy
image 'mcr.microsoft.com/playwright:v1.61.1-noble'
```

Lệch version không làm build đỏ — stage `Install` sẽ tự tải browser đúng bản vào
cache trong workspace — nhưng mỗi build phải tải thêm ~150MB. Đổi tag cùng lúc
với lần nâng package là xong.

Hai file CI cũ ([.github/workflows/e2e.yml](../.github/workflows/e2e.yml) và
[.gitlab-ci.yml](../.gitlab-ci.yml)) vẫn đang ghi `v1.48.0-jammy` — đã lỗi thời so
với lockfile, cần sửa nếu còn dùng.

## 8. Hai lỗi ở lần chạy job đầu tiên

### `Could not find credentials entry with ID 'portal-pos-env-stage'`

Chưa tạo credential — quay lại [mục 2](#2-credentials-cần-tạo). Job cần đúng 2
credential kind **Secret file** cho môi trường đang build:

| ID                               | Nội dung                           |
| -------------------------------- | ---------------------------------- |
| `portal-pos-env-<env>`           | `configs/env/.env.<env>`           |
| `portal-pos-storage-state-<env>` | `src/data/dynamic/auth/admin.json` |

Repo mới chỉ có `.env.local`, chưa có `.env.stage`. Chạy lần đầu thì để
`TARGET_ENV=local` (mặc định của job là `stage` — phải đổi trong màn hình
"Build with Parameters"), vì `.env.local` đã trỏ vào Portal DEV thật.

### `AllurePluginException: ... exit code: 127`

Đi kèm dòng `OCI runtime exec failed: ... allure: no such file or directory`.

Allure CLI được Jenkins cài trên controller ở `/var/jenkins_home/tools/...`.
Nếu `agent { docker { ... } }` đặt ở **cấp pipeline** thì `post{}` cũng chạy bên
trong container Playwright — container chỉ mount thư mục workspace, không mount
`tools/`, và image Playwright cũng không có Java để chạy Allure. Kết quả: build
nào cũng đỏ ở `post`, kể cả khi toàn bộ test pass.

Jenkinsfile hiện tại đã xử lý: `agent any` ở cấp pipeline, container khai báo ở
stage `Build & test` với `reuseNode true` (dùng chung workspace). Bước `allure`
cũng được bọc `try/catch` để lỗi publish không nuốt mất JUnit + HTML report.

Vẫn lỗi thì kiểm tra Manage Jenkins → Tools → Allure Commandline: phải có một
tool tên `allure`, bật **Install automatically** (bản 2.30.x).
