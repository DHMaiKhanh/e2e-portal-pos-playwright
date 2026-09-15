# Chạy suite E2E trên Jenkins

Pipeline nằm ở [Jenkinsfile](../Jenkinsfile). Nó chạy Playwright trong container
`mcr.microsoft.com/playwright`, nạp cấu hình môi trường + session đăng nhập từ
Jenkins Credentials, rồi publish JUnit / HTML / Allure report.

> Chưa từng dùng Docker/Jenkins? Đọc bản chi tiết từng bước trước:
> [jenkins-getting-started.md](jenkins-getting-started.md). Tài liệu này giả định
> bạn đã quen Jenkins.
>
> Muốn xem bản đồ luồng — file nào gọi file nào, từ `docker compose up` tới lúc
> ra report: [docker-jenkins-flow.md](docker-jenkins-flow.md).

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
| GitHub              | `githubNotify(...)` — commit status trên PR |
| Email Extension     | `emailext(...)` — báo kết quả qua email     |

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

### Login Jenkins của bạn — **không** lưu trong repo

Hai credential trên là secret của _suite test_, nạp vào Jenkins là đúng chỗ. Còn
username/password bạn dùng để đăng nhập chính Jenkins thì khác: không dòng code
nào trong repo cần tới nó, nên nó không có lý do gì nằm trong working tree —
`.gitignore` chỉ chặn `git add` vô tình, không chặn ai đó zip cả thư mục repo,
copy sang máy khác, hay `git add -f`.

Chỗ lưu đang dùng, cố ý đặt ngoài repo:

```
%USERPROFILE%\.config\portal-pos\jenkins.env      # ACL: chỉ user hiện tại đọc được
```

Và lưu **API token** thay cho mật khẩu — tạo ở
`http://localhost:8090/user/<user>/security` → _Add new Token_. Token thu hồi được
riêng lẻ khi nghi bị lộ; mật khẩu thì đổi là mất luôn phiên trên mọi thiết bị.

Đọc ra khi cần gọi Jenkins API:

```bash
set -a; . "$USERPROFILE/.config/portal-pos/jenkins.env"; set +a
curl -sS -u "$JENKINS_USER:$JENKINS_TOKEN" "$JENKINS_URL/job/portal-pos-e2e/lastBuild/api/json"
```

## 3. Tạo job

New Item → **Pipeline** (hoặc Multibranch Pipeline nếu muốn build theo branch):

- Definition: **Pipeline script from SCM**
- SCM: Git → Repository URL `https://github.com/khanhdo-afk/e2e-portal-pos-playwright.git`
  (fork. Upstream `DHMaiKhanh/...` là read-only với account này — `git push` trả 403 —
  nên job trỏ vào fork để build được code vừa sửa mà không phải đợi PR merge.
  Muốn build upstream thì đổi lại URL, nhưng nhớ là mọi fix Jenkinsfile phải merge xong mới có hiệu lực.)
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

> File GitHub Actions (`.github/workflows/e2e.yml`) và GitLab CI (`.gitlab-ci.yml`)
> đã bị xoá (2026-09-15) — Jenkins là pipeline chính thức duy nhất, giữ 2 file cũ
> lệch version chỉ gây nhầm lẫn không biết cái nào là thật. Vẫn còn trong git
> history nếu cần khôi phục.

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

## 9. Trigger tự động, commit status & email

Ba thứ dưới đây không bắt buộc để build chạy được (build tay vẫn hoạt động bình
thường nếu bỏ qua mục này), nhưng là chuẩn tối thiểu của một pipeline CI thật:
tự động chạy khi có code mới, báo kết quả ngược lại nơi review code, và báo cho
người phụ trách khi build đỏ mà không cần tự vào Jenkins xem.

### 9.1. Trigger — `pollSCM`, không phải webhook thật

Jenkinsfile khai báo:

```groovy
triggers { pollSCM('H/5 * * * *') }
```

GitHub không gọi được webhook vào `localhost:8090` vì Jenkins không có URL
public — poll là cách duy nhất chạy được với setup local hiện tại. Jenkins tự
kiểm tra remote mỗi ~5 phút, build nếu có commit mới trên `main`. Không cần cấu
hình gì thêm ở phía GitHub.

Khi Jenkins đã có URL public thật (ngrok, domain nội bộ, reverse proxy...), đổi
sang webhook cho nhanh hơn và đỡ tốn tài nguyên chờ:

```groovy
triggers { githubPush() }
```

và ở GitHub: repo → Settings → Webhooks → Add webhook → Payload URL
`<jenkins-url>/github-webhook/`, content type `application/json`, event `Just
the push event`.

### 9.2. Commit status trên GitHub (PR check)

Jenkinsfile gọi `githubNotify(...)` ở stage `Notify: pending` (đầu build) và ở
`post { success / unstable / failure }` — trạng thái hiện ra ở tab Checks của PR
và commit, không phải vào Jenkins xem mới biết. UNSTABLE (có test fail) được map
thành `FAILURE` phía GitHub vì GitHub không có khái niệm "unstable".

Cần một credential:

**`github-token`** — Kind: **Secret text**

Giá trị là GitHub Personal Access Token, scope tối thiểu `repo:status` (classic
token) hoặc `Commit statuses: Read and write` (fine-grained token), tạo ở
GitHub → Settings → Developer settings → Personal access tokens.

Thiếu credential này thì `notifyGithub()` trong Jenkinsfile bắt lỗi và chỉ
`echo` ra log — build vẫn chạy và publish report bình thường, chỉ là PR không
thấy status.

### 9.3. Email khi build đỏ

`post { unstable / failure }` gọi `notifyEmail(...)` (dùng bước `emailext` của
plugin Email Extension); `post { fixed }` gửi thêm một email khi suite xanh trở
lại sau lần đỏ trước đó, để không phải im lặng dò xem đã hết đỏ chưa nhưng cũng
không spam mỗi build pass liên tiếp.

Người nhận cấu hình ở biến `NOTIFY_EMAIL` trong Jenkinsfile (`environment` ở đầu
file) — sửa thẳng ở đó nếu đổi người phụ trách, không cần đụng vào phần logic
notify.

SMTP là cấu hình global, không nằm trong Jenkinsfile: Manage Jenkins → System →
**Extended E-mail Notification** — điền SMTP server, port, credential (nếu SMTP
yêu cầu đăng nhập), và **Default user e-mail suffix** / **System Admin e-mail
address** (địa chỉ gửi đi). Bấm **Test configuration** ở cuối trang để kiểm tra
trước khi tin build thật gửi được.

Chưa có SMTP thì `emailext` throw lỗi, `notifyEmail()` bắt lại và chỉ `echo` ra
log — cùng kiểu graceful-degrade như commit status ở trên, build không vì thế
mà đỏ oan.
