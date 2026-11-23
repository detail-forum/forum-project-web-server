'use client'

import { useEffect, useRef, useState } from 'react'
import type { GroupChatMessageDTO } from '@/types/api'

interface Props {
  isAuthenticated: boolean
  isConnected: boolean
  sending: boolean
  uploadingImage: boolean
  uploadingFile: boolean
  replyingTo: GroupChatMessageDTO | null
  onCancelReply: () => void
  /** 보냈으면 true를 돌려준다. 그때 입력창을 비운다. */
  onSend: (text: string) => Promise<boolean>
  onRequireLogin: () => void
  onStartTyping: () => void
  onStopTyping: () => void
  onPickImage: (file: File) => void
  onPickFile: (file: File) => void
  onOpenGif: () => void
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_FILE_BYTES = 50 * 1024 * 1024

/** 메시지 입력창: 답장 표시, 첨부 메뉴(이미지·파일·GIF), 입력 중 알림 */
export default function MessageComposer({
  isAuthenticated,
  isConnected,
  sending,
  uploadingImage,
  uploadingFile,
  replyingTo,
  onCancelReply,
  onSend,
  onRequireLogin,
  onStartTyping,
  onStopTyping,
  onPickImage,
  onPickFile,
  onOpenGif,
}: Props) {
  const [text, setText] = useState('')
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const attachmentMenuRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 답장을 고르면 입력창을 비우고 포커스한다
  useEffect(() => {
    if (!replyingTo) return
    setText('')
    const t = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(t)
  }, [replyingTo])

  // 첨부 메뉴 바깥을 누르면 닫는다
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) {
        setShowAttachmentMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const clearTypingTimer = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setText(value)
    clearTypingTimer()
    if (value.trim() && isConnected) {
      onStartTyping()
      // 3초 동안 입력이 없으면 입력 중 표시를 끈다
      typingTimeoutRef.current = setTimeout(onStopTyping, 3000)
    } else {
      onStopTyping()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) {
      onRequireLogin()
      return
    }
    if (!text.trim()) return
    if (await onSend(text)) {
      setText('')
      onStopTyping()
      clearTypingTimer()
    }
  }

  const pick = (max: number, tooBig: string, onPick: (file: File) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > max) {
      alert(tooBig)
      return
    }
    onPick(file)
    setShowAttachmentMenu(false)
  }

  const busy = uploadingImage || uploadingFile
  const menuItemClass =
    'w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2 disabled:opacity-50'

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4 bg-white">
      {replyingTo && (
        <div className="mb-2 p-2 bg-gray-100 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs text-gray-500">답장:</span>
            <span className="text-xs text-gray-700 truncate">
              @{replyingTo.displayName || replyingTo.nickname || replyingTo.username}: {replyingTo.message}
            </span>
          </div>
          <button type="button" onClick={onCancelReply} className="text-gray-400 hover:text-gray-600 text-sm">
            ✕
          </button>
        </div>
      )}
      <div className="flex gap-2 items-end">
        <div className="relative" ref={attachmentMenuRef}>
          <button
            type="button"
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            disabled={sending || !isAuthenticated || busy}
            className="p-2 text-gray-400 hover:text-gray-600 transition disabled:opacity-50"
            title="첨부"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          {showAttachmentMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[150px] z-50">
              <button
                type="button"
                onClick={() => {
                  imageInputRef.current?.click()
                  setShowAttachmentMenu(false)
                }}
                disabled={uploadingImage}
                className={menuItemClass}
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
                className={menuItemClass}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                {uploadingFile ? '업로드 중...' : '파일'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenGif()
                  setShowAttachmentMenu(false)
                }}
                disabled={sending}
                className={menuItemClass}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                GIF
              </button>
            </div>
          )}
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={pick(MAX_IMAGE_BYTES, '이미지 크기는 10MB 이하여야 합니다.', onPickImage)}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          onChange={pick(MAX_FILE_BYTES, '파일 크기는 50MB 이하여야 합니다.', onPickFile)}
          className="hidden"
        />
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={handleChange}
          placeholder={replyingTo ? `@${replyingTo.nickname}에게 답장...` : '메시지를 입력하세요...'}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={sending || !isAuthenticated || !isConnected || busy}
        />
        <button
          type="submit"
          disabled={sending || !text.trim() || !isAuthenticated || busy}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {sending ? '전송 중...' : '전송'}
        </button>
      </div>
      {!isAuthenticated && <p className="text-sm text-gray-500 mt-2 text-center">로그인이 필요합니다.</p>}
    </form>
  )
}
