'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import { postApi } from '@/services/api'
import type { PostDetailDTO } from '@/types/api'
import Header from '@/components/Header'
import ImageInsertButton from '@/components/ImageInsertButton'
import ResizableImage from '@/components/ResizableImage'
import { getUsernameFromToken } from '@/utils/jwt'

export default function EditPostPage() {
  const params = useParams()
  const router = useRouter()
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const [post, setPost] = useState<PostDetailDTO | null>(null)
  const [formData, setFormData] = useState({ title: '', body: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
      return
    }
    fetchPost()
  }, [params.id, isAuthenticated])

  const fetchPost = async () => {
    try {
      setLoading(true)
      const response = await postApi.getPostDetail(Number(params.id))
      if (response.success && response.data) {
        const postData = response.data
        const currentUsername = getUsernameFromToken()
        
        // 작성자 확인
        if (currentUsername !== postData.username) {
          alert('본인이 작성한 게시글만 수정할 수 있습니다.')
          router.push(`/posts/${params.id}`)
          return
        }

        setPost(postData)
        setFormData({
          title: postData.title,
          body: postData.body,
        })
      }
    } catch (error) {
      console.error('게시글 조회 실패:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const updateData: { title?: string; body?: string } = {}
      if (formData.title !== post?.title) {
        updateData.title = formData.title
      }
      if (formData.body !== post?.body) {
        updateData.body = formData.body
      }

      if (Object.keys(updateData).length === 0) {
        setError('변경된 내용이 없습니다.')
        setSaving(false)
        return
      }

      const response = await postApi.updatePost(Number(params.id), updateData)
      if (response.success) {
        // 수정 후 페이지 이동 시 캐시 무효화를 위해 router.refresh() 호출
        router.push(`/posts/${params.id}`)
        router.refresh()
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '게시글 수정에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleImageInserted = (markdown: string) => {
    // 이미지 마크다운을 본문에 추가
    setFormData({
      ...formData,
      body: formData.body + '\n' + markdown + '\n',
    })
  }

  // 이미지 크기 변경 핸들러
  const handleImageSizeChange = (newMarkdown: string) => {
    // 마크다운에서 URL 추출하여 기존 마크다운 찾기
    const urlMatch = newMarkdown.match(/!\[([^\]]*)\]\(([^)]+?)(?:\s+width="\d+"\s+height="\d+")?\)/)
    if (!urlMatch) return
    
    const url = urlMatch[2].trim()
    // 기존 본문에서 해당 URL을 가진 이미지 마크다운 찾기 (크기 정보 포함/미포함 모두)
    const oldPattern = new RegExp(`!\\[([^\\]]*)\\]\\(${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s+width="\\d+"\\s+height="\\d+")?\\)`, 'g')
    const updatedBody = formData.body.replace(oldPattern, newMarkdown)
    
    setFormData({
      ...formData,
      body: updatedBody,
    })
  }

  // 마크다운을 파싱하여 이미지와 텍스트를 분리
  const renderPreview = useMemo(() => {
    if (!formData.body) return null

    // 이미지 마크다운 패턴: ![alt](url) 또는 ![alt](url width="..." height="...")
    const imagePattern = /!\[([^\]]*)\]\(([^)]+?)(?:\s+width="(\d+)"\s+height="(\d+)")?\)/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match
    let keyCounter = 0

    while ((match = imagePattern.exec(formData.body)) !== null) {
      // 이미지 앞의 텍스트
      if (match.index > lastIndex) {
        const textPart = formData.body.substring(lastIndex, match.index)
        if (textPart.trim()) {
          parts.push(
            <div key={`text-${keyCounter++}`} className="whitespace-pre-wrap my-2 text-gray-700">
              {textPart}
            </div>
          )
        }
      }

      // 이미지 요소
      const alt = match[1] || '이미지'
      // URL에서 width/height 속성 제거 (URL만 추출)
      let url = match[2].trim()
      // width="..." height="..." 형식 제거
      url = url.replace(/\s+width=["']?\d+["']?\s*height=["']?\d+["']?/gi, '')
      url = url.replace(/\s+height=["']?\d+["']?\s*width=["']?\d+["']?/gi, '')
      url = url.replace(/\s+width=["']?\d+["']?/gi, '')
      url = url.replace(/\s+height=["']?\d+["']?/gi, '')
      url = url.trim()
      const fullMarkdown = match[0]

      if (url) {
        parts.push(
          <ResizableImage
            key={`img-${keyCounter++}`}
            src={url}
            alt={alt}
            markdown={fullMarkdown}
            onSizeChange={handleImageSizeChange}
          />
        )
      }

      lastIndex = match.index + match[0].length
    }

    // 남은 텍스트
    if (lastIndex < formData.body.length) {
      const remainingText = formData.body.substring(lastIndex)
      if (remainingText.trim()) {
        parts.push(
          <div key={`text-${keyCounter++}`} className="whitespace-pre-wrap my-2 text-gray-700">
            {remainingText}
          </div>
        )
      }
    }

    return parts.length > 0 ? <div className="space-y-2">{parts}</div> : null
  }, [formData.body])

  if (!isAuthenticated) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header onLoginClick={() => router.push('/')} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-gray-500">로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header onLoginClick={() => router.push('/')} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">게시글 수정</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              제목 (10자 이상)
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              minLength={10}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="body" className="block text-sm font-medium text-gray-700">
                본문 (10자 이상)
              </label>
              <ImageInsertButton
                onImageInserted={handleImageInserted}
                textareaRef={textareaRef}
              />
            </div>
            
            {/* 텍스트 입력 영역 */}
            <textarea
              ref={textareaRef}
              id="body"
              name="body"
              value={formData.body}
              onChange={handleChange}
              required
              minLength={10}
              rows={10}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
              placeholder="마크다운 형식으로 작성하세요. 이미지는 미리보기에서 크기를 조절할 수 있습니다."
            />
            
            {/* 미리보기 영역 */}
            {formData.body && (
              <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="text-sm font-medium text-gray-600 mb-2">미리보기</div>
                <div className="min-h-[200px] p-4 bg-white rounded border border-gray-200">
                  {renderPreview || (
                    <div className="text-gray-500 text-sm">내용을 입력하면 미리보기가 표시됩니다.</div>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  💡 이미지 모서리의 파란 점을 드래그하여 크기를 조절할 수 있습니다. (Shift 키를 누르면 종횡비 유지)
                </p>
              </div>
            )}
            
            <p className="mt-1 text-xs text-gray-500">
              이미지 버튼을 클릭하여 이미지를 업로드하고 삽입할 수 있습니다.
            </p>
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push(`/posts/${params.id}`)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving || formData.title.length < 10 || formData.body.length < 10}
              className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '수정 중...' : '수정하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

