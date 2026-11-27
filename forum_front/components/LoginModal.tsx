'use client'

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import { setCredentials } from '@/store/slices/authSlice'
import { authApi } from '@/services/api'
import { useRouter } from 'next/navigation'

interface LoginModalProps {
  isOpen?: boolean
  onClose: () => void
  onLoginSuccess?: () => void
}

export default function LoginModal({ isOpen = true, onClose, onLoginSuccess }: LoginModalProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nickname: '',
    email: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showEmailVerification, setShowEmailVerification] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const dispatch = useDispatch()
  const router = useRouter()
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)

  // 새로고침 직후에는 세션 복원(AuthInitializer) 전이라 비로그인으로 보여 페이지가 모달을 연다. 복원되면 닫는다.
  useEffect(() => {
    if (isOpen && isAuthenticated) onClose()
  }, [isOpen, isAuthenticated, onClose])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        const response = await authApi.login({
          username: formData.username,
          password: formData.password,
        })
        if (response.success && response.data) {
          dispatch(setCredentials({
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken,
          }))
          onClose()
          if (onLoginSuccess) {
            onLoginSuccess()
          }
          router.refresh()
        }
      } else {
        const response = await authApi.register({
          username: formData.username,
          password: formData.password,
          nickname: formData.nickname,
          email: formData.email,
        })
        if (response.success) {
          // 회원가입 성공 - 이메일 인증 안내 모달 표시
          setError('')
          setIsLogin(true) // 로그인 모드로 전환
          setFormData({ username: '', password: '', nickname: '', email: '' })
          // 이메일 인증 안내 모달 표시
          alert('회원가입이 완료되었습니다!\n\n이메일을 확인하여 인증을 완료해주세요.\n인증이 완료되면 로그인하실 수 있습니다.')
        }
      }
    } catch (err: any) {
      const status = err.response?.status
      const errorMessage = err.response?.data?.message || '오류가 발생했습니다.'
      
      // 상태 코드에 따라 적절한 메시지 표시
      if (status === 401 || status === 403) {
        // 인증 실패 (아이디/비밀번호 틀림 또는 이메일 미인증)
        if (errorMessage.includes('이메일 인증이 완료되지 않았습니다') || 
            errorMessage.includes('이메일 인증')) {
          setError('')
          setShowEmailVerification(true)
          setResendEmail('')
        } else {
          // 아이디/비밀번호 틀림
          setError(errorMessage || '아이디 또는 비밀번호가 올바르지 않습니다.')
          setShowEmailVerification(false)
        }
      } else if (status === 400) {
        // 잘못된 요청 (입력값 오류 등)
        setError(errorMessage)
        setShowEmailVerification(false)
      } else if (status === 500) {
        // 서버 오류
        setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
        setShowEmailVerification(false)
      } else {
        // 기타 오류
        setError(errorMessage)
        setShowEmailVerification(false)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!resendEmail.trim()) {
      setError('이메일 주소를 입력해주세요.')
      return
    }

    setResending(true)
    setError('')
    setResendSuccess(false)

    try {
      const response = await authApi.resendVerificationEmail(resendEmail)
      if (response.success) {
        setResendSuccess(true)
        setError('')
        setTimeout(() => {
          setShowEmailVerification(false)
          setResendEmail('')
          setResendSuccess(false)
        }, 3000)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '인증 메일 재발송에 실패했습니다.')
    } finally {
      setResending(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {isLogin ? '로그인' : '회원가입'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                아이디
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {!isLogin && (
              <>
                <div>
                  <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
                    닉네임
                  </label>
                  <input
                    type="text"
                    id="nickname"
                    name="nickname"
                    value={formData.nickname}
                    onChange={handleChange}
                    required
                    maxLength={15}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    이메일
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </>
            )}

            {error && !showEmailVerification && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            {showEmailVerification && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800 mb-2">
                      이메일 인증이 필요합니다
                    </p>
                    <p className="text-sm text-yellow-700 mb-3">
                      로그인하려면 먼저 이메일 인증을 완료해주세요. 인증 메일을 받지 못하셨다면 아래에서 재발송할 수 있습니다.
                    </p>
                    <div className="space-y-2">
                      <input
                        type="email"
                        placeholder="이메일 주소를 입력하세요"
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resending || resendSuccess}
                        className="w-full py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {resending ? '발송 중...' : resendSuccess ? '발송 완료!' : '인증 메일 재발송'}
                      </button>
                      {resendSuccess && (
                        <p className="text-sm text-green-600 text-center">
                          인증 메일이 발송되었습니다. 이메일을 확인해주세요.
                        </p>
                      )}
                      {error && showEmailVerification && (
                        <p className="text-sm text-red-600">{error}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEmailVerification(false)
                        setResendEmail('')
                        setError('')
                        setResendSuccess(false)
                      }}
                      className="mt-2 text-sm text-yellow-700 hover:text-yellow-900 underline"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!showEmailVerification && (
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '처리 중...' : isLogin ? '로그인' : '회원가입'}
              </button>
            )}
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
                setFormData({ username: '', password: '', nickname: '', email: '' })
                setShowEmailVerification(false)
                setResendEmail('')
                setResendSuccess(false)
              }}
              className="text-sm text-primary hover:underline"
            >
              {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
            </button>
            {isLogin && (
              <a href="/reset-password" className="block mt-2 text-sm text-gray-500 hover:underline">
                아이디·비밀번호를 잊으셨나요?
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

