'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '@/store/store'
import { logout } from '@/store/slices/authSlice'
import { useRouter } from 'next/navigation'
import { getUsernameFromToken } from '@/utils/jwt'
import { authApi } from '@/services/api'
import { store } from '@/store/store'
import type { User } from '@/types/api'

interface HeaderProps {
  onLoginClick: () => void
}

export default function Header({ onLoginClick }: HeaderProps) {
  const [mounted, setMounted] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const lastFetchedUsernameRef = useRef<string | null>(null) // 마지막으로 가져온 username 추적
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const dispatch = useDispatch()
  const router = useRouter()

  const fetchUserInfo = useCallback(async (retryCount = 0) => {
    try {
      const response = await authApi.getCurrentUser()
      if (response.success && response.data) {
        // 사용자 정보가 변경된 경우에만 업데이트 (깜빡임 방지)
        setUser(prevUser => {
          // 프로필 이미지 URL과 username이 동일하면 업데이트하지 않음
          if (prevUser?.profileImageUrl === response.data?.profileImageUrl && 
              prevUser?.username === response.data?.username) {
            return prevUser
          }
          return response.data
        })
      }
    } catch (error: any) {
      // 403 또는 401 에러인 경우에만 처리 (다른 에러는 무시)
      if (error?.response?.status === 403 || error?.response?.status === 401) {
        // 토큰 재발급이 자동으로 처리되므로, 재발급 후 재시도
        // 최대 2번만 재시도 (무한 루프 방지)
        if (retryCount < 2) {
          // 재발급이 완료될 시간을 주기 위해 약간의 지연
          setTimeout(() => {
            fetchUserInfo(retryCount + 1)
          }, 1500)
        } else {
          // 재시도 후에도 실패하면 로그아웃 처리하지 않고 조용히 실패
          // (다른 컴포넌트에서도 사용자 정보를 조회할 수 있으므로)
          console.warn('사용자 정보 조회 실패: 최대 재시도 횟수 초과')
        }
      } else {
        // 403/401이 아닌 다른 에러는 로그만 남기고 조용히 실패
        console.error('사용자 정보 조회 실패:', error)
      }
    }
  }, [])

  // Hydration 에러 방지: 클라이언트에서만 마운트된 후 인증 상태 표시
  useEffect(() => {
    setMounted(true)
    if (isAuthenticated) {
      const currentUsername = getUsernameFromToken()
      setUsername(currentUsername)
      
      // 이미 사용자 정보가 있고 username이 동일하면 다시 가져오지 않음 (깜빡임 방지)
      if (lastFetchedUsernameRef.current !== currentUsername) {
        lastFetchedUsernameRef.current = currentUsername
        fetchUserInfo()
      }
    } else {
      // 로그아웃 시 사용자 정보 초기화
      setUser(null)
      setUsername(null)
      lastFetchedUsernameRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, fetchUserInfo])

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  const handleLogout = useCallback(async () => {
    try {
      // 서버의 쿠키도 삭제
      await authApi.logout()
    } catch (error) {
      console.error('로그아웃 실패:', error)
    } finally {
      // Redux 상태 초기화
      dispatch(logout())
      // 메인 페이지로 이동 후 새로고침하여 완전한 로그아웃 상태로 전환
      router.push('/')
      router.refresh()
    }
  }, [dispatch, router])

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
              게시글
            </Link>
                {mounted && isAuthenticated ? (
                  <>
                <Link
                  href="/my-posts"
                  className="text-gray-700 hover:text-primary transition-colors"
                  prefetch={true}
                >
                  내 게시글
                </Link>
                <Link
                  href="/social-gathering"
                  className="text-gray-700 hover:text-primary transition-colors"
                  prefetch={true}
                >
                  모임
                </Link>
                <Link
                  href="/chat"
                  className="text-gray-700 hover:text-primary transition-colors"
                  prefetch={true}
                >
                  채팅
                </Link>
                  </>
                ) : (
                  <>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      onLoginClick()
                    }}
                    className="text-gray-700 hover:text-primary transition-colors"
                  >
                    내 게시글
                  </button>
                  </>
                )}
            {mounted && isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center focus:outline-none"
                >
                  {user?.profileImageUrl ? (
                    <Image
                      src={user.profileImageUrl.startsWith('http') 
                        ? user.profileImageUrl 
                        : `${process.env.NEXT_PUBLIC_UPLOAD_BASE_URL || ''}${user.profileImageUrl}`}
                      alt="프로필"
                      width={40}
                      height={40}
                      className="rounded-full object-cover border-2 border-gray-200 hover:border-primary transition-colors"
                      unoptimized
                      priority
                      onError={(e) => {
                        // 이미지 로드 실패 시 placeholder로 대체
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          const placeholder = document.createElement('div')
                          placeholder.className = 'w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center border-2 border-gray-200'
                          placeholder.innerHTML = `<span class="text-gray-600 font-medium text-sm">${username?.charAt(0).toUpperCase() || 'U'}</span>`
                          parent.appendChild(placeholder)
                        }
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center border-2 border-gray-200 hover:border-primary transition-colors">
                      <span className="text-gray-600 font-medium text-sm">
                        {username?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </button>
                
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <Link
                      href="/settings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowDropdown(false)}
                    >
                      설정
                    </Link>
                     <Link
                      href="/social"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      prefetch={true}
                    >
                      소셜
                    </Link>
                    <button
                      onClick={() => {
                        setShowDropdown(false)
                        handleLogout()
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
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

