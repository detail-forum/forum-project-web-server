'use client'

import { useCallback, useEffect, useState } from 'react'
import { directChatApi, imageUploadApi } from '@/services/api'
import type { DirectChatMessageDTO } from '@/types/api'
import { useDirectWebSocket } from '@/hooks/useDirectWebSocket'
import { uploadChatFile } from '@/utils/chatUpload'

const byTime = (a: DirectChatMessageDTO, b: DirectChatMessageDTO) =>
  new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime()

/**
 * 1대1 채팅방 한 곳의 메시지: 불러오기, 실시간 수신, 읽음 표시, 보내기, 첨부.
 * 웹소켓이 끊겨 있으면 REST로 보내고 목록을 다시 받는다.
 */
export function useDirectChatMessages({
  roomId,
  enabled,
  currentUsername,
}: {
  roomId: number | null
  enabled: boolean
  currentUsername: string | null
}) {
  const [messages, setMessages] = useState<DirectChatMessageDTO[]>([])
  const [sending, setSending] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)

  const fetchMessages = useCallback(async () => {
    if (!roomId) return
    try {
      const response = await directChatApi.getMessages(roomId, 0, 100)
      if (response.success && response.data) setMessages([...(response.data.content || [])].sort(byTime))
    } catch (error) {
      console.error('1대1 채팅 메시지 조회 실패:', error)
    }
  }, [roomId])

  useEffect(() => {
    if (enabled && roomId) fetchMessages()
  }, [enabled, roomId, fetchMessages])

  const ws = useDirectWebSocket({
    roomId,
    enabled,
    onMessage: useCallback((message: DirectChatMessageDTO) => {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message].sort(byTime)))
    }, []),
    onRead: useCallback((data: { messageId: number; isRead?: boolean }) => {
      // 서버 읽음 이벤트에는 isRead가 없다: 오면 읽은 것
      setMessages((prev) => prev.map((msg) => (msg.id === data.messageId ? { ...msg, isRead: data.isRead ?? true } : msg)))
    }, []),
  })
  const { isConnected, markAsRead } = ws

  // 상대가 보낸 마지막 메시지를 읽음 처리
  useEffect(() => {
    if (messages.length > 0 && isConnected && currentUsername && roomId) {
      const last = messages[messages.length - 1]
      if (last.username !== currentUsername && !last.isRead) markAsRead(last.id)
    }
  }, [messages, isConnected, currentUsername, roomId, markAsRead])

  /** 보냈으면 true */
  const send = async (text: string): Promise<boolean> => {
    if (!roomId) return false
    const message = text.trim()
    setSending(true)
    try {
      if (isConnected && ws.sendMessage(message)) return true
      const response = await directChatApi.sendMessage(roomId, { message, messageType: 'TEXT' })
      if (response.success && response.data) {
        await fetchMessages()
        return true
      }
      alert(response.message || '메시지 전송에 실패했습니다.')
      return false
    } catch (error: any) {
      alert(error.response?.data?.message || error.message || '메시지 전송에 실패했습니다.')
      return false
    } finally {
      setSending(false)
    }
  }

  // 첨부 메시지는 REST로 보내고 목록을 다시 받는다.
  const sendAttachment = async (
    payload: { messageType: 'IMAGE' | 'FILE'; fileUrl: string; fileName?: string; fileSize?: number },
    failMessage: string,
  ) => {
    if (!roomId) return
    const response = await directChatApi.sendMessage(roomId, { message: '', ...payload })
    if (response.success && response.data) await fetchMessages()
    else alert(response.message || failMessage)
  }

  const sendImage = async (file: File) => {
    try {
      setUploadingImage(true)
      const upload = await imageUploadApi.uploadImage(file)
      if (!upload.success || !upload.data) {
        alert(upload.message || '이미지 업로드에 실패했습니다.')
        return
      }
      await sendAttachment({ messageType: 'IMAGE', fileUrl: upload.data.url }, '이미지 전송에 실패했습니다.')
    } catch (error: any) {
      alert(error.response?.data?.message || error.message || '이미지 업로드에 실패했습니다.')
    } finally {
      setUploadingImage(false)
    }
  }

  const sendFile = async (file: File) => {
    try {
      setUploadingFile(true)
      await sendAttachment({ messageType: 'FILE', ...(await uploadChatFile(file)) }, '파일 전송에 실패했습니다.')
    } catch (error: any) {
      alert(error.response?.data?.message || error.message || '파일 업로드에 실패했습니다.')
    } finally {
      setUploadingFile(false)
    }
  }

  return {
    messages,
    sending,
    uploadingImage,
    uploadingFile,
    isConnected,
    typingUsers: ws.typingUsers,
    startTyping: ws.startTyping,
    stopTyping: ws.stopTyping,
    send,
    sendImage,
    sendFile,
  }
}
