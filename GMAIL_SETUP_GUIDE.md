# Gmail SMTP 설정 가이드

이 문서는 rjsgud's forum 프로젝트에서 Gmail을 사용하여 이메일 인증 메일을 발송하기 위한 설정 방법을 설명합니다.

## 1. Gmail 앱 비밀번호 생성

Gmail에서 이메일을 발송하려면 **앱 비밀번호(App Password)**를 생성해야 합니다. 일반 Gmail 비밀번호는 보안상의 이유로 SMTP 인증에 사용할 수 없습니다.

### 단계별 가이드

#### 1단계: Google 계정 2단계 인증 활성화

1. [Google 계정 설정](https://myaccount.google.com/)에 접속
2. 왼쪽 메뉴에서 **보안(Security)** 클릭
3. **2단계 인증(2-Step Verification)** 섹션에서 **2단계 인증 사용** 클릭
4. 안내에 따라 2단계 인증을 활성화합니다

> **참고**: 앱 비밀번호를 생성하려면 반드시 2단계 인증이 활성화되어 있어야 합니다.

#### 2단계: 앱 비밀번호 생성

1. [Google 계정 설정 > 보안](https://myaccount.google.com/security) 페이지로 이동
2. **2단계 인증** 섹션에서 **앱 비밀번호(App passwords)** 클릭
   - 또는 직접 링크: https://myaccount.google.com/apppasswords
3. **앱 선택** 드롭다운에서 **기타(사용자 지정 이름)** 선택
4. 앱 이름 입력 (예: "Forum Email Service" 또는 "rjsgud forum")
5. **생성** 버튼 클릭
6. **16자리 비밀번호**가 생성됩니다 (예: `abcd efgh ijkl mnop`)
   - 이 비밀번호를 복사해두세요 (공백 포함 또는 제거해도 됩니다)

> **중요**: 이 비밀번호는 한 번만 표시되므로 안전한 곳에 저장해두세요.

## 2. application.properties 설정

`forum_server/src/main/resources/application.properties` 파일을 열고 다음 설정을 수정합니다:

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

### 설정 값 설명

- **spring.mail.username**: Gmail 주소 (예: `qkrrjsgud49@gmail.com`)
- **spring.mail.password**: 위에서 생성한 **앱 비밀번호** (16자리)
- **app.base-url**: 프론트엔드 URL (프로덕션: `https://forum.rjsgud.com`, 개발: `http://localhost:3000`)

### 예시

```properties
spring.mail.username=qkrrjsgud49@gmail.com
spring.mail.password=abcd efgh ijkl mnop
app.base-url=https://forum.rjsgud.com
```

## 3. Jenkins 배포 환경 설정

Jenkins에서 배포할 경우, `application.properties`에 직접 비밀번호를 작성하는 대신 **환경 변수**를 사용하는 것이 더 안전합니다.

### 방법 1: Jenkins Credentials 사용 (권장)

1. Jenkins 관리 > Credentials > System > Global credentials (unrestricted)
2. **Add Credentials** 클릭
3. 다음 정보 입력:
   - **Kind**: Secret text
   - **Secret**: 앱 비밀번호 (16자리)
   - **ID**: `gmail-app-password`
   - **Description**: Gmail App Password for email verification

4. `Jenkinsfile`에 환경 변수 추가:

```groovy
environment {
    // ... 기존 설정 ...
    GMAIL_APP_PASSWORD = credentials('gmail-app-password')
}
```

5. `application.properties`에서 환경 변수 참조:

```properties
spring.mail.password=${GMAIL_APP_PASSWORD}
```

### 방법 2: application.properties 직접 수정

개발 환경이나 테스트 환경에서는 `application.properties`에 직접 작성해도 됩니다. 다만 **절대 Git에 커밋하지 마세요!**

`.gitignore`에 다음을 추가하여 실수로 커밋되는 것을 방지할 수 있습니다:

```gitignore
# Gmail 비밀번호가 포함된 설정 파일 (로컬만 사용)
forum_server/src/main/resources/application-local.properties
```

## 4. 테스트

설정이 완료되면 다음을 확인하세요:

1. **백엔드 서버 재시작**
2. **회원가입 테스트**
   - 새 계정으로 회원가입
   - 등록한 이메일 주소로 인증 메일이 도착하는지 확인
3. **이메일 확인**
   - 이메일이 스팸 폴더에 들어가지 않았는지 확인
   - 이메일의 인증 링크가 올바르게 작동하는지 확인

## 5. 문제 해결

### 이메일이 발송되지 않는 경우

1. **앱 비밀번호 확인**
   - 앱 비밀번호가 올바르게 입력되었는지 확인
   - 공백이 포함되어 있어도 괜찮지만, 공백 없이 입력해도 됩니다

2. **2단계 인증 확인**
   - Google 계정에 2단계 인증이 활성화되어 있는지 확인

3. **로그 확인**
   - 백엔드 로그에서 이메일 발송 관련 에러 메시지 확인
   - `EmailService`의 로그 메시지 확인

4. **방화벽/네트워크 확인**
   - SMTP 포트(587)가 차단되지 않았는지 확인

### "Username and Password not accepted" 에러

- 앱 비밀번호가 아닌 일반 Gmail 비밀번호를 사용하고 있을 가능성이 높습니다
- 앱 비밀번호를 다시 생성하여 사용하세요

### "Less secure app access" 관련 에러

- Gmail은 더 이상 "보안 수준이 낮은 앱" 접근을 허용하지 않습니다
- 반드시 **앱 비밀번호**를 사용해야 합니다

## 6. 보안 권장사항

1. **앱 비밀번호 보안**
   - 앱 비밀번호를 Git에 커밋하지 마세요
   - Jenkins Credentials나 환경 변수를 사용하세요

2. **프로덕션 환경**
   - 프로덕션에서는 반드시 Jenkins Credentials를 사용하세요
   - `application.properties`에 직접 비밀번호를 작성하지 마세요

3. **이메일 발송 제한**
   - Gmail은 하루에 발송할 수 있는 이메일 수에 제한이 있습니다 (약 500통)
   - 대량 발송이 필요한 경우 Gmail 대신 전용 이메일 서비스(SendGrid, AWS SES 등)를 고려하세요

## 7. 추가 리소스

- [Google 앱 비밀번호 가이드](https://support.google.com/accounts/answer/185833)
- [Spring Boot Mail 설정](https://spring.io/guides/gs/sending-email/)
- [Gmail SMTP 설정](https://support.google.com/mail/answer/7126229)

---

**작성일**: 2025년 1월
**작성자**: rjsgud's forum 개발팀
