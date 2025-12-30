'use client'

import { useState } from 'react'
import type { CommentDTO } from '@/types/api'
import CommentForm from './CommentForm'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { commentApi } from '@/services/api'

// 간단한 SVG 아이콘 컴포넌트
const HeartIcon = ({ filled = false, className = 'w-4 h-4' }: { filled?: boolean; className?: string }) => (
  <svg className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
)

const PinIcon = ({ filled = false, className = 'w-4 h-4' }: { filled?: boolean; className?: string }) => (
  <svg className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
  </svg>
)

const TrashIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const EditIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

const ReplyIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
  </svg>
)

interface CommentItemProps {
  comment: CommentDTO
  postAuthorUsername?: string
  currentUsername: string | null
  isAuthenticated: boolean
  postId: number
  onCommentUpdated: (comment: CommentDTO) => void
  onCommentDeleted: (commentId: number) => void
  onLikeToggled: (comment: CommentDTO) => void
  onPinToggled: (comment: CommentDTO) => void
  onReplyCreated: () => void
  depth?: number
}

export default function CommentItem({
  comment,
  postAuthorUsername,
  currentUsername,
  isAuthenticated,
  postId,
  onCommentUpdated,
  onCommentDeleted,
  onLikeToggled,
  onPinToggled,
  onReplyCreated,
  depth = 0,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isReplying, setIsReplying] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLiking, setIsLiking] = useState(false)
  const [isPinning, setIsPinning] = useState(false)
  const [editBody, setEditBody] = useState(comment.body)

  const isOwner = currentUsername === comment.username
  const isPostAuthor = currentUsername === postAuthorUsername
  const canPin = isPostAuthor && !comment.parentCommentId // 게시글 작성자만 최상위 댓글 고정 가능
  const maxDepth = 2 // 최대 대댓글 깊이

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ko })
    } catch {
      return dateString
    }
  }

  const handleEdit = async () => {
    if (!editBody.trim()) {
      alert('댓글 내용을 입력해주세요.')
      return
    }

    try {
      const response = await commentApi.updateComment(comment.id, { body: editBody })
      if (response.success && response.data) {
        onCommentUpdated(response.data)
        setIsEditing(false)
      }
    } catch (err: any) {
      alert(err.response?.data?.message || '댓글 수정에 실패했습니다.')
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 이 댓글을 삭제하시겠습니까?')) {
      return
    }

    try {
      setIsDeleting(true)
      await commentApi.deleteComment(comment.id)
      onCommentDeleted(comment.id)
    } catch (err: any) {
      alert(err.response?.data?.message || '댓글 삭제에 실패했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleLike = async () => {
    if (!isAuthenticated) {
      alert('로그인이 필요합니다.')
      return
    }

    try {
      setIsLiking(true)
      const response = await commentApi.toggleLike(comment.id)
      if (response.success && response.data) {
        onLikeToggled(response.data)
      }
    } catch (err: any) {
      alert(err.response?.data?.message || '좋아요 처리에 실패했습니다.')
    } finally {
      setIsLiking(false)
    }
  }

  const handlePin = async () => {
    try {
      setIsPinning(true)
      const response = await commentApi.togglePin(comment.id)
      if (response.success && response.data) {
        onPinToggled(response.data)
      }
    } catch (err: any) {
      alert(err.response?.data?.message || '댓글 고정 처리에 실패했습니다.')
    } finally {
      setIsPinning(false)
    }
  }

  const handleReplyCreated = () => {
    setIsReplying(false)
    onReplyCreated()
  }

  return (
    <div className={`${depth > 0 ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
      <div
        className={`p-4 rounded-lg ${
          comment.isPinned
            ? 'bg-yellow-50 border-2 border-yellow-200'
            : 'bg-gray-50 border border-gray-200'
        }`}
      >
        {/* 댓글 헤더 */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-900">{comment.username}</span>
            {comment.isPinned && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                <PinIcon className="w-3 h-3 mr-1" filled />
                고정됨
              </span>
            )}
            <span className="text-xs text-gray-500">{formatDate(comment.createDateTime)}</span>
          </div>
        </div>

        {/* 댓글 내용 */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={3}
            />
            <div className="flex space-x-2">
              <button
                onClick={handleEdit}
                className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-secondary transition-colors text-sm"
              >
                저장
              </button>
              <button
                onClick={() => {
                  setIsEditing(false)
                  setEditBody(comment.body)
                }}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="text-gray-800 whitespace-pre-wrap mb-3">{comment.body}</div>
        )}

        {/* 댓글 액션 버튼 */}
        {!isEditing && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* 좋아요 버튼 */}
              <button
                onClick={handleLike}
                disabled={!isAuthenticated || isLiking}
                className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                  comment.isLiked
                    ? 'text-red-500 hover:text-red-600'
                    : 'text-gray-500 hover:text-red-500'
                } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <HeartIcon filled={comment.isLiked} />
                <span className="text-sm">{comment.likeCount}</span>
              </button>

              {/* 대댓글 버튼 */}
              {isAuthenticated && depth < maxDepth && (
                <button
                  onClick={() => setIsReplying(!isReplying)}
                  className="flex items-center space-x-1 px-2 py-1 text-gray-500 hover:text-primary transition-colors"
                >
                  <ReplyIcon />
                  <span className="text-sm">답글</span>
                </button>
              )}

              {/* 수정 버튼 - 로그인된 유저 중 자신의 댓글이거나 게시물 주인만 수정 가능 */}
              {isAuthenticated && (isOwner || isPostAuthor) && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-1 px-2 py-1 text-gray-500 hover:text-primary transition-colors"
                >
                  <EditIcon />
                  <span className="text-sm">수정</span>
                </button>
              )}

              {/* 삭제 버튼 */}
              {(isOwner || isPostAuthor) && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center space-x-1 px-2 py-1 text-gray-500 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  <TrashIcon />
                  <span className="text-sm">{isDeleting ? '삭제 중...' : '삭제'}</span>
                </button>
              )}

              {/* 고정 버튼 */}
              {canPin && (
                <button
                  onClick={handlePin}
                  disabled={isPinning}
                  className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                    comment.isPinned
                      ? 'text-yellow-600 hover:text-yellow-700'
                      : 'text-gray-500 hover:text-yellow-600'
                  } disabled:opacity-50`}
                >
                  <PinIcon filled={comment.isPinned} />
                  <span className="text-sm">{comment.isPinned ? '고정 해제' : '고정'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 대댓글 작성 폼 */}
      {isReplying && (
        <div className="mt-3 ml-4">
          <CommentForm
            postId={postId}
            parentCommentId={comment.id}
            onCommentCreated={handleReplyCreated}
            placeholder={`${comment.username}님에게 답글 달기...`}
            onCancel={() => setIsReplying(false)}
          />
        </div>
      )}

      {/* 대댓글 목록 */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postAuthorUsername={postAuthorUsername}
              currentUsername={currentUsername}
              isAuthenticated={isAuthenticated}
              postId={postId}
              onCommentUpdated={onCommentUpdated}
              onCommentDeleted={onCommentDeleted}
              onLikeToggled={onLikeToggled}
              onPinToggled={onPinToggled}
              onReplyCreated={onReplyCreated}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

