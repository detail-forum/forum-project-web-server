pipeline {
  agent any

  options {
    skipDefaultCheckout(true)
    timestamps()
  }

  environment {
    // 프로젝트 소스 경로 (GitHub에서 체크아웃되는 경로)
    PROJECT_ROOT = 'C:\\Users\\rjsgud49\\Documents\\GitHub\\forum-project'
    
    // 배포 경로
    DEPLOY_ROOT = 'C:\\deploy\\forum'
    DEPLOY_BACKEND_DIR = 'C:\\deploy\\forum\\backend'
    DEPLOY_FRONT_DIR   = 'C:\\deploy\\forum\\frontend'

    // Nginx 경로 (실제 경로에 맞게 수정 필요, PATH에 있으면 빈 값으로 두기)
    NGINX_HOME = ''

    // Next.js telemetry 끄기
    NEXT_TELEMETRY_DISABLED = '1'
  }

  stages {
    stage('Checkout') {
      steps {
        script {
          echo 'GitHub에서 소스 코드 체크아웃 중...'
          checkout scm
        }
      }
    }

    stage('환경 설정') {
      steps {
        bat '''
          echo ===== 환경 확인 =====
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
            echo ===== 프론트엔드 의존성 설치 =====
            call npm ci
            
            echo ===== 프론트엔드 빌드 =====
            call npm run build
          '''
        }
      }
    }

    stage('백엔드 빌드') {
      steps {
        dir('forum_server') {
          bat '''
            echo ===== 백엔드 빌드 =====
            call gradlew.bat clean build -x test
          '''
        }
      }
    }

    stage('테스트 실행') {
      steps {
        dir('forum_server') {
          bat '''
            echo ===== 백엔드 테스트 실행 =====
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

    stage('배포 디렉토리 준비') {
      steps {
        bat """
          echo ===== 배포 디렉토리 생성 =====
          if not exist "${DEPLOY_ROOT}" mkdir "${DEPLOY_ROOT}"
          if not exist "${DEPLOY_BACKEND_DIR}" mkdir "${DEPLOY_BACKEND_DIR}"
          if not exist "${DEPLOY_FRONT_DIR}" mkdir "${DEPLOY_FRONT_DIR}"
        """
      }
    }

    stage('아티팩트 복사') {
      steps {
        bat """
          echo ===== 빌드 결과물 복사 =====
          
          REM 백엔드 JAR 파일 복사 (plain JAR 제외하고 실행 가능한 JAR만 복사)
          echo 백엔드 JAR 복사 중...
          if exist "forum_server\\build\\libs\\api_practice-0.0.1-SNAPSHOT.jar" (
            copy /Y "forum_server\\build\\libs\\api_practice-0.0.1-SNAPSHOT.jar" "${DEPLOY_BACKEND_DIR}\\app.jar"
            echo Copied: api_practice-0.0.1-SNAPSHOT.jar to app.jar
          ) else (
            echo [ERROR] JAR 파일을 찾을 수 없습니다!
            exit /b 1
          )
          
          REM 프론트엔드 빌드 결과 복사
          echo 프론트엔드 빌드 결과 복사 중...
          
          REM .next 디렉토리 복사
          if exist "forum_front\\.next" (
            xcopy /E /I /Y /Q "forum_front\\.next" "${DEPLOY_FRONT_DIR}\\.next\\"
          )
          
          REM public 디렉토리 복사
          if exist "forum_front\\public" (
            xcopy /E /I /Y /Q "forum_front\\public" "${DEPLOY_FRONT_DIR}\\public\\"
          )
          
          REM 필수 설정 파일 복사
          copy /Y "forum_front\\package.json" "${DEPLOY_FRONT_DIR}\\package.json"
          if exist "forum_front\\next.config.js" (
            copy /Y "forum_front\\next.config.js" "${DEPLOY_FRONT_DIR}\\next.config.js"
          )
          if exist "forum_front\\tsconfig.json" (
            copy /Y "forum_front\\tsconfig.json" "${DEPLOY_FRONT_DIR}\\tsconfig.json"
          )
          
          echo 복사 완료!
        """
      }
    }

    stage('배포') {
      steps {
        bat """
          echo ===== 배포 시작 =====
          
          REM 1) 기존 백엔드(8081) 프로세스 종료
          echo [1/6] 기존 백엔드 프로세스 종료 중...
          for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8081 ^| findstr LISTENING') do (
            echo 종료할 PID: %%a
            taskkill /F /PID %%a 2>nul || echo PID %%a 종료 실패 또는 이미 종료됨
          )
          REM 대기 (ping을 사용하여 2초 대기)
          ping 127.0.0.1 -n 3 >nul
          
          REM 2) 기존 프론트엔드(3000) 프로세스 종료
          echo [2/6] 기존 프론트엔드 프로세스 종료 중...
          for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
            echo 종료할 PID: %%a
            taskkill /F /PID %%a 2>nul || echo PID %%a 종료 실패 또는 이미 종료됨
          )
          REM 대기 (ping을 사용하여 2초 대기)
          ping 127.0.0.1 -n 3 >nul
          
          REM 3) 백엔드 재실행 (백그라운드)
          echo [3/6] 백엔드 서버 시작 중...
          if not exist "${DEPLOY_BACKEND_DIR}\\logs" mkdir "${DEPLOY_BACKEND_DIR}\\logs"
          cd /d "${DEPLOY_BACKEND_DIR}"
          start "forum-backend" /B cmd /c "java -jar app.jar > logs\\backend.log 2>&1"
          REM 대기 (ping을 사용하여 5초 대기)
          ping 127.0.0.1 -n 6 >nul
          
          REM 4) 프론트엔드 재실행 (백그라운드)
          echo [4/6] 프론트엔드 서버 시작 중...
          if not exist "${DEPLOY_FRONT_DIR}\\logs" mkdir "${DEPLOY_FRONT_DIR}\\logs"
          cd /d "${DEPLOY_FRONT_DIR}"
          REM 프로덕션 의존성만 설치 (node_modules가 없는 경우)
          if not exist "node_modules" (
            echo node_modules 설치 중...
            call npm install --omit=dev --production
          )
          start "forum-frontend" /B cmd /c "npm run start -- -p 3000 > logs\\frontend.log 2>&1"
          REM 대기 (ping을 사용하여 5초 대기)
          ping 127.0.0.1 -n 6 >nul
          
          REM 5) Nginx 설정 테스트 및 리로드
          echo [5/6] Nginx 설정 확인 및 리로드 중...
          REM 먼저 PATH에서 Nginx 찾기
          where nginx.exe >nul 2>&1
          if %ERRORLEVEL% EQU 0 (
            REM Nginx가 PATH에 있는 경우
            nginx.exe -t >nul 2>&1
            if %ERRORLEVEL% EQU 0 (
              nginx.exe -s reload
              echo Nginx 리로드 완료
            ) else (
              echo [WARN] Nginx 설정 파일에 오류가 있습니다. 계속 진행합니다.
            )
          ) else (
            REM PATH에 없으면 환경 변수 경로 확인
            if not "${NGINX_HOME}"=="" (
              if exist "${NGINX_HOME}\\nginx.exe" (
                cd /d "${NGINX_HOME}"
                nginx.exe -t >nul 2>&1
                if %ERRORLEVEL% EQU 0 (
                  nginx.exe -s reload
                  echo Nginx 리로드 완료
                ) else (
                  echo [WARN] Nginx 설정 파일에 오류가 있습니다. 계속 진행합니다.
                )
              ) else (
                echo [INFO] Nginx를 찾을 수 없습니다. Nginx 리로드를 건너뜁니다.
              )
            ) else (
              echo [INFO] Nginx 경로가 설정되지 않았습니다. Nginx 리로드를 건너뜁니다.
            )
          )
          
          REM 6) 포트 상태 확인
          echo [6/6] 서비스 상태 확인 중...
          REM 대기 (ping을 사용하여 3초 대기)
          ping 127.0.0.1 -n 4 >nul
          netstat -ano | findstr :8081 && echo [OK] 백엔드(8081) 실행 중 || echo [WARN] 백엔드(8081) 아직 시작되지 않음
          netstat -ano | findstr :3000 && echo [OK] 프론트엔드(3000) 실행 중 || echo [WARN] 프론트엔드(3000) 아직 시작되지 않음
          
          echo ===== 배포 완료 =====
        """
      }
    }
  }

  post {
    always {
      script {
        echo '빌드 파이프라인 완료'
      }
    }
    success {
      echo '✅ 빌드 및 배포 성공!'
    }
    failure {
      echo '❌ 빌드 또는 배포 실패!'
    }
    cleanup {
      cleanWs()
    }
  }
}