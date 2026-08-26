# Jenkins + Docker cho người mới — từ A đến Z

## ⚡ Bật lại sau khi restart máy — chỉ cần 1 lệnh

```powershell
Start-Process "D:\Docker\Docker Desktop.exe"
```

Rồi chờ ~60–90 giây. **Không cần gõ `docker compose up`** — hai container khai báo
`restart: unless-stopped` nên Docker tự bật lại `jenkins` + `jenkins-dind` ngay khi
daemon sống. Kiểm tra bằng:

```powershell
docker ps
```

Thấy dòng `0.0.0.0:8090->8080/tcp` là mở được UI tại http://localhost:8090.

Chỉ khi `docker ps` **trống** — thường vì lần trước bạn chạy `down` chứ không phải
chỉ tắt máy — mới cần bật thủ công:

```powershell
cd d:\3.Portal_POS\e2e_portal_pos_playwright
docker compose -f ci/jenkins/docker-compose.yml up -d
```

> **Lưu ý:** không thêm `--build`. Image đã build sẵn, `--build` chỉ tốn vài phút
> build lại y hệt. Chỉ dùng khi vừa sửa `Dockerfile` hoặc `plugins.txt`.

Giải thích đầy đủ (chờ Jenkins nạp plugin, session Portal hết hạn...):
[Mở lại Jenkins sau khi tắt / restart máy](#mở-lại-jenkins-sau-khi-tắt--restart-máy).

---

Tài liệu này đi từ **máy Windows chưa có gì** đến **bấm build trên Jenkins và đọc
được report** của suite E2E Portal POS. Mỗi bước đều có lệnh cụ thể kèm lý do tại
sao phải làm bước đó.

- Đã quen Jenkins rồi? Đọc bản ngắn: [jenkins.md](jenkins.md).
- Đã dựng xong rồi, chỉ cần bật lại sau khi restart máy? → phần **1 lệnh** ngay đầu file, hoặc bản đầy đủ: [Mở lại Jenkins](#mở-lại-jenkins-sau-khi-tắt--restart-máy).
- Thời gian: ~45–60 phút, phần lớn là ngồi chờ tải image (~2.5GB).
- Yêu cầu: Windows 10/11, RAM ≥ 16GB, ổ trống ≥ 20GB, quyền admin để cài Docker.

---

# Mở lại Jenkins sau khi tắt / restart máy

Khởi động lại Windows **không làm mất gì cả**: job, credential, lịch sử build đều
nằm trong Docker volume `jenkins-data`, sống độc lập với container. Thứ duy nhất
tắt theo máy là Docker Desktop — và không có nó thì mọi lệnh `docker` đều báo:

```
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine
```

## R1. Bật Docker Desktop

Mở từ Start Menu, hoặc bằng PowerShell:

```powershell
Start-Process "D:\Docker\Docker Desktop.exe"
```

Chờ icon con cá voi ở khay hệ thống chuyển sang **Engine running** — mất khoảng
30–90 giây. Kiểm tra bằng:

```powershell
docker info
```

Ra được thông tin server (Server Version, Storage Driver...) là daemon đã sống.

## R2. Thường thì không phải gõ thêm gì

Hai container khai báo `restart: unless-stopped` trong
[ci/jenkins/docker-compose.yml](../ci/jenkins/docker-compose.yml), nên Docker tự
bật lại `jenkins` + `jenkins-dind` ngay khi daemon lên. Kiểm tra:

```powershell
docker ps
```

Thấy đủ 2 dòng `Up ...`, trong đó `jenkins` có `0.0.0.0:8090->8080/tcp` là xong.

Nếu **không** thấy container nào — thường vì lần trước bạn chạy `down` chứ không
phải chỉ tắt máy — bật lại thủ công:

```powershell
cd d:\3.Portal_POS\e2e_portal_pos_playwright
docker compose -f ci/jenkins/docker-compose.yml up -d
```

Lệnh này **không có `--build`**, và cố tình như vậy: image
`portal-pos-jenkins:latest` đã build sẵn từ lần đầu, thêm `--build` chỉ tốn vài
phút build lại y hệt. Chỉ dùng `--build` khi vừa sửa `Dockerfile` hoặc
`plugins.txt`.

## R3. Chờ Jenkins khởi động xong rồi mới mở trình duyệt

Container `Up` **không** đồng nghĩa Jenkins đã sẵn sàng — nó cần thêm ~30–60 giây
để nạp plugin. Trong lúc đó http://localhost:8090 trả về 503 hoặc trang
_"Please wait while Jenkins is getting ready to work"_. Cứ chờ, đừng restart.

Muốn nhìn tiến độ:

```powershell
docker compose -f ci/jenkins/docker-compose.yml logs -f jenkins
```

Dòng `Jenkins is fully up and running` là mở được. Thoát log bằng `Ctrl+C` —
lệnh này chỉ xem log, `Ctrl+C` không tắt Jenkins.

## R4. Vào lại giao diện

Mở **http://localhost:8090**, đăng nhập bằng user admin đã tạo ở
[mục C4](#c4-chạy-wizard-lần-đầu). Mật khẩu khởi tạo trong
`initialAdminPassword` không dùng nữa và cũng không cần lấy lại.

> **Trước khi bấm build sau vài ngày không dùng:** session Portal nhiều khả năng
> đã hết hạn. Chạy `npm run auth` trên máy dev rồi update credential
> `portal-pos-storage-state-<env>` — xem [mục H1](#h1-session-hết-hạn--lỗi-hay-gặp-nhất).
> Bỏ qua bước này thì stage Preflight sẽ đỏ ngay.

---

## 0. Hiểu bức tranh trước khi gõ lệnh

Ba khái niệm, nói theo kiểu dễ hình dung nhất:

| Thứ             | Là gì                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| **Docker**      | Công cụ chạy phần mềm trong "hộp" (container) đóng gói sẵn — không cần cài Java, Node, browser lên máy |
| **Jenkins**     | Máy chủ CI: bấm nút (hoặc theo lịch) là nó tự checkout code, chạy test, publish report                 |
| **Jenkinsfile** | Kịch bản mô tả Jenkins phải làm gì, nằm ngay trong repo nên sửa/review được như code                   |

Sau khi làm xong tài liệu này, máy bạn sẽ có hình dạng như sau:

```
Windows (máy bạn)
└── Docker Desktop
    ├── container "jenkins"        ← UI ở http://localhost:8090, có sẵn docker CLI
    │      đọc Jenkinsfile trong repo để biết phải build thế nào
    └── container "jenkins-dind"   ← Docker daemon riêng dành cho các build
           └── container "playwright"  ← sinh ra mỗi lần build, chạy test rồi tự xoá
```

Vì sao chạy Jenkins trong Docker thay vì cài thẳng lên Windows: không phải cài
Java/JDK, cấu hình nằm gọn trong 3 file của repo, và khi hỏng thì xoá đi dựng lại
mất 5 phút. Vì sao lại có thêm container `jenkins-dind` — giải thích ở [mục B3](#b3-cijenkinsdocker-composeyml--khai-báo-2-container).

---

# PHẦN A — Cài Docker Desktop

## A1. Tải và cài

1. Tải Docker Desktop for Windows: https://www.docker.com/products/docker-desktop/
2. Chạy file cài, để nguyên tuỳ chọn **Use WSL 2 instead of Hyper-V** (mặc định).
3. Cài xong **khởi động lại máy** — bước này hay bị bỏ qua và gây lỗi WSL khó hiểu.
4. Mở Docker Desktop, chờ icon con cá voi ở khay hệ thống chuyển sang trạng thái
   **Engine running** (màu xanh).

> Muốn cài vào ổ D cho đỡ đầy ổ C thì chọn đường dẫn lúc cài
> (`--installation-dir`), và trong Settings → Resources → Advanced đổi **Disk image
> location** sang ổ D. Image Playwright nặng ~2GB nên chỗ này đáng quan tâm.

## A2. Kiểm tra Docker đã chạy

Mở **PowerShell** và chạy:

```powershell
docker version
docker run --rm hello-world
```

Ra được dòng `Hello from Docker!` là xong A2. Nếu báo
`Cannot connect to the Docker daemon` → Docker Desktop chưa khởi động xong, chờ
thêm hoặc mở lại app.

## A3. Cấp đủ RAM cho WSL2 (bắt buộc, đừng bỏ qua)

Suite chạy 8 worker Chromium song song. Mặc định WSL2 chỉ lấy khoảng một nửa RAM
máy, và Chromium sẽ bị OOM-kill giữa chừng → **test fail rải rác không theo quy
luật nào**, rất mất thời gian đi tìm nguyên nhân.

Tạo file `C:\Users\<tên-user>\.wslconfig`:

```powershell
@"
[wsl2]
memory=8GB
processors=4
swap=2GB
"@ | Out-File -Encoding utf8 "$env:USERPROFILE\.wslconfig"
```

Rồi áp dụng (Docker Desktop sẽ tự khởi động lại):

```powershell
wsl --shutdown
```

Máy 32GB thì để `memory=12GB` cho thoải mái. Máy 8GB thì hạ số worker xuống 4 lúc
build (tham số `WORKERS`, xem [mục F1](#f1-các-tham-số-khi-build)).

---

# PHẦN B — Các file cần có trong dự án

Repo này **đã có sẵn cả 4 file**. Nếu bạn chỉ cần dựng Jenkins cho repo này, đọc
lướt phần B để hiểu từng file làm gì rồi nhảy sang [PHẦN C](#phần-c--dựng-jenkins-lên).
Phần B viết đầy đủ để bạn tái tạo được ở một dự án khác.

| File                                                              | Vai trò                                                     |
| ----------------------------------------------------------------- | ----------------------------------------------------------- |
| [ci/jenkins/Dockerfile](../ci/jenkins/Dockerfile)                 | Image Jenkins riêng: có docker CLI + cài sẵn plugin         |
| [ci/jenkins/plugins.txt](../ci/jenkins/plugins.txt)               | Danh sách plugin nướng vào image                            |
| [ci/jenkins/docker-compose.yml](../ci/jenkins/docker-compose.yml) | Khai báo 2 container và volume dữ liệu                      |
| [Jenkinsfile](../Jenkinsfile)                                     | Kịch bản build: install → lint → nạp secret → test → report |

## B1. `ci/jenkins/Dockerfile` — Jenkins "đã pha sẵn"

Image `jenkins/jenkins` gốc thiếu hai thứ mà repo này cần, nên ta build đè lên:

```dockerfile
FROM jenkins/jenkins:lts-jdk21

USER root
# Cài docker CLI (không cần daemon — daemon nằm ở container dind riêng)
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
 && install -m 0755 -d /etc/apt/keyrings \
 && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
 && chmod a+r /etc/apt/keyrings/docker.asc \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
      > /etc/apt/sources.list.d/docker.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends docker-ce-cli \
 && rm -rf /var/lib/apt/lists/*
USER jenkins

COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt
```

Hai lý do, cả hai đều bắt buộc:

1. **docker CLI** — Jenkinsfile mở đầu bằng `agent { docker { image ... } }`, tức
   Jenkins gọi thẳng lệnh `docker` trên node. Thiếu CLI thì build đỏ ngay với
   `docker: not found`.
2. **Plugin cài sẵn** — khỏi phải bấm tay 10 plugin qua UI mỗi lần dựng lại Jenkins.

## B2. `ci/jenkins/plugins.txt` — plugin bắt buộc

```
workflow-aggregator      # pipeline
git                      # checkout từ Git
docker-workflow          # agent { docker { ... } }
credentials-binding      # withCredentials([file(...)])
junit                    # biểu đồ pass/fail theo build
htmlpublisher            # link "Playwright HTML Report"
allure-jenkins-plugin    # allure(...)
ansicolor                # ansiColor('xterm') — log có màu
timestamper              # timestamps()
pipeline-stage-view      # xem tiến độ từng stage (không bắt buộc, nhưng nên có)
```

Lưu ý cho người mới: thiếu `ansicolor` hoặc `timestamper` thì pipeline **fail ngay
ở bước đọc file**, chưa chạy dòng lệnh nào — log sẽ không nói gì về test cả. Thấy
lỗi kiểu `Invalid option type "ansiColor"` thì là thiếu plugin, không phải lỗi code.

## B3. `ci/jenkins/docker-compose.yml` — khai báo 2 container

File đầy đủ xem [tại đây](../ci/jenkins/docker-compose.yml). Phần cần hiểu:

| Container      | Vai trò                                                                      |
| -------------- | ---------------------------------------------------------------------------- |
| `jenkins`      | Controller + giao diện web (port **8090**). Chứa docker CLI ở mục B1         |
| `jenkins-dind` | Docker daemon riêng cho build; giữ cache image Playwright (~2GB) qua restart |

| Volume                 | Giữ cái gì                                       |
| ---------------------- | ------------------------------------------------ |
| `jenkins-data`         | JENKINS_HOME: job, credentials, lịch sử build    |
| `jenkins-docker-certs` | Chứng chỉ TLS để CLI nói chuyện an toàn với dind |
| `dind-storage`         | Cache image/layer của daemon build               |

**Vì sao Docker-in-Docker chứ không mount `/var/run/docker.sock`** (cách phổ biến
trên mạng): Jenkinsfile dùng `agent { docker { ... } }`, nghĩa là Jenkins
bind-mount thư mục workspace `/var/jenkins_home/workspace/<job>` vào container
Playwright. Nếu daemon là daemon của host, nó hiểu đường dẫn đó theo filesystem
host → không tìm thấy → **workspace rỗng, code vừa checkout biến mất, build đỏ mà
log không nói lý do**. Ở đây daemon `dind` mount chung volume `jenkins-data` nên
hai bên nhìn thấy cùng một đường dẫn.

**Port 8090** chứ không phải 8080 vì máy này đã có app khác giữ 8080. Nếu 8090
cũng bận, sửa số **bên trái** dấu hai chấm (`'8091:8080'`); số bên phải là port
Jenkins nghe bên trong container, giữ nguyên.

## B4. `Jenkinsfile` — kịch bản build

Nằm ở gốc repo: [Jenkinsfile](../Jenkinsfile). Không cần thuộc, chỉ cần biết nó
chạy 5 stage theo thứ tự:

| Stage             | Làm gì                                                                     |
| ----------------- | -------------------------------------------------------------------------- |
| **Install**       | `npm ci` + tải Chromium vào cache trong workspace                          |
| **Quality**       | `npm run lint` + `npm run typecheck` (tắt được bằng tham số `RUN_QUALITY`) |
| **Provision env** | Nạp 2 secret file từ Jenkins Credentials vào workspace                     |
| **Preflight**     | Kiểm tra Portal có truy cập được không + session còn sống không            |
| **E2E tests**     | Chạy `npx playwright test`, có test fail thì đánh dấu build `UNSTABLE`     |

Khối `post { always { ... } }` chạy **kể cả khi test fail** để publish JUnit /
HTML / Allure report, lưu screenshot–video–trace, rồi **xoá secret khỏi workspace**.

Stage **Preflight** là phần đáng giá nhất với người mới: session Portal hết hạn là
lỗi hay gặp nhất, và nếu không có stage này thì hàng trăm test sẽ timeout suốt một
tiếng trước khi bạn biết nguyên nhân (chuyện đã xảy ra thật:
[auth-session-expiry-issue.md](auth-session-expiry-issue.md)).

---

# PHẦN C — Dựng Jenkins lên

## C1. Khởi động

Mở PowerShell, **đứng ở thư mục gốc repo**:

```powershell
cd d:\3.Portal_POS\e2e_portal_pos_playwright
docker compose -f ci/jenkins/docker-compose.yml up -d --build
```

Lần đầu mất 3–10 phút: build image Jenkins, cài docker CLI, tải 10 plugin. Cứ để
nó chạy, đừng tắt cửa sổ.

## C2. Kiểm tra 2 container đã sống

```powershell
docker compose -f ci/jenkins/docker-compose.yml ps
```

Cả `jenkins` và `jenkins-dind` phải ở trạng thái `running`. Kiểm tra thêm rằng
Jenkins nói chuyện được với daemon dind:

```powershell
docker exec jenkins docker info
```

Ra thông tin daemon (Server Version, Storage Driver...) là ngon. Nếu báo
`Cannot connect to the Docker daemon` → dind chưa lên xong, chờ 30 giây rồi thử lại.

## C3. Mở giao diện và mở khoá

Lấy mật khẩu khởi tạo:

```powershell
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Copy chuỗi đó, mở **http://localhost:8090**, dán vào ô _Administrator password_.

## C4. Chạy wizard lần đầu

1. Màn hình _Customize Jenkins_: chọn **Select plugins to install** → bấm **None**
   (bỏ chọn tất cả) → **Install**.
   Toàn bộ plugin cần thiết đã nằm sẵn trong image ở [mục B2](#b2-cijenkinspluginstxt--plugin-bắt-buộc);
   cài thêm bộ "suggested" chỉ tốn thời gian và thừa.
2. Tạo user admin: nhập username / password / email — **ghi lại**, mật khẩu khởi
   tạo ở C3 sẽ không dùng nữa.
3. _Instance Configuration_: để nguyên `http://localhost:8090/` → **Save and Finish**.

## C5. Khai báo công cụ Allure

Jenkinsfile có gọi `allure(...)` nên cần khai báo một tool tên đúng là `allure`:

**Manage Jenkins → Tools → Allure Commandline → Add Allure Commandline**

- Name: `allure` (viết thường, đúng chính tả — Jenkinsfile tìm theo tên này)
- Tích **Install automatically**, chọn version **2.30.x** (khớp `allure-commandline`
  trong `package.json`)
- **Save**

Ô version bị rỗng, không chọn được gì? Jenkins mới dựng chưa tải xong metadata
của tool installer (trong log sẽ thấy `No tool installer metadata found for ...
AllureCommandlineInstaller`). Vào **Manage Jenkins → Plugins → Advanced settings**
→ bấm **Check now**, chờ vài giây rồi mở lại trang Tools.

> Không muốn dùng Allure? Xoá block `allure(...)` trong `post` của Jenkinsfile là
> được, phần còn lại vẫn chạy bình thường.

---

# PHẦN D — Chuẩn bị 2 secret

Đây là phần khác biệt lớn nhất của dự án này so với các hướng dẫn Jenkins trên
mạng, nên đọc kỹ.

Portal đăng nhập bằng **Google OAuth + xác thực 2 bước**, không drive headless
được (chi tiết: [authentication.md](authentication.md)). Nghĩa là suite **không tự
đăng nhập được trên Jenkins**. Cách làm: chụp session một lần trên máy dev rồi nạp
vào Jenkins dạng file bí mật. Kèm theo đó, file `.env.*` bị gitignore nên cũng phải
nạp cùng đường đó.

## D1. Chọn file môi trường

Ba file thật — `.env.local`, `.env.stage`, `.env.prod` — đều bị gitignore, nên máy
nào cũng phải tự tạo. Repo chỉ commit khung mẫu
[configs/env/.env.example](../configs/env/.env.example).

**Đã từng chạy test trên máy này thì `configs/env/.env.local` có sẵn rồi** — dùng
luôn nó cho lần chạy Jenkins đầu tiên, khỏi phải đi xin giá trị môi trường khác.
Đừng để chữ "local" gây nhầm: nó **không** trỏ vào localhost mà trỏ vào Portal DEV
thật (`https://v2.dev-fastboypay.com`), nên container Playwright trên Jenkins vẫn
gọi tới được. Chỉ `.env.example` mới trỏ `http://localhost:3000`.

Cần thêm môi trường khác thì copy khung mẫu rồi điền giá trị thật (hỏi team):

```powershell
Copy-Item configs/env/.env.example configs/env/.env.stage
```

```ini
ENV=stage
HEADLESS=true
BASE_URL=https://<portal-host>
API_URL=https://<api-host>
ADMIN_USERNAME=<user>
ADMIN_PASSWORD=<pass>
STORE_ID=<id>
STORAGE_STATE=src/data/dynamic/auth/admin.json
LOG_LEVEL=info
```

Thứ quyết định file nào được nạp là **phần đuôi tên file**, không phải dòng `ENV=`
bên trong: Jenkinsfile truyền `ENV=<TARGET_ENV>` và `loadEnv` đọc
`configs/env/.env.<ENV>`. Dòng `ENV=` trong file chỉ có tác dụng khi chạy ở máy
local mà không set biến. Không nạp được file nào thì `loadEnv` rơi về
`.env.example` → `BASE_URL` thành `http://localhost:3000` → **cả suite fail** mà
log không nói rõ lý do.

## D2. Chụp session đăng nhập

```powershell
npm install          # nếu chưa cài
npm run auth         # mở browser thật, BẠN tự đăng nhập bằng tay
```

Đăng nhập xong, script lưu session vào `src/data/dynamic/auth/admin.json`. Đây
chính là file sẽ upload lên Jenkins.

`npm run auth` ghim sẵn `ENV=local` (xem `scripts` trong `package.json`), nên
session chụp ra thuộc Portal ghi trong `.env.local`. Muốn session cho môi trường
khác thì chạy `npx cross-env ENV=stage node scripts/capture-auth.mjs` — upload
session của môi trường này vào credential của môi trường khác thì Preflight đỏ.

**Chụp lại ngay trước khi upload, đừng dùng file cũ đang nằm trong repo.**
`refreshToken` chỉ sống khoảng 3 ngày, nên file để lâu gần như luôn là file đã
chết → build đỏ ngay ở Preflight. Kiểm tra trước cho nhanh:

```powershell
node -e "const s=require('./src/data/dynamic/auth/admin.json');for(const n of ['token','refreshToken']){const c=s.cookies.find(x=>x.name===n);console.log(n, c?new Date(c.expires*1000).toISOString():'(khong co)', c&&c.expires*1000<Date.now()?'HET HAN':'con song')}"
```

## D3. Tạo credential trên Jenkins

**Manage Jenkins → Credentials → System → Global credentials → Add Credentials**

Tạo **2 credential**, cả hai đều **Kind: Secret file**. Bảng dưới là cặp cho lần
chạy đầu bằng `TARGET_ENV=local`:

| ID                               | Upload file                        |
| -------------------------------- | ---------------------------------- |
| `portal-pos-env-local`           | `configs/env/.env.local`           |
| `portal-pos-storage-state-local` | `src/data/dynamic/auth/admin.json` |

ID phải gõ **chính xác** — Jenkinsfile ghép chuỗi theo tham số `TARGET_ENV`:
`portal-pos-env-${TARGET_ENV}`. Mỗi môi trường cần một cặp riêng đặt tên theo đúng
mẫu đó, ví dụ `portal-pos-env-stage` + `portal-pos-storage-state-stage`. Build với
một `TARGET_ENV` chưa có cặp credential sẽ fail ngay ở stage **Provision env** với
lỗi credential not found.

Đóng gói **cả file** thay vì tách từng biến thành credential riêng là có chủ ý:
sau này thêm biến mới chỉ cần sửa file trên Jenkins, không phải đụng vào Jenkinsfile.

---

# PHẦN E — Tạo job

## E1. New Item

Trang chủ Jenkins → **New Item**

- Tên: `portal-pos-e2e`
- Loại: **Pipeline** → OK

## E2. Cấu hình Pipeline

Kéo xuống mục **Pipeline**:

| Trường           | Giá trị                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| Definition       | **Pipeline script from SCM**                                                                               |
| SCM              | **Git**                                                                                                    |
| Repository URL   | `https://github.com/DHMaiKhanh/e2e-portal-pos-playwright.git`                                              |
| Credentials      | GitHub Personal Access Token (Kind: _Username with password_, password = token) — chỉ cần nếu repo private |
| Branch Specifier | `*/main`                                                                                                   |
| Script Path      | `Jenkinsfile`                                                                                              |

**Save**.

> ⚠️ Phải là URL remote, **tuyệt đối không** trỏ vào `D:\3.Portal_POS\...`.
> Jenkins chạy trong container Linux, nó không nhìn thấy ổ đĩa Windows của bạn.

## E3. Build lần đầu

Bấm **Build Now**. Lần này Jenkins chỉ đọc file để nạp danh sách tham số rồi dừng
— **đây là hành vi bình thường** của Jenkins với job có `parameters`, không phải
lỗi. Từ lần thứ hai, menu bên trái đổi thành **Build with Parameters**.

---

# PHẦN F — Chạy và đọc kết quả

## F1. Các tham số khi build

| Tham số       | Mặc định | Ghi chú                                                             |
| ------------- | -------- | ------------------------------------------------------------------- |
| `TARGET_ENV`  | `stage`  | Chọn cặp credential được nạp và giá trị `ENV` truyền cho Playwright |
| `TEST_PATH`   | _(rỗng)_ | Thu hẹp phạm vi, vd `tests/e2e/customers`. Rỗng = chạy hết          |
| `GREP`        | _(rỗng)_ | Lọc theo tag, vd `@smoke`                                           |
| `WORKERS`     | `8`      | Điểm bão hoà đã đo — cao hơn không nhanh hơn, nghẽn ở server Portal |
| `TRACE`       | `off`    | Bật `retain-on-failure` khi cần điều tra; làm chậm ~25% cả suite    |
| `RUN_QUALITY` | `true`   | Chạy `lint` + `typecheck` trước                                     |

**Lần chạy thử đầu tiên** đặt `TARGET_ENV` = `local` (khớp cặp credential ở
[mục D3](#d3-tạo-credential-trên-jenkins)), `TEST_PATH` = `tests/e2e/customers`,
`WORKERS` = `2`. Mục đích là biết pipeline có thông không trong vài phút, thay vì
chờ cả tiếng rồi mới phát hiện sai credential.

Mặc định của `TARGET_ENV` là `stage`. Mới chỉ tạo cặp credential `local` mà quên
đổi ô này thì build đỏ ngay ở stage **Provision env**, không phải lỗi test.

## F2. Đọc kết quả

Vào trang build vừa chạy, sidebar bên trái có:

- **Test Result** (JUnit) — số pass/fail và xu hướng qua các build
- **Playwright HTML Report** — report quen thuộc, xem được từng bước test
- **Allure Report** — thống kê chi tiết hơn
- **Build Artifacts** — `results.json`, screenshot / video / trace của test fail

## F3. Ba màu build nghĩa là gì

| Trạng thái    | Nghĩa là                                                                 |
| ------------- | ------------------------------------------------------------------------ |
| 🟢 `SUCCESS`  | Toàn bộ test pass                                                        |
| 🟡 `UNSTABLE` | Có test fail — lỗi nằm ở app hoặc ở test, mở report xem                  |
| 🔴 `FAILURE`  | Hỏng **trước khi** test chạy: install, lint/typecheck, hoặc Preflight đỏ |

Tách 🟡 khỏi 🔴 là có chủ ý: "test tìm ra vấn đề" và "pipeline không chạy nổi" là
hai chuyện khác nhau, cần người khác nhau xử lý.

---

# PHẦN G — Lệnh dùng hằng ngày

Chạy từ thư mục gốc repo:

```powershell
# Xem log Jenkins theo thời gian thực (Ctrl+C để thoát)
docker compose -f ci/jenkins/docker-compose.yml logs -f jenkins

# Restart sau khi sửa cấu hình
docker compose -f ci/jenkins/docker-compose.yml restart jenkins

# Dừng Jenkins, GIỮ NGUYÊN job + credentials + lịch sử build
docker compose -f ci/jenkins/docker-compose.yml down

# Bật lại
docker compose -f ci/jenkins/docker-compose.yml up -d

# Build lại image sau khi sửa Dockerfile / plugins.txt
docker compose -f ci/jenkins/docker-compose.yml up -d --build

# ⚠️ XOÁ SẠCH: mất hết job, credentials, lịch sử. Chỉ dùng khi muốn làm lại từ đầu
docker compose -f ci/jenkins/docker-compose.yml down -v
```

Khác biệt duy nhất cần nhớ: `down` giữ dữ liệu, `down -v` xoá luôn volume
`jenkins-data`. Gõ nhầm `-v` là phải làm lại toàn bộ PHẦN C, D, E.

---

# PHẦN H — Lỗi hay gặp

| Triệu chứng                                                  | Nguyên nhân                                        | Cách xử lý                                                                                               |
| ------------------------------------------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `Cannot connect to the Docker daemon` (trên PowerShell)      | Docker Desktop chưa khởi động xong                 | Mở Docker Desktop, chờ "Engine running"                                                                  |
| `docker: not found` (trong build Jenkins)                    | Dùng image `jenkins/jenkins` gốc, thiếu docker CLI | Dựng lại bằng `ci/jenkins/Dockerfile` ([mục B1](#b1-cijenkinsdockerfile--jenkins-đã-pha-sẵn))            |
| `Invalid option type "ansiColor"` / `timestamps`             | Thiếu plugin, fail ngay lúc parse                  | Kiểm tra `plugins.txt`, chạy `up -d --build` lại                                                         |
| Checkout xong nhưng workspace rỗng, `npm ci` không thấy file | Dùng `/var/run/docker.sock` của host thay vì dind  | Dùng đúng `docker-compose.yml` của repo ([mục B3](#b3-cijenkinsdocker-composeyml--khai-báo-2-container)) |
| Test fail rải rác, tab Chromium crash                        | WSL2 thiếu RAM, bị OOM-kill                        | Sửa `.wslconfig` ≥ 8GB ([mục A3](#a3-cấp-đủ-ram-cho-wsl2-bắt-buộc-đừng-bỏ-qua)), hoặc hạ `WORKERS`       |
| `port is already allocated` khi `up`                         | Cổng 8090 đang bị chiếm                            | Đổi số bên trái trong `ports:` thành `8091:8080`                                                         |
| Cả suite fail, URL trỏ `http://localhost:3000`               | Quên credential `portal-pos-env-<env>`             | Tạo lại credential ở [mục D3](#d3-tạo-credential-trên-jenkins), kiểm tra ID đúng chính tả                |
| Preflight đỏ: "Session đăng nhập không dùng được"            | Session hết hạn — **lỗi hay gặp nhất**             | Xem mục ngay bên dưới                                                                                    |
| `Host key verification failed` / 403 khi checkout            | Repo private, thiếu credential Git                 | Thêm GitHub PAT ở [mục E2](#e2-cấu-hình-pipeline)                                                        |

## H1. Session hết hạn — lỗi hay gặp nhất

Session Portal bị server thu hồi theo thời gian. Khi đó stage **Preflight** đỏ kèm
đúng hướng dẫn xử lý. Cách sửa, làm trên **máy dev**:

```powershell
npm run auth     # đăng nhập lại bằng tay
```

Rồi vào Jenkins → Credentials → `portal-pos-storage-state-<env>` (vd
`portal-pos-storage-state-local`) → **Update** → upload lại
`src/data/dynamic/auth/admin.json` → build lại.

Đây cũng là lý do `triggers { cron(...) }` bị comment sẵn trong Jenkinsfile: build
theo lịch sẽ đỏ hàng loạt ngay khi session chết, và đó là tiếng ồn chứ không phải
tín hiệu.

---

# PHẦN I — Checklist tổng

Tick hết là xong:

- [ ] Docker Desktop chạy, `docker run hello-world` OK
- [ ] `.wslconfig` cấp ≥ 8GB RAM, đã `wsl --shutdown`
- [ ] `docker compose -f ci/jenkins/docker-compose.yml ps` → 2 container `running`
- [ ] `docker exec jenkins docker info` ra thông tin daemon
- [ ] Vào được http://localhost:8090, đã tạo user admin
- [ ] Manage Jenkins → Tools có Allure Commandline tên `allure`
- [ ] Có `configs/env/.env.<env>` với `BASE_URL` thật (`.env.local` là đủ cho lần đầu)
- [ ] Vừa chạy `npm run auth`, `refreshToken` trong `admin.json` còn sống
- [ ] 2 credential Secret file đúng tên: `portal-pos-env-<env>`, `portal-pos-storage-state-<env>`
- [ ] Job `portal-pos-e2e` kiểu Pipeline, from SCM, Script Path = `Jenkinsfile`
- [ ] Build with Parameters chạy xanh với `TARGET_ENV` đúng, `TEST_PATH` nhỏ, `WORKERS=2`
- [ ] Trang build có link Playwright HTML Report

---

## Đọc tiếp

- [jenkins.md](jenkins.md) — bản tham khảo ngắn, cho người đã quen Jenkins
- [authentication.md](authentication.md) — vì sao suite không tự đăng nhập được
- [auth-session-expiry-issue.md](auth-session-expiry-issue.md) — sự cố 112 test fail vì session chết
- [test-performance-optimization.md](test-performance-optimization.md) — vì sao là 8 worker
