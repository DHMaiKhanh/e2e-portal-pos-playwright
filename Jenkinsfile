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
  // Image phải khớp version @playwright/test trong package-lock.json (hiện tại
  // 1.61.1). Lệch version thì browser bundled trong image không dùng được —
  // stage 'Install' sẽ tự tải bản đúng nhưng chậm hơn nhiều, nên cập nhật tag
  // này mỗi lần nâng Playwright.
  //
  //   --ipc=host : Chromium dùng shared memory; thiếu cờ này tab hay crash
  //                trong container (/dev/shm mặc định chỉ 64MB).
  agent {
    docker {
      image 'mcr.microsoft.com/playwright:v1.61.1-noble'
      args '--ipc=host'
    }
  }

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
        // không nạp thì loadEnv rơi về .env.example → trỏ localhost và cả suite
        // fail một cách vô nghĩa.
        withCredentials([
          file(credentialsId: "portal-pos-env-${params.TARGET_ENV}", variable: 'ENV_FILE')
        ]) {
          sh 'install -m 600 "$ENV_FILE" "configs/env/.env.$ENV"'
        }

        // Session đăng nhập chụp sẵn bằng `npm run auth` trên máy dev rồi
        // upload lên Jenkins dạng Secret file.
        withCredentials([
          file(credentialsId: "portal-pos-storage-state-${params.TARGET_ENV}", variable: 'STATE_FILE')
        ]) {
          sh 'mkdir -p "$(dirname "$STORAGE_STATE")" && install -m 600 "$STATE_FILE" "$STORAGE_STATE"'
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
      // Manage Jenkins → Tools. Bỏ block này nếu không dùng Allure.
      allure(results: [[path: 'reports/allure-results']], reportBuildPolicy: 'ALWAYS')

      archiveArtifacts(
        artifacts: 'reports/json/results.json, reports/junit/results.xml, test-results/**/*.png, test-results/**/*.webm, test-results/**/trace.zip',
        allowEmptyArchive: true
      )

      // Secret không được nằm lại trong workspace giữa các build.
      sh 'rm -f configs/env/.env.local configs/env/.env.stage configs/env/.env.prod "$STORAGE_STATE" || true'
    }
  }
}
