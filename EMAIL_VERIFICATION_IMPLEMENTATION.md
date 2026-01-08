# 이메일 인증 기능 구현 완료

이 문서는 rjsgud's forum 프로젝트에 추가된 이메일 인증 기능에 대한 구현 내용을 설명합니다.

## 구현 개요

회원가입 시 이메일 인증을 필수로 하며, 이메일 인증이 완료된 사용자만 로그인할 수 있도록 구현되었습니다.

## 구현된 기능

### 백엔드

1. **데이터베이스 스키마 변경**
   - `Users` 엔티티에 `emailVerified` (boolean) 필드 추가
   - `Users` 엔티티에 `emailVerificationToken` (String) 필드 추가
   - 마이그레이션 SQL 스크립트: `add_email_verification_fields.sql`

2. **이메일 발송 서비스**
   - `EmailService` 클래스 생성
   - Gmail SMTP를 통한 HTML 이메일 발송
   - 이메일 인증 링크 포함

3. **인증 로직**
   - 회원가입 시 이메일 인증 토큰 생성 및 이메일 발송
   - 이메일 인증 API 엔드포인트 (`/auth/verify-email`)
   - 이메일 인증 메일 재발송 API (`/auth/resend-verification`)
   - 로그인 시 이메일 인증 여부 확인

### 프론트엔드

1. **이메일 인증 페이지**
   - `/verify-email` 페이지 생성
   - 토큰을 통한 이메일 인증 처리
   - 성공/실패 상태 표시

2. **회원가입 플로우 변경**
   - 회원가입 후 자동 로그인 제거
   - 이메일 인증 안내 메시지 표시

3. **API 서비스**
   - `authApi.verifyEmail()` 메서드 추가
   - `authApi.resendVerificationEmail()` 메서드 추가

## 데이터베이스 마이그레이션

다음 SQL 스크립트를 실행하여 데이터베이스에 필드를 추가하세요:

```sql
-- email_verified 필드 추가 (기본값: false)
ALTER TABLE users 
ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE 
AFTER github_link;

-- email_verification_token 필드 추가
ALTER TABLE users 
ADD COLUMN email_verification_token VARCHAR(255) NULL 
AFTER email_verified;

-- 기존 사용자들의 이메일 인증 상태를 false로 설정
UPDATE users SET email_verified = FALSE WHERE email_verified IS NULL;

-- 인덱스 추가 (토큰 검색 성능 향상)
CREATE INDEX idx_email_verification_token ON users(email_verification_token);
```

**실행 방법:**
1. MySQL에 접속
2. `2025_gbsw_spring` 데이터베이스 선택
3. 위 SQL 스크립트 실행

또는 파일 경로: `forum_server/src/main/resources/add_email_verification_fields.sql`

## 설정 방법

### 1. Gmail 앱 비밀번호 생성

자세한 내용은 `GMAIL_SETUP_GUIDE.md` 파일을 참조하세요.

**요약:**
1. Google 계정에서 2단계 인증 활성화
2. 앱 비밀번호 생성 (16자리)
3. `application.properties`에 설정 추가

### 2. application.properties 설정

```properties
# 이메일 발송 설정 (Gmail SMTP)
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=your-email@gmail.com
spring.mail.password=your-app-password
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
spring.mail.properties.mail.smtp.starttls.required=true
spring.mail.properties.mail.smtp.connectiontimeout=5000
spring.mail.properties.mail.smtp.timeout=5000
spring.mail.properties.mail.smtp.writetimeout=5000

# 애플리케이션 기본 URL (이메일 인증 링크에 사용)
app.base-url=https://forum.rjsgud.com
```

**중요:** 
- `spring.mail.username`: Gmail 주소
- `spring.mail.password`: **앱 비밀번호** (일반 비밀번호 아님)
- `app.base-url`: 프론트엔드 URL

## 사용자 플로우

### 회원가입 플로우

1. 사용자가 회원가입 폼 작성
2. 회원가입 요청
3. 백엔드에서:
   - 사용자 정보 저장
   - 이메일 인증 토큰 생성
   - 이메일 인증 메일 발송
4. 프론트엔드에서:
   - "이메일을 확인하여 인증을 완료해주세요" 메시지 표시
   - 로그인 모드로 전환

### 이메일 인증 플로우

1. 사용자가 이메일에서 인증 링크 클릭
2. `/verify-email?token=xxx` 페이지로 이동
3. 백엔드에서:
   - 토큰 검증
   - 사용자의 `emailVerified`를 `true`로 변경
   - 토큰 제거 (일회용)
4. 프론트엔드에서:
   - 성공 메시지 표시
   - 3초 후 홈으로 리다이렉트

### 로그인 플로우

1. 사용자가 로그인 시도
2. 백엔드에서:
   - 아이디/비밀번호 확인
   - **이메일 인증 여부 확인** ← 새로 추가됨
   - 이메일 미인증 시 에러 반환
3. 프론트엔드에서:
   - 이메일 미인증 시 에러 메시지 표시
   - "이메일 인증이 완료되지 않았습니다" 메시지

## API 엔드포인트

### POST /api/auth/register
회원가입 (기존과 동일하지만 이메일 발송 추가)

**응답:**
```json
{
  "success": true,
  "message": "회원가입이 완료되었습니다. 이메일을 확인하여 인증을 완료해주세요."
}
```

### GET /api/auth/verify-email?token={token}
이메일 인증 처리

**응답:**
```json
{
  "success": true,
  "message": "이메일 인증이 완료되었습니다."
}
```

### POST /api/auth/resend-verification?email={email}
이메일 인증 메일 재발송

**응답:**
```json
{
  "success": true,
  "message": "인증 메일이 재발송되었습니다."
}
```

### POST /api/auth/login
로그인 (이메일 인증 여부 확인 추가)

**에러 응답 (이메일 미인증):**
```json
{
  "success": false,
  "message": "이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요."
}
```

## 변경된 파일 목록

### 백엔드

1. `forum_server/src/main/java/com/pgh/api_practice/entity/Users.java`
   - `emailVerified`, `emailVerificationToken` 필드 추가

2. `forum_server/src/main/java/com/pgh/api_practice/repository/AuthRepository.java`
   - `findByEmail()`, `findByEmailVerificationToken()` 메서드 추가

3. `forum_server/src/main/java/com/pgh/api_practice/service/AuthService.java`
   - 회원가입 시 이메일 인증 토큰 생성 및 발송
   - 로그인 시 이메일 인증 여부 확인
   - `verifyEmail()`, `resendVerificationEmail()` 메서드 추가

4. `forum_server/src/main/java/com/pgh/api_practice/service/EmailService.java` (신규)
   - 이메일 발송 서비스

5. `forum_server/src/main/java/com/pgh/api_practice/controller/AuthController.java`
   - `/auth/verify-email` 엔드포인트 추가
   - `/auth/resend-verification` 엔드포인트 추가

6. `forum_server/src/main/resources/application.properties`
   - Gmail SMTP 설정 추가

7. `forum_server/src/main/resources/add_email_verification_fields.sql` (신규)
   - 데이터베이스 마이그레이션 스크립트

8. `forum_server/build.gradle`
   - `spring-boot-starter-mail` 의존성 추가

### 프론트엔드

1. `forum_front/services/api.ts`
   - `authApi.verifyEmail()`, `authApi.resendVerificationEmail()` 메서드 추가

2. `forum_front/components/LoginModal.tsx`
   - 회원가입 후 자동 로그인 제거
   - 이메일 인증 안내 메시지 표시

3. `forum_front/app/verify-email/page.tsx` (신규)
   - 이메일 인증 처리 페이지

## 테스트 방법

1. **데이터베이스 마이그레이션 실행**
   ```sql
   -- add_email_verification_fields.sql 실행
   ```

2. **Gmail 설정**
   - `GMAIL_SETUP_GUIDE.md` 참조하여 앱 비밀번호 생성
   - `application.properties`에 설정 추가

3. **백엔드 재시작**
   ```bash
   cd forum_server
   ./gradlew bootRun
   ```

4. **회원가입 테스트**
   - 새 계정으로 회원가입
   - 등록한 이메일 주소로 인증 메일 확인
   - 이메일의 인증 링크 클릭
   - 인증 완료 확인

5. **로그인 테스트**
   - 이메일 미인증 상태에서 로그인 시도 → 에러 확인
   - 이메일 인증 후 로그인 시도 → 성공 확인

## 주의사항

1. **기존 사용자 처리**
   - 마이그레이션 후 기존 사용자들은 `emailVerified = false` 상태
   - 기존 사용자도 이메일 인증을 완료해야 로그인 가능
   - 필요시 관리자 도구로 기존 사용자 인증 상태 업데이트

2. **이메일 발송 실패**
   - 이메일 발송이 실패해도 회원가입은 완료됨
   - 사용자는 `/auth/resend-verification` API로 재발송 요청 가능

3. **토큰 보안**
   - 인증 토큰은 UUID로 생성 (예측 불가능)
   - 인증 완료 후 토큰은 즉시 삭제 (일회용)

4. **프로덕션 환경**
   - Gmail은 하루 발송 제한이 있음 (약 500통)
   - 대량 발송이 필요한 경우 전용 이메일 서비스 고려

## 추가 개선 사항 (선택)

1. **토큰 만료 시간 설정**
   - 현재는 토큰 만료 시간이 없음
   - 필요시 `emailVerificationTokenExpiry` 필드 추가 가능

2. **이메일 인증 재발송 UI**
   - 프론트엔드에 "인증 메일 재발송" 버튼 추가

3. **이메일 템플릿 개선**
   - 더 나은 디자인의 이메일 템플릿 사용
   - 이메일 템플릿 파일 분리 (Thymeleaf 등)

---

**구현 완료일**: 2025년 1월
**작성자**: rjsgud's forum 개발팀
