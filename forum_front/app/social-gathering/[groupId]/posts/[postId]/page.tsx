'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import { groupApi } from '@/services/api'
import type { GroupPostDetailDTO } from '@/types/api'
import Header from '@/components/Header'
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
  const currentUsername = useSelector((state: RootState) => state.auth.username)
  const [post, setPost] = useState<GroupPostDetailDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)

  useEffect(() => {
    if (groupId && postId) {
      fetchPost()
    }
  }, [groupId, postId])

  const fetchPost = async () => {
    try {
      setLoading(true)
      const response = await groupApi.getGroupPostDetail(groupId, postId)
      if (response.success && response.data) {
        setPost(response.data)
      }
    } catch (error) {
      console.error('게시물 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      setDeleting(true)
      const response = await groupApi.deleteGroupPost(groupId, postId)
      if (response.success) {
        router.push(`/social-gathering/${groupId}`)
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

          {(post.canEdit || post.canDelete) && (
            <div className="flex gap-2 pt-4 border-t">
              {post.canEdit && (
                <button
                  onClick={() => router.push(`/social-gathering/${groupId}/posts/${postId}/edit`)}
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
