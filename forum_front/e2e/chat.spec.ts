import { test, expect } from '@playwright/test'
import { createVerifiedUser, login } from './support'

test('1대1 채팅: 메시지가 WebSocket으로 새로고침 없이 상대 화면에 나타난다', async ({ browser, request }) => {
  const alice = await createVerifiedUser(request, 'chata')
  const bob = await createVerifiedUser(request, 'chatb')

  // 앨리스가 밥과의 방을 연다(/chat?user=).
  const alicePage = await (await browser.newContext()).newPage()
  await login(alicePage, alice)
  await alicePage.goto(`/chat?user=${bob.username}`)
  const aliceBox = alicePage.getByPlaceholder('메시지를 입력하세요...')
  await expect(aliceBox).toBeVisible()

  const hello = `안녕 밥 ${Date.now()}`
  await aliceBox.fill(hello)
  await alicePage.getByRole('button', { name: '전송', exact: true }).click()
  await expect(alicePage.getByText(hello)).toBeVisible()

  // 밥은 목록에서 방을 고르면 저장된 메시지를 본다.
  const bobPage = await (await browser.newContext()).newPage()
  await login(bobPage, bob)
  await bobPage.goto('/chat')
  await bobPage.getByText(alice.nickname).first().click()
  await expect(bobPage.getByText(hello)).toBeVisible()

  // 밥의 답장은 앨리스 화면에 새로고침 없이 들어와야 한다.
  const reply = `반가워 앨리스 ${Date.now()}`
  await bobPage.getByPlaceholder('메시지를 입력하세요...').fill(reply)
  await bobPage.getByRole('button', { name: '전송', exact: true }).click()
  await expect(alicePage.getByText(reply)).toBeVisible()
})
