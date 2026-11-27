import { expect, type APIRequestContext, type Page } from '@playwright/test'

import { API, MAILPIT } from '../playwright.config'

export { API }

export interface TestUser {
  username: string
  password: string
  nickname: string
  email: string
}

/** 테스트끼리 겹치지 않는 사용자. 닉네임은 서버 제한(15자) 안으로 둔다. */
export function newUser(prefix = 'u'): TestUser {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  return {
    username: `${prefix}${id}`,
    password: 'e2e-password-1',
    nickname: `${prefix}${id}`.slice(0, 15),
    email: `${prefix}${id}@forum.test`,
  }
}

/** 서버가 그 주소로 보낸 메일에서 링크(/verify-email?token=..., /reset-password?token=...)를 꺼낸다. */
export async function linkFromMail(request: APIRequestContext, email: string, path: string): Promise<string> {
  let link = ''
  await expect
    .poll(async () => {
      const search = await request.get(`${MAILPIT}/api/v1/search`, { params: { query: `to:"${email}"` } })
      const { messages } = await search.json()
      for (const m of messages ?? []) {
        const message = await (await request.get(`${MAILPIT}/api/v1/message/${m.ID}`)).json()
        const found = `${message.HTML ?? ''} ${message.Text ?? ''}`.match(new RegExp(`https?://[^"'\\s<>]*${path}\\?token=[\\w-]+`))
        if (found) link = found[0]
      }
      return link
    }, { message: `${email}로 온 ${path} 메일`, timeout: 20_000 })
    .not.toBe('')
  return link
}

/** API로 가입하고 메일 속 링크로 인증까지 끝낸 사용자. UI로 가입하는 흐름은 auth.spec.ts가 따로 본다. */
export async function createVerifiedUser(request: APIRequestContext, prefix?: string): Promise<TestUser> {
  const user = newUser(prefix)
  const res = await request.post(`${API}/auth/register`, { data: user })
  expect(res.ok(), await res.text()).toBeTruthy()
  const link = await linkFromMail(request, user.email, '/verify-email')
  const token = new URL(link).searchParams.get('token')
  const verified = await request.get(`${API}/auth/verify-email`, { params: { token: token! } })
  expect(verified.ok(), await verified.text()).toBeTruthy()
  return user
}

export async function openLoginModal(page: Page) {
  await page.getByRole('button', { name: '로그인', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible()
}

export async function submitLogin(page: Page, user: Pick<TestUser, 'username' | 'password'>) {
  await page.locator('input[name="username"]').fill(user.username)
  await page.locator('input[name="password"]').fill(user.password)
  await page.locator('form button[type="submit"]').click()
}

/** 홈에서 헤더의 로그인 버튼으로 로그인한다. 끝나면 로그인 버튼이 사라진다. */
export async function login(page: Page, user: TestUser) {
  await page.goto('/')
  await openLoginModal(page)
  await submitLogin(page, user)
  await expect(page.getByRole('heading', { name: '로그인' })).toBeHidden()
  await expect(page.getByRole('button', { name: '로그인', exact: true })).toHaveCount(0)
}
