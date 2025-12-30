'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '@/store/store'
import { logout } from '@/store/slices/authSlice'
import { useRouter } from 'next/navigation'
import { getUsernameFromToken } from '@/utils/jwt'

interface HeaderProps {
  onLoginClick: () => void
}

export default function Header({ onLoginClick }: HeaderProps) {
  const [mounted, setMounted] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const dispatch = useDispatch()
  const router = useRouter()

  // Hydration 에러 방지: 클라이언트에서만 마운트된 후 인증 상태 표시
  useEffect(() => {
    setMounted(true)
    if (isAuthenticated) {
      setUsername(getUsernameFromToken())
    }
  }, [isAuthenticated])

  const handleLogout = useCallback(() => {
    // Redux 상태에서 로그아웃 처리 (토큰 제거 포함)
    dispatch(logout())
    
    // localStorage에서 토큰 제거 (이중 확인)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    }
    
    // 메인 페이지로 이동 후 새로고침하여 완전한 로그아웃 상태로 전환
    router.push('/')
    router.refresh()
  }, [dispatch, router])

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-3" prefetch={true}>
            <img
              src="/asset/logo.png"
              alt="로고"
              width={40}
              height={40}
              className="object-contain"
            />
            <span className="text-lg font-semibold text-gray-800">
              rjsgud's forum
            </span>
          </Link>
          
          <nav className="flex items-center space-x-4">
            <Link
              href="/posts-list"
              className="text-gray-700 hover:text-primary transition-colors"
              prefetch={true}
            >
              게시글 목록
            </Link>
                <Link
                  href="/posts"
                  className="text-gray-700 hover:text-primary transition-colors"
                  prefetch={true}
                >
                  게시글 작성
                </Link>
                <Link
                  href="/my-posts"
                  className="text-gray-700 hover:text-primary transition-colors"
                  prefetch={true}
                >
                  내 게시글
                </Link>
            {mounted && isAuthenticated ? (
              <>
                
                <span className="text-gray-700 font-medium">
                  {username || '사용자'}님 환영합니다.
                </span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-gray-700 hover:text-primary transition-colors"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <button
                onClick={onLoginClick}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors"
              >
                로그인
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}

