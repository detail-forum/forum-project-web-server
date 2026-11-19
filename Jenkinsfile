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
