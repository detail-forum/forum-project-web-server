import { defineConfig, devices } from '@playwright/test'

// 서비스 전체 e2e: 브라우저 → Next.js(3100) → Spring 서버(18081) → MySQL, 메일은 Mailpit(18025).
// 백엔드는 e2e/docker-compose.yml을 globalSetup이 띄운다. 운영 서버로는 요청이 가지 않는다.
const PORT = 3100
// 기본은 docker-compose.yml이 연 포트. CI 파드처럼 백엔드를 밖에서 띄우면 환경 변수로 바꾼다.
export const API = process.env.E2E_API_URL || 'http://localhost:18081'
export const MAILPIT = process.env.E2E_MAILPIT_URL || 'http://localhost:18025'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // 운영과 같은 프로덕션 빌드로 띄운다. next dev는 StrictMode로 effect를 두 번 돌려 일회용 토큰 요청이 중복된다.
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 600_000,
    // 운영 API로 붙은 개발 서버를 잘못 재사용하지 않도록 항상 새로 띄운다.
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_API_URL: API,
      NEXT_PUBLIC_UPLOAD_BASE_URL: API,
    },
  },
})
