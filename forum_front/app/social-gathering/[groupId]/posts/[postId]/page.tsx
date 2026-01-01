'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import { groupApi, postApi } from '@/services/api'
import type { GroupPostDetailDTO, PostDetailDTO } from '@/types/api'
import Header from '@/components/Header'
import CommentList from '@/components/CommentList'
import LoginModal from '@/components/LoginModal'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { getUsernameFromToken } from '@/utils/jwt'

export default function GroupPostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = Number(params.groupId)
  const postId = Number(params.postId)
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const [post, setPost] = useState<GroupPostDetailDTO | PostDetailDTO | null>(null)
  const [isGroupPost, setIsGroupPost] = useState(false) // group_posts 테이블인지 posts 테이블인지 구분
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [liking, setLiking] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isLiked, setIsLiked] = useState(false)

  useEffect(() => {
    if (groupId && postId) {
      fetchPost()
    }
  }, [groupId, postId])

  const fetchPost = async () => {
    try {
      setLoading(true)
      // 먼저 group_posts 테이블에서 조회 시도
      try {
        const groupPostResponse = await groupApi.getGroupPostDetail(groupId, postId)
        if (groupPostResponse.success && groupPostResponse.data) {
          setPost(groupPostResponse.data)
          setIsGroupPost(true)
          return
        }
      } catch (groupPostError) {
        console.log('group_posts 테이블에서 조회 실패, posts 테이블에서 조회 시도:', groupPostError)
      }
      
      // group_posts에서 찾지 못하면 posts 테이블에서 조회
      const postResponse = await postApi.getPostDetail(postId)
      if (postResponse.success && postResponse.data) {
        // PostDetailDTO를 GroupPostDetailDTO 형식으로 변환
        const postData = postResponse.data
        const currentUsername = isAuthenticated ? getUsernameFromToken() : null
        const isAuthor = currentUsername === postData.username
        const convertedPost: GroupPostDetailDTO = {
          id: postData.id,
          title: postData.title,
          body: postData.body,
          username: postData.username,
          nickname: postData.nickname || postData.username,
          Views: String(postData.views || 0),
          createDateTime: postData.createDateTime,
          updateDateTime: postData.updateDateTime,
          profileImageUrl: postData.profileImageUrl,
          isAuthor: isAuthor,
          canEdit: postData.canEdit || false,
          canDelete: postData.canDelete || false,
          isPublic: postData.isPublic,
        }
        setPost(convertedPost)
        setIsGroupPost(false)
        // 좋아요 정보 설정
        setLikeCount(postData.likeCount || 0)
        setIsLiked(postData.isLiked || false)
      }
    } catch (error) {
      console.error('게시물 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async () => {
    if (!isAuthenticated) {
      setShowLoginModal(true)
      return
    }

    try {
      setLiking(true)
      const response = await postApi.toggleLike(postId)
      if (response.success) {
        // 좋아요 상태 업데이트
        const newIsLiked = response.data || false
        const newLikeCount = newIsLiked ? likeCount + 1 : likeCount - 1
        setIsLiked(newIsLiked)
        setLikeCount(newLikeCount)
      }
    } catch (error: any) {
      console.error('좋아요 처리 실패:', error)
      alert(error.response?.data?.message || '좋아요 처리에 실패했습니다.')
    } finally {
      setLiking(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      setDeleting(true)
      if (isGroupPost) {
        // group_posts 테이블의 게시글 삭제
        const response = await groupApi.deleteGroupPost(groupId, postId)
        if (response.success) {
          router.push(`/social-gathering/${groupId}`)
        }
      } else {
        // posts 테이블의 게시글 삭제
        const response = await postApi.deletePost(postId)
        if (response.success) {
          router.push(`/social-gathering/${groupId}`)
        }
      }
    } catch (error: any) {
      console.error('게시물 삭제 실패:', error)
      alert(error.response?.data?.message || '게시물 삭제에 실패했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  // 마크다운 렌더링 함수 (간단한 버전)
  const renderMarkdown = useCallback((text: string): React.ReactNode => {
    if (!text) return ''

    const lines = text.split('\n')
    const elements: React.ReactNode[] = []
    let keyCounter = 0

    lines.forEach((line, index) => {
      // 코드 블록
      if (line.startsWith('```')) {
        const codeBlock: string[] = []
        let i = index + 1
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeBlock.push(lines[i])
          i++
        }
        elements.push(
          <pre key={`code-${keyCounter++}`} className="bg-gray-100 p-4 rounded overflow-x-auto my-4">
            <code className="text-sm font-mono">{codeBlock.join('\n')}</code>
          </pre>
        )
        return
      }

      // 제목
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${keyCounter++}`} className="text-3xl font-bold my-4">
            {line.substring(2)}
          </h1>
        )
        return
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${keyCounter++}`} className="text-2xl font-bold my-3">
            {line.substring(3)}
          </h2>
        )
        return
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${keyCounter++}`} className="text-xl font-bold my-2">
            {line.substring(4)}
          </h3>
        )
        return
      }

      // 이미지
      const imageMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/)
      if (imageMatch) {
        elements.push(
          <img
            key={`img-${keyCounter++}`}
            src={imageMatch[2]}
            alt={imageMatch[1]}
            className="max-w-full h-auto my-4 rounded"
          />
        )
        return
      }

      // 리스트
      if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <li key={`li-${keyCounter++}`} className="ml-4 my-1">
            {line.substring(2)}
          </li>
        )
        return
      }

      // 일반 텍스트 (인라인 마크다운 처리)
      if (line.trim()) {
        const parts: React.ReactNode[] = []
        let lastIndex = 0
        let partKeyCounter = 0

        // 굵게
        const boldRegex = /\*\*([^*]+)\*\*/g
        let match
        const matches: Array<{ index: number; length: number; content: string; type: string }> = []

        while ((match = boldRegex.exec(line)) !== null) {
          matches.push({
            index: match.index,
            length: match[0].length,
            content: match[1],
            type: 'bold',
          })
        }

        // 기울임
        const italicRegex = /\*([^*]+)\*/g
        while ((match = italicRegex.exec(line)) !== null) {
          matches.push({
            index: match.index,
            length: match[0].length,
            content: match[1],
            type: 'italic',
          })
        }

        // 링크
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
        while ((match = linkRegex.exec(line)) !== null) {
          matches.push({
            index: match.index,
            length: match[0].length,
            content: match[1],
            type: 'link',
            url: match[2],
          } as any)
        }

        matches.sort((a, b) => a.index - b.index)

        matches.forEach((m) => {
          if (m.index > lastIndex) {
            parts.push(<span key={`text-${partKeyCounter++}`}>{line.substring(lastIndex, m.index)}</span>)
          }
          if (m.type === 'bold') {
            parts.push(
              <strong key={`bold-${partKeyCounter++}`} className="font-bold">
                {m.content}
              </strong>
            )
          } else if (m.type === 'italic') {
            parts.push(
              <em key={`italic-${partKeyCounter++}`} className="italic">
                {m.content}
              </em>
            )
          } else if (m.type === 'link') {
            parts.push(
              <a
                key={`link-${partKeyCounter++}`}
                href={(m as any).url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                {m.content}
              </a>
            )
          }
          lastIndex = m.index + m.length
        })

        if (lastIndex < line.length) {
          parts.push(<span key={`text-${partKeyCounter++}`}>{line.substring(lastIndex)}</span>)
        }

        elements.push(
          <p key={`p-${keyCounter++}`} className="my-2">
            {parts.length > 0 ? parts : line}
          </p>
        )
      } else {
        elements.push(<br key={`br-${keyCounter++}`} />)
      }
    })

    return <div>{elements}</div>
  }, [])

  if (loading) {
    return (
      <div>
        <Header onLoginClick={() => {}} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          로딩 중...
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div>
        <Header onLoginClick={() => {}} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          게시물을 찾을 수 없습니다.
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return ''
      const date = new Date(dateString)
      return format(date, 'yyyy년 MM월 dd일 HH:mm', { locale: ko })
    } catch {
      return ''
    }
  }

  return (
    <div>
      <Header onLoginClick={() => setShowLoginModal(true)} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-4">
          <button
            onClick={() => router.push(`/social-gathering/${groupId}`)}
            className="text-blue-500 hover:text-blue-600"
          >
            ← 모임으로 돌아가기
          </button>
        </div>

        <article className="bg-white rounded-lg shadow p-8">
          <header className="mb-6">
            <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
            <div className="flex justify-between items-center text-sm text-gray-500">
              <div className="flex items-center gap-4">
                <Link
                  href={`/users/${post.username}`}
                  className="hover:text-blue-500 transition"
                >
                  {post.nickname} ({post.username})
                </Link>
                <span>조회수: {post.Views || 0}</span>
                {/* posts 테이블의 게시글만 좋아요 기능 표시 */}
                {!isGroupPost && (
                  <button
                    onClick={handleLike}
                    disabled={liking}
                    className={`flex items-center gap-1 px-3 py-1 rounded transition ${
                      isLiked
                        ? 'text-red-500 bg-red-50 hover:bg-red-100'
                        : 'text-gray-500 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <svg
                      className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`}
                      fill={isLiked ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    <span>{likeCount}</span>
                  </button>
                )}
              </div>
              <div>
                <span>작성일: {formatDate(post.createDateTime)}</span>
                {post.updateDateTime && post.updateDateTime !== post.createDateTime && (
                  <span className="ml-2">수정일: {formatDate(post.updateDateTime)}</span>
                )}
              </div>
            </div>
          </header>

          {post.profileImageUrl && (
            <div className="mb-6">
              <img
                src={post.profileImageUrl}
                alt={post.title}
                className="w-full h-auto rounded-lg"
              />
            </div>
          )}

          <div className="prose max-w-none mb-8">
            {renderMarkdown(post.body)}
          </div>

          {/* 댓글 섹션 */}
          <div className="mt-8 pt-8 border-t">
            <CommentList postId={postId} />
          </div>

          {(post.canEdit || post.canDelete) && (
            <div className="flex gap-2 pt-4 border-t">
              {post.canEdit && (
                <button
                  onClick={() => {
                    if (isGroupPost) {
                      router.push(`/social-gathering/${groupId}/posts/${postId}/edit`)
                    } else {
                      router.push(`/posts/${postId}/edit`)
                    }
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition"
                >
                  수정
                </button>
              )}
              {post.canDelete && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition disabled:opacity-50"
                >
                  {deleting ? '삭제 중...' : '삭제'}
                </button>
              )}
            </div>
          )}
        </article>
      </div>

      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => {
            setShowLoginModal(false)
            fetchPost()
          }}
        />
      )}
    </div>
  )
}
