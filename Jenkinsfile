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
                    bat '''
                        echo ===== Frontend Build =====
                        node -v
                        npm -v

                        npm ci
                        npm run build
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
           - frontend: 전체 소스 + .next
           - backend : 실행 JAR
        ========================= */
        stage('Copy Artifacts') {
            steps {
                bat '''
                    echo ===== Copy Artifacts =====

                    if not exist "%DEPLOY_BACKEND%"  mkdir "%DEPLOY_BACKEND%"
                    if not exist "%DEPLOY_FRONTEND%" mkdir "%DEPLOY_FRONTEND%"

                    echo --- Backend JAR ---
                    for %%f in (forum_server\\build\\libs\\*-SNAPSHOT.jar) do (
                        copy /Y "%%f" "%DEPLOY_BACKEND%\\app.jar"
                    )

                    echo --- Frontend Source ---
                    rmdir /S /Q "%DEPLOY_FRONTEND%"
                    mkdir "%DEPLOY_FRONTEND%"

                    xcopy /E /I /Y forum_front "%DEPLOY_FRONTEND%"
                '''
            }
        }

        /* =========================
           5. Restart Services (NSSM)
        ========================= */
        stage('Restart Services (NSSM)') {
            steps {
                bat '''
                    echo ===== Restart NSSM Services =====

                    "%NSSM%" restart forum-backend
                    "%NSSM%" restart forum-frontend

                    REM Jenkins-safe wait
                    ping 127.0.0.1 -n 6 > nul
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
