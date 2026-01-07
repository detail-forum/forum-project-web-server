pipeline {
    agent any

    options {
        timestamps()
    }

    environment {
        // 배포 경로
        DEPLOY_ROOT     = 'C:\\deploy\\forum'
        DEPLOY_BACKEND  = 'C:\\deploy\\forum\\backend'
        DEPLOY_FRONTEND = 'C:\\deploy\\forum\\frontend'

        // NSSM 경로
        NSSM = 'C:\\nssm\\nssm.exe'

        // Next.js 텔레메트리 비활성화
        NEXT_TELEMETRY_DISABLED = '1'
        
        // 프론트엔드 API URL (HTTPS)
        NEXT_PUBLIC_API_URL = 'https://forum.rjsgud.com/api'
    }

    stages {

        /* =========================
           1. Git Checkout
        ========================= */
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        /* =========================
           2. Frontend Build (Next.js)
        ========================= */
        stage('Frontend Build') {
            steps {
                dir('forum_front') {
                    powershell '''
                        Write-Host "===== Frontend Build =====" -ForegroundColor Cyan
                        Write-Host ""
                        
                        Write-Host "Node.js version:" -ForegroundColor Yellow
                        node -v
                        Write-Host "npm version:" -ForegroundColor Yellow
                        npm -v
                        Write-Host ""
                        
                        Write-Host "Installing dependencies..." -ForegroundColor Yellow
                        npm ci
                        if ($LASTEXITCODE -ne 0) {
                            Write-Host "[ERROR] npm ci failed!" -ForegroundColor Red
                            exit 1
                        }
                        Write-Host ""
                        
                        Write-Host "Building Next.js application..." -ForegroundColor Yellow
                        Write-Host "API URL: $env:NEXT_PUBLIC_API_URL" -ForegroundColor Cyan
                        npm run build
                        if ($LASTEXITCODE -ne 0) {
                            Write-Host "[ERROR] npm run build failed!" -ForegroundColor Red
                            exit 1
                        }
                        Write-Host ""
                        
                        Write-Host "Verifying build output..." -ForegroundColor Yellow
                        if (-not (Test-Path ".next")) {
                            Write-Host "[ERROR] .next directory not found after build!" -ForegroundColor Red
                            Get-ChildItem
                            exit 1
                        }
                        Write-Host ""
                        Write-Host "Frontend build completed successfully" -ForegroundColor Green
                    '''
                }
            }
        }



        /* =========================
           3. Backend Build (Spring)
        ========================= */
        stage('Backend Build') {
            steps {
                dir('forum_server') {
                    bat '''
                        echo ===== Backend Build =====
                        gradlew.bat clean build -x test
                    '''
                }
            }
        }

        /* =========================
           4. Copy Artifacts
           - frontend: 전체 소스 + .next + node_modules
           - backend : 실행 JAR (plain JAR 제외)
        ========================= */
stage('Copy Artifacts') {
    steps {
        bat '''
            echo ===== Stop Services =====
            "%NSSM%" stop forum-backend
            "%NSSM%" stop forum-frontend

            ping 127.0.0.1 -n 5 > nul

            echo ===== Copy Artifacts =====
            if not exist "%DEPLOY_BACKEND%"  mkdir "%DEPLOY_BACKEND%"
            if not exist "%DEPLOY_FRONTEND%" mkdir "%DEPLOY_FRONTEND%"

            echo --- Backend JAR ---
            REM 기존 JAR 파일 삭제 (잠금 방지)
            if exist "%DEPLOY_BACKEND%\\app.jar" (
                echo Deleting old JAR file...
                del /F /Q "%DEPLOY_BACKEND%\\app.jar"
                ping 127.0.0.1 -n 2 > nul
            )
            
            REM plain JAR 제외하고 실행 가능한 JAR만 복사
            if exist "forum_server\\build\\libs\\api_practice-0.0.1-SNAPSHOT.jar" (
                echo Copying JAR file...
                copy /Y "forum_server\\build\\libs\\api_practice-0.0.1-SNAPSHOT.jar" "%DEPLOY_BACKEND%\\app.jar"
                
                REM 복사 확인
                if exist "%DEPLOY_BACKEND%\\app.jar" (
                    echo [OK] Backend JAR copied successfully
                    echo Verifying JAR file...
                    dir "%DEPLOY_BACKEND%\\app.jar"
                ) else (
                    echo [ERROR] JAR file copy failed!
                    exit /b 1
                )
            ) else (
                echo [ERROR] Backend JAR file not found!
                echo Checking build directory...
                dir "forum_server\\build\\libs\\"
                exit /b 1
            )

            echo --- Frontend Source ---
            REM 빌드 결과물 확인
            if not exist "forum_front\\.next" (
                echo [ERROR] .next directory not found! Frontend build may have failed.
                exit /b 1
            )
            if not exist "forum_front\\node_modules" (
                echo [ERROR] node_modules not found! npm ci may have failed.
                exit /b 1
            )

            rmdir /S /Q "%DEPLOY_FRONTEND%"
            mkdir "%DEPLOY_FRONTEND%"

            REM 필수 파일 및 디렉토리 복사
            echo Copying .next directory...
            xcopy /E /I /Y forum_front\\.next "%DEPLOY_FRONTEND%\\.next"
            if %ERRORLEVEL% NEQ 0 (
                echo [ERROR] Failed to copy .next directory
                exit /b 1
            )

            echo Copying public directory...
            xcopy /E /I /Y forum_front\\public "%DEPLOY_FRONTEND%\\public"

            echo Copying node_modules...
            xcopy /E /I /Y forum_front\\node_modules "%DEPLOY_FRONTEND%\\node_modules"
            if %ERRORLEVEL% NEQ 0 (
                echo [ERROR] Failed to copy node_modules
                exit /b 1
            )

            echo Copying configuration files...
            copy /Y forum_front\\package.json "%DEPLOY_FRONTEND%\\package.json"
            copy /Y forum_front\\package-lock.json "%DEPLOY_FRONTEND%\\package-lock.json" 2>nul
            if exist forum_front\\next.config.js copy /Y forum_front\\next.config.js "%DEPLOY_FRONTEND%\\next.config.js"
            if exist forum_front\\tsconfig.json copy /Y forum_front\\tsconfig.json "%DEPLOY_FRONTEND%\\tsconfig.json"
            if exist forum_front\\tailwind.config.js copy /Y forum_front\\tailwind.config.js "%DEPLOY_FRONTEND%\\tailwind.config.js"
            if exist forum_front\\postcss.config.js copy /Y forum_front\\postcss.config.js "%DEPLOY_FRONTEND%\\postcss.config.js"

            echo Copying source directories...
            xcopy /E /I /Y forum_front\\app "%DEPLOY_FRONTEND%\\app"
            xcopy /E /I /Y forum_front\\components "%DEPLOY_FRONTEND%\\components"
            xcopy /E /I /Y forum_front\\services "%DEPLOY_FRONTEND%\\services"
            xcopy /E /I /Y forum_front\\store "%DEPLOY_FRONTEND%\\store"
            xcopy /E /I /Y forum_front\\types "%DEPLOY_FRONTEND%\\types"
            xcopy /E /I /Y forum_front\\utils "%DEPLOY_FRONTEND%\\utils"

            echo Frontend artifacts copied successfully
        '''
    }
}

        /* =========================
           5. Restart Services (NSSM)
        ========================= */
stage('Restart Services (NSSM)') {
    steps {
        bat '''
            echo ===== Restart Services =====
            
            REM 백엔드 JAR 파일 확인
            echo Verifying backend JAR file before restart...
            if exist "%DEPLOY_BACKEND%\\app.jar" (
                echo [OK] JAR file exists
                dir "%DEPLOY_BACKEND%\\app.jar"
            ) else (
                echo [ERROR] JAR file not found at %DEPLOY_BACKEND%\\app.jar
                exit /b 1
            )
            
            REM NSSM 서비스 경로 확인
            echo Checking NSSM service configuration...
            "%NSSM%" get forum-backend Application
            "%NSSM%" get forum-backend AppParameters
            
            REM Backend 재시작
            echo Restarting backend service...
            "%NSSM%" restart forum-backend
            if %ERRORLEVEL% NEQ 0 (
                echo [WARN] Backend restart may have failed, trying start...
                "%NSSM%" start forum-backend
            )
            
            REM 백엔드 시작 확인 및 로그 출력
            echo Checking backend service status...
            "%NSSM%" status forum-backend
            echo.
            echo Backend service logs (if available):
            if exist "%DEPLOY_BACKEND%\\logs\\spring.log" (
                powershell "Get-Content '%DEPLOY_BACKEND%\\logs\\spring.log' -Tail 30 -ErrorAction SilentlyContinue"
            ) else (
                echo [INFO] Log file not found at %DEPLOY_BACKEND%\\logs\\spring.log
                echo Checking NSSM log directory...
                if exist "C:\\nssm\\logs\\forum-backend" (
                    echo NSSM log directory exists
                ) else (
                    echo NSSM log directory not found
                )
            )

            REM Frontend 시작
            echo Starting frontend service...
            "%NSSM%" start forum-frontend
            if %ERRORLEVEL% NEQ 0 (
                echo [ERROR] Failed to start frontend service!
                echo Checking frontend directory...
                dir "%DEPLOY_FRONTEND%"
                exit /b 1
            )

            echo Waiting for services to start...
            ping 127.0.0.1 -n 6 > nul

            echo ===== Service Status Check =====
            echo Checking backend service...
            "%NSSM%" status forum-backend
            netstat -ano | findstr :8081 && echo [OK] Backend(8081) is running || echo [WARN] Backend(8081) not started - Service may be starting...
            echo.
            echo Checking frontend service...
            "%NSSM%" status forum-frontend
            netstat -ano | findstr :3000 && echo [OK] Frontend(3000) is running || echo [WARN] Frontend(3000) not started
            
            REM Frontend가 시작되지 않았으면 로그 확인
            if not exist "%DEPLOY_FRONTEND%\\.next" (
                echo [ERROR] .next directory missing in deploy folder!
            )
            if not exist "%DEPLOY_FRONTEND%\\node_modules" (
                echo [ERROR] node_modules missing in deploy folder!
            )
        '''
    }
}
    }

    post {
        success {
            echo '✅ Build & Deploy SUCCESS'
        }
        failure {
            echo '❌ Build FAILED'
        }
        cleanup {
            cleanWs()
        }
    }
}
