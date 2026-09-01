# Luồng Docker + Jenkins từ A → Z

Tài liệu này trả lời đúng một câu hỏi: **từ lúc bấm Build đến lúc có report, hệ
thống đi qua những file nào, theo thứ tự nào, file nào gọi file nào.**

Nó không phải hướng dẫn cài đặt. Muốn dựng từ đầu thì đọc
[jenkins-getting-started.md](jenkins-getting-started.md) (từng bước cho người
mới) hoặc [jenkins.md](jenkins.md) (bản tham khảo ngắn). Ở đây là **bản đồ**: khi
build đỏ ở một chỗ nào đó, bạn biết ngay phải mở file nào.

---

## 0. Toàn cảnh — 3 tầng, 6 file

Toàn bộ hệ thống chỉ có 6 file cấu hình. Ba file đầu dựng nên Jenkins, ba file
sau quyết định một lần build chạy thế nào.

```
TẦNG 1 — Hạ tầng (dựng 1 lần, sống mãi)
  ci/jenkins/docker-compose.yml   khai báo 2 container + 3 volume + 1 network
    └── ci/jenkins/Dockerfile     build image cho container "jenkins"
          └── ci/jenkins/plugins.txt   danh sách plugin nướng sẵn vào image

TẦNG 2 — Kịch bản build (chạy lại mỗi lần bấm Build)
  Jenkinsfile                     điều phối: tạo container Playwright, gọi npm

TẦNG 3 — Cấu hình test (do Jenkinsfile gọi tới)
  playwright.config.ts            reporter, project, worker, trace
    └── configs/env/loadEnv.ts    đọc .env.<ENV> → object env dùng khắp suite
```

Hình dạng lúc chạy:

```
Windows (máy bạn)
└── Docker Desktop
    ├── container "jenkins"          ← UI http://localhost:8090
    │     JENKINS_HOME = volume jenkins-data
    │     workspace    = /var/jenkins_home/workspace/<tên job>
    │     có docker CLI, KHÔNG có daemon
    │        │ nói chuyện qua tcp://docker:2376 (TLS)
    │        ▼
    ├── container "jenkins-dind"     ← Docker daemon riêng cho build
    │     cũng mount volume jenkins-data ở đúng /var/jenkins_home
    │     image cache nằm ở volume dind-storage
    │        │ daemon này tạo ra:
    │        ▼
    └── container "playwright"       ← sinh ra mỗi build, chạy test xong tự xoá
          mcr.microsoft.com/playwright:v1.61.1-noble
          bind-mount đúng workspace ở trên vào trong container
```

**Chi tiết quan trọng nhất của cả setup**, nói luôn ở đây vì mọi thứ khác phụ
thuộc vào nó: cả `jenkins` và `jenkins-dind` cùng mount volume `jenkins-data` vào
đúng đường dẫn `/var/jenkins_home`. Khi Jenkins bảo daemon "mount
`/var/jenkins_home/workspace/portal-pos-e2e` vào container Playwright", daemon
`dind` resolve được đường dẫn đó vì nó cũng thấy volume ấy. Nếu dùng
`/var/run/docker.sock` của host (cách phổ biến trên mạng), daemon host sẽ đi tìm
đường dẫn đó trên **filesystem của host** — không có → container Playwright nhận
workspace rỗng → checkout biến mất, build đỏ không hiểu vì sao.

---

## 1. LUỒNG A — Dựng hạ tầng

Chạy một lần, hoặc mỗi khi sửa `Dockerfile` / `plugins.txt`.

```bash
docker compose -f ci/jenkins/docker-compose.yml up -d --build
```

Thứ tự file:

| #   | File                                                              | Chuyện gì xảy ra                                                                                          |
| --- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | [ci/jenkins/docker-compose.yml](../ci/jenkins/docker-compose.yml) | Đọc khai báo: 2 service `dind` + `jenkins`, 3 volume, 1 network `jenkins`                                 |
| 2   | —                                                                 | Tạo volume `jenkins-data`, `jenkins-docker-certs`, `dind-storage` nếu chưa có                             |
| 3   | —                                                                 | Bật `dind` trước (`depends_on`). Nó sinh cert TLS vào `jenkins-docker-certs`, nhận alias mạng là `docker` |
| 4   | [ci/jenkins/Dockerfile](../ci/jenkins/Dockerfile)                 | `build: .` → build image `portal-pos-jenkins:latest` từ `jenkins/jenkins:lts-jdk21`                       |
| 5   | —                                                                 | Trong Dockerfile: `USER root` → cài `docker-ce-cli` từ repo Docker chính thức                             |
| 6   | [ci/jenkins/plugins.txt](../ci/jenkins/plugins.txt)               | `COPY` vào `/usr/share/jenkins/ref/plugins.txt` rồi `jenkins-plugin-cli` cài sẵn 10 plugin                |
| 7   | —                                                                 | Bật container `jenkins`, publish port `8090:8080`                                                         |

Ba biến môi trường trong compose là thứ nối container `jenkins` sang daemon
`dind`:

```yaml
DOCKER_HOST: tcp://docker:2376 # "docker" = alias mạng của service dind
DOCKER_CERT_PATH: /certs/client # đọc từ volume jenkins-docker-certs
DOCKER_TLS_VERIFY: '1'
```

Nhờ 3 biến này, lệnh `docker` gõ trong container `jenkins` (hoặc do plugin Docker
Pipeline gọi) đi thẳng sang daemon `dind`, không đụng gì tới Docker của Windows.

Vì sao image `jenkins` phải build lại chứ không dùng thẳng `jenkins/jenkins:lts`:

- Không có docker CLI → `agent { docker { ... } }` chết ngay với `docker: not found`
- Không có plugin sẵn → mỗi lần dựng lại phải bấm tay 10 plugin qua UI
- Thiếu `ansicolor` hoặc `timestamper` thì pipeline **fail ở bước parse**, tức
  build đỏ trước khi chạy một dòng test nào

---

## 2. LUỒNG B — Từ lúc bấm Build đến khi container Playwright chạy

Job kiểu **Pipeline script from SCM** nên bản thân job trên Jenkins gần như rỗng;
mọi thứ nằm trong repo.

```
Bạn bấm "Build with Parameters"
  │   chọn TARGET_ENV / TEST_PATH / GREP / WORKERS / TRACE / RUN_QUALITY
  ▼
[container jenkins] Jenkins đọc cấu hình job
  │   Definition = Pipeline script from SCM, Script Path = Jenkinsfile
  ▼
[container jenkins] git clone/fetch repo vào workspace
  │   /var/jenkins_home/workspace/<tên job>   (nằm trên volume jenkins-data)
  ▼
[container jenkins] Parse Jenkinsfile
  │   parameters{} → options{} → environment{}
  │   `agent any`  → dùng luôn node này, KHÔNG vào container
  ▼
stage('Build & test') có agent riêng:
  │   docker { image 'mcr.microsoft.com/playwright:v1.61.1-noble'
  │            args '--ipc=host'
  │            reuseNode true }
  ▼
[container jenkins] plugin Docker Pipeline gọi docker CLI
  │   → DOCKER_HOST=tcp://docker:2376 → daemon dind
  ▼
[dind] pull image Playwright (~2GB, chỉ lần đầu — cache ở volume dind-storage)
  │   rồi docker run với:
  │     -v <workspace>:<workspace>   ← nhờ cùng volume jenkins-data mà khớp
  │     -w <workspace>
  │     -u <uid của jenkins>         ← không phải root
  │     --ipc=host
  ▼
[container playwright] các stage con Install → Quality → Provision env
                       → Preflight → E2E tests chạy ở đây
```

Ba tuỳ chọn của `agent { docker }` trong [Jenkinsfile](../Jenkinsfile), mỗi cái
sửa một lỗi có thật:

| Tuỳ chọn                  | Không có nó thì sao                                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `image ...:v1.61.1-noble` | Lệch version `@playwright/test` → browser bundled trong image không dùng được, stage Install phải tải lại ~150MB mỗi build |
| `args '--ipc=host'`       | `/dev/shm` mặc định 64MB → tab Chromium crash rải rác giữa suite                                                           |
| `reuseNode true`          | Container được cấp workspace **mới** → `post{}` chạy ngoài container không thấy `reports/` → không publish được gì         |

### Vì sao `agent any` ở cấp pipeline mà không phải `agent { docker }`

Đây là thay đổi ở commit `de2152b`, đáng nhớ vì nó từng làm **mọi build đỏ**:

- `post{}` luôn chạy trên agent của **cấp pipeline**.
- Trước đây `agent { docker }` đặt ở cấp pipeline → `post{}` chạy trong container
  Playwright.
- Nhưng Allure CLI do Jenkins cài nằm ở `/var/jenkins_home/tools/...` trên
  controller, thư mục đó không được mount vào container, và image Playwright cũng
  không có Java. Kết quả:

  ```
  OCI runtime exec failed: ... allure: no such file or directory
  AllurePluginException: Can not generate Allure Report, exit code: 127
  ```

- Cách sửa: `agent any` ở cấp pipeline (nơi có Allure + Java), container hạ xuống
  stage `Build & test` với `reuseNode true` để vẫn dùng chung workspace.

Nói gọn: **test chạy trong container, publish report chạy ngoài container, cả hai
nhìn chung một thư mục workspace.**

---

## 3. LUỒNG C — Bên trong container: 5 stage, file nào chạy

Tất cả đều nằm trong `stage('Build & test')`, chạy tuần tự, đỏ ở đâu dừng ở đó.

### C1. `Install`

```bash
npm ci --ignore-scripts --prefer-offline --no-audit --fund=false
npx playwright install chromium
npx playwright --version
```

- Đọc `package-lock.json`, không phải `package.json`.
- `--ignore-scripts` bỏ 2 script trong [package.json](../package.json):
  - `postinstall` = `playwright install --with-deps chromium` — cần root + apt,
    mà container chạy dưới uid của jenkins → sẽ đỏ
  - `prepare` = `husky install` — git hook, vô nghĩa trên CI
- Browser cài riêng ở dòng sau, không kèm `--with-deps` vì image Playwright đã có
  sẵn thư viện hệ thống.

Ba biến trong `environment{}` tồn tại chính vì container chạy **không phải root**
— `HOME` mặc định của image không ghi được, nên mọi cache phải nằm trong
workspace:

```groovy
HOME = "${WORKSPACE}"
npm_config_cache = "${WORKSPACE}/.npm"
PLAYWRIGHT_BROWSERS_PATH = "${WORKSPACE}/.cache/ms-playwright"
```

### C2. `Quality` — bỏ qua được bằng `RUN_QUALITY=false`

```bash
npm run lint       # eslint . --ext .ts,.js   → .eslintrc.cjs
npm run typecheck  # tsc --noEmit             → tsconfig.json
```

### C3. `Provision env` — chỗ secret đi vào workspace

Đây là stage khó nhìn ra nhất nếu chỉ đọc repo, vì hai file nó tạo ra đều bị
gitignore.

```
Jenkins Credentials (lưu trong volume jenkins-data)
  │
  ├── portal-pos-env-<TARGET_ENV>            kind: Secret file
  │     └── install -m 600 → configs/env/.env.<ENV>
  │
  └── portal-pos-storage-state-<TARGET_ENV>  kind: Secret file
        └── install -m 600 → src/data/dynamic/auth/admin.json
```

`<TARGET_ENV>` chính là tham số build, nên `TARGET_ENV=stage` sẽ nạp cặp
credential `portal-pos-env-stage` + `portal-pos-storage-state-stage`. Đổi tham số
là đổi luôn cặp secret — không có chỗ nào khác phải sửa.

Cả hai lệnh nằm trong `try/catch`: thiếu credential thì build dừng với message
nói rõ **phải tạo credential ID nào và bỏ nội dung gì vào**, thay vì để dòng
`Could not find credentials entry with ID ...` của Jenkins nằm tít cuối log.

Vì sao đóng gói nguyên file `.env` thành một credential thay vì tách từng biến:
thêm biến mới sau này chỉ cần sửa file trên Jenkins, không phải đụng vào
Jenkinsfile.

### C4. `Preflight` — bắt 2 lỗi hạ tầng trước khi tốn 1 tiếng chạy test

```bash
node scripts/check-server.mjs                        # (1)
npx playwright test --project=setup --reporter=list  # (2)
```

| #   | File                                                    | Kiểm tra gì                                                | Đỏ nghĩa là                                                 |
| --- | ------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | [scripts/check-server.mjs](../scripts/check-server.mjs) | `fetch(BASE_URL)` timeout 3s, chấp nhận `2xx`/`401`/`302`  | Portal không tới được từ container: mạng/VPN/`BASE_URL` sai |
| 2   | [tests/global.setup.ts](../tests/global.setup.ts)       | Mở `/` bằng session đã lưu, xem có bị đá về `/login` không | Session đã hết hạn hoặc bị server thu hồi                   |

Đây là lá chắn cho sự cố có thật đã ghi lại ở
[auth-session-expiry-issue.md](auth-session-expiry-issue.md): 112 test fail chỉ
vì session chết. Bắt ở Preflight thì build đỏ trong 30 giây kèm hướng dẫn, thay
vì hàng trăm test timeout trong một tiếng.

Cũng vì lý do này mà `triggers { cron(...) }` bị comment sẵn trong Jenkinsfile:
Portal đăng nhập bằng Google OAuth + 2FA, không drive headless được (xem
[authentication.md](authentication.md)), session phải chụp tay bằng `npm run auth`
rồi upload lại. Build đêm sẽ đỏ hàng loạt ngay khi session chết — đó là tiếng ồn,
không phải tín hiệu.

### C5. `E2E tests`

```bash
rm -rf reports test-results     # Preflight cũng ghi vào reports/, xoá cho sạch
npx playwright test [TEST_PATH] [--grep 'GREP']
```

Lệnh được ghép động từ tham số build. Điểm cần nhớ: **test fail không làm dừng
pipeline**. `sh(..., returnStatus: true)` bắt exit code, khác 0 thì gọi
`unstable(...)` — build vàng, và `post{}` vẫn chạy để publish report. Nếu để nó
`error` thì lần chạy nào có test đỏ là mất luôn report, đúng lúc cần report nhất.

---

## 4. LUỒNG D — Cấu hình chảy từ đâu tới test

Đây là luồng hay bị hiểu nhầm nhất: `TARGET_ENV` bạn chọn trên UI cuối cùng biến
thành `baseURL` của Playwright bằng cách nào.

```
UI: Build with Parameters, TARGET_ENV = stage
  │
  ▼  Jenkinsfile: environment { ENV = "${params.TARGET_ENV}" }
biến môi trường ENV=stage  (đi vào container qua docker exec)
  │
  ├─► stage Provision env: install $ENV_FILE → configs/env/.env.stage
  │
  ▼  npx playwright test
playwright.config.ts
  │   import { loadEnv } from './configs/env/loadEnv'
  ▼
configs/env/loadEnv.ts — thứ tự ưu tiên (dotenv override:false → ai vào trước thắng)
  │   1. biến môi trường thật của OS      ← CI/CD, KHÔNG BAO GIỜ bị ghi đè
  │   2. configs/env/.env.<ENV>           ← file vừa nạp từ credential
  │   3. configs/env/.env.example         ← mặc định, trỏ localhost
  ▼
object env { BASE_URL, API_URL, STORAGE_STATE, STORE_ID, ADMIN_*, ... }
  │
  ├─► playwright.config.ts  use.baseURL / use.storageState / project 'api' baseURL
  └─► src/**, tests/**       import { env } from '@configs/env/loadEnv'
```

Hệ quả thực tế của thứ tự ưu tiên trên:

- **Không nạp được `.env.<ENV>`** → rơi xuống `.env.example` → `BASE_URL` thành
  `http://localhost:3000` → cả suite fail mà log không nói lý do. Đây chính là lý
  do stage `Provision env` tồn tại và vì sao nó `error` sớm.
- **Biến OS thắng file** → muốn override tạm thời chỉ cần truyền biến, không phải
  sửa file.

Ba tham số build khác đi thẳng vào `playwright.config.ts` qua biến môi trường,
không qua file `.env`:

| Tham số   | Biến ENV    | Nơi đọc trong `playwright.config.ts`             |
| --------- | ----------- | ------------------------------------------------ |
| `WORKERS` | `WORKERS`   | `workers: process.env.WORKERS ? Number(...) : 8` |
| `TRACE`   | `TRACE`     | `use.trace: process.env.TRACE ?? 'off'`          |
| —         | `CI='true'` | `forbidOnly: isCI`, `retries: isCI ? 2 : 0`      |

Con số mặc định đều có đo đạc, đừng chỉnh mò:

- **`WORKERS=8`** là điểm bão hoà. Suite drive một Portal **từ xa**, nghẽn nằm ở
  server chứ không ở CPU. Đo trên thư mục customers: 4 worker → 105.8s, 8 →
  63.8s, 16 → 62.0s, 24 → **69.6s** (chậm hơn). Từ 8 trở lên wall-time đi ngang
  nhưng độ trễ mỗi test tăng gấp đôi, đẩy test tới sát timeout mà không được gì.
- **`TRACE=off`** vì `retain-on-failure` **không rẻ** như tên gọi: nó record trace
  cho _mọi_ test rồi mới vứt phần pass đi. Đo trên payroll: 38.5s → 28.8s khi tắt
  (−25%). Test fail vẫn có screenshot + `error-context.md` + call log. Cần trace
  thì chạy lại riêng phần fail:
  `TRACE=retain-on-failure npx playwright test --last-failed`.

Chi tiết: [test-performance-optimization.md](test-performance-optimization.md).

---

## 5. LUỒNG E — Report chảy ngược ra ngoài

`playwright.config.ts` khai báo 5 reporter cùng lúc, tất cả ghi vào `reports/`
trong workspace — tức là ghi vào volume `jenkins-data`, nên container Playwright
tắt đi rồi file vẫn còn.

```
[container playwright] npx playwright test
  │
  ├── list                → stdout, đọc trực tiếp trong Console Output
  ├── html                → reports/html/index.html
  ├── json                → reports/json/results.json
  ├── junit               → reports/junit/results.xml
  ├── allure-playwright   → reports/allure-results/
  └── (screenshot/video/trace của test fail) → test-results/
  │
  ▼  container tắt, workspace giữ nguyên (reuseNode true)
[container jenkins] post { always { ... } }
  │
  ├── junit(...)            reports/junit/results.xml  → tab "Test Result", biểu đồ theo build
  ├── publishHTML(...)      reports/html/index.html    → link "Playwright HTML Report"
  ├── allure(...)           reports/allure-results/    → link "Allure Report"   [try/catch]
  ├── archiveArtifacts(...) json + junit + allure-results + *.png/*.webm/trace.zip
  └── sh 'rm -f ...'        XOÁ .env.* và admin.json khỏi workspace
```

Hai chi tiết cố ý:

- **`allure(...)` bọc `try/catch`.** Đây là bước publish, không phải bước test.
  Allure hỏng (thiếu tool tên `allure` ở Manage Jenkins → Tools) không được phép
  nuốt luôn JUnit + HTML report của một lần chạy đã xong.
- **Dòng `rm -f` cuối cùng.** Secret không được nằm lại trong workspace giữa các
  build — workspace sống dai trên volume `jenkins-data`, build sau vẫn thấy.

Màu build nghĩa là gì:

| Màu | Trạng thái | Đọc là                                                                          |
| --- | ---------- | ------------------------------------------------------------------------------- |
| 🟢  | `SUCCESS`  | Toàn bộ test pass                                                               |
| 🟡  | `UNSTABLE` | Có test fail — lỗi ở app hoặc ở test, mở report                                 |
| 🔴  | `FAILURE`  | Hỏng **trước khi** test chạy: Install, lint/typecheck, Provision env, Preflight |

Tách 🟡 khỏi 🔴 là để phân biệt "test tìm ra vấn đề" với "pipeline không chạy
nổi" — hai thứ này cần người khác nhau xử lý.

---

## 6. Bản đồ file — tra ngược

| File                                                              | Vai trò                               | Ai gọi nó                                             |
| ----------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------- |
| [ci/jenkins/docker-compose.yml](../ci/jenkins/docker-compose.yml) | Khai báo container/volume/network     | Bạn, bằng tay: `docker compose up -d --build`         |
| [ci/jenkins/Dockerfile](../ci/jenkins/Dockerfile)                 | Image Jenkins + docker CLI + plugin   | `build: .` trong compose                              |
| [ci/jenkins/plugins.txt](../ci/jenkins/plugins.txt)               | 10 plugin bắt buộc                    | `jenkins-plugin-cli` trong Dockerfile                 |
| [Jenkinsfile](../Jenkinsfile)                                     | Kịch bản build                        | Job Jenkins (Script Path)                             |
| [package.json](../package.json)                                   | `lint`, `typecheck`, `auth`, `test:*` | Các stage trong Jenkinsfile                           |
| [playwright.config.ts](../playwright.config.ts)                   | Reporter, project, worker, trace      | `npx playwright test`                                 |
| [configs/env/loadEnv.ts](../configs/env/loadEnv.ts)               | Đọc `.env.<ENV>` → object `env`       | `playwright.config.ts` + toàn bộ `src/`, `tests/`     |
| [configs/env/.env.example](../configs/env/.env.example)           | Khung mẫu + giá trị mặc định          | `loadEnv.ts` (fallback cuối)                          |
| `configs/env/.env.<env>`                                          | Cấu hình thật _(gitignored)_          | Nạp từ credential ở stage Provision env               |
| [scripts/check-server.mjs](../scripts/check-server.mjs)           | Ping `BASE_URL`                       | Stage Preflight + hook `pretest`                      |
| [tests/global.setup.ts](../tests/global.setup.ts)                 | Kiểm tra session còn sống             | Project `setup`, là dependency của project `chromium` |
| `src/data/dynamic/auth/admin.json`                                | Session đăng nhập _(gitignored)_      | Nạp từ credential; `use.storageState`                 |
| [scripts/capture-auth.mjs](../scripts/capture-auth.mjs)           | Chụp session bằng tay                 | `npm run auth`, **chỉ chạy trên máy dev**             |

---

## 7. Vòng đời dữ liệu — cái gì mất khi nào

| Volume                 | Chứa gì                                                  | `down` | `down -v`              |
| ---------------------- | -------------------------------------------------------- | ------ | ---------------------- |
| `jenkins-data`         | JENKINS_HOME: job, credentials, lịch sử build, workspace | Giữ    | **Mất sạch**           |
| `dind-storage`         | Image cache (Playwright ~2GB)                            | Giữ    | Mất, build sau tải lại |
| `jenkins-docker-certs` | Cert TLS dind sinh lúc khởi động                         | Giữ    | Mất, tự sinh lại       |

```bash
docker compose -f ci/jenkins/docker-compose.yml logs -f jenkins  # xem log
docker compose -f ci/jenkins/docker-compose.yml restart jenkins  # restart
docker compose -f ci/jenkins/docker-compose.yml down             # dừng, GIỮ dữ liệu
docker compose -f ci/jenkins/docker-compose.yml up -d --build    # build lại sau khi sửa Dockerfile/plugins.txt
docker compose -f ci/jenkins/docker-compose.yml down -v          # ⚠️ xoá sạch, làm lại từ đầu
```

Còn container Playwright thì **không có volume nào cả** — nó sinh ra mỗi build,
chạy xong tự xoá. Mọi thứ nó tạo ra đều nằm trong workspace bind-mount, tức là
trên `jenkins-data`.

---

## 8. Chạy local khác Jenkins ở chỗ nào

Cùng một `playwright.config.ts`, cùng một `loadEnv.ts` — khác đúng 4 chỗ:

|              | Máy dev                               | Jenkins                                     |
| ------------ | ------------------------------------- | ------------------------------------------- |
| Cài đặt      | `npm install` (chạy cả `postinstall`) | `npm ci --ignore-scripts`                   |
| `.env.<env>` | File thật trên đĩa                    | Nạp từ credential mỗi build, xoá ở `post{}` |
| `admin.json` | `npm run auth` sinh ra tại chỗ        | Nạp từ credential mỗi build, xoá ở `post{}` |
| `CI`         | không set → `retries: 0`              | `CI=true` → `retries: 2`, `forbidOnly`      |

`npm run auth` **chỉ chạy được trên máy dev**: nó mở browser thật để bạn đăng
nhập Google + 2FA bằng tay. Không có cách nào chạy nó trên Jenkins — đó là lý do
tồn tại của credential `portal-pos-storage-state-<env>` và của cả stage Preflight.

---

## 9. Build đỏ ở đâu → mở file nào

| Log báo                                               | Hỏng ở đâu                                          | Mở file                                                                                                     |
| ----------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `docker: not found`                                   | Image jenkins thiếu docker CLI                      | [ci/jenkins/Dockerfile](../ci/jenkins/Dockerfile), build lại bằng `--build`                                 |
| Pipeline đỏ ngay khi parse, chưa chạy stage nào       | Thiếu plugin (`ansicolor`, `timestamper`)           | [ci/jenkins/plugins.txt](../ci/jenkins/plugins.txt)                                                         |
| Workspace rỗng / không thấy file repo trong container | Daemon sai (socket host thay vì dind)               | [docker-compose.yml](../ci/jenkins/docker-compose.yml) — `jenkins-data` phải mount vào **cả hai** container |
| `EACCES` khi `npm ci`, npm ghi cache thất bại         | `HOME` không ghi được                               | Khối `environment{}` trong [Jenkinsfile](../Jenkinsfile)                                                    |
| `Không nạp được cấu hình môi trường '<env>'`          | Chưa tạo credential                                 | Manage Jenkins → Credentials; xem [jenkins.md](jenkins.md) mục 2                                            |
| Test đỏ hàng loạt, `BASE_URL` là `localhost:3000`     | `.env.<ENV>` không được nạp → rơi về `.env.example` | Stage `Provision env` + [loadEnv.ts](../configs/env/loadEnv.ts)                                             |
| `✗ Portal POS app is not reachable`                   | Container không tới được Portal                     | Mạng/VPN, `BASE_URL` trong credential `portal-pos-env-<env>`                                                |
| `Session đăng nhập không dùng được`                   | Session hết hạn                                     | `npm run auth` trên máy dev → upload lại credential                                                         |
| `allure: no such file or directory` (127)             | Post chạy nhầm trong container, hoặc thiếu tool     | `agent any` ở cấp pipeline + Manage Jenkins → Tools                                                         |
| Tab Chromium crash rải rác, không theo quy luật       | `/dev/shm` 64MB, hoặc WSL2 thiếu RAM                | `args '--ipc=host'`; Docker Desktop → Resources, cấp ≥ 8GB                                                  |
| Mỗi build tải lại ~150MB browser                      | Tag image lệch `@playwright/test`                   | Dòng `image ...` trong [Jenkinsfile](../Jenkinsfile)                                                        |

---

## 10. Sửa gì thì phải làm lại bước nào

| Sửa file                                             | Cần làm gì                                                              |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| `Jenkinsfile`                                        | Không cần gì — build sau tự lấy bản mới từ SCM                          |
| `playwright.config.ts`, `configs/`, `tests/`, `src/` | Không cần gì — cùng lấy từ SCM                                          |
| `ci/jenkins/plugins.txt`                             | `docker compose ... up -d --build`                                      |
| `ci/jenkins/Dockerfile`                              | `docker compose ... up -d --build`                                      |
| `ci/jenkins/docker-compose.yml`                      | `docker compose ... up -d` (thêm `--build` nếu đụng tới `build:`)       |
| Nâng `@playwright/test`                              | Sửa tag image trong `Jenkinsfile` cho khớp `package-lock.json`          |
| Đổi `BASE_URL` / thêm biến env                       | Upload lại credential `portal-pos-env-<env>`, **không** sửa Jenkinsfile |

---

## Đọc tiếp

- [jenkins-getting-started.md](jenkins-getting-started.md) — dựng từ số 0, từng bước
- [jenkins.md](jenkins.md) — tham khảo ngắn: plugin, credential, tạo job
- [authentication.md](authentication.md) — vì sao suite không tự đăng nhập được
- [auth-session-expiry-issue.md](auth-session-expiry-issue.md) — sự cố 112 test fail vì session chết
- [test-performance-optimization.md](test-performance-optimization.md) — vì sao 8 worker, vì sao tắt trace
