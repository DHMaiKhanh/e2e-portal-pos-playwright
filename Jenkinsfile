// Portal POS — Playwright E2E pipeline
//
// Chạy toàn bộ suite trong container Playwright chính thức, lấy cấu hình môi
// trường và session đăng nhập từ Jenkins Credentials, rồi publish JUnit +
// HTML + Allure report.
//
// Plugin cần có: Docker Pipeline, Credentials Binding, JUnit, HTML Publisher,
// Allure, AnsiColor, Timestamper, GitHub, Email Extension. Xem docs/jenkins.md
// để biết cách tạo credentials và job.

// --- Helpers dùng chung giữa các stage / post condition ---
//
// Cả hai bọc try/catch vì đây là bước phụ (report ra ngoài), không phải bước
// test: thiếu credential 'github-token' hay SMTP chưa cấu hình không được phép
// làm hỏng cả build đã chạy xong.

def notifyGithub(String status, String description) {
  try {
    githubNotify(
      credentialsId: 'github-token',
      context: 'jenkins/portal-pos-e2e',
      description: description,
      status: status
    )
  } catch (err) {
    echo "Bỏ qua GitHub commit status (${status}): ${err}"
  }
}

def notifyEmail(String subject, String body) {
  try {
    emailext(to: env.NOTIFY_EMAIL, subject: subject, body: body)
  } catch (err) {
    echo "Bỏ qua email notify: ${err}"
  }
}

pipeline {
  // Agent ở cấp pipeline là node của Jenkins, KHÔNG phải container: mọi bước
  // trong post{} (junit, publishHTML, allure, archiveArtifacts) chạy ở đây.
  //
  // Trước đây `agent { docker { ... } }` đặt ở cấp này, nên post{} cũng bị chạy
  // bên trong container Playwright — mà Allure CLI lại nằm trên controller ở
  // /var/jenkins_home/tools/... (thư mục đó không được mount vào container, và
  // image Playwright cũng không có Java). Kết quả: mọi build đều đỏ ở post với
  //
  //   OCI runtime exec failed: ... allure: no such file or directory
  //   AllurePluginException: Can not generate Allure Report, exit code: 127
  //
  // Container giờ khai báo ở stage 'Build & test' bên dưới với `reuseNode true`,
  // tức vẫn dùng đúng workspace này — reports/ ghi từ trong container vẫn nhìn
  // thấy được ở post{}.
  agent any

  parameters {
    choice(
      name: 'TARGET_ENV',
      choices: ['stage', 'prod', 'local'],
      description: 'Môi trường đích. Quyết định credential nào được nạp và giá trị ENV truyền cho Playwright.'
    )
    string(
      name: 'TEST_PATH',
      defaultValue: '',
      description: 'Giới hạn phạm vi chạy, ví dụ tests/e2e/customers. Để trống = chạy toàn bộ.'
    )
    string(
      name: 'GREP',
      defaultValue: '',
      description: 'Lọc theo tag/tên test (--grep), ví dụ @smoke. Để trống = không lọc.'
    )
    string(
      name: 'WORKERS',
      defaultValue: '8',
      description: 'Số worker song song. 8 là điểm bão hoà đã đo — cao hơn không nhanh hơn vì nghẽn ở server Portal, chỉ làm mỗi test chậm đi.'
    )
    choice(
      name: 'TRACE',
      choices: ['off', 'retain-on-failure', 'on'],
      description: 'Ghi trace. Mặc định off vì retain-on-failure vẫn phải record mọi test (+25% thời gian đã đo). Bật khi cần điều tra.'
    )
    booleanParam(
      name: 'RUN_QUALITY',
      defaultValue: true,
      description: 'Chạy lint + typecheck trước khi test.'
    )
  }

  options {
    timeout(time: 120, unit: 'MINUTES')
    timestamps()
    ansiColor('xterm')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '30', artifactNumToKeepStr: '10'))
  }

  triggers {
    // Jenkins chạy ở localhost:8090, GitHub không gọi webhook vào được (không
    // có URL public) nên dùng poll thay cho webhook thật. H/5 * * * * = mỗi
    // ~5 phút, phút lệch ngẫu nhiên để tránh nhiều job cùng poll một lúc.
    //
    // Khi Jenkins đã có URL public (ngrok, domain nội bộ, v.v.) thì đổi sang
    // githubPush() — nhanh hơn poll và không tốn tài nguyên chờ. Cần thêm
    // webhook trên GitHub trỏ về <jenkins-url>/github-webhook/, xem
    // docs/jenkins.md mục 9.
    //
    // KHÔNG dùng cron theo giờ cố định: session đăng nhập Portal hết hạn bất kỳ
    // lúc nào (Google OAuth + 2FA, không tự động hoá được — xem
    // docs/authentication.md), build theo lịch cố định sẽ đỏ hàng loạt ngay khi
    // đó xảy ra mà không ai theo dõi (mục 6).
    pollSCM('H/5 * * * *')
  }

  environment {
    CI = 'true'
    ENV = "${params.TARGET_ENV}"
    WORKERS = "${params.WORKERS}"
    TRACE = "${params.TRACE}"

    // Container chạy dưới uid của Jenkins chứ không phải root, nên mọi cache
    // phải nằm trong workspace (HOME mặc định của image không ghi được).
    HOME = "${WORKSPACE}"
    npm_config_cache = "${WORKSPACE}/.npm"
    PLAYWRIGHT_BROWSERS_PATH = "${WORKSPACE}/.cache/ms-playwright"

    STORAGE_STATE = 'src/data/dynamic/auth/admin.json'

    // Người nhận email báo kết quả build (Manage Jenkins → System → Extended
    // E-mail Notification cấu hình SMTP, xem docs/jenkins.md mục 9).
    NOTIFY_EMAIL = 'khanh_do@fastboy.net'
  }

  stages {
    stage('Notify: pending') {
      // Chạy ở agent ngoài (agent any cấp pipeline), không cần container —
      // báo PENDING lên GitHub càng sớm càng tốt, trước khi tải image/npm ci.
      steps {
        script { notifyGithub('PENDING', 'Đang chạy…') }
      }
    }

    stage('Build & test') {
      // Image phải khớp version @playwright/test trong package-lock.json (hiện
      // tại 1.61.1). Lệch version thì browser bundled trong image không dùng
      // được — stage 'Install' sẽ tự tải bản đúng nhưng chậm hơn nhiều, nên cập
      // nhật tag này mỗi lần nâng Playwright.
      //
      //   --ipc=host     : Chromium dùng shared memory; thiếu cờ này tab hay
      //                    crash trong container (/dev/shm mặc định chỉ 64MB).
      //   reuseNode true : dùng lại workspace của node ngoài thay vì cấp
      //                    workspace mới, để post{} (chạy ngoài container) đọc
      //                    được reports/ do các stage bên trong sinh ra.
      agent {
        docker {
          image 'mcr.microsoft.com/playwright:v1.61.1-noble'
          args '--ipc=host'
          reuseNode true
        }
      }

      stages {
        stage('Install') {
          steps {
            // --ignore-scripts bỏ qua `postinstall` (playwright install --with-deps,
            // cần root + apt) và `prepare` (husky, vô nghĩa trên CI). Browser cài
            // riêng ở bước dưới, không kèm --with-deps vì image đã có sẵn deps hệ
            // thống.
            sh 'npm ci --ignore-scripts --prefer-offline --no-audit --fund=false'
            sh 'npx playwright install chromium'
            sh 'npx playwright --version'
          }
        }

        stage('Quality') {
          when { expression { params.RUN_QUALITY } }
          steps {
            sh 'npm run lint'
            sh 'npm run typecheck'
          }
        }

        stage('Provision env') {
          steps {
            // File .env.<env> là secret file trong Jenkins (BASE_URL, API_URL,
            // STORE_ID, ADMIN_*). Repo cố tình gitignore các file này, nên nếu
            // không nạp thì loadEnv rơi về .env.example → trỏ localhost và cả
            // suite fail một cách vô nghĩa.
            //
            // Session đăng nhập chụp sẵn bằng `npm run auth` trên máy dev rồi
            // upload lên Jenkins dạng Secret file.
            script {
              def envCred = "portal-pos-env-${params.TARGET_ENV}"
              def stateCred = "portal-pos-storage-state-${params.TARGET_ENV}"

              try {
                withCredentials([file(credentialsId: envCred, variable: 'ENV_FILE')]) {
                  sh 'install -m 600 "$ENV_FILE" "configs/env/.env.$ENV"'
                }
                withCredentials([file(credentialsId: stateCred, variable: 'STATE_FILE')]) {
                  sh 'mkdir -p "$(dirname "$STORAGE_STATE")" && install -m 600 "$STATE_FILE" "$STORAGE_STATE"'
                }
              } catch (err) {
                // Lỗi hay gặp nhất ở lần chạy job đầu tiên: plugin và job dựng
                // xong nhưng chưa ai tạo credential. Message mặc định của Jenkins
                // ("Could not find credentials entry with ID ...") nằm tít cuối
                // log và không nói phải làm gì tiếp.
                error(
                  "Không nạp được cấu hình môi trường '${params.TARGET_ENV}': ${err}\n" +
                  "\n" +
                  "Cần 2 credential kind 'Secret file' ở Manage Jenkins → Credentials → System → Global:\n" +
                  "  ${envCred}\n" +
                  "      nội dung = file configs/env/.env.${params.TARGET_ENV} trên máy dev\n" +
                  "  ${stateCred}\n" +
                  "      nội dung = file src/data/dynamic/auth/admin.json (sinh bằng: npm run auth)\n" +
                  "\n" +
                  "Chưa có .env.${params.TARGET_ENV} thì build lại với TARGET_ENV=local.\n" +
                  "Chi tiết: docs/jenkins.md mục 2."
                )
              }
            }
          }
        }

        stage('Preflight') {
          steps {
            // Hai lỗi hạ tầng phổ biến nhất, tách riêng để đọc log là biết ngay
            // build đỏ vì môi trường hay vì test:
            //   1. Portal không truy cập được từ agent (mạng/VPN/BASE_URL sai)
            //   2. Session đã bị server thu hồi → phải chụp lại
            sh 'node scripts/check-server.mjs'

            script {
              def status = sh(script: 'npx playwright test --project=setup --reporter=list', returnStatus: true)
              if (status != 0) {
                error(
                  "Session đăng nhập không dùng được.\n" +
                  "Trên máy dev chạy: npm run auth\n" +
                  "rồi upload lại src/data/dynamic/auth/admin.json vào credential " +
                  "'portal-pos-storage-state-${params.TARGET_ENV}' (Secret file)."
                )
              }
            }
          }
        }

        stage('E2E tests') {
          steps {
            // Preflight cũng ghi vào reports/ (nó chạy project `setup` qua chính
            // Playwright). Xoá đi để report publish ra chỉ chứa lần chạy thật.
            sh 'rm -rf reports test-results'

            script {
              def cmd = ['npx', 'playwright', 'test']
              if (params.TEST_PATH?.trim()) {
                cmd << params.TEST_PATH.trim()
              }
              if (params.GREP?.trim()) {
                cmd << '--grep' << "'${params.GREP.trim()}'"
              }

              // Test fail không được làm dừng pipeline ngay: post{} vẫn cần chạy để
              // publish report. Kết quả thật phản ánh qua junit + build status.
              def status = sh(script: cmd.join(' '), returnStatus: true)
              if (status != 0) {
                unstable("Playwright thoát với mã ${status} — có test fail. Xem HTML/Allure report.")
              }
            }
          }
        }
      }
    }
  }

  post {
    always {
      junit testResults: 'reports/junit/results.xml', allowEmptyResults: true

      publishHTML(target: [
        reportName: 'Playwright HTML Report',
        reportDir: 'reports/html',
        reportFiles: 'index.html',
        keepAll: true,
        alwaysLinkToLastBuild: true,
        allowMissing: true
      ])

      // Cần Allure plugin + một Allure Commandline tool tên 'allure' khai báo ở
      // Manage Jenkins → Tools (nên chọn "Install automatically"). Bỏ block này
      // nếu không dùng Allure.
      //
      // Bọc try/catch vì đây là bước publish chứ không phải bước test: Allure
      // hỏng không được phép nuốt luôn junit/HTML report của một lần chạy đã
      // xong.
      script {
        try {
          allure(results: [[path: 'reports/allure-results']], reportBuildPolicy: 'ALWAYS')
        } catch (err) {
          echo(
            "Bỏ qua Allure report: ${err}\n" +
            "Kiểm tra Manage Jenkins → Tools → Allure Commandline có tool tên 'allure' " +
            "và đang bật 'Install automatically'."
          )
        }
      }

      archiveArtifacts(
        artifacts: 'reports/json/results.json, reports/junit/results.xml, reports/allure-results/**, test-results/**/*.png, test-results/**/*.webm, test-results/**/trace.zip',
        allowEmptyArchive: true
      )

      // Secret không được nằm lại trong workspace giữa các build.
      sh 'rm -f configs/env/.env.local configs/env/.env.stage configs/env/.env.prod "$STORAGE_STATE" || true'
    }

    success {
      script { notifyGithub('SUCCESS', 'Tất cả test pass') }
    }

    // GitHub không có khái niệm "unstable" — map về FAILURE để PR check đỏ,
    // vì UNSTABLE nghĩa là có test fail (khác PENDING/SUCCESS), không nên xanh.
    unstable {
      script { notifyGithub('FAILURE', 'Có test fail — xem Playwright/Allure report') }
      script {
        notifyEmail(
          "[portal-pos-e2e] #${env.BUILD_NUMBER} UNSTABLE (${params.TARGET_ENV})",
          "Có test fail. Report: ${env.BUILD_URL}"
        )
      }
    }

    failure {
      script { notifyGithub('FAILURE', 'Pipeline lỗi trước khi test chạy xong') }
      script {
        notifyEmail(
          "[portal-pos-e2e] #${env.BUILD_NUMBER} FAILURE (${params.TARGET_ENV})",
          "Build lỗi trước khi ra được test result — xem log: ${env.BUILD_URL}console"
        )
      }
    }

    // Chạy sau khi build trước đó FAILURE/UNSTABLE và build này SUCCESS —
    // báo "đã xanh lại" một lần, tránh spam email mỗi build pass liên tiếp.
    fixed {
      script {
        notifyEmail(
          "[portal-pos-e2e] #${env.BUILD_NUMBER} back to green (${params.TARGET_ENV})",
          "Suite đã pass trở lại: ${env.BUILD_URL}"
        )
      }
    }
  }
}
