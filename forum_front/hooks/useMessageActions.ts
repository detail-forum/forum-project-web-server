'use client'

import { useEffect, useState } from 'react'
import type { GroupChatMessageDTO } from '@/types/api'
import type { MessageEditing } from '@/components/chat/MessageItem'
import type { ContextMenuState } from '@/components/chat/MessageMenus'

interface ChatOps {
  messages: GroupChatMessageDTO[]
  deleteMessage: (messageId: number) => Promise<boolean>
  editMessageLocally: (messageId: number, text: string) => void
  toggleReaction: (messageId: number, emoji: string) => Promise<boolean>
}

/** 그룹 채팅 메시지의 우클릭 메뉴, 수정, 답장, 반응 상태 */
export function useMessageActions(chat: ChatOps, currentUsername: string | null) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [reactingMessageId, setReactingMessageId] = useState<number | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [replyingTo, setReplyingTo] = useState<GroupChatMessageDTO | null>(null)

  // 우클릭 메뉴는 바깥 아무 곳이나 누르면 닫는다
  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [contextMenu])

  const find = (id: number) => chat.messages.find((m) => m.id === id)

  const onContextMenu = (e: React.MouseEvent, messageId: number) => {
    e.preventDefault()
    const message = find(messageId)
    if (!message) return
    setContextMenu({ x: e.clientX, y: e.clientY, messageId, isMyMessage: message.username === currentUsername })
  }

  const toggleReaction = async (messageId: number, emoji: string) => {
    if (await chat.toggleReaction(messageId, emoji)) {
      setReactingMessageId(null)
      setContextMenu(null)
    }
  }

  const cancelEdit = () => {
    setEditingMessageId(null)
    setEditText('')
  }

  const editing: MessageEditing = {
    messageId: editingMessageId,
    text: editText,
    setText: setEditText,
    onSave: (messageId) => {
      if (!editText.trim()) return
      chat.editMessageLocally(messageId, editText)
      cancelEdit()
    },
    onCancel: cancelEdit,
  }

  const menuHandlers = {
    onReact: (id: number) => {
      setReactingMessageId(id)
      setContextMenu(null)
    },
    onEdit: (id: number) => {
      const message = find(id)
      if (!message) return
      setEditingMessageId(id)
      setEditText(message.message)
      setContextMenu(null)
    },
    onReply: (id: number) => {
      const message = find(id)
      if (!message) return
      setReplyingTo(message)
      setContextMenu(null)
    },
    onDelete: async (id: number) => {
      if (await chat.deleteMessage(id)) setContextMenu(null)
    },
  }

  return {
    contextMenu,
    onContextMenu,
    menuHandlers,
    editing,
    replyingTo,
    setReplyingTo,
    reactingMessageId,
    closeReactionPicker: () => setReactingMessageId(null),
    toggleReaction,
  }
}

export type MessageActions = ReturnType<typeof useMessageActions>
