// Portal POS — Playwright E2E pipeline
//
// Chạy toàn bộ suite trong container Playwright chính thức, lấy cấu hình môi
// trường và session đăng nhập từ Jenkins Credentials, rồi publish JUnit +
// HTML + Allure report.
//
// Plugin cần có: Docker Pipeline, Credentials Binding, JUnit, HTML Publisher,
// Allure, AnsiColor, Timestamper. Xem docs/jenkins.md để biết cách tạo
// credentials và job.

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
    choice(
      name: 'SUITE',
      choices: ['full', 'smoke', 'regression'],
      description: 'Bộ test chạy. smoke = --grep @smoke (nhanh, hợp cho mỗi lần đẩy code); regression = --grep @regression; full = cả suite. Tag định nghĩa ở src/types/testTags.ts.'
    )
    string(
      name: 'TEST_PATH',
      defaultValue: '',
      description: 'Giới hạn phạm vi chạy, ví dụ tests/e2e/customers. Để trống = chạy toàn bộ.'
    )
    string(
      name: 'GREP',
      defaultValue: '',
      description: 'Lọc thêm theo tag/tên test (--grep), ví dụ @auth. Kết hợp AND với SUITE. Để trống = chỉ lọc theo SUITE.'
    )
    string(
      name: 'NOTIFY_EMAIL',
      defaultValue: '',
      description: 'Email nhận thông báo khi build fail/unstable/trở lại xanh. Nhiều địa chỉ cách nhau bằng dấu phẩy. Để trống = không gửi. SMTP khai báo ở ci/jenkins/casc.yaml.'
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

  // Session đăng nhập Portal hết hạn theo thời gian và phải chụp lại thủ công
  // (Google OAuth + 2FA, không tự động hoá được — xem docs/authentication.md).
  // Vì vậy KHÔNG bật cron mặc định: build đêm sẽ đỏ hàng loạt ngay khi session
  // chết, và đó là tiếng ồn chứ không phải tín hiệu. Bật khi đã có cách làm
  // mới session tự động.
  // triggers { cron('H 2 * * 1-5') }

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
  }

  stages {
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

              // SUITE chọn bộ tag, GREP lọc thêm bên trong bộ đó. Gom cả hai thành
              // MỘT --grep theo kiểu AND: Playwright nhận regex, lookahead
              // (?=.*@smoke)(?=.*@auth) = "có @smoke VÀ có @auth". Ghép bằng --grep
              // hai lần không AND được (lần sau đè lần trước).
              def greps = []
              if (params.SUITE == 'smoke')      { greps << '@smoke' }
              if (params.SUITE == 'regression') { greps << '@regression' }
              if (params.GREP?.trim())          { greps << params.GREP.trim() }
              if (greps.size() == 1) {
                cmd << '--grep' << "'${greps[0]}'"
              } else if (greps.size() > 1) {
                def lookahead = greps.collect { "(?=.*${it})" }.join('')
                cmd << '--grep' << "'${lookahead}'"
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

    // Email chỉ gửi khi trạng thái đáng báo: có test fail (unstable), pipeline
    // hỏng (failure), hoặc vừa xanh lại sau một lần đỏ (fixed). Build xanh liên
    // tục thì im lặng — thông báo mọi lần chỉ làm người ta tắt noti.
    unstable { script { notifyByEmail('UNSTABLE — có test fail') } }
    failure { script { notifyByEmail('FAILURE — pipeline hỏng trước khi test xong') } }
    fixed   { script { notifyByEmail('FIXED — build đã xanh trở lại') } }
  }
}

// Khai báo ngoài block pipeline{} để dùng lại ở cả 3 post section. Guard rỗng:
// không nhập NOTIFY_EMAIL thì bỏ qua, không để thiếu SMTP làm post{} đỏ theo.
void notifyByEmail(String headline) {
  def to = params.NOTIFY_EMAIL?.trim()
  if (!to) {
    echo "NOTIFY_EMAIL trống — bỏ qua gửi email (${headline})."
    return
  }
  try {
    mail(
      to: to,
      subject: "[Jenkins] ${env.JOB_NAME} #${env.BUILD_NUMBER} — ${headline}",
      body: """\
${headline}

Job     : ${env.JOB_NAME} #${env.BUILD_NUMBER}
Env      : ${params.TARGET_ENV}  |  Suite: ${params.SUITE}
Kết quả  : ${currentBuild.currentResult}  (${currentBuild.durationString.replace(' and counting', '')})

Build       : ${env.BUILD_URL}
HTML report : ${env.BUILD_URL}Playwright_20HTML_20Report/
Test result : ${env.BUILD_URL}testReport/
"""
    )
  } catch (err) {
    // SMTP chưa cấu hình ở casc.yaml, hoặc server từ chối: đừng để chuyện gửi
    // email làm hỏng kết quả build vốn đã xong.
    echo "Gửi email thất bại (bỏ qua): ${err}"
  }
}
