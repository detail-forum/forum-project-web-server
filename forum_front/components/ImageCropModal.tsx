'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface ImageCropModalProps {
  isOpen: boolean
  imageSrc: string
  onClose: () => void
  onCrop: (croppedImageBlob: Blob) => void
  aspectRatio?: number
}

export default function ImageCropModal({
  isOpen,
  imageSrc,
  onClose,
  onCrop,
  aspectRatio = 1,
}: ImageCropModalProps) {
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [cropBoxPosition, setCropBoxPosition] = useState({ x: 0, y: 0 })
  const [cropBoxSize, setCropBoxSize] = useState({ width: 250, height: 250 })
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 })
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 })
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const cropBoxRef = useRef<HTMLDivElement>(null)
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  const [isDraggingCropBox, setIsDraggingCropBox] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })

  const MIN_CROP_SIZE = 100
  const MAX_CROP_SIZE = 500

  const handleImageLoad = useCallback(() => {
    if (imageRef.current && containerRef.current) {
      const img = imageRef.current
      const container = containerRef.current
      
      const naturalWidth = img.naturalWidth
      const naturalHeight = img.naturalHeight
      setImageNaturalSize({ width: naturalWidth, height: naturalHeight })
      
      const containerWidth = container.offsetWidth
      const containerHeight = container.offsetHeight
      
      const imgAspect = naturalWidth / naturalHeight
      const containerAspect = containerWidth / containerHeight
      
      let displayWidth: number
      let displayHeight: number
      
      if (imgAspect > containerAspect) {
        displayWidth = containerWidth
        displayHeight = displayWidth / imgAspect
      } else {
        displayHeight = containerHeight
        displayWidth = displayHeight * imgAspect
      }
      
      setDisplaySize({ width: displayWidth, height: displayHeight })
      setImagePosition({ x: 0, y: 0 })
      
      // 크롭 박스 초기 위치 (중앙)
      const initialSize = 250
      setCropBoxSize({ width: initialSize, height: initialSize })
      setCropBoxPosition({
        x: (containerWidth - initialSize) / 2,
        y: (containerHeight - initialSize) / 2,
      })
      
      setImageLoaded(true)
    }
  }, [])

  // 이미지 위치를 clamp하여 크롭 박스가 항상 이미지 안에 있도록
  const clampImagePosition = useCallback((newX: number, newY: number) => {
    if (!containerRef.current || !imageLoaded) return { x: newX, y: newY }
    
    const container = containerRef.current
    const containerWidth = container.offsetWidth
    const containerHeight = container.offsetHeight
    const containerCenterX = containerWidth / 2
    const containerCenterY = containerHeight / 2
    
    // 이미지의 실제 위치
    const imageCenterX = containerCenterX + newX
    const imageCenterY = containerCenterY + newY
    
    // 이미지 경계
    const imageLeft = imageCenterX - displaySize.width / 2
    const imageRight = imageCenterX + displaySize.width / 2
    const imageTop = imageCenterY - displaySize.height / 2
    const imageBottom = imageCenterY + displaySize.height / 2
    
    // 크롭 박스 경계
    const cropBoxLeft = cropBoxPosition.x
    const cropBoxRight = cropBoxPosition.x + cropBoxSize.width
    const cropBoxTop = cropBoxPosition.y
    const cropBoxBottom = cropBoxPosition.y + cropBoxSize.height
    
    // 크롭 박스가 이미지 안에 있도록 clamp
    let clampedX = newX
    let clampedY = newY
    
    if (cropBoxLeft < imageLeft) {
      clampedX = newX + (imageLeft - cropBoxLeft)
    }
    if (cropBoxRight > imageRight) {
      clampedX = newX - (cropBoxRight - imageRight)
    }
    if (cropBoxTop < imageTop) {
      clampedY = newY + (imageTop - cropBoxTop)
    }
    if (cropBoxBottom > imageBottom) {
      clampedY = newY - (cropBoxBottom - imageBottom)
    }
    
    return { x: clampedX, y: clampedY }
  }, [imageLoaded, displaySize, cropBoxPosition, cropBoxSize])

  // 이미지 드래그
  const handleImageMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingImage(true)
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect()
      setDragStart({ 
        x: e.clientX - imagePosition.x, 
        y: e.clientY - imagePosition.y 
      })
    }
  }

  // 크롭 박스 드래그
  const handleCropBoxMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingCropBox(true)
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect()
      setDragStart({ 
        x: e.clientX - containerRect.left - cropBoxPosition.x, 
        y: e.clientY - containerRect.top - cropBoxPosition.y 
      })
    }
  }

  // 크롭 박스 리사이즈 핸들
  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizeHandle(handle)
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect()
      setResizeStart({
        x: e.clientX - containerRect.left,
        y: e.clientY - containerRect.top,
        width: cropBoxSize.width,
        height: cropBoxSize.height,
      })
    }
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return
    
    const container = containerRef.current
    const containerRect = container.getBoundingClientRect()
    
    if (isDraggingImage) {
      // 이미지 드래그 - clamp 적용
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y
      const clamped = clampImagePosition(newX, newY)
      setImagePosition(clamped)
    } else if (isDraggingCropBox) {
      // 크롭 박스 드래그
      const newX = e.clientX - containerRect.left - dragStart.x
      const newY = e.clientY - containerRect.top - dragStart.y
      
      // 경계 체크 - 이미지 안에만 있도록
      const containerWidth = container.offsetWidth
      const containerHeight = container.offsetHeight
      const containerCenterX = containerWidth / 2
      const containerCenterY = containerHeight / 2
      
      const imageCenterX = containerCenterX + imagePosition.x
      const imageCenterY = containerCenterY + imagePosition.y
      
      const imageLeft = imageCenterX - displaySize.width / 2
      const imageRight = imageCenterX + displaySize.width / 2
      const imageTop = imageCenterY - displaySize.height / 2
      const imageBottom = imageCenterY + displaySize.height / 2
      
      const maxX = Math.min(containerWidth - cropBoxSize.width, imageRight - cropBoxSize.width)
      const maxY = Math.min(containerHeight - cropBoxSize.height, imageBottom - cropBoxSize.height)
      const minX = Math.max(0, imageLeft)
      const minY = Math.max(0, imageTop)
      
      setCropBoxPosition({
        x: Math.max(minX, Math.min(maxX, newX)),
        y: Math.max(minY, Math.min(maxY, newY)),
      })
    } else if (isResizing && resizeHandle) {
      // 크롭 박스 리사이즈
      const deltaX = (e.clientX - containerRect.left) - resizeStart.x
      const deltaY = (e.clientY - containerRect.top) - resizeStart.y
      
      let newWidth = resizeStart.width
      let newHeight = resizeStart.height
      let newX = cropBoxPosition.x
      let newY = cropBoxPosition.y
      
      // 핸들에 따라 크기 조절
      if (resizeHandle.includes('right')) {
        newWidth = Math.max(MIN_CROP_SIZE, Math.min(MAX_CROP_SIZE, resizeStart.width + deltaX))
      }
      if (resizeHandle.includes('left')) {
        const widthChange = resizeStart.width - Math.max(MIN_CROP_SIZE, Math.min(MAX_CROP_SIZE, resizeStart.width - deltaX))
        newWidth = resizeStart.width - widthChange
        newX = cropBoxPosition.x + widthChange
      }
      if (resizeHandle.includes('bottom')) {
        newHeight = Math.max(MIN_CROP_SIZE, Math.min(MAX_CROP_SIZE, resizeStart.height + deltaY))
      }
      if (resizeHandle.includes('top')) {
        const heightChange = resizeStart.height - Math.max(MIN_CROP_SIZE, Math.min(MAX_CROP_SIZE, resizeStart.height - deltaY))
        newHeight = resizeStart.height - heightChange
        newY = cropBoxPosition.y + heightChange
      }
      
      // 정사각형 유지
      const size = Math.min(newWidth, newHeight)
      newWidth = size
      newHeight = size
      
      // 경계 체크
      const containerWidth = container.offsetWidth
      const containerHeight = container.offsetHeight
      const containerCenterX = containerWidth / 2
      const containerCenterY = containerHeight / 2
      
      const imageCenterX = containerCenterX + imagePosition.x
      const imageCenterY = containerCenterY + imagePosition.y
      
      const imageLeft = imageCenterX - displaySize.width / 2
      const imageRight = imageCenterX + displaySize.width / 2
      const imageTop = imageCenterY - displaySize.height / 2
      const imageBottom = imageCenterY + displaySize.height / 2
      
      const maxX = Math.min(containerWidth - newWidth, imageRight - newWidth)
      const maxY = Math.min(containerHeight - newHeight, imageBottom - newHeight)
      const minX = Math.max(0, imageLeft)
      const minY = Math.max(0, imageTop)
      
      setCropBoxSize({ width: newWidth, height: newHeight })
      setCropBoxPosition({
        x: Math.max(minX, Math.min(maxX, newX)),
        y: Math.max(minY, Math.min(maxY, newY)),
      })
    }
  }, [isDraggingImage, isDraggingCropBox, isResizing, resizeHandle, dragStart, resizeStart, imagePosition, displaySize, cropBoxPosition, cropBoxSize, clampImagePosition])

  const handleMouseUp = useCallback(() => {
    setIsDraggingImage(false)
    setIsDraggingCropBox(false)
    setIsResizing(false)
    setResizeHandle(null)
  }, [])

  useEffect(() => {
    if (isDraggingImage || isDraggingCropBox || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDraggingImage, isDraggingCropBox, isResizing, handleMouseMove, handleMouseUp])

  const handleCrop = () => {
    if (!imageRef.current || !containerRef.current) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = imageRef.current
    const container = containerRef.current
    
    const outputSize = 400
    canvas.width = outputSize
    canvas.height = outputSize

    // 컨테이너와 이미지 정보
    const containerWidth = container.offsetWidth
    const containerHeight = container.offsetHeight
    const containerCenterX = containerWidth / 2
    const containerCenterY = containerHeight / 2
    
    // 이미지의 실제 위치 (컨테이너 중심 기준)
    const imageCenterX = containerCenterX + imagePosition.x
    const imageCenterY = containerCenterY + imagePosition.y
    
    // 크롭 박스 중심 위치
    const cropBoxCenterX = cropBoxPosition.x + cropBoxSize.width / 2
    const cropBoxCenterY = cropBoxPosition.y + cropBoxSize.height / 2
    
    // 크롭 박스 중심이 이미지에서 어디에 있는지 계산
    // 이미지 중심을 기준으로 한 상대 위치
    const relativeX = cropBoxCenterX - imageCenterX
    const relativeY = cropBoxCenterY - imageCenterY
    
    // 이미지에서의 절대 위치
    const cropBoxXInImage = displaySize.width / 2 + relativeX
    const cropBoxYInImage = displaySize.height / 2 + relativeY
    
    // 원본 이미지 좌표로 변환
    const scaleX = imageNaturalSize.width / displaySize.width
    const scaleY = imageNaturalSize.height / displaySize.height
    
    // 원본 이미지에서의 크롭 박스 중심
    const sourceCenterX = cropBoxXInImage * scaleX
    const sourceCenterY = cropBoxYInImage * scaleY
    
    // 크롭 영역 크기 (원본 이미지 기준)
    const sourceCropWidth = cropBoxSize.width * scaleX
    const sourceCropHeight = cropBoxSize.height * scaleY
    
    // 크롭 영역의 시작점
    const sourceX = Math.max(0, Math.min(imageNaturalSize.width - sourceCropWidth, sourceCenterX - sourceCropWidth / 2))
    const sourceY = Math.max(0, Math.min(imageNaturalSize.height - sourceCropHeight, sourceCenterY - sourceCropHeight / 2))
    const finalCropWidth = Math.min(sourceCropWidth, imageNaturalSize.width - sourceX)
    const finalCropHeight = Math.min(sourceCropHeight, imageNaturalSize.height - sourceY)

    // 캔버스에 그리기
    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      finalCropWidth,
      finalCropHeight,
      0,
      0,
      outputSize,
      outputSize
    )

    canvas.toBlob((blob) => {
      if (blob) {
        onCrop(blob)
        onClose()
      }
    }, 'image/jpeg', 0.9)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">이미지 크롭</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <div
            ref={containerRef}
            className="relative w-full aspect-square bg-gray-900 overflow-hidden rounded-lg"
            style={{ maxWidth: '500px', maxHeight: '500px', margin: '0 auto' }}
          >
            {/* 이미지 - 드래그 가능 */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="크롭할 이미지"
              className="absolute top-1/2 left-1/2 select-none"
              style={{
                width: imageLoaded ? `${displaySize.width}px` : 'auto',
                height: imageLoaded ? `${displaySize.height}px` : 'auto',
                objectFit: 'contain',
                opacity: imageLoaded ? 1 : 0,
                cursor: isDraggingImage ? 'grabbing' : 'grab',
                transform: `translate(calc(-50% + ${imagePosition.x}px), calc(-50% + ${imagePosition.y}px))`,
                userSelect: 'none',
              }}
              onLoad={handleImageLoad}
              onMouseDown={handleImageMouseDown}
              draggable={false}
            />
            
            {/* 크롭 박스 - 드래그 및 리사이즈 가능 */}
            {imageLoaded && (
              <div
                ref={cropBoxRef}
                className="absolute border-2 border-white shadow-lg z-10"
                style={{
                  width: `${cropBoxSize.width}px`,
                  height: `${cropBoxSize.height}px`,
                  left: `${cropBoxPosition.x}px`,
                  top: `${cropBoxPosition.y}px`,
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                }}
              >
                {/* 크롭 박스 배경 - 드래그 가능 */}
                <div
                  className="absolute inset-0 cursor-move"
                  onMouseDown={handleCropBoxMouseDown}
                ></div>
                
                {/* 크롭 박스 모서리 핸들 - 리사이즈 가능 */}
                <div
                  className="absolute -top-1 -left-1 w-4 h-4 border-2 border-white bg-white rounded-full cursor-nwse-resize"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'top-left')}
                ></div>
                <div
                  className="absolute -top-1 -right-1 w-4 h-4 border-2 border-white bg-white rounded-full cursor-nesw-resize"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'top-right')}
                ></div>
                <div
                  className="absolute -bottom-1 -left-1 w-4 h-4 border-2 border-white bg-white rounded-full cursor-nesw-resize"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-left')}
                ></div>
                <div
                  className="absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white bg-white rounded-full cursor-nwse-resize"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-right')}
                ></div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs text-gray-500 text-center">
            이미지와 크롭 박스를 드래그하여 이동하고, 모서리를 드래그하여 크기를 조절하세요
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleCrop}
            disabled={!imageLoaded}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            적용
          </button>
        </div>
      </div>
    </div>
  )
}
