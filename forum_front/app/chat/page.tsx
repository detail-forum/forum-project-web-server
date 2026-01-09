'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import Header from '@/components/Header'
import LoginModal from '@/components/LoginModal'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { getUsernameFromToken } from '@/utils/jwt'
import { directChatApi, groupApi, imageUploadApi, fileUploadApi, followApi } from '@/services/api'
import type { DirectChatRoomDTO, DirectChatMessageDTO, GroupChatRoomDTO, GroupChatMessageDTO } from '@/types/api'
import { useDirectWebSocket } from '@/hooks/useDirectWebSocket'

// 확장된 그룹 채팅방 타입 (그룹 정보 포함)
interface ExtendedGroupChatRoom extends GroupChatRoomDTO {
  groupId: number
  groupName: string
  roomId: number
  roomName: string
  roomProfileImageUrl?: string
  lastMessage?: string
  lastMessageTime?: string
  unreadCount: number
}

// 통합 메시지 타입
type ChatMessage = DirectChatMessageDTO | GroupChatMessageDTO

type ChatTab = 'direct' | 'group'

export default function ChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const [currentTab, setCurrentTab] = useState<ChatTab>('direct')
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)
  
  // Direct Chat 관련 상태
  const [directChatRooms, setDirectChatRooms] = useState<DirectChatRoomDTO[]>([])
  const [selectedDirectChat, setSelectedDirectChat] = useState<number | null>(null)
  const [directMessages, setDirectMessages] = useState<DirectChatMessageDTO[]>([])
  
  // Group Chat 관련 상태
  const [groupChatRooms, setGroupChatRooms] = useState<ExtendedGroupChatRoom[]>([])
  const [selectedGroupChat, setSelectedGroupChat] = useState<{ groupId: number; roomId: number } | null>(null)
  const [groupMessages, setGroupMessages] = useState<GroupChatMessageDTO[]>([])
  
  // 그룹 목록 (채팅방 조회용)
  const [myGroups, setMyGroups] = useState<Array<{ id: number; name: string }>>([])
  
  // 공통 상태
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const messageInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const attachmentMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentUsernameRef = useRef<string | null>(null)

  // 일반 채팅용 WebSocket 연결
  const {
    isConnected: isDirectConnected,
    sendMessage: wsSendDirectMessage,
    startTyping: startDirectTyping,
    stopTyping: stopDirectTyping,
    markAsRead: markDirectAsRead,
    typingUsers: directTypingUsers,
  } = useDirectWebSocket({
    roomId: selectedDirectChat,
    enabled: isAuthenticated && currentTab === 'direct' && !!selectedDirectChat,
    onMessage: useCallback((message: DirectChatMessageDTO) => {
      console.log('일반 채팅 메시지 수신:', message)
      setDirectMessages(prev => {
        // 중복 방지
        if (prev.some(m => m.id === message.id)) {
          console.log('중복 메시지 무시:', message.id)
          return prev
        }
        // 시간순으로 정렬
        const newMessages = [...prev, message].sort((a, b) => 
          new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime()
        )
        return newMessages
      })
      // 새 메시지가 추가되면 스크롤
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }, []),
    onTyping: useCallback((data: { username: string; isTyping: boolean }) => {
      // 타이핑 상태는 훅에서 자동 관리됨
    }, []),
    onRead: useCallback((data: { messageId: number; username: string; isRead: boolean }) => {
      // 읽음 상태 업데이트
      setDirectMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, isRead: data.isRead }
          : msg
      ))
    }, []),
  })

  // 현재 사용자 초기화
  useEffect(() => {
    if (isAuthenticated) {
      const username = getUsernameFromToken()
      setCurrentUsername(username)
      currentUsernameRef.current = username
    } else {
      setCurrentUsername(null)
      currentUsernameRef.current = null
    }
  }, [isAuthenticated])

  // currentUsername 변경 시 ref 업데이트
  useEffect(() => {
    currentUsernameRef.current = currentUsername
  }, [currentUsername])

  // 채팅방 목록 로드
  useEffect(() => {
    if (isAuthenticated && currentUsername) {
      if (currentTab === 'direct') {
        fetchDirectChatRooms()
      } else {
        fetchGroupChatRooms()
      }
    }
  }, [isAuthenticated, currentUsername, currentTab])

  // 쿼리 파라미터로 사용자 지정 시 채팅방 생성/선택
  useEffect(() => {
    const targetUsername = searchParams.get('user')
    if (targetUsername && isAuthenticated && currentUsername && currentTab === 'direct') {
      handleStartChatWithUser(targetUsername)
    }
  }, [searchParams, isAuthenticated, currentUsername, currentTab])

  // 특정 사용자와 채팅 시작
  const handleStartChatWithUser = async (targetUsername: string) => {
    try {
      // 자기 자신과는 채팅 불가
      if (targetUsername === currentUsername) {
        console.warn('자기 자신과는 채팅할 수 없습니다.')
        return
      }

      // 사용자 정보 조회
      const userInfoResponse = await followApi.getUserInfo(targetUsername)
      if (!userInfoResponse.success || !userInfoResponse.data?.id) {
        console.error('사용자 정보를 찾을 수 없습니다:', targetUsername)
        alert('사용자를 찾을 수 없습니다.')
        router.replace('/chat')
        return
      }

      const targetUserId = userInfoResponse.data.id

      // 채팅방 생성 또는 조회
      const roomResponse = await directChatApi.getOrCreateRoom(targetUserId)
      if (roomResponse.success && roomResponse.data) {
        // 채팅방 목록 새로고침
        await fetchDirectChatRooms()
        // 생성된/조회된 채팅방 선택
        setSelectedDirectChat(roomResponse.data.id)
        // 쿼리 파라미터 제거
        router.replace('/chat')
      } else {
        console.error('채팅방 생성/조회 실패:', roomResponse.message)
        alert(roomResponse.message || '채팅방을 생성할 수 없습니다.')
      }
    } catch (error: any) {
      console.error('채팅 시작 실패:', error)
      const errorMessage = error.response?.data?.message || error.message || '채팅을 시작할 수 없습니다.'
      alert(errorMessage)
      router.replace('/chat')
    }
  }


  // 선택된 채팅방의 메시지 로드
  useEffect(() => {
    if (currentTab === 'direct' && selectedDirectChat) {
      fetchDirectMessages(selectedDirectChat)
    } else if (currentTab === 'group' && selectedGroupChat) {
      fetchGroupMessages(selectedGroupChat.groupId, selectedGroupChat.roomId)
    }
  }, [currentTab, selectedDirectChat, selectedGroupChat])

  // 외부 클릭 시 첨부 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) {
        setShowAttachmentMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])


  // 1대1 채팅방 목록 조회
  const fetchDirectChatRooms = async () => {
    try {
      setLoading(true)
      const response = await directChatApi.getMyRooms()
      if (response.success && response.data) {
        setDirectChatRooms(response.data)
      } else {
        console.error('1대1 채팅방 목록 조회 실패:', response.message)
      }
    } catch (error: any) {
      console.error('1대1 채팅방 목록 조회 실패:', error)
      const errorMessage = error.response?.data?.message || error.message || '채팅방 목록을 불러올 수 없습니다.'
      console.error('에러 상세:', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // 그룹 채팅방 목록 조회
  const fetchGroupChatRooms = async () => {
    try {
      setLoading(true)
      // 먼저 내 그룹 목록 조회
      const groupsResponse = await groupApi.getGroupList(0, 100, true)
      if (!groupsResponse.success || !groupsResponse.data?.content) {
        setGroupChatRooms([])
        setLoading(false)
        return
      }
      
      const groups = groupsResponse.data.content.map((group: any) => ({
        id: group.id,
        name: group.name,
      }))
      setMyGroups(groups)
      
      // 각 그룹의 채팅방 조회
      const allRooms: ExtendedGroupChatRoom[] = []
      for (const group of groups) {
        try {
          const response = await groupApi.getChatRooms(group.id)
          if (response.success && response.data) {
            const rooms = response.data.map((room: GroupChatRoomDTO) => ({
              ...room,
              groupId: group.id,
              groupName: group.name,
              roomId: room.id,
              roomName: room.name,
              roomProfileImageUrl: room.profileImageUrl,
              lastMessage: undefined, // TODO: 마지막 메시지 정보 추가 필요
              lastMessageTime: undefined,
              unreadCount: 0, // TODO: 읽지 않은 메시지 수 추가 필요
            }))
            allRooms.push(...rooms)
          }
        } catch (error) {
          console.error(`그룹 ${group.id}의 채팅방 조회 실패:`, error)
        }
      }
      setGroupChatRooms(allRooms)
    } catch (error) {
      console.error('그룹 채팅방 목록 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 1대1 채팅 메시지 조회
 const fetchDirectMessages = async (chatRoomId: number) => {
  try {
    const response = await directChatApi.getMessages(chatRoomId, 0, 100)
    if (response.success && response.data) {
      const list = [...(response.data.content || [])].sort(
        (a, b) => new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime()
      )
      setDirectMessages(list)

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  } catch (error) {
    console.error('1대1 채팅 메시지 조회 실패:', error)
  }
}

const fetchGroupMessages = async (groupId: number, roomId: number) => {
  try {
    const response = await groupApi.getChatMessages(groupId, roomId, 0, 100)
    if (response.success && response.data) {
      const list = [...response.data].sort(
        (a, b) => new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime()
      )
      setGroupMessages(list)

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  } catch (error) {
    console.error('그룹 채팅 메시지 조회 실패:', error)
  }
}


  // 메시지 전송
const sendMessage = useCallback(async () => {
  if (!isAuthenticated || sending) return
  if (!newMessage.trim()) return

  try {
    setSending(true)

    if (currentTab === 'direct' && selectedDirectChat) {
      // WebSocket으로 먼저 전송 시도
      if (isDirectConnected) {
        const success = wsSendDirectMessage(newMessage.trim())
        if (success) {
          setNewMessage('')
          stopDirectTyping()
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
            typingTimeoutRef.current = null
          }
          return
        }
      }
      
      // WebSocket 실패 시 REST API로 폴백
      const response = await directChatApi.sendMessage(selectedDirectChat, {
        message: newMessage.trim(),
        messageType: 'TEXT' as const,
      })

      if (response.success && response.data) {
        setNewMessage('')
        stopDirectTyping()
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = null
        }
        await fetchDirectMessages(selectedDirectChat)
      } else {
        alert(response.message || '메시지 전송에 실패했습니다.')
      }
    }

    if (currentTab === 'group' && selectedGroupChat) {
      const response = await groupApi.sendChatMessage(
        selectedGroupChat.groupId,
        selectedGroupChat.roomId,
        { message: newMessage.trim() }
      )

      if (response.success) {
        setNewMessage('')
        await fetchGroupMessages(selectedGroupChat.groupId, selectedGroupChat.roomId)
      } else {
        alert(response.message || '메시지 전송에 실패했습니다.')
      }
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || '메시지 전송에 실패했습니다.'
    alert(errorMessage)
  } finally {
    setSending(false)
    // ✅ 전송 후에도 계속 채팅 가능하게 포커스 복귀
    requestAnimationFrame(() => messageInputRef.current?.focus())
  }
}, [isAuthenticated, sending, newMessage, currentTab, selectedDirectChat, selectedGroupChat, isDirectConnected, wsSendDirectMessage, stopDirectTyping])

// 폼 submit 핸들러는 얇게
const handleSendMessage = async (e: React.FormEvent) => {
  e.preventDefault()
  await sendMessage()
}

// 타이핑 인디케이터 처리
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value
  setNewMessage(value)
  
  if (currentTab === 'direct' && selectedDirectChat) {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    if (value.trim() && isDirectConnected) {
      startDirectTyping()
      // 3초 후 자동으로 타이핑 종료
      typingTimeoutRef.current = setTimeout(() => {
        stopDirectTyping()
      }, 3000)
    } else {
      stopDirectTyping()
    }
  }
}

// 메시지 표시 시 읽음 처리
useEffect(() => {
  if (currentTab === 'direct' && directMessages.length > 0 && isDirectConnected && currentUsername && selectedDirectChat) {
    const lastMessage = directMessages[directMessages.length - 1]
    // 본인이 보낸 메시지가 아니고, 아직 읽지 않은 경우
    if (lastMessage.username !== currentUsername && !lastMessage.isRead) {
      markDirectAsRead(lastMessage.id)
    }
  }
}, [directMessages, isDirectConnected, currentUsername, currentTab, selectedDirectChat, markDirectAsRead])


  // 이미지 업로드
  const handleImageUpload = async (file: File) => {
    try {
      setSending(true)
      const uploadResponse = await imageUploadApi.uploadImage(file)
      if (uploadResponse.success && uploadResponse.data) {
        if (currentTab === 'direct' && selectedDirectChat) {
          const response = await directChatApi.sendMessage(selectedDirectChat, {
            message: '',
            messageType: 'IMAGE' as const,
            fileUrl: uploadResponse.data.url,
          })
          if (response.success && response.data) {
            await fetchDirectMessages(selectedDirectChat)
          } else {
            console.error('이미지 메시지 전송 실패:', response.message)
            alert(response.message || '이미지 전송에 실패했습니다.')
          }
        } else if (currentTab === 'group' && selectedGroupChat) {
          const response = await groupApi.sendChatMessage(
            selectedGroupChat.groupId,
            selectedGroupChat.roomId,
            {
              message: '',
              messageType: 'IMAGE',
              fileUrl: uploadResponse.data.url,
            }
          )
          if (response.success) {
            await fetchGroupMessages(selectedGroupChat.groupId, selectedGroupChat.roomId)
          } else {
            console.error('이미지 메시지 전송 실패:', response.message)
            alert(response.message || '이미지 전송에 실패했습니다.')
          }
        }
      } else {
        console.error('이미지 업로드 실패:', uploadResponse.message)
        alert(uploadResponse.message || '이미지 업로드에 실패했습니다.')
      }
    } catch (error: any) {
      console.error('이미지 업로드 실패:', error)
      const errorMessage = error.response?.data?.message || error.message || '이미지 업로드에 실패했습니다.'
      alert(errorMessage)
    } finally {
      setSending(false)
    }
  }

  // 파일 업로드
  const handleFileUpload = async (file: File) => {
    try {
      setSending(true)
      const uploadResponse = await fileUploadApi.uploadFile(file)
      if (uploadResponse.success && uploadResponse.data) {
        if (currentTab === 'direct' && selectedDirectChat) {
          const response = await directChatApi.sendMessage(selectedDirectChat, {
            message: '',
            messageType: 'FILE' as const,
            fileUrl: uploadResponse.data.url,
            fileName: file.name,
            fileSize: file.size,
          })
          if (response.success && response.data) {
            await fetchDirectMessages(selectedDirectChat)
          } else {
            console.error('파일 메시지 전송 실패:', response.message)
            alert(response.message || '파일 전송에 실패했습니다.')
          }
        } else if (currentTab === 'group' && selectedGroupChat) {
          const response = await groupApi.sendChatMessage(
            selectedGroupChat.groupId,
            selectedGroupChat.roomId,
            {
              message: '',
              messageType: 'FILE',
              fileUrl: uploadResponse.data.url,
              fileName: file.name,
              fileSize: file.size,
            }
          )
          if (response.success) {
            await fetchGroupMessages(selectedGroupChat.groupId, selectedGroupChat.roomId)
          } else {
            console.error('파일 메시지 전송 실패:', response.message)
            alert(response.message || '파일 전송에 실패했습니다.')
          }
        }
      } else {
        console.error('파일 업로드 실패:', uploadResponse.message)
        alert(uploadResponse.message || '파일 업로드에 실패했습니다.')
      }
    } catch (error: any) {
      console.error('파일 업로드 실패:', error)
      const errorMessage = error.response?.data?.message || error.message || '파일 업로드에 실패했습니다.'
      alert(errorMessage)
    } finally {
      setSending(false)
    }
  }

  // 채팅 검색
  const handleSearchMessages = async (query: string) => {
    try {
      setSearchQuery(query)
      // TODO: 백엔드 검색 API 구현 후 연동
      // if (currentTab === 'direct' && selectedDirectChat) {
      //   const response = await directChatApi.searchMessages(selectedDirectChat, query)
      //   // 검색 결과 표시
      // } else if (currentTab === 'group' && selectedGroupChat) {
      //   const response = await groupApi.searchChatMessages(
      //     selectedGroupChat.groupId, 
      //     selectedGroupChat.roomId, 
      //     query
      //   )
      //   // 검색 결과 표시
      // }
    } catch (error) {
      console.error('채팅 검색 실패:', error)
    }
  }

  // 이미지 선택
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      handleImageUpload(file)
    }
  }

  // 파일 선택
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      handleFileUpload(file)
    }
  }

  // 현재 선택된 채팅방 정보
  const currentChatRoom = currentTab === 'direct' 
    ? directChatRooms.find(room => room.id === selectedDirectChat)
    : groupChatRooms.find(room => room.groupId === selectedGroupChat?.groupId && room.roomId === selectedGroupChat?.roomId)
  
  // 메시지 스크롤 하단으로
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [directMessages, groupMessages])

  // 필터링된 채팅방 목록
  const filteredDirectRooms = directChatRooms.filter(room =>
    room.otherNickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredGroupRooms = groupChatRooms.filter(room =>
    room.roomName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.groupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  )

useEffect(() => {
  if (currentChatRoom) {
    requestAnimationFrame(() => messageInputRef.current?.focus())
  }
}, [currentChatRoom])

  // 현재 메시지 목록 (타입 변환)
  const currentMessages: Array<DirectChatMessageDTO | GroupChatMessageDTO> = currentTab === 'direct' 
    ? directMessages 
    : groupMessages

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white">
        <Header onLoginClick={() => setShowLoginModal(true)} />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-lg text-gray-600 mb-4">로그인이 필요합니다.</p>
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              로그인
            </button>
          </div>
        </div>
        {showLoginModal && (
          <LoginModal
            isOpen={showLoginModal}
            onClose={() => setShowLoginModal(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header onLoginClick={() => setShowLoginModal(true)} />
      
      <div className="flex-1 flex overflow-hidden">
        {/* 왼쪽: 채팅방 목록 */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* 탭 선택 */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setCurrentTab('direct')
                  setSelectedDirectChat(null)
                  setSelectedGroupChat(null)
                }}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  currentTab === 'direct'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                1대1 채팅
              </button>
              <button
                onClick={() => {
                  setCurrentTab('group')
                  setSelectedDirectChat(null)
                  setSelectedGroupChat(null)
                }}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  currentTab === 'group'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                그룹 채팅
              </button>
            </div>
          </div>

          {/* 채팅방 목록 */}
          <div className="flex-1 overflow-y-auto">
            {currentTab === 'direct' ? (
              filteredDirectRooms.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {searchQuery ? '검색 결과가 없습니다.' : '1대1 채팅방이 없습니다.'}
                </div>
              ) : (
                <div className="p-2">
                  {filteredDirectRooms.map((room) => (
                    <div
                      key={room.id}
                      onClick={() => setSelectedDirectChat(room.id)}
                      className={`p-3 rounded-lg cursor-pointer transition mb-1 ${
                        selectedDirectChat === room.id
                          ? 'bg-blue-50 border-l-4 border-blue-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {room.otherProfileImageUrl ? (
                            <img
                              src={room.otherProfileImageUrl}
                              alt={room.otherNickname}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-gray-600 font-semibold">
                                {room.otherNickname.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium text-gray-800 truncate">
                              {room.otherNickname}
                            </h3>
                            {room.unreadCount > 0 && (
                              <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                                {room.unreadCount}
                              </span>
                            )}
                          </div>
                          {room.lastMessage && (
                            <p className="text-xs text-gray-500 truncate">
                              {room.lastMessage}
                            </p>
                          )}
                          {room.lastMessageTime && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {format(new Date(room.lastMessageTime), 'MM/dd HH:mm', { locale: ko })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              filteredGroupRooms.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {searchQuery ? '검색 결과가 없습니다.' : '그룹 채팅방이 없습니다.'}
                </div>
              ) : (
                <div className="p-2">
                  {filteredGroupRooms.map((room) => (
                    <div
                      key={`${room.groupId}-${room.roomId}`}
                      onClick={() => setSelectedGroupChat({ groupId: room.groupId, roomId: room.roomId })}
                      className={`p-3 rounded-lg cursor-pointer transition mb-1 ${
                        selectedGroupChat?.groupId === room.groupId && selectedGroupChat?.roomId === room.roomId
                          ? 'bg-blue-50 border-l-4 border-blue-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {room.roomProfileImageUrl ? (
                            <img
                              src={room.roomProfileImageUrl}
                              alt={room.roomName}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">
                                {room.roomName.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1 min-w-0">
                              <h3 className="font-medium text-gray-800 truncate">
                                {room.roomName}
                              </h3>
                              <span className="text-xs text-gray-400 truncate">
                                ({room.groupName})
                              </span>
                            </div>
                            {room.unreadCount > 0 && (
                              <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                                {room.unreadCount}
                              </span>
                            )}
                          </div>
                          {room.lastMessage && (
                            <p className="text-xs text-gray-500 truncate">
                              {room.lastMessage}
                            </p>
                          )}
                          {room.lastMessageTime && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {format(new Date(room.lastMessageTime), 'MM/dd HH:mm', { locale: ko })}
                            </p>
                          )}
                          {room.createdTime && !room.lastMessageTime && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {format(new Date(room.createdTime), 'MM/dd HH:mm', { locale: ko })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* 오른쪽: 채팅 영역 */}
        <div className="flex-1 flex flex-col bg-white">
          {currentChatRoom ? (
            <>
              {/* 채팅방 헤더 */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {currentTab === 'direct' && currentChatRoom && 'otherProfileImageUrl' in currentChatRoom ? (
                      <>
                        {currentChatRoom.otherProfileImageUrl ? (
                          <img
                            src={currentChatRoom.otherProfileImageUrl}
                            alt={currentChatRoom.otherNickname}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-gray-600 font-semibold">
                              {currentChatRoom.otherNickname.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <h3 className="text-lg font-semibold text-gray-800">
                          {currentChatRoom.otherNickname}
                        </h3>
                      </>
                    ) : (
                      <>
                        {currentChatRoom && 'roomProfileImageUrl' in currentChatRoom && currentChatRoom.roomProfileImageUrl ? (
                          <img
                            src={currentChatRoom.roomProfileImageUrl}
                            alt={currentChatRoom.roomName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {currentChatRoom && 'roomName' in currentChatRoom ? currentChatRoom.roomName.charAt(0) : 'G'}
                            </span>
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">
                            {currentChatRoom && 'roomName' in currentChatRoom ? currentChatRoom.roomName : ''}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {currentChatRoom && 'groupName' in currentChatRoom ? currentChatRoom.groupName : ''}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* 검색 버튼 */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          const query = prompt('검색어를 입력하세요:')
                          if (query) {
                            handleSearchMessages(query)
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 transition"
                        title="채팅 검색"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                      {searchQuery && (
                        <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[300px] z-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">검색 결과: "{searchQuery}"</span>
                            <button
                              onClick={() => setSearchQuery('')}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            {/* TODO: 검색 결과 표시 */}
                            <p className="text-sm text-gray-500">검색 결과는 백엔드 구현 후 표시됩니다.</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* 인원수 버튼 (그룹 채팅만) */}
                    {currentTab === 'group' && (
                      <button
                        onClick={() => {
                          // TODO: 멤버 목록 표시
                          alert('멤버 목록 기능은 백엔드 구현 후 추가됩니다.')
                        }}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition flex items-center gap-1"
                        title="멤버 목록"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>0</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 메시지 영역 */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
              >
                {currentMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                      <p className="text-lg mb-2">메시지가 없습니다.</p>
                      <p className="text-sm">첫 메시지를 보내보세요!</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {currentMessages.map((message) => {
                      const isMyMessage = currentUsername === message.username
                      const displayName = 'displayName' in message ? message.displayName : undefined
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
                              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-gray-600 text-sm font-semibold">
                                  {message.nickname.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className={`flex-1 ${isMyMessage ? 'flex flex-col items-end' : ''}`}>
                            <div className={`flex items-baseline gap-2 mb-1 ${isMyMessage ? 'flex-row-reverse' : ''}`}>
                              <span className="font-semibold text-sm text-gray-800">
                                {displayName || message.nickname}
                              </span>
                              <span className="text-xs text-gray-500">
                                {format(new Date(message.createdTime), 'HH:mm', { locale: ko })}
                              </span>
                            </div>
                            <div className={`flex items-end gap-2 ${isMyMessage ? 'flex-row-reverse' : ''}`}>
                              <div
                                className={`rounded-lg px-4 py-2 inline-block max-w-md ${
                                  isMyMessage
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-white text-gray-900 border border-gray-200'
                                }`}
                              >
                                {message.messageType === 'IMAGE' && message.fileUrl ? (
                                  <img
                                    src={message.fileUrl}
                                    alt="이미지"
                                    className="max-w-full h-auto rounded"
                                  />
                                ) : message.messageType === 'FILE' && message.fileUrl ? (
                                  <a
                                    href={message.fileUrl}
                                    download={message.fileName}
                                    className="flex items-center gap-2 text-sm hover:underline"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <span>{message.fileName}</span>
                                    {message.fileSize && (
                                      <span className="text-xs text-gray-400">
                                        ({(message.fileSize / 1024).toFixed(1)} KB)
                                      </span>
                                    )}
                                  </a>
                                ) : (
                                  <p className="text-sm whitespace-pre-wrap break-words">
                                    {message.message}
                                  </p>
                                )}
                              </div>
                              {/* 읽음 표시 - 일반 채팅만 (읽었을 때만 ✓ 표시) */}
                              {currentTab === 'direct' && isMyMessage && 'isRead' in message && message.isRead && (
                                <span className="text-xs text-gray-400 whitespace-nowrap self-end pb-8">
                                  ✓
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {/* 타이핑 인디케이터 영역 - 일반 채팅만 */}
                    {currentTab === 'direct' && directTypingUsers.length > 0 && (
                      <div className="px-4 py-2 min-h-[40px] flex items-center">
                        <div className="text-sm text-gray-500 italic">
                          {directTypingUsers.length === 1 
                            ? `${directTypingUsers[0]}님이 입력 중...`
                            : `${directTypingUsers.length}명이 입력 중...`
                          }
                        </div>
                      </div>
                    )}
                    {currentTab === 'direct' && directTypingUsers.length === 0 && (
                      <div className="px-4 py-2 min-h-[40px] flex items-center">
                        <div className="text-sm text-transparent">공간</div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* 입력 영역 */}
              <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-4 bg-white">
                <div className="flex gap-2 items-end">
                  {/* 첨부 버튼 */}
                  <div className="relative" ref={attachmentMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition"
                      title="첨부"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    {/* 첨부 메뉴 */}
                    {showAttachmentMenu && (
                      <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[150px]">
                        <button
                          type="button"
                          onClick={() => {
                            imageInputRef.current?.click()
                            setShowAttachmentMenu(false)
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          이미지
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            fileInputRef.current?.click()
                            setShowAttachmentMenu(false)
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          파일
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <input
                    ref={messageInputRef}
                    type="text"
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if ((e.nativeEvent as any).isComposing) return

                      if (e.key === 'Enter') {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder="메시지를 입력하세요..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!isAuthenticated}
                  />

                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim() || !isAuthenticated}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {sending ? '전송 중...' : '전송'}
                  </button>
                </div>
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
        />
      )}
    </div>
  )
}
