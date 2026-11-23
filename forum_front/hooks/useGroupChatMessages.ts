'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { groupApi, imageUploadApi } from '@/services/api'
import { uploadChatFile } from '@/utils/chatUpload'
import type { GroupChatMessageDTO } from '@/types/api'
import { useWebSocket } from '@/hooks/useWebSocket'

type ReplyPreview = NonNullable<GroupChatMessageDTO['replyToMessage']>

const toReplyPreview = (m: GroupChatMessageDTO): ReplyPreview => ({
  id: m.id,
  message: m.message,
  username: m.username,
  nickname: m.nickname,
  displayName: m.displayName,
  profileImageUrl: m.profileImageUrl,
})

/** 답장 입력에 남은 "@별명 " 접두어를 떼어 낸다. */
const stripReplyPrefix = (text: string, replyingTo: GroupChatMessageDTO | null) => {
  const trimmed = text.trim()
  if (!replyingTo || !trimmed.startsWith('@')) return trimmed
  const prefix = `@${replyingTo.displayName || replyingTo.nickname} `
  return trimmed.startsWith(prefix) ? trimmed.substring(prefix.length).trim() : trimmed.replace(/^@\w+\s*/, '').trim()
}

interface Options {
  groupId: number
  roomId: number
  enabled: boolean
  currentUsername: string | null
  /** 목록을 서버에서 통째로 다시 받았을 때 */
  onReplaced?: () => void
  /** 웹소켓으로 새 메시지가 붙었을 때 */
  onAppended?: () => void
}

/**
 * 모임 채팅방 한 곳의 메시지: 불러오기, 실시간 수신, 보내기, 첨부, 반응, 삭제.
 * 웹소켓이 끊겨 있으면 REST로 보내고 목록을 다시 받는다.
 */
export function useGroupChatMessages({ groupId, roomId, enabled, currentUsername, onReplaced, onAppended }: Options) {
  const [messages, setMessages] = useState<GroupChatMessageDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)

  // 웹소켓 콜백은 한 번만 만들어지므로 최신 값은 ref로 읽는다.
  const usernameRef = useRef(currentUsername)
  usernameRef.current = currentUsername
  const callbacksRef = useRef({ onReplaced, onAppended })
  callbacksRef.current = { onReplaced, onAppended }
  // 서버가 브로드캐스트에 답장 정보를 빠뜨려도 방금 보낸 답장에 붙이기 위한 기록
  const pendingReplyRef = useRef<{ replyTo: GroupChatMessageDTO; messageText: string; timestamp: number } | null>(null)

  const fetchMessages = useCallback(async () => {
    try {
      const response = await groupApi.getChatMessages(groupId, roomId, 0, 100)
      if (response.success && response.data) {
        // 최신 메시지가 아래에 오도록 역순 정렬
        setMessages([...response.data].reverse())
        callbacksRef.current.onReplaced?.()
      }
    } catch (error) {
      console.error('채팅 메시지 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [groupId, roomId])

  useEffect(() => {
    if (groupId && roomId) fetchMessages()
  }, [groupId, roomId, fetchMessages])

  const ws = useWebSocket({
    groupId,
    roomId,
    enabled,
    onMessage: useCallback((message: GroupChatMessageDTO) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev

        let withReply = message
        // 1. 서버가 답장 id만 보냈으면 목록에서 원문을 찾아 붙인다
        if (message.replyToMessageId && !message.replyToMessage) {
          const replied = prev.find((m) => m.id === message.replyToMessageId)
          if (replied) withReply = { ...message, replyToMessage: toReplyPreview(replied) }
        }
        // 2. 방금 내가 보낸 답장이면 보낼 때 기억해 둔 원문을 붙인다 (내용 같고 10초 이내)
        const pending = pendingReplyRef.current
        if (!withReply.replyToMessageId && pending && message.username === usernameRef.current) {
          const timeDiff = Math.abs(new Date(message.createdTime).getTime() - pending.timestamp)
          if (message.message.trim() === pending.messageText.trim() && timeDiff < 10000) {
            withReply = { ...withReply, replyToMessageId: pending.replyTo.id, replyToMessage: toReplyPreview(pending.replyTo) }
            pendingReplyRef.current = null
          }
        }

        setTimeout(() => callbacksRef.current.onAppended?.(), 100)
        return [...prev, withReply].sort((a, b) => new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime())
      })
    }, []),
    onRead: useCallback((data: { messageId: number; username: string; readCount: number }) => {
      setMessages((prev) => prev.map((msg) => (msg.id === data.messageId ? { ...msg, readCount: data.readCount } : msg)))
    }, []),
  })
  const { isConnected, markAsRead } = ws

  // 남이 보낸 마지막 메시지를 읽음 처리
  useEffect(() => {
    if (messages.length > 0 && isConnected && currentUsername) {
      const last = messages[messages.length - 1]
      if (last.username !== currentUsername && last.readCount !== undefined) markAsRead(last.id)
    }
  }, [messages, isConnected, currentUsername, markAsRead])

  const refetchSoon = () => setTimeout(() => fetchMessages(), 500)

  /** 보냈으면 true. 입력창을 비울지 결정하는 데 쓴다. */
  const send = async (text: string, replyingTo: GroupChatMessageDTO | null): Promise<boolean> => {
    const messageToSend = stripReplyPrefix(text, replyingTo)
    setSending(true)
    try {
      if (isConnected && ws.sendMessage(messageToSend, replyingTo?.id)) {
        if (replyingTo) {
          const info = { replyTo: replyingTo, messageText: messageToSend, timestamp: Date.now() }
          pendingReplyRef.current = info
          setTimeout(() => {
            if (pendingReplyRef.current?.timestamp === info.timestamp) pendingReplyRef.current = null
          }, 10000)
        }
        return true
      }
      // 웹소켓이 없거나 실패하면 REST로 보낸다
      const response = await groupApi.sendChatMessage(groupId, roomId, {
        message: messageToSend,
        replyToMessageId: replyingTo?.id,
      })
      if (response.success) {
        refetchSoon()
        return true
      }
      return false
    } catch (error: any) {
      console.error('메시지 전송 실패:', error)
      alert(error.response?.data?.message || '메시지 전송에 실패했습니다.')
      return false
    } finally {
      setSending(false)
    }
  }

  // 첨부 메시지는 웹소켓이 아직 지원하지 않아 REST로 보낸다.
  const sendAttachment = async (payload: { messageType: 'IMAGE' | 'FILE'; fileUrl: string; fileName?: string; fileSize?: number }) => {
    const response = await groupApi.sendChatMessage(groupId, roomId, { message: '', ...payload } as any)
    if (response.success) refetchSoon()
  }

  const sendImage = async (file: File) => {
    try {
      setUploadingImage(true)
      const upload = await imageUploadApi.uploadImage(file)
      if (upload.success && upload.data) await sendAttachment({ messageType: 'IMAGE', fileUrl: upload.data.url })
    } catch (error: any) {
      console.error('이미지 업로드 실패:', error)
      alert(error.response?.data?.message || '이미지 업로드에 실패했습니다.')
    } finally {
      setUploadingImage(false)
    }
  }

  const sendFile = async (file: File) => {
    try {
      setUploadingFile(true)
      await sendAttachment({ messageType: 'FILE', ...(await uploadChatFile(file)) })
    } catch (error: any) {
      console.error('파일 업로드 실패:', error)
      alert(error.response?.data?.message || '파일 업로드에 실패했습니다.')
    } finally {
      setUploadingFile(false)
    }
  }

  const sendGif = async (gifUrl: string) => {
    try {
      setSending(true)
      await sendAttachment({ messageType: 'IMAGE', fileUrl: gifUrl })
    } catch (error: any) {
      console.error('GIF 전송 실패:', error)
      alert(error.response?.data?.message || 'GIF 전송에 실패했습니다.')
    } finally {
      setSending(false)
    }
  }

  /** 지웠으면 true */
  const deleteMessage = async (messageId: number) => {
    if (!confirm('정말로 이 메시지를 삭제하시겠습니까?')) return false
    try {
      const response = await groupApi.deleteChatMessage(groupId, roomId, messageId)
      if (response.success) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId))
        return true
      }
    } catch (error: any) {
      console.error('메시지 삭제 실패:', error)
      alert(error.response?.data?.message || '메시지 삭제에 실패했습니다.')
    }
    return false
  }

  // shortcut: 수정 API가 아직 없어 화면에서만 바꾼다. 새로고침하면 원래 내용으로 돌아온다.
  const editMessageLocally = (messageId: number, text: string) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, message: text } : m)))
  }

  /** 반응을 켜고 끈 뒤 그 메시지만 서버 값으로 바꾼다. 성공하면 true */
  const toggleReaction = async (messageId: number, emoji: string) => {
    try {
      const response = await groupApi.toggleReaction(groupId, roomId, messageId, emoji)
      if (!response.success) return false
      const latest = await groupApi.getChatMessages(groupId, roomId, 0, 100)
      const updated = latest.success ? latest.data?.find((m) => m.id === messageId) : undefined
      if (updated) setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)))
      return true
    } catch (error: any) {
      console.error('반응 추가/제거 실패:', error)
      alert(error.response?.data?.message || '반응 추가/제거에 실패했습니다.')
      return false
    }
  }

  return {
    messages,
    loading,
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
    sendGif,
    deleteMessage,
    editMessageLocally,
    toggleReaction,
  }
}
