// Jenkins pipeline for the Portal POS E2E suite.
// Runs NATIVELY on a Windows Jenkins controller (java -jar jenkins.war) — no Docker.
//
// Prerequisites (one-time, see README/docs):
//   1. Capture a login session locally:  npm run auth
//      -> produces src/data/dynamic/auth/admin.json
//   2. Upload that file to Jenkins as a "Secret file" credential: id = portal-auth-state
//   3. Plugins: NodeJS (optional), HTML Publisher, JUnit
//
// The session snapshot expires. When tests start failing at global.setup with
// "session has expired", re-run `npm run auth` and re-upload the credential.

pipeline {
  agent any

  parameters {
    choice(name: 'ENV', choices: ['stage', 'prod', 'local'], description: 'Target environment')
    string(name: 'BASE_URL', defaultValue: 'http://localhost:3000', description: 'Portal POS base URL')
  }

  options {
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
  }

  environment {
    CI       = 'true'          // enables retries + forbidOnly in playwright.config.ts
    HUSKY    = '0'             // skip git hooks in CI
    ENV      = "${params.ENV}"
    BASE_URL = "${params.BASE_URL}"
    // Keep trace/video only for failures to save disk on the local controller.
    TRACE    = 'retain-on-failure'
    VIDEO    = 'retain-on-failure'
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Install') {
      steps {
        bat 'npm ci'
        bat 'npx playwright install chromium'
      }
    }

    stage('Auth session') {
      steps {
        withCredentials([file(credentialsId: 'portal-auth-state', variable: 'AUTH_FILE')]) {
          bat '''
            if not exist "src\\data\\dynamic\\auth" mkdir "src\\data\\dynamic\\auth"
            copy /Y "%AUTH_FILE%" "src\\data\\dynamic\\auth\\admin.json"
          '''
        }
      }
    }

    stage('Quality') {
      steps {
        bat 'npm run lint'
        bat 'npm run typecheck'
      }
    }

    stage('E2E') {
      steps {
        bat 'npx playwright test'
      }
    }
  }

  post {
    always {
      junit testResults: 'reports/junit/results.xml', allowEmptyResults: true
      publishHTML(target: [
        reportDir: 'reports/html',
        reportFiles: 'index.html',
        reportName: 'Playwright Report',
        keepAll: true,
        allowMissing: true,
        alwaysLinkToLastBuild: true
      ])
      archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true
    }
  }
}
