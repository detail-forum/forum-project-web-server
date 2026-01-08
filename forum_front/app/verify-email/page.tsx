'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authApi } from '@/services/api'
import Link from 'next/link'

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('이메일 인증을 처리하고 있습니다...')

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error')
        setMessage('인증 토큰이 없습니다.')
        return
      }

      try {
        const response = await authApi.verifyEmail(token)
        if (response.success) {
          setStatus('success')
          setMessage('이메일 인증이 완료되었습니다! 이제 로그인하실 수 있습니다.')
          // 3초 후 로그인 페이지로 리다이렉트
          setTimeout(() => {
            router.push('/')
          }, 3000)
        } else {
          setStatus('error')
          setMessage(response.message || '이메일 인증에 실패했습니다.')
        }
      } catch (error: any) {
        setStatus('error')
        const errorMessage = error.response?.data?.message || '이메일 인증에 실패했습니다.'
        setMessage(errorMessage)
      }
    }

    verifyEmail()
  }, [token, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">이메일 인증 중</h1>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">인증 완료!</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-secondary transition-colors"
              >
                홈으로 이동
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">인증 실패</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="space-y-3">
                <Link
                  href="/"
                  className="block px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-secondary transition-colors text-center"
                >
                  홈으로 이동
                </Link>
                <button
                  onClick={() => router.back()}
                  className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  이전 페이지로
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
