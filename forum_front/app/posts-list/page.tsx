'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { postApi } from '@/services/api'
import type { PostListDTO } from '@/types/api'
import Header from '@/components/Header'
import PostCard from '@/components/PostCard'
import { PostListSkeleton } from '@/components/SkeletonLoader'

type SortType = 'RESENT' | 'HITS'

function PostsListContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [posts, setPosts] = useState<PostListDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [sortType, setSortType] = useState<SortType>('RESENT')

  // URL 파라미터에서 초기값 읽기
  useEffect(() => {
    const pageParam = searchParams.get('page')
    const sortParam = searchParams.get('sort') as SortType | null
    
    if (pageParam) {
      setPage(parseInt(pageParam) - 1) // URL은 1부터 시작, 내부는 0부터
    }
    if (sortParam && (sortParam === 'RESENT' || sortParam === 'HITS')) {
      setSortType(sortParam)
    }
  }, [searchParams])

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true)
      const response = await postApi.getPostList(page, 10, sortType)
      if (response.success && response.data) {
        setPosts(response.data.content || [])
        setTotalPages(response.data.totalPages || 0)
        setTotalElements(response.data.totalElements || 0)
      }
    } catch (error) {
      console.error('게시글 목록 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [page, sortType])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const handleSortChange = useCallback((newSortType: SortType) => {
    setSortType(newSortType)
    setPage(0) // 정렬 변경 시 첫 페이지로
    router.push(`/posts-list?page=1&sort=${newSortType}`)
  }, [router])

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
    router.push(`/posts-list?page=${newPage + 1}&sort=${sortType}`)
  }, [router, sortType])

  return (
    <div className="min-h-screen bg-white">
      <Header onLoginClick={() => router.push('/')} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">전체 게시글</h1>
            <p className="text-gray-600">총 {totalElements}개의 게시글</p>
          </div>

          {/* 필터 - 오른쪽 배치 */}
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">정렬:</span>
            <button
              onClick={() => handleSortChange('RESENT')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                sortType === 'RESENT'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              최신순
            </button>
            <button
              onClick={() => handleSortChange('HITS')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                sortType === 'HITS'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              조회수순
            </button>
          </div>
        </div>

        {/* 게시글 목록 */}
        {loading && posts.length === 0 ? (
          <PostListSkeleton />
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            게시글이 없습니다.
          </div>
        ) : (
          <div className="space-y-4 mb-8">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2 mt-8">
            <button
              onClick={() => handlePageChange(0)}
              disabled={page === 0}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              처음
            </button>
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 0}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              이전
            </button>
            
            {/* 페이지 번호 표시 */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i
                } else if (page < 3) {
                  pageNum = i
                } else if (page > totalPages - 4) {
                  pageNum = totalPages - 5 + i
                } else {
                  pageNum = page - 2 + i
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      page === pageNum
                        ? 'bg-primary text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              다음
            </button>
            <button
              onClick={() => handlePageChange(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              마지막
            </button>
          </div>
        )}

        <div className="text-center mt-4 text-sm text-gray-500">
          {totalPages > 0 && (
            <span>
              {page + 1} / {totalPages} 페이지
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PostsListPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white">
        <Header onLoginClick={() => {}} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-gray-500">로딩 중...</div>
        </div>
      </div>
    }>
      <PostsListContent />
    </Suspense>
  )
}

