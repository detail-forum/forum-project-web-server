import { test, expect } from '@playwright/test'

test('테마 버튼이 시스템 → 라이트 → 다크 순서로 바꾸고 새로고침 후에도 유지한다', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')

  const html = page.locator('html')
  const toggle = page.getByRole('button', { name: /^테마:/ })

  await expect(toggle).toHaveAttribute('title', '테마: 시스템 설정')
  await expect(html).toHaveAttribute('data-theme', 'light')

  await toggle.click()
  await expect(toggle).toHaveAttribute('title', '테마: 라이트')
  await expect(html).toHaveAttribute('data-theme', 'light')

  await toggle.click()
  await expect(toggle).toHaveAttribute('title', '테마: 다크')
  await expect(html).toHaveAttribute('data-theme', 'dark')

  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'dark')
})

test('시스템 설정이면 OS 다크 모드를 따른다', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})
