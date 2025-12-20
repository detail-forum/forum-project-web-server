pipeline {
    agent any
    
    environment {
        // Node.js 버전 (필요시 조정)
        NODE_VERSION = '20'
        // Java 버전
        JAVA_VERSION = '21'
        // Gradle 버전
        GRADLE_VERSION = '8.5'
    }
    
    stages {
        stage('Checkout') {
            steps {
                script {
                    echo '소스 코드 체크아웃 중...'
                    checkout scm
                }
            }
        }
        
        stage('환경 설정') {
            steps {
                script {
                    echo '빌드 환경 확인 중...'
                    // Node.js 버전 확인
                    bat '''
                        node --version
                        npm --version
                    '''
                    // Java 버전 확인
                    bat '''
                        java -version
                    '''
                    // Gradle 버전 확인
                    bat '''
                        cd forum_server
                        gradlew.bat --version
                    '''
                }
            }
        }
        
        stage('프론트엔드 빌드') {
            steps {
                dir('forum_front') {
                    script {
                        echo '프론트엔드 의존성 설치 중...'
                        bat '''
                            call npm install
                        '''
                        
                        echo '프론트엔드 빌드 중...'
                        bat '''
                            call npm run build
                        '''
                    }
                }
            }
        }
        
        stage('백엔드 빌드') {
            steps {
                dir('forum_server') {
                    script {
                        echo '백엔드 빌드 중...'
                        bat '''
                            call gradlew.bat clean build -x test
                        '''
                    }
                }
            }
        }
        
        stage('테스트 실행') {
            steps {
                dir('forum_server') {
                    script {
                        echo '백엔드 테스트 실행 중...'
                        bat '''
                            call gradlew.bat test
                        '''
                    }
                }
            }
            post {
                always {
                    // 테스트 결과 리포트 저장
                    junit 'forum_server/build/test-results/test/*.xml'
                }
            }
        }
        
        stage('아티팩트 생성') {
            steps {
                script {
                    echo '빌드 아티팩트 수집 중...'
                    // 프론트엔드 빌드 결과
                    archiveArtifacts artifacts: 'forum_front/.next/**', fingerprint: true, allowEmptyArchive: true
                    // 백엔드 JAR 파일
                    archiveArtifacts artifacts: 'forum_server/build/libs/*.jar', fingerprint: true, allowEmptyArchive: false
                }
            }
        }
        
        stage('배포') {
            when {
                anyOf {
                    branch 'main'
                    branch 'master'
                }
            }
            steps {
                script {
                    echo '배포 준비 중...'
                    // 여기에 실제 배포 스크립트를 추가하세요
                    // 예: 서버로 파일 복사, 서비스 재시작 등
                    bat '''
                        echo 배포 스크립트를 여기에 추가하세요
                        REM 예시:
                        REM xcopy forum_server\\build\\libs\\*.jar C:\\deploy\\ /Y
                        REM net stop YourServiceName
                        REM net start YourServiceName
                    '''
                }
            }
        }
    }
    
    post {
        always {
            script {
                echo '빌드 완료 - 결과 정리 중...'
            }
        }
        success {
            script {
                echo '✅ 빌드 성공!'
            }
        }
        failure {
            script {
                echo '❌ 빌드 실패!'
            }
        }
        cleanup {
            // 빌드 후 정리 작업
            cleanWs()
        }
    }
}