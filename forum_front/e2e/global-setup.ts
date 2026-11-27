import { execSync } from 'node:child_process'
import path from 'node:path'
import { API } from '../playwright.config'

export const COMPOSE = `docker compose -f "${path.join(__dirname, 'docker-compose.yml')}"`
// CI 파드는 백엔드를 사이드카로 띄우므로 Docker 없이 붙기만 한다.
export const EXTERNAL_BACKEND = process.env.E2E_BACKEND === 'external'

/** MySQL·Mailpit·Spring 서버를 띄우고 모두 healthy가 될 때까지 기다린다. 서버 이미지는 빌드하면서 백엔드 테스트도 돈다. */
export default async function globalSetup() {
  if (!EXTERNAL_BACKEND) {
    execSync(`${COMPOSE} up -d --build --wait`, { stdio: 'inherit', timeout: 15 * 60_000 })
    return
  }
  const deadline = Date.now() + 5 * 60_000
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${API}/post?page=0&size=1`)).ok) return
    } catch {
      // 아직 뜨는 중
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error(`백엔드(${API})가 5분 안에 뜨지 않았습니다.`)
}
