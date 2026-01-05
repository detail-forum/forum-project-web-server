'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import { groupApi, imageUploadApi } from '@/services/api'
import Header from '@/components/Header'
import ResizableImage from '@/components/ResizableImage'
import ImageCropModal from '@/components/ImageCropModal'
import ImageInsertButton from '@/components/ImageInsertButton'
import LoginModal from '@/components/LoginModal'

export default function CreateGroupPostPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = Number(params.groupId)
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState<string | undefined>(undefined)
  const [showImageCrop, setShowImageCrop] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setShowLoginModal(true)
    }
  }, [isAuthenticated])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          setImagePreview(e.target.result as string)
          setShowImageCrop(true)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageCrop = async (croppedBlob: Blob) => {
    try {
      // Blob을 File로 변환
      const croppedFile = new File([croppedBlob], 'cropped-image.jpg', { type: 'image/jpeg' })
      const response = await imageUploadApi.uploadImage(croppedFile)
      if (response.success && response.data) {
        setProfileImageUrl(response.data.url)
      }
    } catch (error) {
      console.error('이미지 업로드 실패:', error)
    } finally {
      setShowImageCrop(false)
      setSelectedImage(null)
      setImagePreview('')
    }
  }

  const handleImageInserted = (markdown: string) => {
    // 이미지 마크다운을 본문에 추가
    setBody(body + '\n' + markdown + '\n')
  }

  // 이미지 크기 변경 핸들러
  const handleImageSizeChange = useCallback((newMarkdown: string) => {
    // 마크다운에서 URL 추출하여 기존 마크다운 찾기
    const urlMatch = newMarkdown.match(/!\[([^\]]*)\]\(([^)]+?)(?:\s+width="\d+"\s+height="\d+")?\)/)
    if (!urlMatch) return
    
    const url = urlMatch[2].trim()
    // 기존 본문에서 해당 URL을 가진 이미지 마크다운 찾기 (크기 정보 포함/미포함 모두)
    const oldPattern = new RegExp(`!\\[([^\\]]*)\\]\\(${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s+width="\\d+"\\s+height="\\d+")?\\)`, 'g')
    
    setBody((prev) => prev.replace(oldPattern, newMarkdown))
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
    if (!body) return null

    // 이미지 마크다운 패턴: ![alt](url) 또는 ![alt](url width="..." height="...")
    const imagePattern = /!\[([^\]]*)\]\(([^)]+?)(?:\s+width=["']?(\d+)["']?\s*height=["']?(\d+)["']?)?\)/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match
    let keyCounter = 0
    const imageMatches: Array<{ index: number; length: number; alt: string; url: string; fullMarkdown: string }> = []

    // 모든 이미지 매치 찾기
    while ((match = imagePattern.exec(body)) !== null) {
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

    for (let i = 0; i <= body.length; i++) {
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
      } else if (i < body.length) {
        processedText += body[i]
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
  }, [body, handleImageSizeChange, renderMarkdownText])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isAuthenticated) {
      setShowLoginModal(true)
      return
    }

    if (title.length < 10) {
      alert('제목은 10자 이상이어야 합니다.')
      return
    }

    if (body.length < 10) {
      alert('본문은 10자 이상이어야 합니다.')
      return
    }

    try {
      setLoading(true)
      // 태그 문자열을 배열로 변환 (쉼표로 구분, 공백 제거, 빈 값 제거)
      const tags = tagInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
      
      const response = await groupApi.createGroupPost(groupId, {
        title,
        body,
        profileImageUrl,
        tags: tags.length > 0 ? tags : undefined,
      })

      if (response.success && response.data) {
        router.push(`/social-gathering/${groupId}/posts/${response.data}`)
      }
    } catch (error: any) {
      console.error('게시물 작성 실패:', error)
      alert(error.response?.data?.message || '게시물 작성에 실패했습니다.')
    } finally {
      setLoading(false)
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

        <h1 className="text-2xl font-bold mb-6">모임 활동 글쓰기</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제목 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="제목을 입력하세요 (10자 이상)"
              required
              minLength={10}
            />
          </div>

                    <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              태그 (쉼표로 구분)
            </label>
            <input
              type="text"
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="예: redux, react"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              태그를 쉼표로 구분하여 입력하세요. 예: redux, react, javascript
            </p>
            {tagInput && (
              <div className="mt-2 flex flex-wrap gap-2">
                {tagInput
                  .split(',')
                  .map(tag => tag.trim())
                  .filter(tag => tag.length > 0)
                  .map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-500 text-white text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              대표 이미지
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
            />
            {profileImageUrl && (
              <div className="mt-4">
                <img
                  src={profileImageUrl}
                  alt="게시물 이미지"
                  className="w-48 h-48 object-cover rounded"
                />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                본문 *
              </label>
              <ImageInsertButton
                onImageInserted={handleImageInserted}
                textareaRef={textareaRef}
              />
            </div>
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              rows={15}
              placeholder="본문을 입력하세요 (10자 이상). 마크다운 문법을 사용할 수 있습니다. 이미지는 미리보기에서 크기를 조절할 수 있습니다."
              required
              minLength={10}
            />
            
            {/* 미리보기 영역 */}
            {body && (
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

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded transition disabled:opacity-50"
            >
              {loading ? '작성 중...' : '작성하기'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded transition"
            >
              취소
            </button>
          </div>
        </form>
      </div>

      {showImageCrop && imagePreview && (
        <ImageCropModal
          isOpen={showImageCrop}
          imageSrc={imagePreview}
          onCrop={handleImageCrop}
          onClose={() => {
            setShowImageCrop(false)
            setSelectedImage(null)
            setImagePreview('')
          }}
        />
      )}

      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => {
            setShowLoginModal(false)
          }}
        />
      )}
    </div>
  )
}
