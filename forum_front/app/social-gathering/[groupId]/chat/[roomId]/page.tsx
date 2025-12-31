'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import { groupApi, imageUploadApi } from '@/services/api'
import type { GroupChatMessageDTO, GroupChatRoomDTO, GroupDetailDTO } from '@/types/api'
import Header from '@/components/Header'
import LoginModal from '@/components/LoginModal'
import ImageCropModal from '@/components/ImageCropModal'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { getUsernameFromToken } from '@/utils/jwt'

export default function ChatRoomPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = Number(params.groupId)
  const roomId = Number(params.roomId)
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const [group, setGroup] = useState<GroupDetailDTO | null>(null)
  const [chatRooms, setChatRooms] = useState<GroupChatRoomDTO[]>([])
  const [messages, setMessages] = useState<GroupChatMessageDTO[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showImageCrop, setShowImageCrop] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string>('')
  const [uploadingProfile, setUploadingProfile] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const currentUsername = getUsernameFromToken()
  const profileImageInputRef = useRef<HTMLInputElement>(null)
  const [editingRoom, setEditingRoom] = useState(false)
  const [editRoomName, setEditRoomName] = useState('')
  const [editRoomDescription, setEditRoomDescription] = useState('')
  const [updatingRoom, setUpdatingRoom] = useState(false)

  useEffect(() => {
    if (groupId) {
      fetchGroupDetail()
      fetchChatRooms()
    }
  }, [groupId])

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

  const fetchGroupDetail = async () => {
    try {
      const response = await groupApi.getGroupDetail(groupId)
      if (response.success && response.data) {
        console.log('Group detail:', response.data)
        console.log('Is Admin:', response.data.isAdmin)
        setGroup(response.data)
      }
    } catch (error) {
      console.error('모임 상세 조회 실패:', error)
    }
  }

  const fetchChatRooms = async () => {
    try {
      const response = await groupApi.getChatRooms(groupId)
      if (response.success && response.data) {
        setChatRooms(response.data)
      }
    } catch (error) {
      console.error('채팅방 목록 조회 실패:', error)
    }
  }

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
        const reversedMessages = [...response.data].reverse()
        console.log('Messages:', reversedMessages)
        console.log('First message isAdmin:', reversedMessages[0]?.isAdmin)
        setMessages(reversedMessages)
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

  const handleChatRoomClick = (selectedRoomId: number) => {
    router.push(`/social-gathering/${groupId}/chat/${selectedRoomId}`)
  }

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const imageSrc = event.target?.result as string
        setSelectedImage(imageSrc)
        setShowImageCrop(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageCrop = async (croppedImageBlob: Blob) => {
    try {
      setUploadingProfile(true)
      const file = new File([croppedImageBlob], 'profile.jpg', { type: 'image/jpeg' })
      const uploadResponse = await imageUploadApi.uploadImage(file)
      
      if (uploadResponse.success && uploadResponse.data) {
        const profileImageUrl = uploadResponse.data.url
        await groupApi.updateChatRoom(groupId, roomId, { profileImageUrl })
        await fetchChatRooms()
        setShowImageCrop(false)
        setSelectedImage('')
        alert('채팅방 프로필 이미지가 업데이트되었습니다.')
      }
    } catch (error: any) {
      console.error('프로필 이미지 업로드 실패:', error)
      alert('프로필 이미지 업로드에 실패했습니다.')
    } finally {
      setUploadingProfile(false)
    }
  }

  const handleStartEditRoom = () => {
    if (currentRoom) {
      setEditRoomName(currentRoom.name)
      setEditRoomDescription(currentRoom.description || '')
      setEditingRoom(true)
    }
  }

  const handleCancelEditRoom = () => {
    setEditingRoom(false)
    setEditRoomName('')
    setEditRoomDescription('')
  }

  const handleUpdateRoom = async () => {
    if (!editRoomName.trim() || editRoomName.length < 2) {
      alert('채팅방 이름은 2자 이상이어야 합니다.')
      return
    }

    try {
      setUpdatingRoom(true)
      await groupApi.updateChatRoom(groupId, roomId, {
        name: editRoomName,
        description: editRoomDescription || undefined,
      })
      await fetchChatRooms()
      setEditingRoom(false)
      alert('채팅방 정보가 업데이트되었습니다.')
    } catch (error: any) {
      console.error('채팅방 정보 업데이트 실패:', error)
      alert(error.response?.data?.message || '채팅방 정보 업데이트에 실패했습니다.')
    } finally {
      setUpdatingRoom(false)
    }
  }

  const currentRoom = chatRooms.find((room) => room.id === roomId)

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <Header onLoginClick={() => {}} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header onLoginClick={() => setShowLoginModal(true)} />
      <div className="flex-1 flex overflow-hidden">
        {/* 왼쪽: 채팅방 리스트 */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* 헤더 */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-800">
                {group?.name || '모임'}
              </h2>
              <button
                onClick={() => router.push(`/social-gathering/${groupId}`)}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                ← 모임
              </button>
            </div>
            {group?.isAdmin && (
              <button
                onClick={() => {
                  const name = prompt('채팅방 이름을 입력하세요:')
                  if (name && name.length >= 2) {
                    groupApi
                      .createChatRoom(groupId, { name, description: '' })
                      .then(() => {
                        fetchChatRooms()
                      })
                      .catch((error) => {
                        console.error('채팅방 생성 실패:', error)
                        alert('채팅방 생성에 실패했습니다.')
                      })
                  }
                }}
                className="w-full mt-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm transition"
              >
                + 채팅방 추가
              </button>
            )}
          </div>

          {/* 채팅방 목록 */}
          <div className="flex-1 overflow-y-auto">
            {chatRooms.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                채팅방이 없습니다.
              </div>
            ) : (
              <div className="p-2">
                {chatRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => handleChatRoomClick(room.id)}
                    className={`p-3 rounded-lg cursor-pointer transition mb-1 ${
                      room.id === roomId
                        ? 'bg-blue-50 border-l-4 border-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {room.profileImageUrl ? (
                          <img
                            src={room.profileImageUrl}
                            alt={room.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">
                              {room.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-800 truncate">
                            {room.name}
                          </h3>
                          {room.isAdminRoom && (
                            <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                              관리자
                            </span>
                          )}
                        </div>
                        {room.description && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {room.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: 채팅 영역 */}
        <div className="flex-1 flex flex-col bg-white">
          {currentRoom ? (
            <>
              {/* 채팅방 헤더 */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    {currentRoom.profileImageUrl ? (
                      <img
                        src={currentRoom.profileImageUrl}
                        alt={currentRoom.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center border-2 border-gray-200">
                        <span className="text-blue-600 font-semibold text-2xl">
                          {currentRoom.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    {group?.isAdmin && (
                      <button
                        onClick={() => profileImageInputRef.current?.click()}
                        className="absolute bottom-0 right-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-blue-600 transition"
                        title="프로필 이미지 변경"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    )}
                    <input
                      ref={profileImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageChange}
                      className="hidden"
                    />
                  </div>
                  <div className="flex-1">
                    {editingRoom ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editRoomName}
                          onChange={(e) => setEditRoomName(e.target.value)}
                          placeholder="채팅방 이름"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          disabled={updatingRoom}
                        />
                        <textarea
                          value={editRoomDescription}
                          onChange={(e) => setEditRoomDescription(e.target.value)}
                          placeholder="채팅방 설명 (선택사항)"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          disabled={updatingRoom}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleUpdateRoom}
                            disabled={updatingRoom || !editRoomName.trim() || editRoomName.length < 2}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updatingRoom ? '저장 중...' : '저장'}
                          </button>
                          <button
                            onClick={handleCancelEditRoom}
                            disabled={updatingRoom}
                            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-sm transition disabled:opacity-50"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-800">
                            {currentRoom.name}
                          </h3>
                          {currentRoom.isAdminRoom && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                              관리자 전용
                            </span>
                          )}
                          {group?.isAdmin && (
                            <button
                              onClick={handleStartEditRoom}
                              className="text-gray-400 hover:text-gray-600 transition"
                              title="채팅방 설정"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </button>
                          )}
                        </div>
                        {currentRoom.description && (
                          <p className="text-sm text-gray-500 mt-0.5">
                            {currentRoom.description}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 메시지 영역 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                      <p className="text-lg mb-2">메시지가 없습니다.</p>
                      <p className="text-sm">첫 메시지를 보내보세요!</p>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isMyMessage = currentUsername === message.username
                    return (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${isMyMessage ? 'flex-row-reverse' : ''}`}
                      >
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
                        <div className={`flex-1 ${isMyMessage ? 'flex flex-col items-end' : ''}`}>
                          <div className={`flex items-baseline gap-2 mb-1 ${isMyMessage ? 'flex-row-reverse' : ''}`}>
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-sm text-gray-800">
                                {message.nickname}
                              </span>
                              {message.isAdmin && (
                                <svg
                                  className="w-4 h-4 text-yellow-500"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <title>관리자</title>
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              )}
                              {isMyMessage && <span className="text-blue-500 ml-1 text-xs">(나)</span>}
                            </div>
                            <span className="text-xs text-gray-500">
                              {format(new Date(message.createdTime), 'HH:mm', { locale: ko })}
                            </span>
                          </div>
                          <div
                            className={`rounded-lg px-4 py-2 inline-block max-w-md ${
                              isMyMessage
                                ? 'bg-blue-500 text-white'
                                : 'bg-white text-gray-900 border border-gray-200'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {message.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 입력 영역 */}
              <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-4 bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="메시지를 입력하세요..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={sending || !isAuthenticated}
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim() || !isAuthenticated}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {sending ? '전송 중...' : '전송'}
                  </button>
                </div>
                {!isAuthenticated && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    로그인이 필요합니다.
                  </p>
                )}
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <p className="text-lg mb-2">채팅방을 선택해주세요</p>
                <p className="text-sm">왼쪽에서 채팅방을 선택하면 대화를 시작할 수 있습니다.</p>
              </div>
            </div>
          )}
        </div>
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

      {showImageCrop && selectedImage && (
        <ImageCropModal
          isOpen={showImageCrop}
          imageSrc={selectedImage}
          onClose={() => {
            setShowImageCrop(false)
            setSelectedImage('')
          }}
          onCrop={handleImageCrop}
          aspectRatio={1}
        />
      )}
    </div>
  )
}
