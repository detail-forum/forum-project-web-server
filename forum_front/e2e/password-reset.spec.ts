import { test, expect } from '@playwright/test'
import { createVerifiedUser, linkFromMail, login, openLoginModal, submitLogin } from './support'

test('재설정 메일 요청 → 메일 링크로 새 비밀번호 설정 → 옛 비밀번호는 거부, 새 비밀번호로 로그인', async ({ page, request }) => {
  const user = await createVerifiedUser(request, 'reset')

  // 로그인 모달의 링크로 들어간다.
  await page.goto('/')
  await openLoginModal(page)
  await page.getByRole('link', { name: '아이디·비밀번호를 잊으셨나요?' }).click()
  await page.getByLabel('이메일').fill(user.email)
  await page.getByRole('button', { name: '재설정 메일 받기' }).click()
  await expect(page.getByRole('link', { name: '홈으로 이동' })).toBeVisible()

  await page.goto(await linkFromMail(request, user.email, '/reset-password'))
  const newPassword = 'new-e2e-password-2'
  await page.getByLabel('새 비밀번호', { exact: true }).fill(newPassword)
  await page.getByLabel('새 비밀번호 확인').fill(newPassword)
  await page.getByRole('button', { name: '비밀번호 변경' }).click()
  await expect(page.getByText('비밀번호가 변경되었습니다.', { exact: false })).toBeVisible()

  await page.goto('/')
  await openLoginModal(page)
  await submitLogin(page, user)
  await expect(page.locator('form .text-red-500')).toBeVisible()

  await login(page, { ...user, password: newPassword })
})

test('가입하지 않은 이메일도 같은 응답을 받는다 (가입 여부를 드러내지 않음)', async ({ page }) => {
  await page.goto('/reset-password')
  await page.getByLabel('이메일').fill(`nobody${Date.now()}@forum.test`)
  await page.getByRole('button', { name: '재설정 메일 받기' }).click()
  await expect(page.getByText('가입된 이메일이라면', { exact: false })).toBeVisible()
})
