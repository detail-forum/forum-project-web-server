'use client'

import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { setCredentials } from '@/store/slices/authSlice'
import { authApi } from '@/services/api'

// 클라이언트에서만 서버의 쿠키를 확인하여 Redux 상태 초기화
export default function AuthInitializer() {
  const dispatch = useDispatch()

  useEffect(() => {
    // HttpOnly 쿠키는 JavaScript에서 읽을 수 없으므로 서버 API로 확인
    const initializeAuth = async () => {
      try {
        const response = await authApi.verifyAuth()
        if (response.success && response.data) {
          // 서버가 쿠키에서 토큰을 읽어서 반환했으므로 Redux store 초기화
          dispatch(setCredentials({
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken,
          }))
        }
      } catch (error) {
        // 인증 실패 시 무시 (로그인하지 않은 상태)
        console.debug('인증 상태 확인 실패 (로그인하지 않음)')
      }
    }

    initializeAuth()
  }, [dispatch])

  return null
}

