// 쿠버네티스 CI: ci 네임스페이스에 빌드 Pod를 띄워 이미지를 만들고 포럼 Deployment만 교체한다.
// 클러스터 준비는 k8s/ci.yaml과 k8s/README.md를 따른다.
pipeline {
    agent {
        kubernetes {
            namespace 'ci'
            defaultContainer 'buildkit'
            yaml '''
apiVersion: v1
kind: Pod
spec:
  serviceAccountName: forum-deployer
  containers:
    - name: buildkit
      image: moby/buildkit:v0.34.2-rootless
      command: [cat]
      tty: true
      env:
        - name: BUILDKITD_FLAGS
          value: --oci-worker-no-process-sandbox
      securityContext:
        runAsUser: 1000
        runAsGroup: 1000
        seccompProfile:
          type: Unconfined
        appArmorProfile:
          type: Unconfined
    - name: kubectl
      image: alpine/k8s:1.37.1
      command: [cat]
      tty: true
'''
        }
    }

    // 웹훅 대신 폴링: Jenkins를 인터넷에 열지 않아도 main push를 잡는다.
    triggers {
        pollSCM('H/5 * * * *')
    }

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 40, unit: 'MINUTES')
    }

    environment {
        PUSH_REGISTRY = 'registry.ci.svc.cluster.local:5000'
        // 노드의 containerd가 이미지를 받는 주소. 같은 레지스트리를 hostPort로 연다.
        PULL_REGISTRY = 'localhost:5000'
    }

    stages {
        stage('Images') {
            steps {
                script {
                    env.TAG = env.GIT_COMMIT.take(12)
                }
                // 백엔드 이미지 빌드 단계에서 테스트가 돈다.
                sh '''
                    buildctl-daemonless.sh build --frontend dockerfile.v0 \
                      --local context=forum_server --local dockerfile=forum_server \
                      --output type=image,name=$PUSH_REGISTRY/forum-backend:$TAG,push=true,registry.insecure=true
                '''
                withCredentials([string(credentialsId: 'giphy-api-key', variable: 'GIPHY_API_KEY')]) {
                    sh '''
                        buildctl-daemonless.sh build --frontend dockerfile.v0 \
                          --local context=forum_front --local dockerfile=forum_front \
                          --opt build-arg:NEXT_PUBLIC_GIPHY_API_KEY=$GIPHY_API_KEY \
                          --output type=image,name=$PUSH_REGISTRY/forum-frontend:$TAG,push=true,registry.insecure=true
                    '''
                }
            }
        }

        // 서비스 전체 e2e. 방금 만든 백엔드 이미지를 MySQL·Mailpit과 한 파드에 띄우고 Playwright가 localhost로 붙는다.
        // 실패하면 배포하지 않는다. 로컬에서는 forum_front에서 npm run test:e2e (docker compose 사용).
        stage('E2E') {
            steps {
                script {
                    podTemplate(namespace: 'ci', yaml: """
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: playwright
      image: mcr.microsoft.com/playwright:v1.65.1-noble
      command: [cat]
      tty: true
    - name: mysql
      image: mysql:8.4
      env:
        - { name: MYSQL_ROOT_PASSWORD, value: e2e-root }
        - { name: MYSQL_DATABASE, value: forum }
        - { name: MYSQL_USER, value: forum }
        - { name: MYSQL_PASSWORD, value: forum-e2e }
    - name: mailpit
      image: axllent/mailpit
      env:
        - { name: MP_SMTP_AUTH_ACCEPT_ANY, value: "1" }
        - { name: MP_SMTP_AUTH_ALLOW_INSECURE, value: "1" }
    - name: backend
      image: ${env.PULL_REGISTRY}/forum-backend:${env.TAG}
      # 파드 안 컨테이너는 동시에 뜬다. DB가 열리기 전에 Spring이 시작하면 죽으므로 기다린다.
      command: [bash, -c, 'until </dev/tcp/127.0.0.1/3306; do sleep 2; done; sleep 5; exec java -jar /app/app.jar']
      env:
        - { name: DB_URL, value: "jdbc:mysql://127.0.0.1:3306/forum?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Seoul&characterEncoding=UTF-8" }
        - { name: DB_USERNAME, value: forum }
        - { name: DB_PASSWORD, value: forum-e2e }
        - { name: JWT_SECRET, value: e2e-only-jwt-secret-at-least-32-bytes-long }
        - { name: MAIL_USERNAME, value: noreply@forum.test }
        - { name: MAIL_PASSWORD, value: e2e }
        - { name: APP_BASE_URL, value: "http://localhost:3100" }
        - { name: CORS_ALLOWED_ORIGINS, value: "http://localhost:3100" }
        - { name: APP_UPLOAD_DIR, value: /tmp/uploads }
        - { name: APP_RATE_LIMIT_ENABLED, value: "false" }
        - name: SPRING_APPLICATION_JSON
          value: '{"spring.mail.host":"127.0.0.1","spring.mail.port":1025,"spring.mail.properties.mail.smtp.starttls.enable":false,"spring.mail.properties.mail.smtp.starttls.required":false}'
""") {
                        node(POD_LABEL) {
                            checkout scm
                            container('playwright') {
                                sh '''
                                    cd forum_front
                                    npm ci
                                    E2E_BACKEND=external E2E_API_URL=http://localhost:8081 E2E_MAILPIT_URL=http://localhost:8025 CI=1 \
                                      npx playwright test
                                '''
                            }
                        }
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                container('kubectl') {
                    sh '''
                        for app in forum-backend forum-frontend; do
                          kubectl -n apps set image deploy/$app "*=$PULL_REGISTRY/$app:$TAG"
                        done
                        for app in forum-backend forum-frontend; do
                          kubectl -n apps rollout status deploy/$app --timeout=300s
                        done
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "배포 완료: ${env.TAG}"
        }
        failure {
            echo '빌드 또는 배포 실패. 배포 단계에서 실패했다면: kubectl -n apps rollout undo deploy/<앱>'
        }
    }
}
