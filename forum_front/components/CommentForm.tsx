'use client'

import { useState } from 'react'
import { commentApi } from '@/services/api'
import { store } from '@/store/store'
import { logout } from '@/store/slices/authSlice'
import GifPicker from './GifPicker'

interface CommentFormProps {
  postId: number
  parentCommentId?: number | null
  onCommentCreated: () => void
  placeholder?: string
  onCancel?: () => void
}

export default function CommentForm({
  postId,
  parentCommentId,
  onCommentCreated,
  placeholder = '댓글을 입력하세요...',
  onCancel,
}: CommentFormProps) {
  const [body, setBody] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!body.trim()) {
      alert('댓글 내용을 입력해주세요.')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await commentApi.createComment({
        body: body.trim(),
        postId,
        parentCommentId: parentCommentId || null,
      })

      if (response.success) {
        setBody('')
        onCommentCreated()
        if (onCancel) {
          onCancel()
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 
        ([401, 403].includes(err.response?.status) ? '로그인이 필요합니다. 다시 로그인해주세요.' : 
         err.response?.status === 502 ? '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' :
         '댓글 작성에 실패했습니다.')
      alert(errorMessage)
      console.error('댓글 작성 실패:', err)
      
      // 403 오류 시 로그아웃 처리
      if ([401, 403].includes(err.response?.status) && typeof window !== 'undefined') {
        store.dispatch(logout())
        setTimeout(() => {
          window.location.href = '/'
        }, 1000)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGifSelect = (gifUrl: string) => {
    // GIF를 마크다운 이미지 형식으로 추가
    const gifMarkdown = `![GIF](${gifUrl})`
    setBody(prev => prev ? `${prev}\n${gifMarkdown}` : gifMarkdown)
    setShowGifPicker(false)
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={placeholder}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none pr-10"
            rows={3}
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={() => setShowGifPicker(true)}
            disabled={isSubmitting}
            className="absolute bottom-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 transition disabled:opacity-50"
            title="GIF 추가"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
        <div className="flex justify-end space-x-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              취소
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !body.trim()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '작성 중...' : '작성'}
          </button>
        </div>
      </form>
      <GifPicker
        isOpen={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelect={handleGifSelect}
      />
    </>
  )
}

