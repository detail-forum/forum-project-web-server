import { memo } from 'react'
import Link from 'next/link'
import type { PostListDTO } from '@/types/api'
// date-fns에서 필요한 함수만 임포트 (트리 쉐이킹)
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

interface PostCardProps {
  post: PostListDTO
}

function PostCard({ post }: PostCardProps) {
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ko })
    } catch {
      return dateString
    }
  }

  return (
    <Link
      href={`/posts/${post.id}`}
      prefetch={true}
      className="block p-6 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all"
    >
      <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
        {post.title}
      </h3>
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          <span>{post.username}</span>
          <span>조회수: {post.views || post.Views || 0}</span>
        </div>
        <span>{formatDate(post.createDateTime)}</span>
      </div>
    </Link>
  )
}

export default memo(PostCard)

