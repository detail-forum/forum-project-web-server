'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '@/store/store'
import { logout } from '@/store/slices/authSlice'
import { useRouter, usePathname } from 'next/navigation'
import { getUsernameFromToken } from '@/utils/jwt'
import { authApi, notificationApi } from '@/services/api'
import { store } from '@/store/store'
import type { User } from '@/types/api'
import NotificationModal from './NotificationModal'
import ThemeToggle from './ThemeToggle'

interface HeaderProps {
  onLoginClick: () => void
}

export default function Header({ onLoginClick }: HeaderProps) {
  const [mounted, setMounted] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const lastFetchedUsernameRef = useRef<string | null>(null) // 마지막으로 가져온 username 추적
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const dispatch = useDispatch()
  const router = useRouter()
  const pathname = usePathname()
  // 현재 위치한 메뉴를 표시한다.
  const navClass = (href: string) =>
    `text-sm font-medium transition-colors hover:text-primary ${
      pathname === href || pathname?.startsWith(href + '/') ? 'text-primary' : 'text-gray-600'
    }`

  const fetchUserInfo = useCallback(async (retryCount = 0) => {
    // 인증되지 않은 상태에서는 API 호출하지 않음 (무한 루프 방지)
    if (!isAuthenticated) {
      return
    }

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
        // 인증되지 않은 상태로 변경되었을 수 있으므로 조용히 실패
        // 토큰 재발급이 자동으로 처리되지만, 비 로그인 사용자의 경우 재시도하지 않음
        if (isAuthenticated && retryCount < 1) {
          // 인증된 상태에서만 한 번 재시도 (무한 루프 방지)
          setTimeout(() => {
            fetchUserInfo(retryCount + 1)
          }, 1500)
        } else {
          // 재시도 후에도 실패하면 조용히 실패 (비 로그인 상태일 수 있음)
          console.debug('사용자 정보 조회 실패 (로그인하지 않음)')
        }
      } else {
        // 403/401이 아닌 다른 에러는 로그만 남기고 조용히 실패
        console.error('사용자 정보 조회 실패:', error)
      }
    }
  }, [isAuthenticated])

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const response = await notificationApi.getUnreadCount()
      if (response.success) {
        setUnreadCount(response.data)
      }
    } catch (error) {
      // 알림 개수 조회 실패는 조용히 무시
      console.error('알림 개수 조회 실패:', error)
    }
  }, [isAuthenticated])

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
      
      // 알림 개수 조회
      fetchUnreadCount()
      
      // 주기적으로 알림 개수 갱신 (30초마다)
      const interval = setInterval(() => {
        fetchUnreadCount()
      }, 30000)
      
      return () => clearInterval(interval)
    } else {
      // 로그아웃 시 사용자 정보 초기화
      setUser(null)
      setUsername(null)
      setUnreadCount(0)
      lastFetchedUsernameRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, fetchUserInfo, fetchUnreadCount])

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
    <>
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/80">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-3" prefetch={true}>
            <img
              src="/asset/logo.png"
              alt="로고"
              width={40}
              height={40}
              className="object-contain"
            />
            <span className="text-lg font-bold tracking-tight text-gray-900">
              rjsgud's forum
            </span>
          </Link>
          
          <nav className="flex items-center gap-5">
            <Link
              href="/posts-list"
              className={navClass("/posts-list")}
              prefetch={true}
            >
              게시글
            </Link>
                {mounted && isAuthenticated ? (
                  <>
                <Link
                  href="/my-posts"
                  className={navClass("/my-posts")}
                  prefetch={true}
                >
                  내 게시글
                </Link>
                <Link
                  href="/social-gathering"
                  className={navClass("/social-gathering")}
                  prefetch={true}
                >
                  모임
                </Link>
                <Link
                  href="/chat"
                  className={navClass("/chat")}
                  prefetch={true}
                >
                  채팅
                </Link>
                <button
                  onClick={() => setShowNotificationModal(true)}
                  className="relative p-1.5 rounded-full text-gray-600 hover:text-primary hover:bg-gray-100 transition-colors"
                >
                  <span className="sr-only">알림</span>
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center ring-2 ring-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                  </>
                ) : (
                  <>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      onLoginClick()
                    }}
                    className={navClass('/my-posts')}
                  >
                    내 게시글
                  </button>
                  </>
                )}
            <ThemeToggle />
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
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 p-1 z-50">
                    <Link
                      href="/settings"
                      className="block px-3 py-2 text-sm rounded-lg text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowDropdown(false)}
                    >
                      설정
                    </Link>
                     <Link
                      href="/social"
                      className="block px-3 py-2 text-sm rounded-lg text-gray-700 hover:bg-gray-100"
                      prefetch={true}
                    >
                      소셜
                    </Link>
                    {user?.role === 'ADMIN' && (
                      <Link
                        href="/admin"
                        className="block px-3 py-2 text-sm rounded-lg text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowDropdown(false)}
                      >
                        서비스 관리
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setShowDropdown(false)
                        handleLogout()
                      }}
                      className="block w-full text-left px-3 py-2 text-sm rounded-lg text-red-600 hover:bg-red-50"
                    >
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onLoginClick}
                className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-secondary transition-colors"
              >
                로그인
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
      {/* 헤더 밖에 둔다. 헤더의 backdrop-blur가 fixed 요소의 기준을 헤더로 바꿔 모달이 헤더 안에 갇힌다. */}
      {showNotificationModal && (
        <NotificationModal
          isOpen={showNotificationModal}
          onClose={() => {
            setShowNotificationModal(false)
            fetchUnreadCount() // 모달 닫을 때 알림 개수 갱신
          }}
        />
      )}
    </>
  )
}

