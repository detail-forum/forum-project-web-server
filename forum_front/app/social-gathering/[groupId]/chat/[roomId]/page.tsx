'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import { groupApi, imageUploadApi, fileUploadApi } from '@/services/api'
import type { GroupChatMessageDTO, GroupChatRoomDTO, GroupDetailDTO, GroupMemberDTO } from '@/types/api'
import Header from '@/components/Header'
import LoginModal from '@/components/LoginModal'
import ImageCropModal from '@/components/ImageCropModal'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { getUsernameFromToken } from '@/utils/jwt'
import { useWebSocket } from '@/hooks/useWebSocket'

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
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)
  const currentUsernameRef = useRef<string | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const profileImageInputRef = useRef<HTMLInputElement>(null)
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: number; isMyMessage: boolean } | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null)
  const [editMessageText, setEditMessageText] = useState('')
  const [replyingTo, setReplyingTo] = useState<GroupChatMessageDTO | null>(null)
  const pendingReplyRef = useRef<{ replyTo: GroupChatMessageDTO; messageText: string; timestamp: number } | null>(null) // 전송 중인 답장 정보
  
  // currentUsername 초기화 및 업데이트
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
  const [showMembers, setShowMembers] = useState(false)
  const [members, setMembers] = useState<GroupMemberDTO[]>([])
  const [reactingMessageId, setReactingMessageId] = useState<number | null>(null) // 반응 추가 중인 메시지 ID
  const [editingRoom, setEditingRoom] = useState(false)
  const [editRoomName, setEditRoomName] = useState('')
  const [editRoomDescription, setEditRoomDescription] = useState('')
  const [updatingRoom, setUpdatingRoom] = useState(false)
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomDescription, setNewRoomDescription] = useState('')
  const [creatingRoom, setCreatingRoom] = useState(false)
  const [newRoomImage, setNewRoomImage] = useState<string>('')
  const [showNewRoomImageCrop, setShowNewRoomImageCrop] = useState(false)
  const [deletingRoom, setDeletingRoom] = useState(false)
  const newRoomImageInputRef = useRef<HTMLInputElement>(null)
  const [myDisplayName, setMyDisplayName] = useState<string>('')
  const [updatingDisplayName, setUpdatingDisplayName] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'room' | 'displayName'>('displayName')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [searchResults, setSearchResults] = useState<GroupChatMessageDTO[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearchSidebar, setShowSearchSidebar] = useState(false)
  const [searchCategory, setSearchCategory] = useState<'ALL' | 'TEXT' | 'IMAGE' | 'FILE'>('ALL')
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const attachmentMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)

  useEffect(() => {
    if (groupId) {
      fetchGroupDetail()
      fetchChatRooms()
    }
  }, [groupId])

  // WebSocket 연결
  const {
    isConnected,
    sendMessage: wsSendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    typingUsers,
  } = useWebSocket({
    groupId,
    roomId,
    enabled: isAuthenticated && !!groupId && !!roomId,
    onMessage: useCallback((message: GroupChatMessageDTO) => {
      console.log('onMessage 콜백 호출:', message)
      setMessages(prev => {
        // 중복 방지
        if (prev.some(m => m.id === message.id)) {
          console.log('중복 메시지 무시:', message.id)
          return prev
        }
        console.log('새 메시지 추가:', message.id, message.message)
        
        // 답장 정보 처리
        let messageWithReply = message
        
        // 1. 백엔드에서 답장 정보가 있는 경우
        if (message.replyToMessageId && !message.replyToMessage) {
          const repliedMessage = prev.find(m => m.id === message.replyToMessageId)
          if (repliedMessage) {
            messageWithReply = {
              ...message,
              replyToMessage: {
                id: repliedMessage.id,
                message: repliedMessage.message,
                username: repliedMessage.username,
                nickname: repliedMessage.nickname,
                displayName: repliedMessage.displayName,
                profileImageUrl: repliedMessage.profileImageUrl,
              }
            }
          }
        }
        
        // 2. 프론트엔드에서 답장 정보 추가 (방금 보낸 메시지이고 답장 중이었다면)
        if (!messageWithReply.replyToMessageId && pendingReplyRef.current && message.username === currentUsernameRef.current) {
          console.log('답장 정보 매칭 시도:', { 
            messageUsername: message.username, 
            currentUsername: currentUsernameRef.current,
            pendingReply: pendingReplyRef.current 
          })
          
          // 메시지 내용과 시간을 비교하여 매칭
          const messageTime = new Date(message.createdTime).getTime()
          const timeDiff = Math.abs(messageTime - pendingReplyRef.current.timestamp)
          const messageMatches = message.message.trim() === pendingReplyRef.current.messageText.trim()
          
          console.log('답장 정보 매칭 조건 확인:', { 
            messageText: message.message.trim(), 
            pendingText: pendingReplyRef.current.messageText.trim(), 
            messageMatches, 
            timeDiff,
            timeDiffOk: timeDiff < 10000
          })
          
          // 메시지 내용이 일치하고 시간이 10초 이내이면 답장 정보 추가
          if (messageMatches && timeDiff < 10000) {
            console.log('답장 정보 매칭 성공! 답장 정보 추가')
            messageWithReply = {
              ...messageWithReply,
              replyToMessageId: pendingReplyRef.current.replyTo.id,
              replyToMessage: {
                id: pendingReplyRef.current.replyTo.id,
                message: pendingReplyRef.current.replyTo.message,
                username: pendingReplyRef.current.replyTo.username,
                nickname: pendingReplyRef.current.replyTo.nickname,
                displayName: pendingReplyRef.current.replyTo.displayName,
                profileImageUrl: pendingReplyRef.current.replyTo.profileImageUrl,
              }
            }
            // 답장 정보 사용 후 초기화
            pendingReplyRef.current = null
          } else {
            console.log('답장 정보 매칭 실패:', { 
              messageText: message.message.trim(), 
              pendingText: pendingReplyRef.current.messageText.trim(), 
              messageMatches, 
              timeDiff,
              reason: !messageMatches ? '메시지 내용 불일치' : '시간 초과'
            })
          }
        }
        
        // 시간순으로 정렬
        const newMessages = [...prev, messageWithReply].sort((a, b) => 
          new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime()
        )
        console.log('메시지 목록 업데이트 완료, 총 메시지 수:', newMessages.length)
        // 새 메시지가 추가되면 스크롤 위치 확인 후 자동 스크롤
        setTimeout(() => {
          if (messagesContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 100
            if (isAtBottom) {
              scrollToBottom()
            }
          }
        }, 100)
        return newMessages
      })
    }, []),
    onTyping: useCallback((data: { username: string; isTyping: boolean }) => {
      // 타이핑 상태는 훅에서 자동 관리됨
    }, []),
    onRead: useCallback((data: { messageId: number; username: string; readCount: number }) => {
      // 읽음 수 업데이트
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, readCount: data.readCount }
          : msg
      ))
    }, []),
  })

  // 초기 메시지 로드
  useEffect(() => {
    if (groupId && roomId) {
      fetchMessages()
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

  // 스크롤 위치 확인
  const checkScrollPosition = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      const isAtBottom = distanceFromBottom < 50 // 50px 여유로 줄임
      setIsScrolledToBottom(isAtBottom)
      
      // 사용자가 스크롤 중임을 표시
      setIsUserScrolling(true)
      
      // 스크롤이 멈춘 후 200ms 후에 사용자 스크롤 상태 해제
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false)
      }, 200)
    }
  }, [])

  // 스크롤 이벤트 리스너
  useEffect(() => {
    const container = messagesContainerRef.current
    if (container) {
      // 스크롤 이벤트에 디바운싱 적용
      let scrollTimeout: NodeJS.Timeout | null = null
      const handleScroll = () => {
        if (scrollTimeout) {
          clearTimeout(scrollTimeout)
        }
        scrollTimeout = setTimeout(() => {
          checkScrollPosition()
        }, 50) // 50ms 디바운싱
      }
      
      container.addEventListener('scroll', handleScroll, { passive: true })
      return () => {
        container.removeEventListener('scroll', handleScroll)
        if (scrollTimeout) {
          clearTimeout(scrollTimeout)
        }
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current)
        }
      }
    }
  }, [checkScrollPosition])

  // 메시지가 추가될 때 스크롤 처리 (초기 로드 제외)
  useEffect(() => {
    if (initialLoad) {
      // 초기 로드 시에는 스크롤하지 않음
      setInitialLoad(false)
      return
    }
    
    // 사용자가 스크롤 중이 아니고 하단에 있을 때만 자동 스크롤
    if (isScrolledToBottom && !isUserScrolling) {
      // 약간의 지연을 두어 스크롤 버벅임 방지
      const timeoutId = setTimeout(() => {
        if (messagesContainerRef.current && !isUserScrolling) {
          const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
          const distanceFromBottom = scrollHeight - scrollTop - clientHeight
          // 여전히 하단 근처에 있으면 스크롤
          if (distanceFromBottom < 100) {
            scrollToBottom()
          }
        }
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [messages, isScrolledToBottom, initialLoad, isUserScrolling])

  const scrollToBottom = () => {
    if (messagesContainerRef.current && messagesEndRef.current) {
      // 즉시 스크롤하여 버벅임 방지
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
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
        // 초기 로드 플래그 설정
        setInitialLoad(true)
      }
    } catch (error) {
      console.error('채팅 메시지 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 멤버 목록 조회
  const fetchMembers = async () => {
    try {
      const response = await groupApi.getGroupMembers(groupId)
      if (response.success && response.data) {
        setMembers(response.data)
        // 내 별명 찾기
        const myMember = response.data.find(m => m.username === currentUsername)
        if (myMember) {
          setMyDisplayName(myMember.displayName || '')
        }
      }
    } catch (error) {
      console.error('멤버 목록 조회 실패:', error)
    }
  }

  // 별명 업데이트
  const handleUpdateDisplayName = async () => {
    if (!currentUsername) return
    
    try {
      setUpdatingDisplayName(true)
      const myMember = members.find(m => m.username === currentUsername)
      if (!myMember) {
        alert('멤버 정보를 찾을 수 없습니다.')
        return
      }
      
      const response = await groupApi.updateMemberDisplayName(groupId, myMember.userId, myDisplayName.trim() || undefined)
      if (response.success) {
        alert('별명이 변경되었습니다.')
        fetchMembers() // 멤버 목록 새로고침
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '별명 변경에 실패했습니다.')
    } finally {
      setUpdatingDisplayName(false)
    }
  }

  useEffect(() => {
    if (groupId && showMembers) {
      fetchMembers()
    }
  }, [groupId, showMembers])

  // 채팅방 로드 시 내 별명 조회
  useEffect(() => {
    if (groupId && isAuthenticated) {
      fetchMembers()
    }
  }, [groupId, roomId, isAuthenticated])


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isAuthenticated) {
      setShowLoginModal(true)
      return
    }

    if (!newMessage.trim()) {
      console.warn('메시지가 비어있습니다.')
      return
    }

    if (!isConnected) {
      console.warn('WebSocket이 연결되지 않았습니다. REST API로 전송합니다.')
      // WebSocket 연결 실패 시 REST API로 폴백
      try {
        setSending(true)
        // @username으로 시작하는 부분 제거
        let messageToSend = newMessage.trim()
        if (replyingTo && messageToSend.startsWith('@')) {
          const replyPrefix = `@${replyingTo.displayName || replyingTo.nickname} `
          if (messageToSend.startsWith(replyPrefix)) {
            messageToSend = messageToSend.substring(replyPrefix.length).trim()
          } else {
            messageToSend = messageToSend.replace(/^@\w+\s*/, '').trim()
          }
        }
        const response = await groupApi.sendChatMessage(groupId, roomId, { 
          message: messageToSend,
          replyToMessageId: replyingTo?.id
        })
        if (response.success) {
          setNewMessage('')
          setReplyingTo(null) // 답글 초기화
          // REST API로 전송한 경우 메시지 목록 새로고침
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
      return
    }

    try {
      setSending(true)
      // @username으로 시작하는 부분 제거
      let messageToSend = newMessage.trim()
      if (replyingTo && messageToSend.startsWith('@')) {
        // @username 부분 제거
        const replyPrefix = `@${replyingTo.displayName || replyingTo.nickname} `
        if (messageToSend.startsWith(replyPrefix)) {
          messageToSend = messageToSend.substring(replyPrefix.length).trim()
        } else {
          // 다른 형식의 @username 제거
          messageToSend = messageToSend.replace(/^@\w+\s*/, '').trim()
        }
      }
      console.log('메시지 전송 시도:', { groupId, roomId, message: messageToSend, isConnected, replyingTo })
      const success = wsSendMessage(messageToSend, replyingTo?.id)
      console.log('메시지 전송 결과:', success)
      
      if (success) {
        console.log('WebSocket으로 메시지 전송 성공')
        // 답장 정보를 ref에 저장 (메시지 수신 시 사용)
        const replyInfo = replyingTo ? {
          replyTo: replyingTo,
          messageText: messageToSend,
          timestamp: Date.now()
        } : null
        
        if (replyInfo) {
          pendingReplyRef.current = replyInfo
          console.log('답장 정보 저장:', { replyToId: replyInfo.replyTo.id, messageText: messageToSend })
        }
        
        // 메시지 전송 성공 시 입력 필드와 답장 정보 초기화
        setNewMessage('')
        setReplyingTo(null)
        stopTyping()
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = null
        }
        
        // 10초 후 pendingReplyRef 초기화 (타임아웃)
        if (replyInfo) {
          setTimeout(() => {
            if (pendingReplyRef.current && pendingReplyRef.current.timestamp === replyInfo.timestamp) {
              console.log('답장 정보 타임아웃으로 초기화')
              pendingReplyRef.current = null
            }
          }, 10000)
        }
      } else {
        console.warn('WebSocket 전송 실패, REST API로 폴백')
        // WebSocket 연결 실패 시 REST API로 폴백
        try {
          const response = await groupApi.sendChatMessage(groupId, roomId, { message: messageToSend })
          if (response.success) {
            setNewMessage('')
            setReplyingTo(null) // 답글 초기화
            // REST API로 전송한 경우 메시지 목록 새로고침
            setTimeout(() => {
              fetchMessages()
            }, 500)
          }
        } catch (error: any) {
          console.error('REST API 메시지 전송 실패:', error)
          alert(error.response?.data?.message || '메시지 전송에 실패했습니다.')
        }
      }
    } catch (error: any) {
      console.error('메시지 전송 실패:', error)
      alert(error.response?.data?.message || '메시지 전송에 실패했습니다.')
    } finally {
      setSending(false)
    }
  }

  // 타이핑 인디케이터 처리
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNewMessage(value)
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    if (value.trim() && isConnected) {
      startTyping()
      // 3초 후 자동으로 타이핑 종료
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping()
      }, 3000)
    } else {
      stopTyping()
    }
  }

  // 메시지 표시 시 읽음 처리
  useEffect(() => {
    if (messages.length > 0 && isConnected && currentUsername) {
      const lastMessage = messages[messages.length - 1]
      // 본인이 보낸 메시지가 아니고, 아직 읽지 않은 경우
      if (lastMessage.username !== currentUsername && lastMessage.readCount !== undefined) {
        markAsRead(lastMessage.id)
      }
    }
  }, [messages, isConnected, currentUsername, markAsRead])

  // 메시지 우클릭 핸들러
  const handleMessageContextMenu = (e: React.MouseEvent, messageId: number) => {
    e.preventDefault()
    const message = messages.find(m => m.id === messageId)
    if (!message) return
    
    const isMyMessage = message.username === currentUsername
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      messageId,
      isMyMessage,
    })
  }

  // 컨텍스트 메뉴 닫기
  const closeContextMenu = () => {
    setContextMenu(null)
  }

  // 컨텍스트 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (contextMenu) {
      const handleClick = () => closeContextMenu()
      window.addEventListener('click', handleClick)
      return () => window.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  // 첨부 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) {
        setShowAttachmentMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 메시지 삭제
  const handleDeleteMessage = async (messageId: number) => {
    if (!confirm('정말로 이 메시지를 삭제하시겠습니까?')) return
    
    try {
      const response = await groupApi.deleteChatMessage(groupId, roomId, messageId)
      if (response.success) {
        setMessages(prev => prev.filter(m => m.id !== messageId))
        closeContextMenu()
      }
    } catch (error: any) {
      console.error('메시지 삭제 실패:', error)
      alert(error.response?.data?.message || '메시지 삭제에 실패했습니다.')
    }
  }

  // 메시지 수정 시작
  const handleStartEditMessage = (messageId: number) => {
    const message = messages.find(m => m.id === messageId)
    if (message) {
      setEditingMessageId(messageId)
      setEditMessageText(message.message)
      closeContextMenu()
    }
  }

  // 메시지 수정 취소
  const handleCancelEditMessage = () => {
    setEditingMessageId(null)
    setEditMessageText('')
  }

  // 메시지 수정 저장
  const handleSaveEditMessage = async (messageId: number) => {
    if (!editMessageText.trim()) return
    
    try {
      // TODO: 메시지 수정 API 호출
      // await groupApi.updateChatMessage(groupId, roomId, messageId, { message: editMessageText })
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, message: editMessageText } : m
      ))
      setEditingMessageId(null)
      setEditMessageText('')
    } catch (error) {
      console.error('메시지 수정 실패:', error)
      alert('메시지 수정에 실패했습니다.')
    }
  }

  // 답글 기능
  const handleReplyMessage = (messageId: number) => {
    const message = messages.find(m => m.id === messageId)
    if (message) {
      console.log('답장 설정:', message)
      setReplyingTo(message)
      // @username을 입력 필드에 넣지 않음
      setNewMessage('')
      closeContextMenu()
      // 입력 필드로 포커스 이동
      setTimeout(() => {
        const input = document.querySelector('input[type="text"]') as HTMLInputElement
        if (input) {
          input.focus()
        }
      }, 100)
    }
  }

  // 답글 취소
  const handleCancelReply = () => {
    setReplyingTo(null)
  }

  // 메시지 반응 추가/제거
  const handleAddReaction = async (messageId: number, emoji: string) => {
    try {
      const response = await groupApi.toggleReaction(groupId, roomId, messageId, emoji)
      if (response.success) {
        // 해당 메시지의 반응 정보만 업데이트
        const messageResponse = await groupApi.getChatMessages(groupId, roomId, 0, 100)
        if (messageResponse.success && messageResponse.data) {
          const updatedMessage = messageResponse.data.find(m => m.id === messageId)
          if (updatedMessage) {
            setMessages(prev => prev.map(m => 
              m.id === messageId ? updatedMessage : m
            ))
          }
        }
        setReactingMessageId(null) // 반응 모달 닫기
        closeContextMenu()
      }
    } catch (error: any) {
      console.error('반응 추가/제거 실패:', error)
      alert(error.response?.data?.message || '반응 추가/제거에 실패했습니다.')
    }
  }

  // 채팅 검색
  const handleSearchMessages = async () => {
    setShowSearchSidebar(true)
    setShowMembers(false) // 멤버 사이드바 닫기
  }

  // 검색 실행
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }
    
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    try {
      setSearching(true)
      
      // 백엔드 API 호출 시도
      try {
        const response = await groupApi.searchChatMessages(groupId, roomId, searchQuery)
        if (response.success && response.data) {
          let filtered = response.data.content || []
          
          // 카테고리 필터 적용
          if (searchCategory !== 'ALL') {
            filtered = filtered.filter(msg => {
              if (searchCategory === 'TEXT') {
                return !msg.fileUrl && !msg.fileName
              } else if (searchCategory === 'IMAGE') {
                return msg.fileUrl && (msg.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) || msg.messageType === 'IMAGE')
              } else if (searchCategory === 'FILE') {
                return msg.fileUrl && msg.fileName && !msg.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) && msg.messageType !== 'IMAGE'
              }
              return true
            })
          }
          
          setSearchResults(filtered)
          setShowSearchResults(true)
          return
        }
      } catch (apiError) {
        console.log('백엔드 검색 API 미구현, 클라이언트 측 필터링 사용')
      }
      
      // 백엔드 API가 없으면 클라이언트 측 필터링 (임시)
      let filtered = messages.filter(msg => {
        const matchesQuery = msg.message?.toLowerCase().includes(searchQuery.toLowerCase()) || false
        
        // 카테고리 필터 적용
        if (searchCategory === 'ALL') {
          return matchesQuery
        } else if (searchCategory === 'TEXT') {
          return matchesQuery && !msg.fileUrl && !msg.fileName
        } else if (searchCategory === 'IMAGE') {
          return matchesQuery && msg.fileUrl && (msg.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) || msg.messageType === 'IMAGE')
        } else if (searchCategory === 'FILE') {
          return matchesQuery && msg.fileUrl && msg.fileName && !msg.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) && msg.messageType !== 'IMAGE'
        }
        return false
      })
      
      setSearchResults(filtered)
      setShowSearchResults(true)
    } catch (error: any) {
      console.error('채팅 검색 실패:', error)
      alert(error.response?.data?.message || '채팅 검색에 실패했습니다.')
    } finally {
      setSearching(false)
    }
  }

  // 이미지 업로드 및 전송
  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true)
      const uploadResponse = await imageUploadApi.uploadImage(file)
      
      if (uploadResponse.success && uploadResponse.data) {
        const imageUrl = uploadResponse.data.url
        
        // WebSocket으로 이미지 메시지 전송
        if (isConnected) {
          // TODO: WebSocket 메시지 타입 확장 필요
          // wsSendMessage('', null, 'IMAGE', imageUrl)
          
          // 임시: REST API로 전송
          const response = await groupApi.sendChatMessage(groupId, roomId, {
            message: '',
            messageType: 'IMAGE',
            fileUrl: imageUrl
          } as any)
          
          if (response.success) {
            setTimeout(() => {
              fetchMessages()
            }, 500)
          }
        } else {
          // REST API로 전송
          const response = await groupApi.sendChatMessage(groupId, roomId, {
            message: '',
            messageType: 'IMAGE',
            fileUrl: imageUrl
          } as any)
          
          if (response.success) {
            setTimeout(() => {
              fetchMessages()
            }, 500)
          }
        }
      }
    } catch (error: any) {
      console.error('이미지 업로드 실패:', error)
      alert(error.response?.data?.message || '이미지 업로드에 실패했습니다.')
    } finally {
      setUploadingImage(false)
      setShowAttachmentMenu(false)
    }
  }

  // 파일 업로드 및 전송
  const handleFileUpload = async (file: File) => {
    try {
      setUploadingFile(true)
      
      // 파일 업로드 API 호출 시도
      let fileUrl: string
      let fileName: string
      let fileSize: number
      
      try {
        const uploadResponse = await fileUploadApi.uploadFile(file)
        if (uploadResponse.success && uploadResponse.data) {
          fileUrl = uploadResponse.data.url
          fileName = uploadResponse.data.originalFilename || file.name
          fileSize = uploadResponse.data.fileSize || file.size
        } else {
          throw new Error('파일 업로드 실패')
        }
      } catch (uploadError) {
        // 파일 업로드 API가 없으면 이미지 업로드 API 사용 (임시)
        console.log('파일 업로드 API 미구현, 이미지 업로드 API 사용')
        const uploadResponse = await imageUploadApi.uploadImage(file)
        if (uploadResponse.success && uploadResponse.data) {
          fileUrl = uploadResponse.data.url
          fileName = file.name
          fileSize = file.size
        } else {
          throw new Error('파일 업로드 실패')
        }
      }
      
      // REST API로 파일 메시지 전송
      const response = await groupApi.sendChatMessage(groupId, roomId, {
        message: '',
        messageType: 'FILE',
        fileUrl: fileUrl,
        fileName: fileName,
        fileSize: fileSize
      } as any)
      
      if (response.success) {
        setTimeout(() => {
          fetchMessages()
        }, 500)
      }
    } catch (error: any) {
      console.error('파일 업로드 실패:', error)
      alert(error.response?.data?.message || '파일 업로드에 실패했습니다.')
    } finally {
      setUploadingFile(false)
      setShowAttachmentMenu(false)
    }
  }

  // 이미지 선택
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('이미지 크기는 10MB 이하여야 합니다.')
        return
      }
      handleImageUpload(file)
    }
  }

  // 파일 선택
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        alert('파일 크기는 50MB 이하여야 합니다.')
        return
      }
      handleFileUpload(file)
    }
  }

  // 반응 메뉴 열기
  const handleOpenReactionMenu = (messageId: number) => {
    setReactingMessageId(messageId)
    closeContextMenu()
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

  const handleOpenCreateRoomModal = () => {
    setNewRoomName('')
    setNewRoomDescription('')
    setShowCreateRoomModal(true)
  }

  const handleCloseCreateRoomModal = () => {
    setShowCreateRoomModal(false)
    setNewRoomName('')
    setNewRoomDescription('')
    setNewRoomImage('')
  }

  const handleNewRoomImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const imageSrc = event.target?.result as string
        setNewRoomImage(imageSrc)
        setShowNewRoomImageCrop(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleNewRoomImageCrop = async (croppedImageBlob: Blob) => {
    try {
      const file = new File([croppedImageBlob], 'profile.jpg', { type: 'image/jpeg' })
      const uploadResponse = await imageUploadApi.uploadImage(file)
      
      if (uploadResponse.success && uploadResponse.data) {
        setNewRoomImage(uploadResponse.data.url)
        setShowNewRoomImageCrop(false)
      }
    } catch (error: any) {
      console.error('이미지 업로드 실패:', error)
      alert('이미지 업로드에 실패했습니다.')
    }
  }

  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || newRoomName.length < 2) {
      alert('채팅방 이름은 2자 이상이어야 합니다.')
      return
    }

    try {
      setCreatingRoom(true)
      const response = await groupApi.createChatRoom(groupId, {
        name: newRoomName,
        description: newRoomDescription || undefined,
      })
      if (response.success && response.data) {
        // 이미지가 있으면 업데이트
        if (newRoomImage) {
          await groupApi.updateChatRoom(groupId, response.data, { profileImageUrl: newRoomImage })
        }
        await fetchChatRooms()
        handleCloseCreateRoomModal()
        alert('채팅방이 생성되었습니다.')
      }
    } catch (error: any) {
      console.error('채팅방 생성 실패:', error)
      alert(error.response?.data?.message || '채팅방 생성에 실패했습니다.')
    } finally {
      setCreatingRoom(false)
    }
  }

  const handleDeleteRoom = async () => {
    if (!currentRoom) return
    
    if (!confirm(`정말로 "${currentRoom.name}" 채팅방을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return
    }

    try {
      setDeletingRoom(true)
      await groupApi.deleteChatRoom(groupId, roomId)
      await fetchChatRooms()
      // 삭제 후 첫 번째 채팅방으로 이동
      const remainingRooms = chatRooms.filter(room => room.id !== roomId)
      if (remainingRooms.length > 0) {
        router.push(`/social-gathering/${groupId}/chat/${remainingRooms[0].id}`)
      } else {
        router.push(`/social-gathering/${groupId}`)
      }
      alert('채팅방이 삭제되었습니다.')
    } catch (error: any) {
      console.error('채팅방 삭제 실패:', error)
      alert(error.response?.data?.message || '채팅방 삭제에 실패했습니다.')
    } finally {
      setDeletingRoom(false)
      setEditingRoom(false)
    }
  }

  const currentRoom = chatRooms.find((room) => room.id === roomId)

  // 설정 모달 열 때 채팅방 정보 로드
  useEffect(() => {
    if (showSettingsModal && currentRoom) {
      handleStartEditRoom()
    }
  }, [showSettingsModal, currentRoom])

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
                onClick={handleOpenCreateRoomModal}
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-800">
                          {currentRoom.name}
                        </h3>
                        {currentRoom.isAdminRoom && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                            관리자 전용
                          </span>
                        )}
                        {isAuthenticated && (
                          <button
                            onClick={() => {
                              setShowSettingsModal(true)
                              if (group?.isAdmin) {
                                setSettingsTab('room')
                              } else {
                                setSettingsTab('displayName')
                              }
                            }}
                            className="text-gray-400 hover:text-gray-600 transition"
                            title="설정"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    {currentRoom.description && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {currentRoom.description}
                      </p>
                    )}
                  </div>
                  {/* 검색 버튼 및 멤버 수 표시 */}
                  <div className="flex items-center gap-2">
                    {/* 검색 버튼 */}
                    <button
                      onClick={handleSearchMessages}
                      className="p-2 text-gray-400 hover:text-gray-600 transition"
                      title="채팅 검색"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                    {/* 멤버 수 표시 버튼 */}
                    <button
                      onClick={() => {
                        setShowMembers(!showMembers)
                        setShowSearchSidebar(false) // 검색 사이드바 닫기
                        if (!showMembers) {
                          fetchMembers()
                        }
                      }}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition flex items-center gap-1"
                      title="멤버 목록"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>{group?.memberCount || 0}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 메시지 영역 */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 relative"
              >
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                      <p className="text-lg mb-2">메시지가 없습니다.</p>
                      <p className="text-sm">첫 메시지를 보내보세요!</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => {
                    const isMyMessage = currentUsername === message.username
                    const isNewMessage = index === messages.length - 1
                    return (
                      <div
                        key={message.id}
                        data-message-id={message.id}
                        className={`flex gap-3 ${isMyMessage ? 'flex-row-reverse' : ''} ${
                          isNewMessage ? 'animate-slide-in' : ''
                        }`}
                        onContextMenu={(e) => handleMessageContextMenu(e, message.id)}
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
                                  {message.displayName || message.nickname}
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
                            <div className={`flex items-end gap-2 ${isMyMessage ? 'flex-row-reverse' : ''}`}>
                              {editingMessageId === message.id ? (
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    value={editMessageText}
                                    onChange={(e) => setEditMessageText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        handleSaveEditMessage(message.id)
                                      } else if (e.key === 'Escape') {
                                        handleCancelEditMessage()
                                      }
                                    }}
                                    className="w-full px-3 py-2 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    autoFocus
                                  />
                                  <div className="flex gap-2 mt-2">
                                    <button
                                      onClick={() => handleSaveEditMessage(message.id)}
                                      className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                                    >
                                      저장
                                    </button>
                                    <button
                                      onClick={handleCancelEditMessage}
                                      className="px-3 py-1 bg-gray-200 text-gray-800 rounded text-xs hover:bg-gray-300"
                                    >
                                      취소
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex flex-col gap-1">
                                    {/* 답장된 메시지 표시 */}
                                    {message.replyToMessageId && message.replyToMessage && (
                                      <div 
                                        className={`flex items-center gap-2 mb-1 px-2 py-1 rounded border-l-4 cursor-pointer hover:opacity-80 transition ${isMyMessage ? 'bg-blue-400 bg-opacity-20 border-blue-300' : 'bg-gray-100 border-gray-300'}`}
                                        onClick={() => {
                                          // 답장된 메시지로 스크롤
                                          const repliedElement = document.querySelector(`[data-message-id="${message.replyToMessageId}"]`)
                                          if (repliedElement) {
                                            repliedElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                            // 하이라이트 효과
                                            repliedElement.classList.add('ring-2', 'ring-blue-500')
                                            setTimeout(() => {
                                              repliedElement.classList.remove('ring-2', 'ring-blue-500')
                                            }, 2000)
                                          }
                                        }}
                                      >
                                        <div className="flex-shrink-0">
                                          {message.replyToMessage.profileImageUrl ? (
                                            <img
                                              src={message.replyToMessage.profileImageUrl}
                                              alt={message.replyToMessage.nickname}
                                              className="w-5 h-5 rounded-full object-cover"
                                            />
                                          ) : (
                                            <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
                                              <span className="text-[10px] text-gray-600 font-semibold">
                                                {(message.replyToMessage.displayName || message.replyToMessage.nickname).charAt(0).toUpperCase()}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1 min-w-0 flex-1">
                                          <span className={`text-xs font-medium truncate ${isMyMessage ? 'text-blue-50' : 'text-gray-700'}`}>
                                            {message.replyToMessage.displayName || message.replyToMessage.nickname}
                                          </span>
                                          <span className={`text-xs truncate ${isMyMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                                            {message.replyToMessage.message.length > 50 
                                              ? message.replyToMessage.message.substring(0, 50) + '...'
                                              : message.replyToMessage.message}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    <div
                                      className={`rounded-lg px-4 py-2 inline-block max-w-md w-fit relative group ${
                                        isMyMessage
                                          ? 'bg-blue-500 text-white'
                                          : 'bg-white text-gray-900 border border-gray-200'
                                      }`}
                                    >
                                      {/* 이미지 메시지 */}
                                      {message.messageType === 'IMAGE' && message.fileUrl ? (
                                        <img
                                          src={message.fileUrl}
                                          alt="이미지"
                                          className="max-w-full h-auto rounded cursor-pointer"
                                          onClick={() => window.open(message.fileUrl, '_blank')}
                                        />
                                      ) : message.messageType === 'FILE' && message.fileUrl ? (
                                        /* 파일 메시지 */
                                        <a
                                          href={message.fileUrl}
                                          download={message.fileName}
                                          className={`flex items-center gap-2 text-sm hover:underline ${
                                            isMyMessage ? 'text-white' : 'text-gray-900'
                                          }`}
                                        >
                                          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                          </svg>
                                          <div className="min-w-0">
                                            <div className="truncate">{message.fileName || '파일'}</div>
                                            {message.fileSize && (
                                              <div className={`text-xs ${isMyMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                                                {(message.fileSize / 1024).toFixed(1)} KB
                                              </div>
                                            )}
                                          </div>
                                        </a>
                                      ) : (
                                        /* 텍스트 메시지 */
                                        <p className="text-sm whitespace-pre-wrap break-words">
                                          {message.message}
                                        </p>
                                      )}
                                      {/* 반응 표시 */}
                                      {message.reactions && message.reactions.length > 0 && (
                                        <div className="flex gap-1 mt-2 flex-wrap">
                                          {message.reactions.map((reaction, idx) => (
                                            <button
                                              key={idx}
                                              onClick={() => handleAddReaction(message.id, reaction.emoji)}
                                              className={`px-2 py-1 rounded-full text-xs hover:bg-opacity-30 transition ${
                                                message.myReactions?.includes(reaction.emoji)
                                                  ? 'bg-blue-500 bg-opacity-30'
                                                  : 'bg-black bg-opacity-20'
                                              }`}
                                            >
                                              {reaction.emoji} {reaction.count}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {/* 읽음 표시 - 채팅박스 하단 높이에 맞춰 표시 */}
                                  {isMyMessage && group?.memberCount && (
                                    <span className="text-xs text-gray-400 whitespace-nowrap self-end pb-8">
                                      {(() => {
                                        const unreadCount = Math.max(0, (group.memberCount || 0) - (message.readCount || 0) - 1) // 본인 제외
                                        return unreadCount > 0 ? `읽음 ${unreadCount}` : ''
                                      })()}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                        </div>
                      </div>
                    )
                  })}
                  {/* 타이핑 인디케이터 영역 - 항상 표시 */}
                  <div className="px-4 py-2 min-h-[40px] flex items-center">
                    {typingUsers.length > 0 ? (
                      <div className="text-sm text-gray-500 italic">
                        {typingUsers.length === 1 
                          ? `${typingUsers[0]}님이 입력 중...`
                          : `${typingUsers.length}명이 입력 중...`
                        }
                      </div>
                    ) : (
                      <div className="text-sm text-transparent">공간</div>
                    )}
                  </div>
                  {/* 연결 상태 표시 */}
                  {!isConnected && (
                    <div className="px-4 py-2 text-xs text-yellow-600 bg-yellow-50 rounded">
                      연결 중... 메시지가 지연될 수 있습니다.
                    </div>
                  )}
                </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 컨텍스트 메뉴 */}
              {contextMenu && (
                <div
                  className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[120px]"
                  style={{
                    left: `${contextMenu.x}px`,
                    top: `${contextMenu.y}px`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleOpenReactionMenu(contextMenu.messageId)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    반응 추가
                  </button>
                  {contextMenu.isMyMessage ? (
                    <>
                      <button
                        onClick={() => handleStartEditMessage(contextMenu.messageId)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleReplyMessage(contextMenu.messageId)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        답글
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(contextMenu.messageId)}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleReplyMessage(contextMenu.messageId)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      답글
                    </button>
                  )}
                </div>
              )}

              {/* 반응 선택 모달 */}
              {reactingMessageId && (
                <div
                  className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center"
                  onClick={() => setReactingMessageId(null)}
                >
                  <div
                    className="bg-white rounded-lg p-4 shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-sm font-semibold mb-3">반응 선택</div>
                    <div className="flex gap-2">
                      {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleAddReaction(reactingMessageId, emoji)}
                          className="text-2xl hover:scale-125 transition-transform px-2 py-1 hover:bg-gray-100 rounded"
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setReactingMessageId(null)}
                      className="mt-3 w-full px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}

              {/* 입력 영역 */}
              <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-4 bg-white">
                {/* 답글 표시 */}
                {replyingTo && (
                  <div className="mb-2 p-2 bg-gray-100 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs text-gray-500">답장:</span>
                      <span className="text-xs text-gray-700 truncate">
                        @{replyingTo.displayName || replyingTo.nickname || replyingTo.username}: {replyingTo.message}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelReply}
                      className="text-gray-400 hover:text-gray-600 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  {/* 첨부 버튼 */}
                  <div className="relative" ref={attachmentMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                      disabled={sending || !isAuthenticated || uploadingImage || uploadingFile}
                      className="p-2 text-gray-400 hover:text-gray-600 transition disabled:opacity-50"
                      title="첨부"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    {/* 첨부 메뉴 */}
                    {showAttachmentMenu && (
                      <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[150px] z-50">
                        <button
                          type="button"
                          onClick={() => {
                            imageInputRef.current?.click()
                            setShowAttachmentMenu(false)
                          }}
                          disabled={uploadingImage}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2 disabled:opacity-50"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {uploadingImage ? '업로드 중...' : '이미지'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            fileInputRef.current?.click()
                            setShowAttachmentMenu(false)
                          }}
                          disabled={uploadingFile}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2 disabled:opacity-50"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          {uploadingFile ? '업로드 중...' : '파일'}
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
                    type="text"
                    value={newMessage}
                    onChange={handleInputChange}
                    placeholder={replyingTo ? `@${replyingTo.nickname}에게 답장...` : "메시지를 입력하세요..."}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={sending || !isAuthenticated || !isConnected || uploadingImage || uploadingFile}
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim() || !isAuthenticated || uploadingImage || uploadingFile}
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

        {/* 검색 사이드바 */}
        {showSearchSidebar && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">채팅 검색</h3>
                <button
                  onClick={() => {
                    setShowSearchSidebar(false)
                    setSearchQuery('')
                    setSearchResults([])
                    setShowSearchResults(false)
                  }}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* 검색 입력 */}
              <form onSubmit={handleSearchSubmit} className="mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="검색어를 입력하세요..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </form>
              
              {/* 카테고리 필터 */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-700 mb-2 block">카테고리</label>
                <div className="flex flex-wrap gap-2">
                  {(['ALL', 'TEXT', 'IMAGE', 'FILE'] as const).map((category) => (
                    <button
                      key={category}
                      onClick={() => {
                        setSearchCategory(category)
                        if (searchQuery.trim()) {
                          setTimeout(() => handleSearchSubmit(), 100)
                        }
                      }}
                      className={`px-3 py-1.5 text-xs rounded-lg transition ${
                        searchCategory === category
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category === 'ALL' ? '전체' : category === 'TEXT' ? '텍스트' : category === 'IMAGE' ? '이미지' : '파일'}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 검색 버튼 */}
              <button
                onClick={() => handleSearchSubmit()}
                disabled={searching || !searchQuery.trim()}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {searching ? '검색 중...' : '검색'}
              </button>
            </div>
            
            {/* 검색 결과 */}
            <div className="flex-1 overflow-y-auto p-4">
              {showSearchResults ? (
                searchResults.length > 0 ? (
                  <>
                    <div className="text-sm text-gray-600 mb-3">
                      검색 결과: <span className="font-semibold">{searchResults.length}개</span>
                    </div>
                    <div className="space-y-2">
                      {searchResults.map((message) => (
                        <div
                          key={message.id}
                          onClick={() => {
                            // 해당 메시지로 스크롤
                            const messageElement = document.querySelector(`[data-message-id="${message.id}"]`)
                            if (messageElement) {
                              messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                              messageElement.classList.add('ring-2', 'ring-blue-500')
                              setTimeout(() => {
                                messageElement.classList.remove('ring-2', 'ring-blue-500')
                              }, 2000)
                            }
                          }}
                          className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-200 transition"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium text-gray-700">
                              {message.displayName || message.nickname}
                            </span>
                            <span className="text-xs text-gray-400">
                              {format(new Date(message.createdTime), 'MM/dd HH:mm', { locale: ko })}
                            </span>
                          </div>
                          {message.fileUrl ? (
                            <div className="text-xs text-gray-500 mb-1">
                              {message.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? '📷 이미지' : '📎 파일'}
                              {message.fileName && `: ${message.fileName}`}
                            </div>
                          ) : null}
                          {message.message && (
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {message.message}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center text-gray-500 text-sm py-8">
                    검색 결과가 없습니다.
                  </div>
                )
              ) : (
                <div className="text-center text-gray-400 text-sm py-8">
                  검색어를 입력하고 검색 버튼을 클릭하세요.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 멤버 목록 사이드바 */}
        {showMembers && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">멤버 ({members.length}명)</h3>
              <button
                onClick={() => setShowMembers(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {members.length === 0 ? (
                <div className="text-center text-gray-500 text-sm">멤버가 없습니다.</div>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => router.push(`/users/${member.username}`)}
                    >
                      <div className="flex-shrink-0">
                        {member.profileImageUrl ? (
                          <img
                            src={member.profileImageUrl}
                            alt={member.nickname}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-semibold">
                            {member.nickname.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800 truncate">
                            {member.nickname}
                          </span>
                          {member.isOwner && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                              주인
                            </span>
                          )}
                          {member.isAdmin && !member.isOwner && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                              관리자
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">@{member.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
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

      {/* 설정 모달 */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">채팅방 설정</h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 탭 메뉴 */}
            {group?.isAdmin && (
              <div className="flex gap-2 mb-4 border-b border-gray-200">
                <button
                  onClick={() => setSettingsTab('room')}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    settingsTab === 'room'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  서버 관리
                </button>
                <button
                  onClick={() => setSettingsTab('displayName')}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    settingsTab === 'displayName'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  별명 설정
                </button>
              </div>
            )}

            {/* 서버 관리 탭 (관리자만) */}
            {settingsTab === 'room' && group?.isAdmin && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    채팅방 이름
                  </label>
                  <input
                    type="text"
                    value={editRoomName}
                    onChange={(e) => setEditRoomName(e.target.value)}
                    placeholder="채팅방 이름"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    disabled={updatingRoom || deletingRoom}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    채팅방 설명 (선택사항)
                  </label>
                  <textarea
                    value={editRoomDescription}
                    onChange={(e) => setEditRoomDescription(e.target.value)}
                    placeholder="채팅방 설명"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    disabled={updatingRoom || deletingRoom}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
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
                        alert('채팅방 정보가 수정되었습니다.')
                        setShowSettingsModal(false)
                      } catch (error: any) {
                        alert(error.response?.data?.message || '채팅방 수정에 실패했습니다.')
                      } finally {
                        setUpdatingRoom(false)
                      }
                    }}
                    disabled={updatingRoom || deletingRoom || !editRoomName.trim() || editRoomName.length < 2}
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updatingRoom ? '저장 중...' : '저장'}
                  </button>
                  <button
                    onClick={handleDeleteRoom}
                    disabled={updatingRoom || deletingRoom}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingRoom ? '삭제 중...' : '채팅방 삭제'}
                  </button>
                </div>
              </div>
            )}

            {/* 별명 설정 탭 */}
            {settingsTab === 'displayName' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    내 별명 (이 채팅방에서만 표시)
                  </label>
                  <input
                    type="text"
                    value={myDisplayName}
                    onChange={(e) => setMyDisplayName(e.target.value)}
                    placeholder="별명을 입력하세요 (선택사항)"
                    maxLength={30}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    disabled={updatingDisplayName}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {myDisplayName.length}/30 (비워두면 기본 닉네임이 표시됩니다)
                  </p>
                </div>
                <button
                  onClick={handleUpdateDisplayName}
                  disabled={updatingDisplayName}
                  className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition disabled:opacity-50"
                >
                  {updatingDisplayName ? '저장 중...' : '저장'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 채팅방 생성 모달 */}
      {showCreateRoomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">새 채팅방 만들기</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  채팅방 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="채팅방 이름을 입력하세요 (2자 이상)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={creatingRoom}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  채팅방 설명 (선택사항)
                </label>
                <textarea
                  value={newRoomDescription}
                  onChange={(e) => setNewRoomDescription(e.target.value)}
                  placeholder="채팅방 설명을 입력하세요"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={creatingRoom}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  채팅방 프로필 이미지 (선택사항)
                </label>
                <div className="flex items-center gap-4">
                  {newRoomImage ? (
                    <div className="relative">
                      <img
                        src={newRoomImage}
                        alt="프로필 미리보기"
                        className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setNewRoomImage('')
                          if (newRoomImageInputRef.current) {
                            newRoomImageInputRef.current.value = ''
                          }
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition"
                        title="이미지 제거"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                      <span className="text-gray-400 text-xs">이미지 없음</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => newRoomImageInputRef.current?.click()}
                    disabled={creatingRoom}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-sm transition disabled:opacity-50"
                  >
                    {newRoomImage ? '이미지 변경' : '이미지 선택'}
                  </button>
                  <input
                    ref={newRoomImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleNewRoomImageChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreateRoom}
                disabled={creatingRoom || !newRoomName.trim() || newRoomName.length < 2}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingRoom ? '생성 중...' : '생성'}
              </button>
              <button
                onClick={handleCloseCreateRoomModal}
                disabled={creatingRoom}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded transition disabled:opacity-50"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 새 채팅방 이미지 크롭 모달 */}
      {showNewRoomImageCrop && newRoomImage && (
        <ImageCropModal
          isOpen={showNewRoomImageCrop}
          imageSrc={newRoomImage}
          onClose={() => {
            setShowNewRoomImageCrop(false)
            setNewRoomImage('')
            if (newRoomImageInputRef.current) {
              newRoomImageInputRef.current.value = ''
            }
          }}
          onCrop={handleNewRoomImageCrop}
          aspectRatio={1}
        />
      )}
    </div>
  )
}
