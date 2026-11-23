'use client'

import { useEffect, useState } from 'react'
import { getThemeMode, setThemeMode, type ThemeMode } from '@/utils/theme'

const NEXT: Record<ThemeMode, ThemeMode> = { system: 'light', light: 'dark', dark: 'system' }
const LABEL: Record<ThemeMode, string> = { system: '시스템 설정', light: '라이트', dark: '다크' }

/** 누를 때마다 시스템 → 라이트 → 다크 순서로 바뀐다. */
export default function ThemeToggle() {
  // 저장된 값은 브라우저에서만 읽을 수 있어서, 마운트 전에는 아무것도 그리지 않는다(hydration 불일치 방지).
  const [mode, setMode] = useState<ThemeMode | null>(null)

  useEffect(() => {
    setMode(getThemeMode())
  }, [])

  if (!mode) return <span className="w-9 h-9" aria-hidden="true" />

  const handleClick = () => {
    const next = NEXT[mode]
    setThemeMode(next)
    setMode(next)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="p-1.5 rounded-full text-gray-600 hover:text-primary hover:bg-gray-100 transition-colors"
      aria-label={`테마: ${LABEL[mode]} (눌러서 ${LABEL[NEXT[mode]]}로 변경)`}
      title={`테마: ${LABEL[mode]}`}
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
        {mode === 'system' && (
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        )}
        {mode === 'light' && (
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        )}
        {mode === 'dark' && (
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        )}
      </svg>
    </button>
  )
}
