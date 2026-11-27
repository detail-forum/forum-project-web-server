import { execSync } from 'node:child_process'
import { COMPOSE, EXTERNAL_BACKEND } from './global-setup'

/** E2E_KEEP=1이면 실패 원인을 보려고 백엔드를 남겨 둔다. 밖에서 띄운 백엔드는 건드리지 않는다. */
export default function globalTeardown() {
  if (process.env.E2E_KEEP || EXTERNAL_BACKEND) return
  execSync(`${COMPOSE} down -v`, { stdio: 'inherit' })
}
