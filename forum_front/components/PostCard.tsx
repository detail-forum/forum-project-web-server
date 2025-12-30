'use client'

import { memo, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { PostListDTO } from '@/types/api'
// date-fns에서 필요한 함수만 임포트 (트리 쉐이킹)
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { generateDefaultPostImage } from '@/utils/defaultPostImage'

interface PostCardProps {
  post: PostListDTO
}

function PostCard({ post }: PostCardProps) {
  const router = useRouter()
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

  const handleTagClick = (e: React.MouseEvent, tag: string) => {
    e.preventDefault()
    e.stopPropagation()
    router.push(`/posts-list?tag=${encodeURIComponent(tag)}`)
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
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>조회수: {(post.views ?? post.Views) ?? 0}</span>
          <span className="flex items-center space-x-1">
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span>{post.likeCount ?? 0}</span>
          </span>
        </div>
        {/* 태그 표시 */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {post.tags.map((tag, index) => (
              <button
                key={index}
                onClick={(e) => handleTagClick(e, tag)}
                className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full hover:bg-primary/20 transition-colors"
                title={`${tag} 태그로 필터링`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

export default memo(PostCard)

