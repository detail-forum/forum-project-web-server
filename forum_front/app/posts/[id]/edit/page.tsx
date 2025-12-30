'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import { postApi, imageUploadApi } from '@/services/api'
import type { PostDetailDTO } from '@/types/api'
import Header from '@/components/Header'
import ImageInsertButton from '@/components/ImageInsertButton'
import ResizableImage from '@/components/ResizableImage'
import ImageCropModal from '@/components/ImageCropModal'
import LoginModal from '@/components/LoginModal'
import { getUsernameFromToken } from '@/utils/jwt'
import Image from 'next/image'

export default function EditPostPage() {
  const params = useParams()
  const router = useRouter()
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [post, setPost] = useState<PostDetailDTO | null>(null)
  const [formData, setFormData] = useState({ title: '', body: '', profileImageUrl: '' })
  const [profileImagePreview, setProfileImagePreview] = useState<string>('')
  const [uploadingProfile, setUploadingProfile] = useState(false)
  const [showCropModal, setShowCropModal] = useState(false)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const profileImageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setShowLoginModal(true)
    } else {
      fetchPost()
    }
  }, [params.id, isAuthenticated])

  // 뒤로가기 방지: 별도의 useEffect로 분리
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 현재 히스토리를 교체하여 뒤로가기 히스토리 제거
    window.history.replaceState(null, '', window.location.href)
    
    // popstate 이벤트 감지 (뒤로가기/앞으로가기)
    const handlePopState = () => {
      // 뒤로가기 시 게시글 상세 페이지로 리다이렉트
      const postId = params.id
      if (postId) {
        router.push(`/posts/${postId}`)
      }
    }
    
    window.addEventListener('popstate', handlePopState)
    
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [params.id, router])

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
        const profileImageUrl = (postData as any).profileImageUrl || ''
        setFormData({
          title: postData.title,
          body: postData.body,
          profileImageUrl: profileImageUrl,
        })
        
        // 프로필 이미지 미리보기 설정
        if (profileImageUrl) {
          const baseUrl = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL || ''
          const previewUrl = profileImageUrl.startsWith('http') 
            ? profileImageUrl 
            : `${baseUrl}${profileImageUrl}`
          setProfileImagePreview(previewUrl)
        }
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
      const updateData: { title?: string; body?: string; profileImageUrl?: string } = {}
      if (formData.title !== post?.title) {
        updateData.title = formData.title
      }
      if (formData.body !== post?.body) {
        updateData.body = formData.body
      }
      const currentProfileImageUrl = (post as any)?.profileImageUrl || ''
      if (formData.profileImageUrl !== currentProfileImageUrl) {
        updateData.profileImageUrl = formData.profileImageUrl
      }

      // 변경사항이 없어도 저장 성공으로 처리
      if (Object.keys(updateData).length === 0) {
        // 수정 후 페이지 이동 시 캐시 무효화를 위해 router.refresh() 호출
        router.push(`/posts/${params.id}`)
        router.refresh()
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

  const handleProfileImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.')
      return
    }

    // 파일 크기 검증 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하여야 합니다.')
      return
    }

    // 파일을 선택하고 크롭 모달 열기
    setSelectedImageFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        setProfileImagePreview(e.target.result as string)
        setShowCropModal(true)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      setUploadingProfile(true)
      
      // Blob을 File로 변환
      const croppedFile = new File([croppedBlob], 'cropped-image.jpg', { type: 'image/jpeg' })
      
      // 크롭된 이미지 업로드
      const response = await imageUploadApi.uploadImage(croppedFile)
      
      if (response.success && response.data) {
        const imageUrl = response.data.url
        setFormData({
          ...formData,
          profileImageUrl: imageUrl,
        })
        
        // 미리보기 URL 생성
        const baseUrl = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL || ''
        const previewUrl = imageUrl.startsWith('http') 
          ? imageUrl 
          : `${baseUrl}${imageUrl}`
        setProfileImagePreview(previewUrl)
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '프로필 이미지 업로드에 실패했습니다.')
      console.error('프로필 이미지 업로드 실패:', error)
    } finally {
      setUploadingProfile(false)
      if (profileImageInputRef.current) {
        profileImageInputRef.current.value = ''
      }
    }
  }

  const handleRemoveProfileImage = () => {
    setFormData({
      ...formData,
      profileImageUrl: '',
    })
    setProfileImagePreview('')
  }

  // 이미지 크기 변경 핸들러
  const handleImageSizeChange = useCallback((newMarkdown: string) => {
    // 마크다운에서 URL 추출하여 기존 마크다운 찾기
    const urlMatch = newMarkdown.match(/!\[([^\]]*)\]\(([^)]+?)(?:\s+width="\d+"\s+height="\d+")?\)/)
    if (!urlMatch) return
    
    const url = urlMatch[2].trim()
    // 기존 본문에서 해당 URL을 가진 이미지 마크다운 찾기 (크기 정보 포함/미포함 모두)
    const oldPattern = new RegExp(`!\\[([^\\]]*)\\]\\(${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s+width="\\d+"\\s+height="\\d+")?\\)`, 'g')
    
    setFormData((prev) => {
      const updatedBody = prev.body.replace(oldPattern, newMarkdown)
      return {
        ...prev,
        body: updatedBody,
      }
    })
  }, [])

  // 인라인 마크다운 렌더링 (굵게, 기울임, 링크, 코드)
  const renderInlineMarkdown = useCallback((text: string): React.ReactNode => {
    if (!text) return ''

    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let keyCounter = 0

    // 패턴 우선순위: 코드 > 링크 > 굵게 > 기울임
    const patterns = [
      { regex: /`([^`]+)`/g, type: 'code' },
      { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: 'link' },
      { regex: /\*\*([^*]+)\*\*/g, type: 'bold' },
      { regex: /\*([^*]+)\*/g, type: 'italic' },
    ]

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

    matches.sort((a, b) => a.index - b.index)

    const filteredMatches: typeof matches = []
    for (const match of matches) {
      const overlaps = filteredMatches.some(
        (m) => match.index < m.index + m.length && match.index + match.length > m.index
      )
      if (!overlaps) {
        filteredMatches.push(match)
      }
    }

    filteredMatches.forEach((match) => {
      if (match.index > lastIndex) {
        const textPart = text.substring(lastIndex, match.index)
        if (textPart) {
          parts.push(<span key={`text-${keyCounter++}`}>{textPart}</span>)
        }
      }

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

    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex)
      if (remainingText) {
        parts.push(<span key={`text-${keyCounter++}`}>{remainingText}</span>)
      }
    }

    return parts.length > 0 ? parts : [<span key={`text-${keyCounter}`}>{text}</span>]
  }, [])

  // 마크다운 텍스트 렌더링 (제목, 굵게, 기울임, 링크, 코드 등)
  const renderMarkdownText = useCallback((text: string): React.ReactNode => {
    if (!text) return null

    const lines = text.split('\n')
    const parts: React.ReactNode[] = []
    let keyCounter = 0
    let inCodeBlock = false
    let codeBlockContent: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // 코드 블록 처리
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          parts.push(
            <pre key={`code-${keyCounter++}`} className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4">
              <code className="text-sm font-mono">{codeBlockContent.join('\n')}</code>
            </pre>
          )
          codeBlockContent = []
          inCodeBlock = false
        } else {
          inCodeBlock = true
        }
        continue
      }

      if (inCodeBlock) {
        codeBlockContent.push(line)
        continue
      }

      // 제목 처리
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

      // 리스트 처리
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

      // 일반 텍스트 처리
      parts.push(
        <p key={`para-${keyCounter++}`} className="my-2">
          {renderInlineMarkdown(line)}
        </p>
      )
    }

    return <div className="prose max-w-none">{parts}</div>
  }, [renderInlineMarkdown])

  // 마크다운 렌더링 (이미지는 ResizableImage로 처리)
  const renderPreview = useMemo(() => {
    if (!formData.body) return null

    // 이미지 마크다운 패턴: ![alt](url) 또는 ![alt](url width="..." height="...")
    const imagePattern = /!\[([^\]]*)\]\(([^)]+?)(?:\s+width=["']?(\d+)["']?\s*height=["']?(\d+)["']?)?\)/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match
    let keyCounter = 0
    const imageMatches: Array<{ index: number; length: number; alt: string; url: string; fullMarkdown: string }> = []

    // 모든 이미지 매치 찾기
    while ((match = imagePattern.exec(formData.body)) !== null) {
      let url = match[2].trim()
      url = url.replace(/\s+width=["']?\d+["']?\s*height=["']?\d+["']?/gi, '')
      url = url.replace(/\s+height=["']?\d+["']?\s*width=["']?\d+["']?/gi, '')
      url = url.replace(/\s+width=["']?\d+["']?/gi, '')
      url = url.replace(/\s+height=["']?\d+["']?/gi, '')
      url = url.trim()

      if (url) {
        imageMatches.push({
          index: match.index,
          length: match[0].length,
          alt: match[1] || '이미지',
          url,
          fullMarkdown: match[0],
        })
      }
    }

    // 이미지를 기준으로 텍스트 분할 및 마크다운 렌더링
    let processedText = ''
    let imageIndex = 0

    for (let i = 0; i <= formData.body.length; i++) {
      if (imageIndex < imageMatches.length && i === imageMatches[imageIndex].index) {
        // 이미지 앞의 텍스트를 마크다운으로 렌더링
        if (processedText) {
          parts.push(
            <div key={`text-${keyCounter++}`}>
              {renderMarkdownText(processedText)}
            </div>
          )
          processedText = ''
        }

        // 이미지 렌더링 (ResizableImage 사용)
        const imgMatch = imageMatches[imageIndex]
        parts.push(
          <ResizableImage
            key={`img-${keyCounter++}`}
            src={imgMatch.url}
            alt={imgMatch.alt}
            markdown={imgMatch.fullMarkdown}
            onSizeChange={handleImageSizeChange}
          />
        )

        i += imageMatches[imageIndex].length - 1
        imageIndex++
      } else if (i < formData.body.length) {
        processedText += formData.body[i]
      }
    }

    // 남은 텍스트 마크다운 렌더링
    if (processedText) {
      parts.push(
        <div key={`text-${keyCounter++}`}>
          {renderMarkdownText(processedText)}
        </div>
      )
    }

    return parts.length > 0 ? <div className="space-y-2">{parts}</div> : null
  }, [formData.body, handleImageSizeChange, renderMarkdownText])

  if (loading && isAuthenticated) {
    return (
      <div className="min-h-screen bg-white">
        <Header onLoginClick={() => setShowLoginModal(true)} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-gray-500">로딩 중...</div>
        </div>
      </div>
    )
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
      {!isAuthenticated && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-20">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">게시글 수정</h1>
            <p className="text-gray-600 mb-6">게시글을 수정하려면 로그인이 필요합니다.</p>
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-secondary transition-colors"
            >
              로그인하기
            </button>
          </div>
        </div>
      )}
      {isAuthenticated && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">게시글 수정</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* 프로필 이미지 업로드 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              게시물 프로필 이미지 (선택)
            </label>
            <div className="flex items-start space-x-4">
              {profileImagePreview ? (
                <div className="relative w-48 h-32 border border-gray-300 rounded-lg overflow-hidden bg-gray-100">
                  <Image
                    src={profileImagePreview}
                    alt="프로필 이미지 미리보기"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={handleRemoveProfileImage}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    title="이미지 제거"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="w-48 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs text-gray-500">이미지 없음</p>
                  </div>
                </div>
              )}
              <div className="flex-1">
                <input
                  ref={profileImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => profileImageInputRef.current?.click()}
                  disabled={uploadingProfile}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingProfile ? '업로드 중...' : profileImagePreview ? '이미지 변경' : '이미지 선택'}
                </button>
                <p className="mt-1 text-xs text-gray-500">
                  카드에 표시될 대표 이미지를 선택하세요. (최대 10MB)
                </p>
              </div>
            </div>
          </div>

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

        {/* 이미지 크롭 모달 */}
        {showCropModal && profileImagePreview && (
          <ImageCropModal
            isOpen={showCropModal}
            imageSrc={profileImagePreview}
            onClose={() => {
              setShowCropModal(false)
              if (!formData.profileImageUrl) {
                setProfileImagePreview('')
              }
              setSelectedImageFile(null)
            }}
            onCrop={handleCropComplete}
            aspectRatio={1}
          />
        )}
        </div>
      )}
    </div>
  )
}

