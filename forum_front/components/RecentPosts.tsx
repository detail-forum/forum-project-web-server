'use client'

import { useEffect, useState, useCallback } from 'react'
import { postApi } from '@/services/api'
import type { PostListDTO } from '@/types/api'
import Link from 'next/link'
import PostCard from './PostCard'
import { PostListSkeleton } from './SkeletonLoader'

export default function RecentPosts() {
  const [posts, setPosts] = useState<PostListDTO[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true)
      const response = await postApi.getPostList(0, 5, 'RESENT')
      if (response.success && response.data) {
        setPosts(response.data.content || [])
      }
    } catch (error) {
      console.error('게시글 목록 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  return (
    <section className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">최신 게시글</h2>
          <p className="text-gray-600">최근에 작성된 게시글을 확인해보세요</p>
        </div>
        <Link
          href="/posts-list"
          prefetch={true}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors"
        >
          전체 게시글 보기
        </Link>
      </div>

      {loading ? (
        <PostListSkeleton />
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          아직 게시글이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </section>
  )
}

