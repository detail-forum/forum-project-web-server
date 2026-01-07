'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import { notificationApi } from '@/services/api'
import type { NotificationDTO } from '@/types/api'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

interface NotificationModalProps {
  isOpen: boolean
  onClose: () => void
}

type NotificationFilter = 'ALL' | 'POST_LIKE' | 'COMMENT_REPLY' | 'NEW_FOLLOWER' | 'NEW_MESSAGE' | 'ADMIN_NOTICE'

export default function NotificationModal({ isOpen, onClose }: NotificationModalProps) {
  const [notifications, setNotifications] = useState<NotificationDTO[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<NotificationDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState<NotificationFilter>('ALL')
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const router = useRouter()
  const modalRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await notificationApi.getNotifications(0, 50) // 최대 50개
      if (response.success && response.data) {
        // isRead가 0/1로 올 수 있으므로 boolean으로 변환
        const notifications = (response.data.content || []).map((n: any) => ({
          ...n,
          isRead: typeof n.isRead === 'boolean' ? n.isRead : n.isRead === 1 || n.isRead === '1' || n.isRead === true
        }))
        setNotifications(notifications)
      }
    } catch (error) {
      console.error('알림 조회 실패:', error)
    } finally {
      setLoading(false)
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
      console.error('알림 개수 조회 실패:', error)
    }
  }, [isAuthenticated])

  const handleMarkAsRead = async (notificationId: number): Promise<void> => {
    try {
      // 백엔드에서 업데이트된 알림 정보를 받아옴
      const response = await notificationApi.markAsRead(notificationId)
      if (response.success && response.data) {
        // isRead를 boolean으로 변환
        const updatedNotification = {
          ...response.data,
          isRead: typeof response.data.isRead === 'boolean' 
            ? response.data.isRead 
            : response.data.isRead === 1 || response.data.isRead === '1' || response.data.isRead === true
        }
        // 서버에서 반환한 최신 상태로 업데이트
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? updatedNotification : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error)
      throw error // 에러를 다시 throw하여 호출자가 처리할 수 있도록
    }
  }

  // 필터 적용
  useEffect(() => {
    if (filter === 'ALL') {
      setFilteredNotifications(notifications)
    } else {
      setFilteredNotifications(notifications.filter(n => n.type === filter))
    }
  }, [notifications, filter])

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('모든 알림 읽음 처리 실패:', error)
    }
  }

  const getNotificationLink = (notification: NotificationDTO): string => {
    switch (notification.type) {
      case 'POST_LIKE':
        if (notification.relatedGroupPostId && notification.relatedGroupId) {
          return `/social-gathering/${notification.relatedGroupId}/posts/${notification.relatedGroupPostId}`
        }
        return notification.relatedPostId ? `/posts/${notification.relatedPostId}` : '#'
      case 'COMMENT_REPLY':
        if (notification.relatedGroupPostId && notification.relatedGroupId) {
          return `/social-gathering/${notification.relatedGroupId}/posts/${notification.relatedGroupPostId}`
        }
        return notification.relatedPostId ? `/posts/${notification.relatedPostId}` : '#'
      case 'NEW_FOLLOWER':
        return notification.relatedUserId ? `/users/${notification.relatedUserNickname || ''}` : '#'
      case 'NEW_MESSAGE':
        return '/chat'
      case 'ADMIN_NOTICE':
        return '#'
      default:
        return '#'
    }
  }

  const getNotificationIcon = (type: NotificationDTO['type']) => {
    switch (type) {
      case 'POST_LIKE':
        return '❤️'
      case 'COMMENT_REPLY':
        return '💬'
      case 'NEW_FOLLOWER':
        return '👤'
      case 'NEW_MESSAGE':
        return '📨'
      case 'ADMIN_NOTICE':
        return '📢'
      default:
        return '🔔'
    }
  }

  const handleNotificationClick = async (notification: NotificationDTO) => {
    // 읽지 않은 알림이면 먼저 읽음 처리
    if (!notification.isRead) {
      try {
        // 백엔드에서 최신 상태를 받아와서 업데이트
        await handleMarkAsRead(notification.id)
      } catch (error) {
        console.error('알림 읽음 처리 실패:', error)
      }
    }
    
    const link = getNotificationLink(notification)
    if (link !== '#') {
      onClose()
      router.push(link)
    }
  }

  const getFilterLabel = (filterType: NotificationFilter): string => {
    switch (filterType) {
      case 'ALL': return '전체'
      case 'POST_LIKE': return '좋아요'
      case 'COMMENT_REPLY': return '댓글'
      case 'NEW_FOLLOWER': return '팔로워'
      case 'NEW_MESSAGE': return '메시지'
      case 'ADMIN_NOTICE': return '공지'
      default: return '전체'
    }
  }

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      // 모달이 열릴 때마다 최신 알림 상태를 가져옴
      fetchNotifications()
      fetchUnreadCount()
    } else if (!isOpen) {
      // 모달이 닫힐 때 상태 초기화 (다음에 열 때 깨끗한 상태로 시작)
      setNotifications([])
      setLoading(true)
    }
  }, [isOpen, isAuthenticated, fetchNotifications, fetchUnreadCount])

  // 모달 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="flex-shrink-0 border-b border-gray-200">
          <div className="px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">알림</h2>
            <div className="flex items-center space-x-4">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-primary hover:text-secondary transition-colors"
                >
                  모두 읽음
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          {/* 필터 버튼 */}
          <div className="px-6 pb-3 flex items-center space-x-2 overflow-x-auto">
            {(['ALL', 'POST_LIKE', 'COMMENT_REPLY', 'NEW_FOLLOWER', 'NEW_MESSAGE', 'ADMIN_NOTICE'] as NotificationFilter[]).map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                  filter === filterType
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {getFilterLabel(filterType)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1" style={{ maxHeight: 'calc(80vh - 140px)' }}>
          {loading ? (
            <div className="px-6 py-12 text-center text-gray-500">
              알림을 불러오는 중...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              {filter === 'ALL' ? '알림이 없습니다.' : `${getFilterLabel(filter)} 알림이 없습니다.`}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => {
                return (
                  <div
                    key={notification.id}
                    className={`px-6 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                      notification.isRead ? 'bg-white' : 'bg-blue-50'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 text-xl">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-2">
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                        {notification.relatedUserNickname && (
                          <div className="flex items-center space-x-1.5">
                            {notification.relatedUserProfileImageUrl ? (
                              <Image
                                src={
                                  notification.relatedUserProfileImageUrl.startsWith('http')
                                    ? notification.relatedUserProfileImageUrl
                                    : `${process.env.NEXT_PUBLIC_UPLOAD_BASE_URL || ''}${notification.relatedUserProfileImageUrl}`
                                }
                                alt={notification.relatedUserNickname}
                                width={20}
                                height={20}
                                className="rounded-full object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-xs text-gray-600">
                                  {notification.relatedUserNickname.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className="text-xs text-gray-500 max-w-[80px] truncate">
                              {notification.relatedUserNickname}
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-gray-400 whitespace-nowrap">
                          {formatDistanceToNow(new Date(notification.createdTime), {
                            addSuffix: true,
                            locale: ko,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
