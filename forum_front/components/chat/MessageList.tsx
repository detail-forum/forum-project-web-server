'use client'

import type { RefObject } from 'react'
import type { GroupChatMessageDTO } from '@/types/api'
import MessageItem, { type MessageEditing } from './MessageItem'

interface Props {
  containerRef: RefObject<HTMLDivElement>
  endRef: RefObject<HTMLDivElement>
  messages: GroupChatMessageDTO[]
  currentUsername: string | null
  memberCount?: number
  typingUsers: string[]
  isConnected: boolean
  editing: MessageEditing
  onContextMenu: (e: React.MouseEvent, messageId: number) => void
  onToggleReaction: (messageId: number, emoji: string) => void
}

/** 메시지 목록, 입력 중 표시, 연결 상태 */
export default function MessageList({
  containerRef,
  endRef,
  messages,
  currentUsername,
  memberCount,
  typingUsers,
  isConnected,
  editing,
  onContextMenu,
  onToggleReaction,
}: Props) {
  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 relative">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <p className="text-lg mb-2">메시지가 없습니다.</p>
            <p className="text-sm">첫 메시지를 보내보세요!</p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message, index) => (
            <MessageItem
              key={message.id}
              message={message}
              isMine={currentUsername === message.username}
              isNewest={index === messages.length - 1}
              memberCount={memberCount}
              editing={editing}
              onContextMenu={onContextMenu}
              onToggleReaction={onToggleReaction}
            />
          ))}
          {/* 입력 중 표시 자리는 항상 잡아 둔다 (메시지가 들썩이지 않게) */}
          <div className="px-4 py-2 min-h-[40px] flex items-center">
            {typingUsers.length > 0 ? (
              <div className="text-sm text-gray-500 italic">
                {typingUsers.length === 1 ? `${typingUsers[0]}님이 입력 중...` : `${typingUsers.length}명이 입력 중...`}
              </div>
            ) : (
              <div className="text-sm text-transparent">공간</div>
            )}
          </div>
          {!isConnected && (
            <div className="px-4 py-2 text-xs text-yellow-600 bg-yellow-50 rounded">연결 중... 메시지가 지연될 수 있습니다.</div>
          )}
        </>
      )}
      <div ref={endRef} />
    </div>
  )
}
