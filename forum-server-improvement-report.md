# forum-project-web-server 개선 보고서

저장소: [detail-forum/forum-project-web-server](https://github.com/detail-forum/forum-project-web-server)  
기준 브랜치: `main`  
형제 앱: `detail-forum/forum-project-app` (이 서버의 API를 소비). 이 저장소 안의 `forum_front`도 같은 계약을 사용한다.  
API 경로, 성공 응답 필드, 로그인 응답(`accessToken`, `refreshToken`)은 유지했다.

## 1. 처음 본 프로젝트

개발자 커뮤니티용 게시판이다. 게시글, 댓글, 좋아요, 팔로우, 모임, 1:1 채팅, STOMP 웹소켓, 이메일 인증, 알림을 제공한다.

| 구분 | 내용 |
| --- | --- |
| 서버 | `forum_server`. Spring Boot 3.5.5, Java 21, Gradle, Spring Security + JWT, Spring Data JPA, MySQL, WebSocket(STOMP), SpringDoc |
| 프론트 | `forum_front`. Next.js 14, TypeScript, Redux, Axios. 이 작업의 대상은 서버 계약이다 |
| 실행 | 서버 `forum_server`에서 `./gradlew bootRun` (포트 8081). 프론트 `npm run dev` (포트 3000) |
| 배포 | Jenkins가 프론트를 빌드하고 `gradlew.bat clean build`로 JAR을 만들어 NSSM 서비스로 띄운다. Nginx가 `https://forum.rjsgud.com`에서 `/api`를 백엔드로 넘긴다 |
| 테스트 | 시작 시점에는 `ApiPracticeApplicationTests.contextLoads`만 있었고, 로컬 MySQL이 없으면 실패했다. Jenkins는 `-x test`로 테스트를 빼 두고 있었다 |

인증은 필터가 토큰을 넣기만 하고, `SecurityFilterChain`은 모든 요청을 `permitAll`한다. 쓰기 API는 서비스에서 `SecurityContext`를 직접 본다. 공개 글 조회는 비로그인으로 동작해야 해서, 이 구조 자체를 한 번에 잠그지는 않았다.

## 2. 반영한 변경

모두 `main`에 머지했다. 각 브랜치에서 `forum_server`의 `./gradlew test`가 통과한 뒤에 머지했다.

### 테스트가 MySQL 없이 돌게 함

- 브랜치: `cursor/test-without-mysql-0d6f`
- PR: https://github.com/detail-forum/forum-project-web-server/pull/1
- 상태: 머지됨
- 내용: 테스트 클래스패스만 H2를 쓰도록 `src/test/resources/application.properties`를 추가했다. `gradlew` 실행 권한을 복구했다.
- 이유: 컨텍스트 테스트가 개발자 PC의 MySQL에 묶여 있어 회귀를 확인하기 어려웠다. 운영 데이터소스와 API는 바꾸지 않았다.

### DB, JWT, 메일 비밀값 분리

- 브랜치: `cursor/externalize-secrets-0d6f`
- PR: https://github.com/detail-forum/forum-project-web-server/pull/2
- 상태: 머지됨
- 내용: `application.properties`의 DB 비밀번호, JWT 서명 키, Gmail 계정은 환경 변수(`DB_PASSWORD`, `JWT_SECRET`, `MAIL_USERNAME`, `MAIL_PASSWORD`) 또는 gitignore된 `application-local.properties`로만 받는다. Hibernate SQL 파라미터 로그는 TRACE가 아니라 INFO다.
- 이유: 비밀값이 저장소에 있었고, TRACE 로그는 쿼리 바인딩 값까지 남긴다.
- 배포 전 필수: 이 커밋을 서비스에 올리기 전에 NSSM(또는 실행 환경)에 `DB_PASSWORD`와 `JWT_SECRET`을 넣어야 서버가 시작된다. 이미 발급된 토큰을 유지하려면 `JWT_SECRET`을 이전 값과 같게 둔다. git 이력에 남은 DB 비밀번호와 Gmail 앱 비밀번호는 폐기하고 새로 발급해야 한다. 이력 재작성(force push)은 하지 않았다.

### 예외 응답 상태 코드와 내부 정보

- 브랜치: `cursor/fix-exception-responses-0d6f`
- PR: https://github.com/detail-forum/forum-project-web-server/pull/3
- 상태: 머지됨
- 내용: `IllegalArgumentException`(비밀번호 불일치, 자기 자신 팔로우 등)은 404가 아니라 400이고 안내 문구는 같다. `IllegalStateException`(모임 가입 제한 등)은 500이 아니라 400이다. `NullPointerException`은 401이 아니라 500이다. `@Valid` 실패는 평문 대신 다른 API와 같은 `ApiResponse` JSON이다. 예상치 못한 예외의 `getMessage()`는 응답에서 빼 로그에만 남긴다.
- 이유: 프론트는 401/403에서 토큰 재발급 후 로그아웃한다. 서버 버그의 NPE가 로그아웃으로 보였고, 검증 실패 본문에 `message`가 없어 설정 화면이 원인을 표시하지 못했다.

### 사용자 응답에서 비밀번호와 인증 토큰 제거

- 브랜치: `cursor/hide-sensitive-user-fields-0d6f`
- PR: https://github.com/detail-forum/forum-project-web-server/pull/4
- 상태: 머지됨
- 내용: `GET /auth/me`가 `Users` 엔티티를 그대로 직렬화했다. `password`, `emailVerificationToken`에 `@JsonIgnore`를 붙였다.
- 이유: 비밀번호 해시와 일회용 인증 토큰이 응답에 포함됐다. 이 저장소 프론트의 `User` 타입에는 두 필드가 없어서, 클라이언트가 읽는 `id`, `username`, `nickname`, `email`, 프로필, 탈퇴 여부, 생성 시각은 그대로다.

### 리프레시 토큰을 API 인증에 쓰지 못하게 함

- 브랜치: `cursor/refresh-token-hardening-0d6f`
- PR: https://github.com/detail-forum/forum-project-web-server/pull/5
- 상태: 머지됨
- 내용: 새 JWT에 `typ=access|refresh`를 넣는다. 리프레시 토큰은 API 필터와 STOMP CONNECT에서 거부한다. `typ`이 없는 기존 액세스 토큰은 계속 인증된다. `typ`이 없어도 `refresh_token` 테이블에 있으면 액세스 토큰으로 쓰지 못한다. 로그아웃은 쿠키의 리프레시 토큰 행을 지운다. 탈퇴했거나 조회되지 않는 사용자는 재발급이 401이다. 새 행에 nullable `user_id`를 저장하고 탈퇴 시 그 사용자의 토큰을 지운다. `GET /auth/verify`는 액세스 토큰이 유효하면 같은 토큰을, 아니면 리프레시로 재발급한 `LoginResponse`를 반환한다. 재발급 쿠키에도 `SameSite=Lax`를 붙였다. HTTPS에서는 `APP_COOKIE_SECURE=true`로 Secure 쿠키를 켤 수 있고 기본값은 false다.
- 이유: 두 토큰의 형식이 같아 탈취된 리프레시 토큰으로 7일간 API에 인증할 수 있었고, 로그아웃은 쿠키만 지웠다. 로그인 응답 필드는 그대로다. 프론트 JWT 유틸은 `sub`와 `exp`만 본다.

### 이미지 업로드 경로 이탈 방지

- 브랜치: `cursor/image-upload-path-safety-0d6f`
- PR: https://github.com/detail-forum/forum-project-web-server/pull/6
- 상태: 머지됨
- 내용: 저장 확장자는 `image/jpeg|png|gif|webp`에서만 정하고, 매직 바이트가 맞을 때만 업로드 디렉터리 안에 저장한다. 삭제 경로도 같은 디렉터리 접두사인지 확인한다.
- 이유: 원본 파일명 확장자를 그대로 붙이면 `../`가 포함된 이름이 `Path.resolve`로 디렉터리를 벗어날 수 있다. 성공 시 URL은 계속 `/uploads/{uuid}.ext`다.

### 자격 증명 CORS에서 전체 출처 허용 제거

- 브랜치: `cursor/restrict-cors-origins-0d6f`
- PR: https://github.com/detail-forum/forum-project-web-server/pull/7
- 상태: 머지됨
- 내용: `allowCredentials(true)`와 함께 있던 `http://*`, `https://*`를 제거했다. 기본 출처는 `localhost:3000`, `127.0.0.1:3000`, 기존 서버 IP, `https://forum.rjsgud.com`, `https://www.forum.rjsgud.com`이다. 추가 출처는 `CORS_ALLOWED_ORIGINS`로 연다.
- 이유: 아무 사이트에서나 브라우저가 인증 쿠키를 실어 이 API를 호출할 수 있었다. 지금 쓰는 프론트 출처는 목록에 남겨 두었다.

### CI에서 백엔드 테스트 실행

- 브랜치: `cursor/run-backend-tests-in-ci-0d6f`
- PR: https://github.com/detail-forum/forum-project-web-server/pull/8
- 상태: 머지됨
- 내용: Jenkins 백엔드 스테이지의 `-x test`를 뺐다. `.github/workflows/backend-test.yml`이 `main` push와 pull request에서 Java 21로 `./gradlew test`를 실행한다.
- 이유: 테스트가 실패해도 배포가 진행됐다. GitHub Actions 러너 결과는 이 작업 환경에서 대신 실행하지 못했다. 로컬 `./gradlew test`는 서버 코드가 같은 상태에서 통과했다.

## 3. 고치지 않은 것

- **전역 `permitAll`**: 공개 글 목록과 인증이 필요한 쓰기가 한 체인에 있다. 서비스가 직접 인증을 검사한다. 매처를 한 번에 잠그면 비로그인 조회가 401이 될 수 있어 형제 앱과 경로를 맞춘 뒤에 하는 편이 안전하다. Swagger(`/swagger-ui.html`, `/api-docs`)도 같은 이유로 공개 상태다.
- **`ddl-auto=update`**: 배포가 스키마를 자동으로 고친다. `validate`로 바꾸려면 마이그레이션 절차가 먼저 필요하다. 이번 리프레시 토큰의 `user_id` 컬럼과 길이 512도 이 설정에 기대고 있다.
- **사용자 검색 응답의 이메일**: `UserInfoDTO`와 프론트 타입이 `email`을 포함한다. 빼면 검색/프로필 계약이 바뀐다.
- **업로드 파일 소유권**: 로그인한 사용자는 파일명만 알면 다른 사람의 이미지를 지울 수 있다. 경로 이탈은 막았고, 소유권은 업로드 메타데이터 테이블이 필요하다.
- **회원가입 비밀번호 최소 길이**: 변경 API만 6자 이상이다. 가입 정책을 코드에서 새로 정하지 않았다.
- **태그 필터 목록의 메모리 페이지네이션**: 일부 목록이 조회 후 정렬하고 자른다. 결과 순서와 페이지 크기가 지금 클라이언트에 맞춰져 있어, 쿼리로 내리는 작업은 별도 검증이 필요하다.
- **`ApplicationUnauthorizedException`이 403**: 프론트는 403도 재발급 신호로 본다. 401로 통일하면 동작이 비슷하지만, 403을 분기하는 클라이언트를 확인하지 못해 두지 않았다.
- **Nginx `/uploads/`의 `Access-Control-Allow-Origin *`**: 공개 이미지용이고 자격 증명 API와는 별개다.
- **액세스 쿠키 수명 1일, JWT 수명 1시간**: 프론트가 만료 전에 재발급한다. 쿠키 수명을 줄이면 재시작 직후 세션 복원 방식이 달라질 수 있다.
- **서비스마다 복붙된 `getCurrentUser`**: 동작 변경 없는 정리라 범위가 커서 이번 차례에서는 제외했다.

## 4. 다음에 할 일

1. 배포 전에 `DB_PASSWORD`, `JWT_SECRET`을 실행 환경에 넣고, 저장소에 노출됐던 DB 비밀번호와 Gmail 앱 비밀번호를 교체한다. `JWT_SECRET`을 바꾸면 기존 로그인 세션은 끊긴다.
2. 공개 GET과 인증이 필요한 쓰기를 나눠 `SecurityFilterChain`을 잠그고, Swagger는 운영에서 끈다. 형제 앱의 비로그인 화면과 같이 확인한다.
3. 업로드 파일 소유자만 삭제할 수 있게 메타데이터를 둔다.
4. 태그/검색 목록을 DB 페이지네이션으로 내려 메모리 적재를 줄인다.
5. 회원가입 비밀번호 규칙을 변경 API와 맞출지 정한다.
6. 사용자 검색에서 이메일을 빼도 되는지 `forum-project-app`과 맞춘다.

이 문서 자체는 `cursor/improvement-report-0d6f`, PR https://github.com/detail-forum/forum-project-web-server/pull/9 이다.

## 5. 검증

`forum_server`에서 `./gradlew test`가 통과했다. 추가한 테스트는 예외 상태 코드, 사용자 JSON에서 비밀번호/인증 토큰 제외, 액세스와 리프레시 토큰 구분, 리프레시 토큰의 필터 거부, 재발급 거부, 로그아웃 시 토큰 삭제, 이미지 확장자/매직 바이트/경로 이탈, CORS 기본 출처다. 브라우저로 운영 사이트에 로그인하는 검증은 이 환경에 운영 DB와 비밀값이 없어 하지 않았다.
