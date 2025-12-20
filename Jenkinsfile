pipeline {
  agent any

  options {
    skipDefaultCheckout(true)
    timestamps()
  }

  environment {
    // 배포 경로
    DEPLOY_ROOT = 'C:\\deploy\\forum'
    DEPLOY_BACKEND_DIR = 'C:\\deploy\\forum\\backend'
    DEPLOY_FRONT_DIR   = 'C:\\deploy\\forum\\frontend'

    // Nginx 경로
    NGINX_HOME = 'C:\\Nginx\\nginx-1.28.0'

    // (선택) Next telemetry 끄기
    NEXT_TELEMETRY_DISABLED = '1'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('환경 설정') {
      steps {
        bat '''
          node --version
          npm --version
          java -version
          cd forum_server
          gradlew.bat --version
        '''
      }
    }

    stage('프론트엔드 빌드') {
      steps {
        dir('forum_front') {
          bat '''
            call npm ci
            call npm run build
          '''
        }
      }
    }

    stage('백엔드 빌드') {
      steps {
        dir('forum_server') {
          bat '''
            call gradlew.bat clean build -x test
          '''
        }
      }
    }

    stage('테스트 실행') {
      steps {
        dir('forum_server') {
          bat '''
            call gradlew.bat test
          '''
        }
      }
      post {
        always {
          junit 'forum_server/build/test-results/test/*.xml'
        }
      }
    }

    stage('아티팩트 복사') {
      steps {
        bat """
          if not exist "${DEPLOY_BACKEND_DIR}" mkdir "${DEPLOY_BACKEND_DIR}"
          if not exist "${DEPLOY_FRONT_DIR}" mkdir "${DEPLOY_FRONT_DIR}"

          REM ✅ 백엔드 jar 복사 (최신 jar 1개를 app.jar로 통일)
          for %%F in (forum_server\\build\\libs\\*.jar) do copy /Y "%%F" "${DEPLOY_BACKEND_DIR}\\app.jar"

          REM ✅ 프론트 빌드 결과 복사 (Next는 서버 실행이 필요해서 .next도 복사)
          REM 필요하면 node_modules는 제외하고, package.json/next.config.js 등도 같이 복사 권장
          xcopy /E /I /Y "forum_front\\.next" "${DEPLOY_FRONT_DIR}\\.next"
          xcopy /E /I /Y "forum_front\\public" "${DEPLOY_FRONT_DIR}\\public"
          copy /Y "forum_front\\package.json" "${DEPLOY_FRONT_DIR}\\package.json"
        """
      }
    }

stage('배포') {
  when {
    expression {
      def b = (env.BRANCH_NAME ?: env.GIT_BRANCH ?: '')
      return b.contains('main') || b.contains('master')
    }
  }
  steps {
    bat """
      echo ===== 1) 기존 백엔드(8081) 프로세스 종료 =====
      for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8081 ^| findstr LISTENING') do (
        echo kill PID=%%a
        taskkill /F /PID %%a
      )

      echo ===== 2) 기존 프론트(3000) 프로세스 종료 =====
      for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
        echo kill PID=%%a
        taskkill /F /PID %%a
      )

      echo ===== 3) 백엔드 재실행 (백그라운드) =====
      if not exist "${DEPLOY_BACKEND_DIR}\\logs" mkdir "${DEPLOY_BACKEND_DIR}\\logs"
      start "forum-backend" /B cmd /c ^
        "cd /d ${DEPLOY_BACKEND_DIR} && java -jar app.jar > logs\\backend.log 2>&1"

      echo ===== 4) 프론트 재실행 (백그라운드) =====
      if not exist "${DEPLOY_FRONT_DIR}\\logs" mkdir "${DEPLOY_FRONT_DIR}\\logs"
      start "forum-frontend" /B cmd /c ^
        "cd /d ${DEPLOY_FRONT_DIR} && npm install --omit=dev && npm run start -- -p 3000 > logs\\frontend.log 2>&1"

      echo ===== 5) Nginx 설정 테스트 & 리로드 =====
      cd /d "${NGINX_HOME}"
      nginx.exe -t
      nginx.exe -s reload

      echo ===== 6) 포트 상태 확인 =====
      netstat -ano | findstr :8081
      netstat -ano | findstr :3000
    """
  }
}


  }

  post {
    success { echo '✅ 빌드 성공!' }
    failure { echo '❌ 빌드 실패!' }
    cleanup { cleanWs() }
  }
}
