import { test, expect, type Page } from '@playwright/test'
import { API, createVerifiedUser, login } from './support'

/** /posts 화면에서 글을 쓰고, 홈 목록에서 그 글을 열어 id를 돌려준다. */
async function writePost(page: Page, title: string, body: string): Promise<number> {
  await page.goto('/posts')
  await page.locator('#title').fill(title)
  await page.locator('#body').fill(body)
  await page.getByRole('button', { name: '작성하기' }).click()
  await page.waitForURL('/')

  await page.getByText(title).first().click()
  await page.waitForURL(/\/posts\/\d+$/)
  return Number(page.url().split('/').pop())
}

test('글 쓰기 → 상세(마크다운) → 댓글 → 수정 → 삭제', async ({ page, request }) => {
  const writer = await createVerifiedUser(request, 'writer')
  await login(page, writer)

  const title = `E2E 글 ${Date.now()}`
  const body = '# 큰 제목\n**굵은 글씨** 입니다\n[안전한 링크](https://example.com)\n[위험한 링크](javascript:alert(1))'
  const id = await writePost(page, title, body)

  // 상세: 서버에 저장된 본문이 마크다운으로 그려지고, javascript: 링크는 href가 없다.
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
  await expect(page.getByRole('heading', { name: '큰 제목' })).toBeVisible()
  await expect(page.locator('strong', { hasText: '굵은 글씨' })).toBeVisible()
  await expect(page.locator('a', { hasText: '안전한 링크' })).toHaveAttribute('href', 'https://example.com')
  const danger = page.locator('a', { hasText: '위험한 링크' })
  await expect(danger).toBeVisible()
  expect(await danger.getAttribute('href')).toBeNull()

  // 댓글
  const comment = `E2E 댓글 ${Date.now()}`
  await page.getByPlaceholder('댓글을 입력하세요...').fill(comment)
  await page.getByRole('button', { name: '작성', exact: true }).click()
  await expect(page.getByText(comment)).toBeVisible()
  await page.reload()
  await expect(page.getByText(comment)).toBeVisible()

  // 수정
  await page.getByRole('article').getByRole('button', { name: '수정', exact: true }).click()
  await page.waitForURL(`/posts/${id}/edit`)
  const newTitle = `${title} (수정됨)`
  await page.locator('#title').fill(newTitle)
  await page.locator('form button[type="submit"]').click()
  await page.waitForURL(`/posts/${id}`)
  await expect(page.getByRole('heading', { name: newTitle })).toBeVisible()

  // 삭제
  page.once('dialog', (d) => d.accept())
  await page.getByRole('article').getByRole('button', { name: '삭제', exact: true }).click()
  await page.waitForURL('/')
  const res = await request.get(`${API}/post/${id}`)
  expect(res.ok()).toBeFalsy()
})

test('다른 사람 글에는 수정·삭제 버튼이 없고, 서버도 수정을 막는다', async ({ browser, request }) => {
  const writer = await createVerifiedUser(request, 'owner')
  const other = await createVerifiedUser(request, 'other')

  const writerPage = await (await browser.newContext()).newPage()
  await login(writerPage, writer)
  const title = `남의 글 ${Date.now()}`
  const id = await writePost(writerPage, title, '다른 사람은 고칠 수 없는 본문입니다.')

  const otherContext = await browser.newContext()
  const otherPage = await otherContext.newPage()
  await login(otherPage, other)
  await otherPage.goto(`/posts/${id}`)
  await expect(otherPage.getByRole('heading', { name: title })).toBeVisible()
  await expect(otherPage.getByRole('article').getByRole('button', { name: '수정', exact: true })).toHaveCount(0)
  await expect(otherPage.getByRole('article').getByRole('button', { name: '삭제', exact: true })).toHaveCount(0)

  // 버튼을 숨기는 것만으로는 부족하다. 로그인한 다른 사용자의 쿠키로 직접 API를 불러도 막혀야 한다.
  const patched = await otherContext.request.patch(`${API}/post/${id}`, { data: { title: 'hijacked title!!' } })
  // 401(로그인 안 됨)이 아니라 403(로그인했지만 권한 없음)이어야 쿠키가 실렸고 권한 검사로 막힌 것이다.
  expect(patched.status()).toBe(403)
  const detail = await (await request.get(`${API}/post/${id}`)).json()
  expect(detail.data.title).toBe(title)
})

test('본문 이미지 업로드: 서버에 저장되고 본문에 마크다운으로 들어가 미리보기에 보인다', async ({ page, request }) => {
  const writer = await createVerifiedUser(request, 'img')
  await login(page, writer)
  await page.goto('/posts')

  // 1x1 PNG. 서버가 파일 머리(시그니처)까지 검사하므로 진짜 PNG여야 한다.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
  await page
    .getByRole('button', { name: '이미지', exact: true })
    .locator('xpath=..')
    .locator('input[type="file"]')
    .setInputFiles({ name: 'dot.png', mimeType: 'image/png', buffer: png })

  await expect(page.locator('#body')).toHaveValue(/!\[dot\.png\]\(\/uploads\/[\w-]+\.png\)/)
  const url = (await page.locator('#body').inputValue()).match(/\/uploads\/[\w-]+\.png/)![0]

  const served = await request.get(`${API}${url}`)
  expect(served.ok()).toBeTruthy()
  expect(served.headers()['content-type']).toContain('image/png')
  await expect(page.locator(`img[src*="${url}"]`)).toBeVisible()
})
