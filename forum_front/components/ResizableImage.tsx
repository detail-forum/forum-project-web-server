'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface ResizableImageProps {
  src: string
  alt: string
  markdown: string // 원본 마크다운 텍스트
  onSizeChange: (newMarkdown: string) => void // 크기 변경 시 호출
  className?: string
}

export default function ResizableImage({ 
  src, 
  alt, 
  markdown, 
  onSizeChange,
  className = '' 
}: ResizableImageProps) {
  const [width, setWidth] = useState<number | null>(null)
  const [height, setHeight] = useState<number | null>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<'se' | 'sw' | 'ne' | 'nw' | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const startPosRef = useRef<{ 
    x: number
    y: number
    width: number
    height: number
    centerX: number
    centerY: number
    initialDistance: number
  } | null>(null)

  // 마크다운에서 크기 정보 추출
  useEffect(() => {
    const widthMatch = markdown.match(/width=["']?(\d+)["']?/)
    const heightMatch = markdown.match(/height=["']?(\d+)["']?/)
    if (widthMatch) {
      setWidth(parseInt(widthMatch[1]))
    }
    if (heightMatch) {
      setHeight(parseInt(heightMatch[1]))
    }
    // 크기 정보가 없으면 기본값은 handleImageLoad에서 설정됨
  }, [markdown])

  // 이미지 로드 시 원본 크기 저장
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    if (!width && !height) {
      // 크기가 설정되지 않았으면 기본 높이 300px로 설정하고 종횡비 유지
      const defaultHeight = 300
      const aspectRatio = img.naturalWidth / img.naturalHeight
      setHeight(defaultHeight)
      setWidth(defaultHeight * aspectRatio)
    }
  }, [width, height])

  // 마우스 다운 (리사이즈 시작)
  const handleMouseDown = useCallback((e: React.MouseEvent, handle: 'se' | 'sw' | 'ne' | 'nw') => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizeHandle(handle)
    
    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const initialDistance = Math.sqrt(
        Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
      )
      
      startPosRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: width || rect.width,
        height: height || rect.height,
        centerX,
        centerY,
        initialDistance,
      } as any
    }
  }, [width, height])

  // 마우스 이동 (리사이즈 중)
  useEffect(() => {
    if (!isResizing || !startPosRef.current || !resizeHandle) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!startPosRef.current || !imageRef.current) return

      // 이미지 중심점 기준으로 마우스와의 거리 계산
      const currentDistance = Math.sqrt(
        Math.pow(e.clientX - startPosRef.current.centerX, 2) + 
        Math.pow(e.clientY - startPosRef.current.centerY, 2)
      )
      
      // 초기 거리 대비 비율로 크기 조절 (중심점 기준 대칭)
      // 감도를 줄이기 위해 변화량에 감도 계수 적용 (0.3 = 30% 감도)
      const distanceDelta = currentDistance - startPosRef.current.initialDistance
      const sensitivity = 0.3
      const adjustedDelta = distanceDelta * sensitivity
      const scale = (startPosRef.current.initialDistance + adjustedDelta) / startPosRef.current.initialDistance
      
      // 최소 크기 보장 (50px)
      const minSize = 50
      let newWidth = Math.max(minSize, startPosRef.current.width * scale)
      let newHeight = Math.max(minSize, startPosRef.current.height * scale)

      // 종횡비 유지 (Shift 키를 누르면)
      if (e.shiftKey && imageRef.current) {
        const aspectRatio = imageRef.current.naturalWidth / imageRef.current.naturalHeight
        // 더 큰 변화량을 기준으로 종횡비 유지
        if (newWidth / startPosRef.current.width > newHeight / startPosRef.current.height) {
          newHeight = newWidth / aspectRatio
        } else {
          newWidth = newHeight * aspectRatio
        }
      }

      setWidth(newWidth)
      setHeight(newHeight)
    }

    const handleMouseUp = () => {
      if (!isResizing) return
      
      setIsResizing(false)
      setResizeHandle(null)
      
      // 마크다운 업데이트
      if (width && height) {
        // 기존 마크다운에서 URL과 alt 추출
        const urlMatch = markdown.match(/!\[([^\]]*)\]\(([^)]+?)(?:\s+width="\d+"\s+height="\d+")?\)/)
        if (urlMatch) {
          const alt = urlMatch[1]
          const url = urlMatch[2].trim()
          const newMarkdown = `![${alt}](${url} width="${Math.round(width)}" height="${Math.round(height)}")`
          onSizeChange(newMarkdown)
        }
      }
      
      startPosRef.current = null
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, resizeHandle, width, height, markdown, onSizeChange])

  // URL 정규화 (로컬 개발 환경 처리)
  const normalizeUrl = (url: string): string => {
    if (!url || !url.trim()) return url
    
    let normalizedUrl = url.trim()
    
    // 마크다운에서 URL 추출 시 width/height 속성 제거
    // 예: "/uploads/image.jpg width=\"300\" height=\"200\"" -> "/uploads/image.jpg"
    // 1. width="..." height="..." 패턴
    normalizedUrl = normalizedUrl.replace(/\s+width\s*=\s*["']?\d+["']?\s*height\s*=\s*["']?\d+["']?/gi, '')
    // 2. height="..." width="..." 패턴
    normalizedUrl = normalizedUrl.replace(/\s+height\s*=\s*["']?\d+["']?\s*width\s*=\s*["']?\d+["']?/gi, '')
    // 3. width="..." 단독
    normalizedUrl = normalizedUrl.replace(/\s+width\s*=\s*["']?\d+["']?/gi, '')
    // 4. height="..." 단독
    normalizedUrl = normalizedUrl.replace(/\s+height\s*=\s*["']?\d+["']?/gi, '')
    // 5. URL 인코딩된 크기 정보 제거 (%20width=%22...%22 등)
    normalizedUrl = normalizedUrl.replace(/%20width%3D%22\d+%22%20height%3D%22\d+%22/gi, '')
    normalizedUrl = normalizedUrl.replace(/%20height%3D%22\d+%22%20width%3D%22\d+%22/gi, '')
    normalizedUrl = normalizedUrl.replace(/%20width%3D%22\d+%22/gi, '')
    normalizedUrl = normalizedUrl.replace(/%20height%3D%22\d+%22/gi, '')
    normalizedUrl = normalizedUrl.trim()
    
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      if (!normalizedUrl.startsWith('/')) {
        normalizedUrl = '/' + normalizedUrl
      }
      
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        let productionUrl = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL || 'https://forum.rjsgud.com/uploads'
        productionUrl = productionUrl.replace(/\/$/, '')
        
        if (!productionUrl.endsWith('/uploads')) {
          productionUrl = productionUrl + '/uploads'
        }
        
        let cleanUrl = normalizedUrl
        if (cleanUrl.startsWith('/uploads/')) {
          cleanUrl = cleanUrl.substring('/uploads/'.length)
        } else if (cleanUrl.startsWith('/uploads')) {
          cleanUrl = cleanUrl.substring('/uploads'.length)
        }
        
        normalizedUrl = `${productionUrl}/${cleanUrl}`
      }
    }
    
    return normalizedUrl
  }

  const imageUrl = normalizeUrl(src)
  
  // 이미지 스타일 (중심점 기준 스케일링을 위해 transform 사용)
  const imageStyle: React.CSSProperties = {
    width: width ? `${width}px` : 'auto',
    height: height ? `${height}px` : 'auto',
    maxWidth: '100%',
    cursor: isResizing ? 'nwse-resize' : 'default',
    userSelect: 'none',
    transformOrigin: 'center center',
    objectFit: 'contain',
  }

  const handleStyle: React.CSSProperties = {
    position: 'absolute',
    width: '12px',
    height: '12px',
    backgroundColor: '#12B886',
    border: '2px solid white',
    borderRadius: '50%',
    cursor: 'nwse-resize',
    zIndex: 10,
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  }

  return (
    <div 
      ref={containerRef}
      className={`relative inline-block my-4 group ${className}`}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <img
        ref={imageRef}
        src={imageUrl}
        alt={alt}
        onLoad={handleImageLoad}
        style={imageStyle}
        className="rounded-lg border-2 border-gray-300 shadow-sm group-hover:border-blue-400 transition-colors"
        draggable={false}
      />
      
      {/* 리사이즈 핸들들 - 항상 표시 */}
      <>
        {/* 우하단 핸들 */}
        <div
          style={{
            ...handleStyle,
            right: '-6px',
            bottom: '-6px',
            cursor: 'nwse-resize',
          }}
          onMouseDown={(e) => handleMouseDown(e, 'se')}
          className="hover:bg-blue-600 hover:scale-110 transition-transform"
          title="크기 조절 (우하단)"
        />
        
        {/* 좌하단 핸들 */}
        <div
          style={{
            ...handleStyle,
            left: '-6px',
            bottom: '-6px',
            cursor: 'nesw-resize',
          }}
          onMouseDown={(e) => handleMouseDown(e, 'sw')}
          className="hover:bg-blue-600 hover:scale-110 transition-transform"
          title="크기 조절 (좌하단)"
        />
        
        {/* 우상단 핸들 */}
        <div
          style={{
            ...handleStyle,
            right: '-6px',
            top: '-6px',
            cursor: 'nesw-resize',
          }}
          onMouseDown={(e) => handleMouseDown(e, 'ne')}
          className="hover:bg-blue-600 hover:scale-110 transition-transform"
          title="크기 조절 (우상단)"
        />
        
        {/* 좌상단 핸들 */}
        <div
          style={{
            ...handleStyle,
            left: '-6px',
            top: '-6px',
            cursor: 'nwse-resize',
          }}
          onMouseDown={(e) => handleMouseDown(e, 'nw')}
          className="hover:bg-blue-600 hover:scale-110 transition-transform"
          title="크기 조절 (좌상단)"
        />
      </>
      
      {/* 크기 정보 표시 (리사이즈 중일 때) */}
      {isResizing && width && height && (
        <div
          style={{
            position: 'absolute',
            top: '-30px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(18, 184, 134, 0.9)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '500',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 20,
          }}
        >
          {Math.round(width)} × {Math.round(height)} px
        </div>
      )}
    </div>
  )
}

