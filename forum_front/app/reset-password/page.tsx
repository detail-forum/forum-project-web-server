'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/services/api'

// 토큰 없이 열면 메일 요청 폼, 메일 링크(?token=)로 열면 새 비밀번호 폼.
function ResetPasswordForm() {
  const token = useSearchParams().get('token')
  const [value, setValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (token && value !== confirm) {
      setError('비밀번호가 서로 다릅니다.')
      return
    }
    setLoading(true)
    try {
      const response = token
        ? await authApi.resetPassword(token, value)
        : await authApi.requestPasswordReset(value)
      setMessage(response.message || '처리되었습니다.')
      setDone(true)
    } catch (err: any) {
      setError(err.response?.data?.message || '요청에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent'

  return (
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">비밀번호 재설정</h1>

      {done ? (
        <>
          <p className="text-gray-600 mb-6">{message}</p>
          <Link
            href="/"
            className="block px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-secondary transition-colors text-center"
          >
            홈으로 이동
          </Link>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-600">
            {token
              ? '새 비밀번호를 입력해주세요.'
              : '가입한 이메일을 입력하면 아이디와 비밀번호 재설정 링크를 보내드립니다.'}
          </p>
          {token ? (
            <>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</span>
                <input type="password" required minLength={6} value={value}
                  onChange={(e) => setValue(e.target.value)} autoComplete="new-password" className={inputClass} />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 확인</span>
                <input type="password" required minLength={6} value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className={inputClass} />
              </label>
            </>
          ) : (
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">이메일</span>
              <input type="email" required value={value}
                onChange={(e) => setValue(e.target.value)} autoComplete="email" className={inputClass} />
            </label>
          )}
          {error && <p className="text-red-500 text-sm" role="alert">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '처리 중...' : token ? '비밀번호 변경' : '재설정 메일 받기'}
          </button>
        </form>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
