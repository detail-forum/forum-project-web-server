'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { groupApi } from '@/services/api'
import type { GroupChatMessageDTO } from '@/types/api'
import { scrollToMessage } from './MessageItem'

type Category = 'ALL' | 'TEXT' | 'IMAGE' | 'FILE'
const CATEGORY_LABEL: Record<Category, string> = { ALL: '전체', TEXT: '텍스트', IMAGE: '이미지', FILE: '파일' }
const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp)$/i

const isImage = (m: GroupChatMessageDTO) => !!m.fileUrl && (IMAGE_EXT.test(m.fileUrl) || m.messageType === 'IMAGE')
const matchesCategory = (m: GroupChatMessageDTO, category: Category) => {
  if (category === 'TEXT') return !m.fileUrl && !m.fileName
  if (category === 'IMAGE') return isImage(m)
  if (category === 'FILE') return !!m.fileUrl && !!m.fileName && !isImage(m)
  return true
}

interface Props {
  groupId: number
  roomId: number
  /** 검색 API가 실패하면 지금 화면의 메시지에서 찾는다 */
  loadedMessages: GroupChatMessageDTO[]
  onClose: () => void
}

/** 채팅 검색 사이드바. 닫으면(언마운트) 검색어와 결과가 함께 사라진다. */
export default function ChatSearchSidebar({ groupId, roomId, loadedMessages, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category>('ALL')
  const [results, setResults] = useState<GroupChatMessageDTO[] | null>(null)
  const [searching, setSearching] = useState(false)

  const search = async (useCategory: Category = category) => {
    if (!query.trim()) {
      setResults((prev) => (prev === null ? null : []))
      return
    }
    setSearching(true)
    try {
      let found: GroupChatMessageDTO[]
      try {
        const response = await groupApi.searchChatMessages(groupId, roomId, query)
        if (!response.success || !response.data) throw new Error('검색 실패')
        found = response.data.content || []
      } catch {
        const q = query.toLowerCase()
        found = loadedMessages.filter((m) => m.message?.toLowerCase().includes(q))
      }
      setResults(found.filter((m) => matchesCategory(m, useCategory)))
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">채팅 검색</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            search()
          }}
          className="mb-4"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색어를 입력하세요..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </form>

        <div className="mb-4">
          <label className="text-xs font-medium text-gray-700 mb-2 block">카테고리</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCategory(c)
                  if (query.trim()) search(c)
                }}
                className={`px-3 py-1.5 text-xs rounded-lg transition ${
                  category === c ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => search()}
          disabled={searching || !query.trim()}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {searching ? '검색 중...' : '검색'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {results === null ? (
          <div className="text-center text-gray-400 text-sm py-8">검색어를 입력하고 검색 버튼을 클릭하세요.</div>
        ) : results.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">검색 결과가 없습니다.</div>
        ) : (
          <>
            <div className="text-sm text-gray-600 mb-3">
              검색 결과: <span className="font-semibold">{results.length}개</span>
            </div>
            <div className="space-y-2">
              {results.map((message) => (
                <div
                  key={message.id}
                  onClick={() => scrollToMessage(message.id)}
                  className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-200 transition"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-gray-700">{message.displayName || message.nickname}</span>
                    <span className="text-xs text-gray-400">
                      {format(new Date(message.createdTime), 'MM/dd HH:mm', { locale: ko })}
                    </span>
                  </div>
                  {message.fileUrl ? (
                    <div className="text-xs text-gray-500 mb-1">
                      {IMAGE_EXT.test(message.fileUrl) ? '📷 이미지' : '📎 파일'}
                      {message.fileName && `: ${message.fileName}`}
                    </div>
                  ) : null}
                  {message.message && <p className="text-sm text-gray-600 line-clamp-2">{message.message}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
