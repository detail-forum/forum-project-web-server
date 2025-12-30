'use client'

import { memo, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { PostListDTO } from '@/types/api'
// date-fns에서 필요한 함수만 임포트 (트리 쉐이킹)
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { generateDefaultPostImage } from '@/utils/defaultPostImage'

interface PostCardProps {
  post: PostListDTO
}

function PostCard({ post }: PostCardProps) {
  const [defaultImageUrl, setDefaultImageUrl] = useState<string>('')
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    // 기본 이미지 생성
    const url = generateDefaultPostImage(post.id)
    setDefaultImageUrl(url)
    
    // 클린업
    return () => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url)
      }
    }
  }, [post.id])

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ko })
    } catch {
      return dateString
    }
  }

  const getImageUrl = () => {
    if (post.profileImageUrl && !imageError) {
      // 프로필 이미지가 있고 에러가 없으면 프로필 이미지 사용
      const baseUrl = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL || ''
      const imageUrl = post.profileImageUrl.startsWith('http') 
        ? post.profileImageUrl 
        : `${baseUrl}${post.profileImageUrl}`
      return imageUrl
    }
    // 기본 이미지 사용
    return defaultImageUrl
  }

  return (
    <Link
      href={`/posts/${post.id}`}
      prefetch={true}
      className="block bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-lg transition-all overflow-hidden h-full flex flex-col"
    >
      {/* 이미지 영역 - 정사각형 비율 */}
      <div className="relative w-full aspect-square bg-gray-100 overflow-hidden">
        {defaultImageUrl && (
          <img
            src={getImageUrl()}
            alt={post.title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
        {/* 오버레이 그라데이션 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        {/* 제목 오버레이 */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-white font-semibold text-base line-clamp-2 drop-shadow-lg">
            {post.title}
          </h3>
        </div>
      </div>
      
      {/* 카드 하단 정보 - 컴팩트하게 */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
          <span className="font-medium text-gray-800">{post.username}</span>
          <span className="text-gray-500">{formatDate(post.createDateTime)}</span>
        </div>
        <div className="text-xs text-gray-500">
          조회수: {(post.views ?? post.Views) ?? 0}
        </div>
      </div>
    </Link>
  )
}

export default memo(PostCard)

