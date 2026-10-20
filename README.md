# Forum Project

<div align="center">

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.5-brightgreen.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.0-black)
![Java](https://img.shields.io/badge/Java-21-orange.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**개발자를 위한 현대적인 게시판 플랫폼**

지식을 공유하고 소통하는 공간을 제공하는 풀스택 웹 애플리케이션

[기능 소개](#-주요-기능) • [시작하기](#-시작하기) • [기술 스택](#-기술-스택) • [프로젝트 구조](#-프로젝트-구조)

</div>

---

## 📋 목차

- [소개](#-소개)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [프로젝트 구조](#-프로젝트-구조)
- [시작하기](#-시작하기)
- [API 문서](#-api-문서)
- [배포](#-배포)
- [기여하기](#-기여하기)

## 🎯 소개

Forum Project는 개발자 커뮤니티를 위한 현대적인 게시판 플랫폼입니다. 실시간 채팅, 모임 기능, 마크다운 에디터 등 다양한 기능을 제공하여 사용자들이 효율적으로 소통하고 지식을 공유할 수 있도록 설계되었습니다.

### 핵심 가치

- **사용자 경험 우선**: 직관적이고 반응형인 UI/UX
- **실시간 소통**: WebSocket 기반 실시간 채팅 및 알림
- **확장 가능한 아키텍처**: 모듈화된 구조로 유지보수 용이
- **보안**: JWT 기반 인증 및 권한 관리

## ✨ 주요 기능

### 📝 게시판 기능
- **게시글 작성/수정/삭제**: 마크다운 에디터를 통한 풍부한 콘텐츠 작성
- **이미지 업로드**: 드래그 앤 드롭 및 크기 조절 기능
- **태그 시스템**: 게시글 분류 및 검색
- **좋아요 및 댓글**: 사용자 간 상호작용
- **조회수 추적**: 인기 게시글 파악

### 👥 모임(그룹) 기능
- **모임 생성 및 관리**: 주제별 커뮤니티 형성
- **모임 게시글**: 그룹 내 활동 게시글 작성
- **공개/비공개 설정**: 모임 외부 노출 여부 선택
- **모임 채팅**: 실시간 그룹 채팅 기능

### 💬 실시간 채팅
- **WebSocket 기반 통신**: STOMP 프로토콜 사용
- **읽음 확인**: 메시지 읽음 상태 추적
- **답장 기능**: 메시지에 대한 답장 및 스레드
- **이모지 반응**: 메시지에 대한 빠른 반응

### 🔐 인증 및 보안
- **JWT 토큰 인증**: Access Token & Refresh Token
- **쿠키 기반 토큰 관리**: 보안 강화
- **자동 토큰 갱신**: 사용자 경험 최적화
- **권한 기반 접근 제어**: 역할별 기능 제한

### 🎨 사용자 인터페이스
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 지원
- **다크 모드 준비**: 향후 확장 가능
- **실시간 미리보기**: 마크다운 작성 시 즉시 확인
- **이미지 크기 조절**: 드래그로 이미지 크기 조정

## 🛠 기술 스택

### Backend
- **Framework**: Spring Boot 3.5.5
- **Language**: Java 21
- **Database**: MySQL 8.0+
- **ORM**: Spring Data JPA
- **Security**: Spring Security + JWT
- **WebSocket**: Spring WebSocket (STOMP)
- **API Documentation**: SpringDoc OpenAPI (Swagger)
- **Build Tool**: Gradle

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.2
- **Styling**: Tailwind CSS 3.3
- **State Management**: Redux Toolkit
- **HTTP Client**: Axios
- **WebSocket**: SockJS + STOMP.js
- **Date Handling**: date-fns
- **Build Tool**: npm

### Infrastructure
- **Web Server**: Nginx
- **CI/CD**: Jenkins
- **Container**: Docker (선택사항)

## 📁 프로젝트 구조

```
forum-project/
├── forum_server/          # Spring Boot 백엔드
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   │   └── com/pgh/api_practice/
│   │   │   │       ├── controller/    # REST API 컨트롤러
│   │   │   │       ├── service/       # 비즈니스 로직
│   │   │   │       ├── repository/    # 데이터 접근 계층
│   │   │   │       ├── entity/        # JPA 엔티티
│   │   │   │       ├── dto/           # 데이터 전송 객체
│   │   │   │       ├── global/        # 전역 설정 (Security, Exception 등)
│   │   │   │       └── config/        # 설정 클래스
│   │   │   └── resources/
│   │   │       └── application.properties
│   │   └── test/                      # 테스트 코드
│   ├── build.gradle
│   └── settings.gradle
│
├── forum_front/           # Next.js 프론트엔드
│   ├── app/               # Next.js App Router
│   │   ├── page.tsx       # 홈 페이지
│   │   ├── posts/         # 게시글 관련 페이지
│   │   ├── social-gathering/  # 모임 관련 페이지
│   │   └── ...
│   ├── components/         # React 컴포넌트
│   ├── services/          # API 서비스
│   ├── store/             # Redux 상태 관리
│   ├── types/             # TypeScript 타입 정의
│   ├── utils/             # 유틸리티 함수
│   └── package.json
│
└── README.md
```

## 🚀 시작하기

### 사전 요구사항

- **Java**: 21 이상
- **Node.js**: 18 이상
- **MySQL**: 8.0 이상
- **npm** 또는 **yarn**

### 설치 및 실행

#### 1. 저장소 클론

```bash
git clone https://github.com/your-username/forum-project.git
cd forum-project
```

#### 2. 데이터베이스와 비밀값 설정

MySQL 데이터베이스를 만든 뒤, 비밀번호와 JWT 시크릿은 저장소에 넣지 않습니다. 서버를 실행하는 디렉터리에 `application-local.properties`를 두거나 환경 변수를 설정하세요. 예시는 `forum_server/application-local.properties.example`입니다.

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/your_database
spring.datasource.username=your_username
spring.datasource.password=your_password
spring.jwt.secret=your-secret-key-minimum-32-characters
spring.mail.username=your-address@gmail.com
spring.mail.password=your-gmail-app-password
```

환경 변수로 넣을 때는 다음 이름을 사용합니다.

- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` (비밀번호는 필수)
- `JWT_SECRET` (32바이트 이상, 필수. 기존에 발급된 토큰을 유지하려면 이전 시크릿과 같아야 합니다)
- `MAIL_USERNAME`, `MAIL_PASSWORD` (Gmail 앱 비밀번호)
- `APP_COOKIE_SECURE=true` (HTTPS 배포에서 인증 쿠키에 Secure 속성을 붙임. 로컬 HTTP는 기본값 false)
- `CORS_ALLOWED_ORIGINS` (선택. 쉼표로 구분. 비우면 `localhost:3000`과 `https://forum.rjsgud.com` 등 기존 프론트 출처만 허용)

배포(NSSM 등)에서도 JAR 안에 비밀값을 넣지 말고, 서비스 환경 변수나 실행 디렉터리의 `application-local.properties`로 주입하세요. 예전에 저장소에 들어가 있던 DB 비밀번호와 Gmail 앱 비밀번호는 폐기하고 새로 발급해야 합니다.

#### 3. 백엔드 실행

```bash
cd forum_server
./gradlew bootRun
```

백엔드 서버는 `http://localhost:8081`에서 실행됩니다.

#### 4. 프론트엔드 실행

새 터미널에서:

```bash
cd forum_front
npm install
npm run dev
```

프론트엔드 서버는 `http://localhost:3000`에서 실행됩니다.

### 환경 변수 설정

프론트엔드 환경 변수 설정을 위해 `.env.local` 파일을 생성하세요:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8081
NEXT_PUBLIC_UPLOAD_BASE_URL=http://localhost:8081/uploads
NEXT_PUBLIC_WS_URL=ws://localhost:8081/ws
```

## 📚 API 문서

백엔드 서버 실행 후 Swagger UI에서 API 문서를 확인할 수 있습니다:

```
http://localhost:8081/swagger-ui.html
```

### 주요 API 엔드포인트

- **인증**: `/api/auth/*`
- **게시글**: `/api/post/*`
- **모임**: `/api/group/*`
- **댓글**: `/api/comment/*`
- **사용자**: `/api/user/*`
- **WebSocket**: `/ws`

## 🚢 배포

### 프로덕션 빌드

#### 백엔드

```bash
cd forum_server
./gradlew clean build
java -jar build/libs/api_practice-0.0.1-SNAPSHOT.jar
```

#### 프론트엔드

```bash
cd forum_front
npm run build
npm start
```

### Nginx 설정

프로덕션 환경에서는 Nginx를 리버스 프록시로 사용하는 것을 권장합니다. 예제 설정 파일은 `nginx.conf` 및 `nginx_websocket_fix.conf`를 참고하세요.

## 🤝 기여하기

프로젝트에 기여하고 싶으시다면 다음 단계를 따르세요:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 코딩 컨벤션

- **Java**: Google Java Style Guide 준수
- **TypeScript**: ESLint 규칙 준수
- **커밋 메시지**: Conventional Commits 형식 사용

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다. 자세한 내용은 `LICENSE` 파일을 참고하세요.

## 👨‍💻 개발자

- **rjsgud49** - 초기 개발 및 유지보수

## 🙏 감사의 말

이 프로젝트는 다음 오픈소스 프로젝트들의 도움을 받았습니다:

- [Spring Boot](https://spring.io/projects/spring-boot)
- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Redux Toolkit](https://redux-toolkit.js.org/)

---

<div align="center">

**⭐ 이 프로젝트가 도움이 되었다면 Star를 눌러주세요! ⭐**

Made with ❤️ by the Forum Project Team

</div>
