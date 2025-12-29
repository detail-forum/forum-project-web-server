'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import { postApi } from '@/services/api'
import type { PostDetailDTO } from '@/types/api'
import Header from '@/components/Header'
import CommentList from '@/components/CommentList'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { getUsernameFromToken } from '@/utils/jwt'

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const [post, setPost] = useState<PostDetailDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchPost()
    }
  }, [params.id])

  const fetchPost = async () => {
    try {
      setLoading(true)
      const response = await postApi.getPostDetail(Number(params.id))
      if (response.success && response.data) {
        // 디버깅: 실제 응답 구조 확인
        console.log('게시글 응답 데이터:', response.data)
        setPost(response.data)
      }
    } catch (error) {
      console.error('게시글 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return ''
      const date = new Date(dateString)
      // 유효하지 않은 날짜 체크 (1970년 이전이거나 미래 날짜는 무시)
      if (isNaN(date.getTime()) || date.getTime() < 0 || date.getTime() > Date.now() + 86400000) {
        return ''
      }
      return format(date, 'yyyy년 MM월 dd일 HH:mm', { locale: ko })
    } catch {
      return ''
    }
  }

  // 수정일이 유효하고 작성일과 다른지 확인
  const hasValidUpdateDate = () => {
    if (!post) return false
    if (!post.updateDateTime) return false
    if (post.updateDateTime === post.createDateTime) return false
    
    try {
      const updateDate = new Date(post.updateDateTime)
      const createDate = new Date(post.createDateTime)
      // 유효한 날짜이고 작성일과 다른 경우만 true
      return !isNaN(updateDate.getTime()) && 
             updateDate.getTime() > 0 && 
             updateDate.getTime() !== createDate.getTime()
    } catch {
      return false
    }
  }

  const currentUsername = getUsernameFromToken()
  const isOwner = isAuthenticated && post && currentUsername === post.username

  const handleDelete = async () => {
    if (!confirm('정말 이 게시글을 삭제하시겠습니까?')) {
      return
    }

    try {
      setDeleting(true)
      const response = await postApi.deletePost(Number(params.id))
      if (response.success) {
        router.push('/')
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '게시글 삭제에 실패했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Header onLoginClick={() => router.push('/')} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="text-center text-gray-500">로딩 중...</div>
        ) : post ? (
          <>
            <article className="bg-white">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
              <div className="flex items-center justify-between text-sm text-gray-500 mb-8 pb-4 border-b">
                <div className="flex items-center space-x-4">
                  <span>{post.username}</span>
                  <span>조회수: {post.views || post.Views || '0'}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span>작성일: {formatDate(post.createDateTime)}</span>
                  {hasValidUpdateDate() && (
                    <span className="text-xs">수정일: {formatDate(post.updateDateTime)}</span>
                  )}
                </div>
              </div>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                  {post.body}
                </div>
              </div>
              <div className="mt-8 pt-8 border-t flex justify-between items-center">
                <button
                  onClick={() => router.back()}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  목록으로
                </button>
                {isOwner && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => router.push(`/posts/${params.id}/edit`)}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors"
                    >
                      수정
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting ? '삭제 중...' : '삭제'}
                    </button>
                  </div>
                )}
              </div>
            </article>

            {/* 댓글 섹션 */}
            <CommentList postId={Number(params.id)} postAuthorUsername={post.username} />
          </>
        ) : (
          <div className="text-center text-gray-500">게시글을 찾을 수 없습니다.</div>
        )}
      </div>
    </div>
  )
}

