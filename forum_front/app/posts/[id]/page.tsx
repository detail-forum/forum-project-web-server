'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import { postApi, followApi } from '@/services/api'
import type { PostDetailDTO, UserInfoDTO } from '@/types/api'
import Header from '@/components/Header'
import CommentList from '@/components/CommentList'
import LoginModal from '@/components/LoginModal'
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
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [liking, setLiking] = useState(false)
  const [authorInfo, setAuthorInfo] = useState<UserInfoDTO | null>(null)
  const [following, setFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

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
        setPost(response.data)
        // 작성자 정보 조회
        if (response.data.username) {
          fetchAuthorInfo(response.data.username)
        }
      }
    } catch (error) {
      console.error('게시글 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAuthorInfo = async (username: string) => {
    try {
      const response = await followApi.getUserInfo(username)
      if (response.success && response.data) {
        setAuthorInfo(response.data)
        setFollowing(response.data.isFollowing)
      }
    } catch (error) {
      console.error('작성자 정보 조회 실패:', error)
    }
  }

  const handleFollow = async () => {
    if (!isAuthenticated) {
      setShowLoginModal(true)
      return
    }
    if (!authorInfo) return

    setFollowLoading(true)
    try {
      if (following) {
        const response = await followApi.unfollowUser(authorInfo.id)
        if (response.success) {
          setFollowing(false)
          // 작성자 정보 다시 조회하여 팔로워 수 업데이트
          if (post?.username) {
            fetchAuthorInfo(post.username)
          }
        }
      } else {
        const response = await followApi.followUser(authorInfo.id)
        if (response.success) {
          setFollowing(true)
          // 작성자 정보 다시 조회하여 팔로워 수 업데이트
          if (post?.username) {
            fetchAuthorInfo(post.username)
          }
        }
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '팔로우 처리에 실패했습니다.')
      console.error('팔로우 처리 실패:', error)
    } finally {
      setFollowLoading(false)
    }
  }

  // 마크다운 렌더링 (제목, 굵게, 기울임, 링크, 코드, 이미지 등 지원)
  const renderMarkdown = (text: string): React.ReactNode => {
    if (!text) return ''
    
    // 줄 단위로 분리하여 처리
    const lines = text.split('\n')
    const parts: React.ReactNode[] = []
    let keyCounter = 0
    let inCodeBlock = false
    let codeBlockContent: string[] = []
    let codeBlockLanguage = ''
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // 코드 블록 처리
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // 코드 블록 종료
          parts.push(
            <pre key={`code-${keyCounter++}`} className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4">
              <code className="text-sm font-mono">{codeBlockContent.join('\n')}</code>
            </pre>
          )
          codeBlockContent = []
          inCodeBlock = false
          codeBlockLanguage = ''
        } else {
          // 코드 블록 시작
          codeBlockLanguage = line.trim().substring(3).trim()
          inCodeBlock = true
        }
        continue
      }
      
      if (inCodeBlock) {
        codeBlockContent.push(line)
        continue
      }
      
      // 제목 처리 (# ## ###)
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
      if (headingMatch) {
        const level = headingMatch[1].length
        const content = headingMatch[2]
        const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements
        parts.push(
          <HeadingTag key={`heading-${keyCounter++}`} className={`font-bold my-4 ${level === 1 ? 'text-3xl' : level === 2 ? 'text-2xl' : level === 3 ? 'text-xl' : 'text-lg'}`}>
            {renderInlineMarkdown(content)}
          </HeadingTag>
        )
        continue
      }
      
      // 리스트 처리 (- item)
      if (line.trim().startsWith('- ')) {
        const listItem = line.trim().substring(2)
        parts.push(
          <li key={`list-${keyCounter++}`} className="ml-4 list-disc">
            {renderInlineMarkdown(listItem)}
          </li>
        )
        continue
      }
      
      // 빈 줄 처리
      if (line.trim() === '') {
        parts.push(<br key={`br-${keyCounter++}`} />)
        continue
      }
      
      // 일반 텍스트 처리 (인라인 마크다운 포함)
      parts.push(
        <p key={`para-${keyCounter++}`} className="my-2">
          {renderInlineMarkdown(line)}
        </p>
      )
    }
    
    return <div className="prose max-w-none">{parts}</div>
  }
  
  // 인라인 마크다운 렌더링 (굵게, 기울임, 링크, 코드, 이미지)
  const renderInlineMarkdown = (text: string): React.ReactNode => {
    if (!text) return ''
    
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let keyCounter = 0
    
    // 이미지 마크다운 패턴: ![alt](url) 또는 ![alt](url width="..." height="...")
    const imagePattern = /!\[([^\]]*)\]\(([^)]+?)(?:\s+width=["']?\d+["']?\s*height=["']?\d+["']?)?\)/g
    let match
    
    while ((match = imagePattern.exec(text)) !== null) {
      // 이미지 앞의 텍스트
      if (match.index > lastIndex) {
        const textPart = text.substring(lastIndex, match.index)
        if (textPart) {
          parts.push(...renderTextMarkdown(textPart, keyCounter))
          keyCounter += 100 // 충분한 키 공간 확보
        }
      }
      
      // 이미지 요소
      const alt = match[1] || '이미지'
      let originalUrl = match[2]
      if (!originalUrl || !originalUrl.trim()) {
        lastIndex = match.index + match[0].length
        continue
      }
      
      // 마크다운에서 width/height 추출
      const widthMatch = match[0].match(/width=["']?(\d+)["']?/)
      const heightMatch = match[0].match(/height=["']?(\d+)["']?/)
      let imageWidth: number | null = widthMatch ? parseInt(widthMatch[1]) : null
      let imageHeight: number | null = heightMatch ? parseInt(heightMatch[1]) : null
      
      // URL에서 width/height 속성 제거
      originalUrl = originalUrl.trim()
      originalUrl = originalUrl.replace(/\s+width=["']?\d+["']?\s*height=["']?\d+["']?/gi, '')
      originalUrl = originalUrl.replace(/\s+height=["']?\d+["']?\s*width=["']?\d+["']?/gi, '')
      originalUrl = originalUrl.replace(/\s+width=["']?\d+["']?/gi, '')
      originalUrl = originalUrl.replace(/\s+height=["']?\d+["']?/gi, '')
      originalUrl = originalUrl.trim()
      
      let url = originalUrl
      
      // URL 정규화
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (!url.startsWith('/')) {
          url = '/' + url
        }
        
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          let productionUrl = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL || 'https://forum.rjsgud.com/uploads'
          productionUrl = productionUrl.replace(/\/$/, '')
          if (!productionUrl.endsWith('/uploads')) {
            productionUrl = productionUrl + '/uploads'
          }
          let cleanUrl = url
          if (cleanUrl.startsWith('/uploads/')) {
            cleanUrl = cleanUrl.substring('/uploads/'.length)
          } else if (cleanUrl.startsWith('/uploads')) {
            cleanUrl = cleanUrl.substring('/uploads'.length)
          }
          url = `${productionUrl}/${cleanUrl}`
        }
      }
      
      const defaultHeight = 300
      const finalHeight = imageHeight || defaultHeight
      const finalWidth = imageWidth || undefined
      
      parts.push(
        <div key={`img-container-${keyCounter++}`} className="my-4">
          <img
            src={url}
            alt={alt}
            style={{
              height: `${finalHeight}px`,
              width: finalWidth ? `${finalWidth}px` : 'auto',
              maxWidth: '100%',
              objectFit: 'contain',
            }}
            className="rounded-lg border border-gray-200 shadow-sm"
            onLoad={(e) => {
              const img = e.currentTarget
              if (!finalWidth) {
                const aspectRatio = img.naturalWidth / img.naturalHeight
                img.style.width = `${finalHeight * aspectRatio}px`
              }
            }}
            onError={(e) => {
              const img = e.currentTarget
              const container = img.parentElement
              if (container && !container.querySelector('.error-message')) {
                img.style.display = 'none'
                const errorDiv = document.createElement('div')
                errorDiv.className = 'error-message text-red-500 text-sm p-2 bg-red-50 rounded'
                errorDiv.textContent = `이미지를 불러올 수 없습니다: ${url}`
                container.appendChild(errorDiv)
              }
            }}
          />
        </div>
      )
      
      lastIndex = match.index + match[0].length
    }
    
    // 남은 텍스트 처리
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex)
      if (remainingText) {
        parts.push(...renderTextMarkdown(remainingText, keyCounter))
      }
    }
    
    return parts.length > 0 ? parts : [text]
  }
  
  // 텍스트 마크다운 렌더링 (굵게, 기울임, 링크, 인라인 코드)
  const renderTextMarkdown = (text: string, startKey: number = 0): React.ReactNode[] => {
    if (!text) return []
    
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let keyCounter = startKey
    
    // 패턴 우선순위: 코드 > 링크 > 굵게 > 기울임
    const patterns = [
      { regex: /`([^`]+)`/g, type: 'code' },
      { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: 'link' },
      { regex: /\*\*([^*]+)\*\*/g, type: 'bold' },
      { regex: /\*([^*]+)\*/g, type: 'italic' },
    ]
    
    // 모든 매치 찾기
    const matches: Array<{ index: number; length: number; type: string; content: string; url?: string }> = []
    
    patterns.forEach(({ regex, type }) => {
      let match
      regex.lastIndex = 0
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          index: match.index,
          length: match[0].length,
          type,
          content: match[1],
          url: match[2],
        })
      }
    })
    
    // 인덱스 순으로 정렬
    matches.sort((a, b) => a.index - b.index)
    
    // 겹치는 매치 제거 (먼저 나온 것 우선)
    const filteredMatches: typeof matches = []
    for (const match of matches) {
      const overlaps = filteredMatches.some(
        (m) => match.index < m.index + m.length && match.index + match.length > m.index
      )
      if (!overlaps) {
        filteredMatches.push(match)
      }
    }
    
    // 매치를 기반으로 렌더링
    filteredMatches.forEach((match) => {
      // 매치 앞의 텍스트
      if (match.index > lastIndex) {
        const textPart = text.substring(lastIndex, match.index)
        if (textPart) {
          parts.push(<span key={`text-${keyCounter++}`}>{textPart}</span>)
        }
      }
      
      // 매치 렌더링
      switch (match.type) {
        case 'code':
          parts.push(
            <code key={`code-${keyCounter++}`} className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">
              {match.content}
            </code>
          )
          break
        case 'link':
          parts.push(
            <a
              key={`link-${keyCounter++}`}
              href={match.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {match.content}
            </a>
          )
          break
        case 'bold':
          parts.push(
            <strong key={`bold-${keyCounter++}`} className="font-bold">
              {match.content}
            </strong>
          )
          break
        case 'italic':
          parts.push(
            <em key={`italic-${keyCounter++}`} className="italic">
              {match.content}
            </em>
          )
          break
      }
      
      lastIndex = match.index + match.length
    })
    
    // 남은 텍스트
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex)
      if (remainingText) {
        parts.push(<span key={`text-${keyCounter++}`}>{remainingText}</span>)
      }
    }
    
    return parts.length > 0 ? parts : [<span key={`text-${keyCounter}`}>{text}</span>]
  }

    const formatDate = (dateString: string) => {
      try {
        if (!dateString) return ''
        const date = new Date(dateString)
        // 유효하지 않은 날짜 체크 (1970년 1월 1일 이전이거나 미래 날짜는 무시)
        const minValidDate = new Date('1970-01-02T00:00:00Z').getTime()
        if (isNaN(date.getTime()) || date.getTime() < minValidDate || date.getTime() > Date.now() + 86400000) {
          return ''
        }
        return format(date, 'yyyy년 MM월 dd일 HH:mm', { locale: ko })
      } catch {
        return ''
      }
    }

    // 수정일이 유효하고 작성일과 다른지 확인
    const hasValidUpdateDate = () => {
      if (!post) {
        console.log('[hasValidUpdateDate] post가 없음')
        return false
      }
      if (!post.updateDateTime) {
        console.log('[hasValidUpdateDate] updateDateTime이 없음')
        return false
      }
    
      try {
        const updateDate = new Date(post.updateDateTime)
        const createDate = new Date(post.createDateTime)
      
        console.log('[hasValidUpdateDate] updateDate:', updateDate)
        console.log('[hasValidUpdateDate] createDate:', createDate)
        console.log('[hasValidUpdateDate] updateDate.getTime():', updateDate.getTime())
        console.log('[hasValidUpdateDate] createDate.getTime():', createDate.getTime())
      
        // 유효하지 않은 날짜 체크 (1970년 1월 1일 이전)
        const minValidDate = new Date('1970-01-02T00:00:00Z').getTime()
        if (isNaN(updateDate.getTime()) || updateDate.getTime() < minValidDate) {
          console.log('[hasValidUpdateDate] 유효하지 않은 날짜')
          return false
        }
      
        // 작성일과 같은 경우 false
        if (updateDate.getTime() === createDate.getTime()) {
          console.log('[hasValidUpdateDate] 작성일과 수정일이 같음')
          return false
        }
      
        // 작성일보다 이후인 경우만 true (수정일이 작성일보다 이전이면 잘못된 데이터)
        const isValid = updateDate.getTime() > createDate.getTime()
        console.log('[hasValidUpdateDate] 최종 결과:', isValid)
        return isValid
      } catch (error) {
        console.error('[hasValidUpdateDate] 에러:', error)
        return false
      }
    }

    const currentUsername = getUsernameFromToken()
    const isOwner = isAuthenticated && post && currentUsername === post.username

    const handleLike = async () => {
      if (!isAuthenticated) {
        setShowLoginModal(true)
        return
      }

      try {
        setLiking(true)
        const response = await postApi.toggleLike(Number(params.id))
        if (response.success && post) {
          // 좋아요 상태 업데이트
          const newIsLiked = response.data || false
          const newLikeCount = newIsLiked ? post.likeCount + 1 : post.likeCount - 1
          setPost({
            ...post,
            isLiked: newIsLiked,
            likeCount: newLikeCount,
          })
        }
      } catch (error: any) {
        alert(error.response?.data?.message || '좋아요 처리에 실패했습니다.')
      } finally {
        setLiking(false)
      }
    }

    const handleEdit = () => {
      if (!isAuthenticated) {
        setShowLoginModal(true)
        return
      }
      router.push(`/posts/${params.id}/edit`)
    }

    const handleDelete = async () => {
      if (!isAuthenticated) {
        setShowLoginModal(true)
        return
      }

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
        <Header onLoginClick={() => setShowLoginModal(true)} />
        {showLoginModal && (
          <LoginModal
            isOpen={showLoginModal}
            onClose={() => setShowLoginModal(false)}
          />
        )}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {loading ? (
            <div className="text-center text-gray-500">로딩 중...</div>
          ) : post ? (
            <>
              <article className="bg-white">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-8 pb-4 border-b">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{post.username}</span>
                      {authorInfo && (
                        <>
                          <span className="text-gray-400">•</span>
                          <button
                            onClick={() => router.push(`/users/${post.username}/followers?type=followers`)}
                            className="text-xs text-primary hover:underline"
                          >
                            팔로워 {authorInfo.followerCount}
                          </button>
                          <button
                            onClick={() => router.push(`/users/${post.username}/followers?type=following`)}
                            className="text-xs text-primary hover:underline"
                          >
                            팔로잉 {authorInfo.followingCount}
                          </button>
                          {!isOwner && isAuthenticated && (
                            <button
                              onClick={handleFollow}
                              disabled={followLoading}
                              className={`ml-2 px-3 py-1 text-xs rounded-lg transition-colors ${
                                following
                                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  : 'bg-primary text-white hover:bg-secondary'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {followLoading ? '처리 중...' : following ? '언팔로우' : '팔로우'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    <span>조회수: {post.views || post.Views || '0'}</span>
                    <span className="flex items-center space-x-1">
                      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span>좋아요: {post.likeCount || 0}</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span>작성일: {formatDate(post.createDateTime)}</span>
                    {hasValidUpdateDate() && (
                      <span className="text-xs">수정일: {formatDate(post.updateDateTime)}</span>
                    )}
                  </div>
                </div>
                <div className="prose max-w-none">
                  <div className="text-gray-800 leading-relaxed">
                    {renderMarkdown(post.body)}
                  </div>
                </div>
                    {/* 태그 표시 */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="mt-6 flex flex-wrap gap-2">
                        {post.tags.map((tag, index) => (
                          <button
                            key={index}
                            onClick={() => router.push(`/posts-list?tag=${encodeURIComponent(tag)}`)}
                            className="px-3 py-1 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors text-sm"
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <div className="mt-8 pt-8 border-t flex justify-between items-center">
                      <button
                        onClick={() => router.back()}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        목록으로
                      </button>
                      <div className="flex items-center space-x-4">
                        {/* 좋아요 버튼 */}
                    <button
                      onClick={handleLike}
                      disabled={liking || !isAuthenticated}
                      className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                        post.isLiked
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <svg
                        className="w-5 h-5"
                        fill={post.isLiked ? 'currentColor' : 'none'}
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
                      <span>{post.likeCount || 0}</span>
                    </button>
                    {isOwner && (
                      <div className="flex space-x-2">
                        <button
                          onClick={handleEdit}
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
