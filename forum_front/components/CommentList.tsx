'use client'

import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import { commentApi } from '@/services/api'
import type { CommentDTO } from '@/types/api'
import CommentItem from './CommentItem'
import CommentForm from './CommentForm'
import LoginModal from './LoginModal'
import { getUsernameFromToken } from '@/utils/jwt'

interface CommentListProps {
  postId: number
  postAuthorUsername?: string
}

export default function CommentList({ postId, postAuthorUsername }: CommentListProps) {
  const [comments, setComments] = useState<CommentDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const currentUsername = getUsernameFromToken()

  useEffect(() => {
    fetchComments()
  }, [postId])

  const fetchComments = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await commentApi.getComments(postId)
      if (response.success && response.data) {
        setComments(response.data)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '댓글을 불러오는데 실패했습니다.')
      console.error('댓글 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCommentCreated = () => {
    fetchComments()
  }

  const handleCommentUpdated = (updatedComment: CommentDTO) => {
    setComments((prev) => updateCommentInTree(prev, updatedComment))
  }

  const handleCommentDeleted = (commentId: number) => {
    setComments((prev) => removeCommentFromTree(prev, commentId))
  }

  const handleLikeToggled = (updatedComment: CommentDTO) => {
    setComments((prev) => updateCommentInTree(prev, updatedComment))
  }

  const handlePinToggled = (updatedComment: CommentDTO) => {
    setComments((prev) => {
      // 고정된 댓글을 맨 위로 이동
      const updated = updateCommentInTree(prev, updatedComment)
      return sortCommentsByPinned(updated)
    })
  }

  // 트리 구조에서 댓글 업데이트
  const updateCommentInTree = (comments: CommentDTO[], updated: CommentDTO): CommentDTO[] => {
    return comments.map((comment) => {
      if (comment.id === updated.id) {
        return { ...updated, replies: comment.replies }
      }
      if (comment.replies.length > 0) {
        return {
          ...comment,
          replies: updateCommentInTree(comment.replies, updated),
        }
      }
      return comment
    })
  }

  // 트리 구조에서 댓글 제거
  const removeCommentFromTree = (comments: CommentDTO[], commentId: number): CommentDTO[] => {
    return comments
      .filter((comment) => comment.id !== commentId)
      .map((comment) => ({
        ...comment,
        replies: removeCommentFromTree(comment.replies, commentId),
      }))
  }

  // 고정된 댓글을 맨 위로 정렬
  const sortCommentsByPinned = (comments: CommentDTO[]): CommentDTO[] => {
    return [...comments].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return 0
    })
  }

  if (loading) {
    return (
      <div className="mt-8 p-4 text-center text-gray-500">
        댓글을 불러오는 중...
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error}
      </div>
    )
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        댓글 {comments.length}
      </h2>

      {/* 댓글 작성 폼 */}
      {isAuthenticated ? (
        <CommentForm
          postId={postId}
          onCommentCreated={handleCommentCreated}
          placeholder="댓글을 입력하세요..."
        />
      ) : (
        <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
          <p className="text-gray-600 mb-3">댓글을 작성하려면 로그인이 필요합니다.</p>
          <button
            onClick={() => setShowLoginModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors"
          >
            로그인하기
          </button>
        </div>
      )}

      {/* 로그인 모달 */}
      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      {/* 댓글 목록 */}
      <div className="mt-6 space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            아직 댓글이 없습니다. 첫 댓글을 작성해보세요!
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postAuthorUsername={postAuthorUsername}
              currentUsername={currentUsername}
              isAuthenticated={isAuthenticated}
              postId={postId}
              onCommentUpdated={handleCommentUpdated}
              onCommentDeleted={handleCommentDeleted}
              onLikeToggled={handleLikeToggled}
              onPinToggled={handlePinToggled}
              onReplyCreated={handleCommentCreated}
            />
          ))
        )}
      </div>
    </div>
  )
}

