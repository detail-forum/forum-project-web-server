import { test, expect } from '@playwright/test'
import { createVerifiedUser, login } from './support'

test('모임 만들기 → 다른 사용자가 가입 → 탈퇴', async ({ browser, request }) => {
  const owner = await createVerifiedUser(request, 'gown')
  const member = await createVerifiedUser(request, 'gmem')

  const ownerPage = await (await browser.newContext()).newPage()
  await login(ownerPage, owner)
  await ownerPage.goto('/social-gathering/create')
  const name = `E2E 모임 ${Date.now()}`
  await ownerPage.getByPlaceholder('모임 이름을 입력하세요 (2자 이상)').fill(name)
  await ownerPage.getByPlaceholder('모임에 대한 설명을 입력하세요').fill('e2e로 만든 모임입니다.')
  await ownerPage.getByRole('button', { name: '모임 만들기' }).click()
  await ownerPage.waitForURL(/\/social-gathering\/\d+$/)
  const groupUrl = new URL(ownerPage.url()).pathname
  await expect(ownerPage.getByRole('heading', { name })).toBeVisible()
  // 주인은 가입·탈퇴 버튼이 없다.
  await expect(ownerPage.getByRole('button', { name: '가입하기' })).toHaveCount(0)
  await expect(ownerPage.getByRole('button', { name: '탈퇴하기' })).toHaveCount(0)

  const memberPage = await (await browser.newContext()).newPage()
  await login(memberPage, member)
  await memberPage.goto(groupUrl)
  // 가입·탈퇴의 확인·안내 창(confirm/alert)은 모두 수락한다.
  memberPage.on('dialog', (d) => d.accept())
  await memberPage.getByRole('button', { name: '가입하기' }).click()
  await expect(memberPage.getByRole('button', { name: '탈퇴하기' })).toBeVisible()
  await expect(memberPage.getByText('멤버: 2명')).toBeVisible()

  // 탈퇴하면 모임 목록으로 돌아간다. 다시 들어가면 가입 전 상태다.
  await memberPage.getByRole('button', { name: '탈퇴하기' }).click()
  await memberPage.waitForURL('/social-gathering')
  await memberPage.goto(groupUrl)
  await expect(memberPage.getByRole('button', { name: '가입하기' })).toBeVisible()
  await expect(memberPage.getByText('멤버: 1명')).toBeVisible()
})
