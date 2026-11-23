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

  // 모임 게시글인 경우 모임 게시글 상세 페이지로, 아니면 일반 게시글 상세 페이지로
  const getPostUrl = () => {
    if (post.groupId) {
      return `/social-gathering/${post.groupId}/posts/${post.id}`
    }
    return `/posts/${post.id}`
  }

  return (
    <Link
      href={getPostUrl()}
      prefetch={true}
      className="group block bg-white border border-gray-200 rounded-xl hover:border-primary/60 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden h-full flex flex-col"
    >
      {/* 이미지 영역 - 정사각형 비율 */}
      <div className="relative w-full aspect-square bg-gray-100 overflow-hidden">
        {defaultImageUrl && (
          <img
            src={getImageUrl()}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        )}
        {/* 오버레이 그라데이션 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        
        {/* 그룹명 오버레이 - 상단 */}
        {post.groupName && (
          <div className="absolute top-3 left-3 z-10">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                router.push(`/social-gathering/${post.groupId}`)
              }}
              className="inline-block max-w-[12rem] truncate px-2.5 py-1 bg-black/50 backdrop-blur-sm text-white rounded-md text-xs font-medium hover:bg-primary transition-colors"
              title={post.groupName}
            >
              {post.groupName}
            </button>
          </div>
        )}
        
        {/* 제목 오버레이 */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-white font-semibold text-base line-clamp-2 drop-shadow-lg">
            {post.title}
          </h3>
        </div>
      </div>
      
      {/* 카드 하단 정보 - 일반 게시물과 동일한 디자인 */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-medium text-gray-800 truncate">{post.username}</span>
          <span className="text-gray-400 shrink-0 ml-2">{formatDate(post.createDateTime)}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1" title="조회수">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="sr-only">조회수</span>
            {(post.views ?? post.Views) ?? 0}
          </span>
          <span className="flex items-center gap-1" title="좋아요">
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="sr-only">좋아요</span>
            {post.likeCount ?? 0}
          </span>
        </div>
        {/* 태그 표시 */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {post.tags.slice(0, 3).map((tag, index) => (
              <button
                key={index}
                onClick={(e) => handleTagClick(e, tag)}
                className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full hover:bg-primary/20 transition-colors"
                title={`${tag} 태그로 필터링`}
              >
                #{tag}
              </button>
            ))}
            {post.tags.length > 3 && (
              <span className="px-2 py-0.5 text-gray-400 text-xs">
                +{post.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}

export default memo(PostCard)

