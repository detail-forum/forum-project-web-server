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
        console.log('작성일:', response.data.createDateTime)
        console.log('수정일:', response.data.updateDateTime)
        console.log('수정일 타입:', typeof response.data.updateDateTime)
        setPost(response.data)
      }
    } catch (error) {
      console.error('게시글 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 마크다운 이미지 렌더링 (간단한 버전)
  const renderMarkdown = (text: string): React.ReactNode => {
    if (!text) return ''
    
    // 이미지 마크다운 패턴: ![alt](url) 또는 ![alt](url width="..." height="...")
    // width/height 속성은 선택적이며, URL과 함께 파싱됨
    const imagePattern = /!\[([^\]]*)\]\(([^)]+?)(?:\s+width=["']?\d+["']?\s*height=["']?\d+["']?)?\)/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match
    let keyCounter = 0
    
    while ((match = imagePattern.exec(text)) !== null) {
      // 이미지 앞의 텍스트
      if (match.index > lastIndex) {
        const textPart = text.substring(lastIndex, match.index)
        if (textPart) {
          parts.push(
            <span key={`text-${keyCounter++}`} className="whitespace-pre-wrap">
              {textPart}
            </span>
          )
        }
      }
      
      // 이미지 요소
      const alt = match[1] || '이미지'
      let originalUrl = match[2]
      if (!originalUrl || !originalUrl.trim()) {
        // URL이 없으면 건너뛰기
        lastIndex = match.index + match[0].length
        continue
      }
      
      // 마크다운에서 width/height 추출
      const widthMatch = match[0].match(/width=["']?(\d+)["']?/)
      const heightMatch = match[0].match(/height=["']?(\d+)["']?/)
      let imageWidth: number | null = widthMatch ? parseInt(widthMatch[1]) : null
      let imageHeight: number | null = heightMatch ? parseInt(heightMatch[1]) : null
      
      // URL에서 width/height 속성 제거 (마크다운 확장 형식 지원)
      originalUrl = originalUrl.trim()
      originalUrl = originalUrl.replace(/\s+width=["']?\d+["']?\s*height=["']?\d+["']?/gi, '')
      originalUrl = originalUrl.replace(/\s+height=["']?\d+["']?\s*width=["']?\d+["']?/gi, '')
      originalUrl = originalUrl.replace(/\s+width=["']?\d+["']?/gi, '')
      originalUrl = originalUrl.replace(/\s+height=["']?\d+["']?/gi, '')
      originalUrl = originalUrl.trim()
      
      let url = originalUrl
      
      // URL 정규화
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // 상대 경로인 경우 /로 시작하도록 보장
        if (!url.startsWith('/')) {
          url = '/' + url
        }
        
        // 로컬 개발 환경에서는 프로덕션 서버의 이미지를 직접 사용
        // 프로덕션 환경에서는 상대 경로 그대로 사용 (Nginx가 처리)
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          // 클라이언트 측에서 개발 환경일 때 프로덕션 서버 직접 사용
          // 환경 변수가 없으면 기본값으로 프로덕션 서버 사용
          let productionUrl = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL || 'https://forum.rjsgud.com/uploads'
          
          // URL 끝의 슬래시 제거
          productionUrl = productionUrl.replace(/\/$/, '')
          
          // URL 끝에 /uploads가 포함되어 있지 않으면 추가
          if (!productionUrl.endsWith('/uploads')) {
            productionUrl = productionUrl + '/uploads'
          }
          
          // 원본 URL이 이미 /uploads/로 시작하면 제거
          let cleanUrl = url
          if (cleanUrl.startsWith('/uploads/')) {
            cleanUrl = cleanUrl.substring('/uploads/'.length)
          } else if (cleanUrl.startsWith('/uploads')) {
            cleanUrl = cleanUrl.substring('/uploads'.length)
          }
          
          // 최종 URL 구성
          url = `${productionUrl}/${cleanUrl}`
          
          console.log('[이미지 URL 변환]', { originalUrl, convertedUrl: url, productionUrl, cleanUrl })
        }
      } 
      
      console.log('이미지 렌더링:', { alt, url, originalUrl, imageWidth, imageHeight })
      
      // 기본 높이 300px 설정 (크기 정보가 없을 때)
      const defaultHeight = 300
      const finalHeight = imageHeight || defaultHeight
      // width가 없으면 이미지 로드 후 종횡비에 맞춰 자동 계산
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
              console.log('이미지 로드 성공:', url)
              // width가 없으면 종횡비에 맞춰 자동 계산
              if (!finalWidth) {
                const aspectRatio = img.naturalWidth / img.naturalHeight
                img.style.width = `${finalHeight * aspectRatio}px`
              }
            }}
            onError={(e) => {
              console.error('이미지 로드 실패:', {
                url,
                originalUrl,
                src: e.currentTarget.src,
                currentSrc: e.currentTarget.currentSrc,
              })
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
    
    // 남은 텍스트
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex)
      if (remainingText.trim()) {
        parts.push(
          <span key={`text-${keyCounter++}`} className="whitespace-pre-wrap block">
            {remainingText}
          </span>
        )
      }
    }
    
    return parts.length > 0 ? <div>{parts}</div> : <div className="whitespace-pre-wrap">{text}</div>
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
                  <div className="text-gray-800 leading-relaxed">
                    {renderMarkdown(post.body)}
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
