# 포럼 쿠버네티스 CI

`main`에 push하면 Jenkins가 5분 안에 알아채고 다음을 한다.

1. `ci` 네임스페이스에 빌드 Pod를 띄운다 (BuildKit rootless + kubectl).
2. `forum_server/Dockerfile`로 백엔드 이미지를 만든다. 이 단계에서 테스트가 돈다.
3. `forum_front/Dockerfile`로 프론트 이미지를 만든다.
4. 두 이미지를 커밋 해시 태그로 클러스터 레지스트리에 올린다.
5. `apps/forum-backend`, `apps/forum-frontend`의 이미지를 바꾸고 롤아웃이 끝날 때까지 기다린다.

빌드 Pod는 포럼 Deployment 두 개의 이미지만 바꿀 수 있다. 노드의 containerd 소켓은 쓰지 않는다.

## 처음 한 번 준비 (홈서버 WSL)

```bash
# 1. 레지스트리, 네임스페이스, 권한
kubectl apply -f k8s/ci.yaml

# 2. Jenkins가 위 권한을 쓰게 한다 (C:\deploy\k8s\manifests\jenkins.yaml에도 같은 줄을 넣는다)
kubectl -n apps patch deploy jenkins -p '{"spec":{"template":{"spec":{"serviceAccountName":"jenkins"}}}}'

# 3. 포럼 Deployment가 레지스트리에서 이미지를 받게 한다
for app in forum-backend forum-frontend; do
  kubectl -n apps patch deploy $app --type json \
    -p '[{"op":"replace","path":"/spec/template/spec/containers/0/imagePullPolicy","value":"IfNotPresent"}]'
done
```

4. Jenkins → Plugins에서 **Kubernetes** 플러그인을 설치하고 재시작한다.
5. Jenkins → Clouds → New cloud → Kubernetes:
   - Kubernetes URL: 비움 (클러스터 안 설정 사용)
   - Kubernetes Namespace: `ci`
   - Jenkins URL: `http://jenkins.apps.svc.cluster.local:8080`
   - WebSocket: 체크
6. `forum_pj` 작업을 한 번 수동으로 실행한다. 이후는 폴링으로 돈다.

## 되돌리기

```bash
kubectl -n apps rollout undo deploy/forum-backend
kubectl -n apps rollout undo deploy/forum-frontend
```

## 주의

- `C:\deploy\k8s\manifests\apps.yaml`을 다시 적용하면 이미지가 `local/...:1`로, pull 정책이 `Never`로 돌아가고 메일 설정(`forum-mail` Secret)도 빠진다. 다시 적용하기 전에 그 파일을 지금 상태에 맞춘다.
- 노드의 containerd는 `localhost:5000`을 따로 설정하지 않아도 HTTP로 받는다 (2026-11-19 확인).
