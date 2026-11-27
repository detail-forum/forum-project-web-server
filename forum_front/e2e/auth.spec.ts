import { test, expect } from '@playwright/test'
import { createVerifiedUser, linkFromMail, newUser, openLoginModal, submitLogin, login } from './support'

test('화면에서 가입 → 메일 인증 전에는 로그인 거부 → 메일 링크로 인증 → 로그인', async ({ page, request }) => {
  const user = newUser('join')

  await page.goto('/')
  await openLoginModal(page)
  await page.getByRole('button', { name: '계정이 없으신가요? 회원가입' }).click()
  await page.locator('input[name="username"]').fill(user.username)
  await page.locator('input[name="password"]').fill(user.password)
  await page.locator('input[name="nickname"]').fill(user.nickname)
  await page.locator('input[name="email"]').fill(user.email)
  const signedUp = page.waitForEvent('dialog').then((d) => d.accept())
  await page.locator('form button[type="submit"]').click()
  await signedUp

  // 가입하면 로그인 화면으로 돌아온다. 아직 인증 전이라 서버가 거부한다.
  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible()
  await submitLogin(page, user)
  await expect(page.getByText('로그인하려면 먼저 이메일 인증을 완료해주세요.', { exact: false })).toBeVisible()

  // 서버가 보낸 실제 메일의 링크를 연다.
  await page.goto(await linkFromMail(request, user.email, '/verify-email'))
  await expect(page.getByRole('heading', { name: '인증 완료!' })).toBeVisible()

  await login(page, user)
})

test('틀린 비밀번호면 오류를 보여 주고 로그인되지 않는다', async ({ page, request }) => {
  const user = await createVerifiedUser(request, 'wrong')

  await page.goto('/')
  await openLoginModal(page)
  await submitLogin(page, { username: user.username, password: 'not-the-password' })

  await expect(page.locator('form .text-red-500')).toBeVisible()
  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible()
})

test('로그인은 새로고침해도 유지되고 로그아웃하면 풀린다', async ({ page, request }) => {
  const user = await createVerifiedUser(request, 'keep')
  await login(page, user)

  await page.reload()
  await expect(page.getByRole('button', { name: '로그인', exact: true })).toHaveCount(0)

  await page.locator('header').getByRole('button').last().click()
  await page.getByRole('button', { name: '로그아웃' }).click()
  await expect(page.getByRole('button', { name: '로그인', exact: true }).first()).toBeVisible()
})
