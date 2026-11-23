'use client'

import { useEffect, useState, useCallback } from 'react'
import { postApi } from '@/services/api'
import type { PostListDTO } from '@/types/api'
import Link from 'next/link'
import PostCard from './PostCard'
import { PostListSkeleton } from './SkeletonLoader'
import { motion } from 'framer-motion'

// ScrollReveal 컴포넌트 (framer-motion으로 구현)
function ScrollReveal({ children, enableBlur = true }: { children: React.ReactNode; enableBlur?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  )
}

// FadeContent 컴포넌트 (framer-motion으로 구현)
function FadeContent({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  )
}

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
      <ScrollReveal>
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">최신 게시글</h2>
            <p className="text-gray-600">최근에 작성된 게시글을 확인해보세요</p>
          </div>
          <Link
            href="/posts-list"
            prefetch={true}
            className="group inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-primary transition-colors"
          >
            전체 게시글 보기
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </ScrollReveal>

      {loading ? (
        <PostListSkeleton />
      ) : posts.length === 0 ? (
        <FadeContent>
          <div className="text-center py-12 text-gray-500">
            아직 게시글이 없습니다.
          </div>
        </FadeContent>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {posts.map((post) => (
            <ScrollReveal key={post.id} enableBlur={false}>
              <PostCard post={post} />
            </ScrollReveal>
          ))}
        </div>
      )}
    </section>
  )
}

