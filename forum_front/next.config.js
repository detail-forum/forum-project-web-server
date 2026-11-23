/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // X-Powered-By 헤더 제거 (ZAP: 서버 정보 노출)
  poweredByHeader: false,
  // /api/* 경로는 Next.js가 처리하지 않고 외부로 프록시
  async rewrites() {
    // 환경 변수에서 업로드 서버 URL 가져오기
    let uploadBaseUrl = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL
    
    // 환경 변수가 없으면 프로덕션 서버 사용
    if (!uploadBaseUrl) {
      uploadBaseUrl = 'https://forum.rjsgud.com'
    }
    
    // URL 끝에 /uploads가 포함되어 있지 않으면 추가
    if (!uploadBaseUrl.endsWith('/uploads')) {
      uploadBaseUrl = uploadBaseUrl.replace(/\/$/, '') + '/uploads'
    }

    return [
      {
        source: "/uploads/:path*",
        destination: `${uploadBaseUrl}/:path*`,
      },
    ];
  },
  // 보안 응답 헤더 (ZAP 경고 대응). CSP는 앱이 실제 쓰는 출처만 허용.
  // shortcut: script/style에 'unsafe-inline' 허용 — Next.js 인라인 스크립트 때문. nonce 방식으로 좁히려면 미들웨어 필요.
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Pretendard 웹폰트(app/layout.tsx)를 jsDelivr에서 받는다.
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "img-src 'self' data: blob: https://*.giphy.com",
      "connect-src 'self' https://api.giphy.com https://forum.rjsgud.com wss://forum.rjsgud.com",
      "font-src 'self' data: https://cdn.jsdelivr.net",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
  webpack: (config, { isServer }) => {
    // 클라이언트 사이드에서만 처리
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }
    
    return config
  },
}

module.exports = nextConfig

