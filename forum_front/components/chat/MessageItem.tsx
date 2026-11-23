'use client'

import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { GroupChatMessageDTO } from '@/types/api'

/** 그룹·1대1 메시지가 함께 쓰는 모양. 1대1에는 답장, 반응, 관리자 표시가 없다. */
export type ChatMessageView = Pick<
  GroupChatMessageDTO,
  'id' | 'username' | 'nickname' | 'message' | 'createdTime' | 'profileImageUrl' | 'fileUrl' | 'fileName' | 'fileSize'
> &
  Partial<
    Pick<GroupChatMessageDTO, 'displayName' | 'isAdmin' | 'replyToMessageId' | 'replyToMessage' | 'reactions' | 'myReactions' | 'messageType'>
  >

/** 그룹 채팅 읽음 표시: 나를 뺀 멤버 중 아직 읽지 않은 수 */
export const groupReadLabel = (memberCount: number, readCount?: number) => {
  const unread = Math.max(0, memberCount - (readCount || 0) - 1)
  return unread > 0 ? `읽음 ${unread}` : ''
}

export interface MessageEditing {
  messageId: number | null
  text: string
  setText: (text: string) => void
  onSave: (messageId: number) => void
  onCancel: () => void
}

interface Props {
  message: ChatMessageView
  isMine: boolean
  isNewest: boolean
  /** 내 메시지 옆 읽음 표시. undefined면 자리도 만들지 않는다 */
  readLabel?: string
  editing?: MessageEditing
  onContextMenu?: (e: React.MouseEvent, messageId: number) => void
  onToggleReaction?: (messageId: number, emoji: string) => void
}

/** 화면의 메시지 요소로 스크롤하고 2초간 강조한다. 답장 원문, 검색 결과에서 쓴다. */
export function scrollToMessage(messageId: number) {
  const element = document.querySelector(`[data-message-id="${messageId}"]`)
  if (!element) return
  element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  element.classList.add('ring-2', 'ring-blue-500')
  setTimeout(() => element.classList.remove('ring-2', 'ring-blue-500'), 2000)
}

/** 채팅 메시지 한 개: 작성자, 답장 원문, 본문(텍스트·이미지·파일), 반응, 읽음 수 */
export default function MessageItem({ message, isMine, isNewest, readLabel, editing, onContextMenu, onToggleReaction }: Props) {
  return (
    <div
      data-message-id={message.id}
      className={`flex gap-3 ${isMine ? 'flex-row-reverse' : ''} ${isNewest ? 'animate-slide-in' : ''}`}
      onContextMenu={onContextMenu ? (e) => onContextMenu(e, message.id) : undefined}
    >
      <div className="flex-shrink-0">
        {message.profileImageUrl ? (
          <img src={message.profileImageUrl} alt={message.nickname} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-semibold">
            {message.nickname.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className={`flex-1 ${isMine ? 'flex flex-col items-end' : ''}`}>
        <div className={`flex items-baseline gap-2 mb-1 ${isMine ? 'flex-row-reverse' : ''}`}>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-sm text-gray-800">{message.displayName || message.nickname}</span>
            {message.isAdmin && (
              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <title>관리자</title>
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            )}
            {isMine && <span className="text-blue-500 ml-1 text-xs">(나)</span>}
          </div>
          <span className="text-xs text-gray-500">{format(new Date(message.createdTime), 'HH:mm', { locale: ko })}</span>
        </div>
        <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
          {editing && editing.messageId === message.id ? (
            <div className="flex-1">
              <input
                type="text"
                value={editing.text}
                onChange={(e) => editing.setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    editing.onSave(message.id)
                  } else if (e.key === 'Escape') {
                    editing.onCancel()
                  }
                }}
                className="w-full px-3 py-2 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => editing.onSave(message.id)}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                >
                  저장
                </button>
                <button onClick={editing.onCancel} className="px-3 py-1 bg-gray-200 text-gray-800 rounded text-xs hover:bg-gray-300">
                  취소
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                {message.replyToMessageId && message.replyToMessage && (
                  <ReplyQuote message={message} isMine={isMine} />
                )}
                <div
                  className={`rounded-lg px-4 py-2 inline-block max-w-md w-fit relative group ${
                    isMine ? 'bg-blue-500 text-white' : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  <MessageBody message={message} isMine={isMine} />
                  {message.reactions && message.reactions.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {message.reactions.map((reaction, idx) => (
                        <button
                          key={idx}
                          onClick={() => onToggleReaction?.(message.id, reaction.emoji)}
                          className={`px-2 py-1 rounded-full text-xs hover:bg-opacity-30 transition ${
                            message.myReactions?.includes(reaction.emoji) ? 'bg-blue-500 bg-opacity-30' : 'bg-black bg-opacity-20'
                          }`}
                        >
                          {reaction.emoji} {reaction.count}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {readLabel !== undefined && (
                <span className="text-xs text-gray-400 whitespace-nowrap self-end pb-8">{readLabel}</span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ReplyQuote({ message, isMine }: { message: ChatMessageView; isMine: boolean }) {
  const reply = message.replyToMessage!
  const name = reply.displayName || reply.nickname
  return (
    <div
      className={`flex items-center gap-2 mb-1 px-2 py-1 rounded border-l-4 cursor-pointer hover:opacity-80 transition ${
        isMine ? 'bg-blue-400 bg-opacity-20 border-blue-300' : 'bg-gray-100 border-gray-300'
      }`}
      onClick={() => scrollToMessage(message.replyToMessageId!)}
    >
      <div className="flex-shrink-0">
        {reply.profileImageUrl ? (
          <img src={reply.profileImageUrl} alt={reply.nickname} className="w-5 h-5 rounded-full object-cover" />
        ) : (
          <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-[10px] text-gray-600 font-semibold">{name.charAt(0).toUpperCase()}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 min-w-0 flex-1">
        <span className={`text-xs font-medium truncate ${isMine ? 'text-blue-50' : 'text-gray-700'}`}>{name}</span>
        <span className={`text-xs truncate ${isMine ? 'text-blue-100' : 'text-gray-500'}`}>
          {reply.message.length > 50 ? reply.message.substring(0, 50) + '...' : reply.message}
        </span>
      </div>
    </div>
  )
}

function MessageBody({ message, isMine }: { message: ChatMessageView; isMine: boolean }) {
  if (message.messageType === 'IMAGE' && message.fileUrl) {
    return (
      <img
        src={message.fileUrl}
        alt="이미지"
        className="max-w-full h-auto rounded cursor-pointer"
        onClick={() => window.open(message.fileUrl, '_blank')}
      />
    )
  }
  if (message.messageType === 'FILE' && message.fileUrl) {
    return (
      <a
        href={message.fileUrl}
        download={message.fileName}
        className={`flex items-center gap-2 text-sm hover:underline ${isMine ? 'text-white' : 'text-gray-900'}`}
      >
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <div className="min-w-0">
          <div className="truncate">{message.fileName || '파일'}</div>
          {message.fileSize && (
            <div className={`text-xs ${isMine ? 'text-blue-100' : 'text-gray-500'}`}>{(message.fileSize / 1024).toFixed(1)} KB</div>
          )}
        </div>
      </a>
    )
  }
  return <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
}
