'use client'

import { useMemo } from 'react'
import ResizableImage from '@/components/ResizableImage'
import { safeHref } from '@/utils/safeHref'

// 글 쓰기·수정 화면 4곳이 똑같이 갖고 있던 미리보기를 모았다. 상세 보기 화면은 이미지를 다르게 그려서 따로 둔다.

// 인라인 마크다운 렌더링 (굵게, 기울임, 링크, 코드)
function renderInlineMarkdown(text: string): React.ReactNode {
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
            href={safeHref(match.url)}
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
}

// 마크다운 텍스트 렌더링 (제목, 굵게, 기울임, 링크, 코드 등)
function renderMarkdownText(text: string): React.ReactNode {
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
}

/** 크기를 바꾼 이미지 마크다운(newMarkdown)으로 본문의 같은 URL 이미지를 바꾼다 */
export function applyImageSize(body: string, newMarkdown: string): string {
  // 마크다운에서 URL 추출하여 기존 마크다운 찾기
  const urlMatch = newMarkdown.match(/!\[([^\]]*)\]\(([^)]+?)(?:\s+width=["']?\d+["']?\s*height=["']?\d+["']?)?\)/)
  if (!urlMatch) return body
  
  // URL에서 크기 정보 제거
  let url = urlMatch[2].trim()
  url = url.replace(/\s+width\s*=\s*["']?\d+["']?\s*height\s*=\s*["']?\d+["']?/gi, '')
  url = url.replace(/\s+height\s*=\s*["']?\d+["']?\s*width\s*=\s*["']?\d+["']?/gi, '')
  url = url.replace(/\s+width\s*=\s*["']?\d+["']?/gi, '')
  url = url.replace(/\s+height\s*=\s*["']?\d+["']?/gi, '')
  url = url.replace(/%20width%3D%22\d+%22%20height%3D%22\d+%22/gi, '')
  url = url.replace(/%20height%3D%22\d+%22%20width%3D%22\d+%22/gi, '')
  url = url.replace(/%20width%3D%22\d+%22/gi, '')
  url = url.replace(/%20height%3D%22\d+%22/gi, '')
  url = url.trim()
  
  // 기존 본문에서 해당 URL을 가진 이미지 마크다운 찾기 (크기 정보 포함/미포함 모두)
  // URL을 이스케이프하여 정규식 패턴 생성
  const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // 다양한 크기 정보 패턴을 포함한 정규식
  const oldPattern = new RegExp(`!\\[([^\\]]*)\\]\\(${escapedUrl}(?:\\s+width=["']?\\d+["']?\\s*height=["']?\\d+["']?)?\\)`, 'g')
  
  return body.replace(oldPattern, newMarkdown)
}

interface MarkdownPreviewProps {
  body: string
  onImageSizeChange: (newMarkdown: string) => void
}

/** 본문이 비어 있으면 아무것도 그리지 않는다 */
export default function MarkdownPreview({ body, onImageSizeChange }: MarkdownPreviewProps) {
  // 마크다운 렌더링 (이미지는 ResizableImage로 처리)
  const preview = useMemo(() => {
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
      // URL 추출 - 크기 정보가 포함된 경우를 처리
      let url = match[2].trim()
      
      // 크기 정보 제거 (다양한 패턴 처리)
      // 1. width="..." height="..." 패턴
      url = url.replace(/\s+width\s*=\s*["']?\d+["']?\s*height\s*=\s*["']?\d+["']?/gi, '')
      // 2. height="..." width="..." 패턴
      url = url.replace(/\s+height\s*=\s*["']?\d+["']?\s*width\s*=\s*["']?\d+["']?/gi, '')
      // 3. width="..." 단독
      url = url.replace(/\s+width\s*=\s*["']?\d+["']?/gi, '')
      // 4. height="..." 단독
      url = url.replace(/\s+height\s*=\s*["']?\d+["']?/gi, '')
      // 5. URL 인코딩된 크기 정보 제거 (%20width=%22...%22 등)
      url = url.replace(/%20width%3D%22\d+%22%20height%3D%22\d+%22/gi, '')
      url = url.replace(/%20height%3D%22\d+%22%20width%3D%22\d+%22/gi, '')
      url = url.replace(/%20width%3D%22\d+%22/gi, '')
      url = url.replace(/%20height%3D%22\d+%22/gi, '')
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
            onSizeChange={onImageSizeChange}
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
  }, [body, onImageSizeChange])

  return preview
}
