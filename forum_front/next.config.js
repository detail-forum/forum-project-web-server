/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
  // /api/* 경로를 정적 파일로 처리하지 않도록 설정
  async headers() {
    return []
  },
}

module.exports = nextConfig

