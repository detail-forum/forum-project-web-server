'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import { groupApi } from '@/services/api'
import type { GroupChatMessageDTO } from '@/types/api'
import Header from '@/components/Header'
import LoginModal from '@/components/LoginModal'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function ChatRoomPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = Number(params.groupId)
  const roomId = Number(params.roomId)
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const [messages, setMessages] = useState<GroupChatMessageDTO[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (groupId && roomId) {
      fetchMessages()
      // 폴링으로 메시지 새로고침 (5초마다)
      const interval = setInterval(() => {
        fetchMessages()
      }, 5000)
      setPollingInterval(interval)

      return () => {
        if (interval) clearInterval(interval)
      }
    }
  }, [groupId, roomId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = async () => {
    try {
      const response = await groupApi.getChatMessages(groupId, roomId, 0, 100)
      if (response.success && response.data) {
        // 최신 메시지가 아래에 오도록 역순 정렬
        setMessages([...response.data].reverse())
      }
    } catch (error) {
      console.error('채팅 메시지 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isAuthenticated) {
      setShowLoginModal(true)
      return
    }

    if (!newMessage.trim()) return

    try {
      setSending(true)
      const response = await groupApi.sendChatMessage(groupId, roomId, { message: newMessage })
      if (response.success) {
        setNewMessage('')
        // 메시지 전송 후 즉시 새로고침
        setTimeout(() => {
          fetchMessages()
        }, 500)
      }
    } catch (error: any) {
      console.error('메시지 전송 실패:', error)
      alert(error.response?.data?.message || '메시지 전송에 실패했습니다.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Header onLoginClick={() => {}} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          로딩 중...
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <Header onLoginClick={() => setShowLoginModal(true)} />
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="py-4 border-b">
          <button
            onClick={() => router.back()}
            className="text-blue-500 hover:text-blue-600"
          >
            ← 뒤로가기
          </button>
        </div>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-12">메시지가 없습니다.</div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="flex gap-3">
                <div className="flex-shrink-0">
                  {message.profileImageUrl ? (
                    <img
                      src={message.profileImageUrl}
                      alt={message.nickname}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-semibold">
                      {message.nickname.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-semibold text-sm">{message.nickname}</span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(message.createdTime), 'HH:mm', { locale: ko })}
                    </span>
                  </div>
                  <div className="bg-gray-100 rounded-lg px-4 py-2 inline-block">
                    <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 입력 영역 */}
        <form onSubmit={handleSendMessage} className="border-t p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="메시지를 입력하세요..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sending || !isAuthenticated}
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim() || !isAuthenticated}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? '전송 중...' : '전송'}
            </button>
          </div>
          {!isAuthenticated && (
            <p className="text-sm text-gray-500 mt-2">로그인이 필요합니다.</p>
          )}
        </form>
      </div>

      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => {
            setShowLoginModal(false)
          }}
        />
      )}
    </div>
  )
}
