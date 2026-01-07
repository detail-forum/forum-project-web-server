'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { postApi } from '@/services/api'
import type { PostListDTO } from '@/types/api'
import Header from '@/components/Header'
import PostCard from '@/components/PostCard'
import { PostListSkeleton } from '@/components/SkeletonLoader'

type SortType = 'RESENT' | 'HITS' | 'LIKES'
type GroupFilterType = 'ALL' | 'GENERAL' | 'GROUP'

function PostsListContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [posts, setPosts] = useState<PostListDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [sortType, setSortType] = useState<SortType>('RESENT')
  const [groupFilter, setGroupFilter] = useState<GroupFilterType>('ALL')
  const [tag, setTag] = useState<string | null>(null)
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [searchInput, setSearchInput] = useState<string>('')

  // URL 파라미터에서 초기값 읽기
  useEffect(() => {
    const pageParam = searchParams.get('page')
    const sortParam = searchParams.get('sort') as SortType | null
    const groupFilterParam = searchParams.get('groupFilter') as GroupFilterType | null
    const tagParam = searchParams.get('tag')
    const searchParam = searchParams.get('search')
    
    if (pageParam) {
      setPage(parseInt(pageParam) - 1) // URL은 1부터 시작, 내부는 0부터
    }
    if (sortParam && (sortParam === 'RESENT' || sortParam === 'HITS' || sortParam === 'LIKES')) {
      setSortType(sortParam)
    }
    if (groupFilterParam && (groupFilterParam === 'ALL' || groupFilterParam === 'GENERAL' || groupFilterParam === 'GROUP')) {
      setGroupFilter(groupFilterParam)
    }
    setTag(tagParam)
    setSearchKeyword(searchParam || '')
    setSearchInput(searchParam || '')
  }, [searchParams])

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true)
      const response = await postApi.getPostList(page, 12, sortType, tag || undefined, searchKeyword || undefined, groupFilter !== 'ALL' ? groupFilter : undefined)
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
  }, [page, sortType, tag, searchKeyword, groupFilter])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const handleSortChange = useCallback((newSortType: SortType) => {
    setSortType(newSortType)
    setPage(0) // 정렬 변경 시 첫 페이지로
    const tagParam = tag ? `&tag=${encodeURIComponent(tag)}` : ''
    const searchParam = searchKeyword ? `&search=${encodeURIComponent(searchKeyword)}` : ''
    const groupFilterParam = groupFilter !== 'ALL' ? `&groupFilter=${groupFilter}` : ''
    router.push(`/posts-list?page=1&sort=${newSortType}${tagParam}${searchParam}${groupFilterParam}`)
  }, [router, tag, searchKeyword, groupFilter])
  
  const handleGroupFilterChange = useCallback((newGroupFilter: GroupFilterType) => {
    setGroupFilter(newGroupFilter)
    setPage(0) // 필터 변경 시 첫 페이지로
    const tagParam = tag ? `&tag=${encodeURIComponent(tag)}` : ''
    const searchParam = searchKeyword ? `&search=${encodeURIComponent(searchKeyword)}` : ''
    const groupFilterParam = newGroupFilter !== 'ALL' ? `&groupFilter=${newGroupFilter}` : ''
    router.push(`/posts-list?page=1&sort=${sortType}${tagParam}${searchParam}${groupFilterParam}`)
  }, [router, tag, searchKeyword, sortType])

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
    const tagParam = tag ? `&tag=${encodeURIComponent(tag)}` : ''
    const searchParam = searchKeyword ? `&search=${encodeURIComponent(searchKeyword)}` : ''
    const groupFilterParam = groupFilter !== 'ALL' ? `&groupFilter=${groupFilter}` : ''
    router.push(`/posts-list?page=${newPage + 1}&sort=${sortType}${tagParam}${searchParam}${groupFilterParam}`)
  }, [router, sortType, tag, searchKeyword, groupFilter])

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    setPage(0)
    const searchValue = searchInput.trim()
    const tagParam = tag ? `&tag=${encodeURIComponent(tag)}` : ''
    const searchParam = searchValue ? `&search=${encodeURIComponent(searchValue)}` : ''
    const groupFilterParam = groupFilter !== 'ALL' ? `&groupFilter=${groupFilter}` : ''
    router.push(`/posts-list?page=1&sort=${sortType}${tagParam}${searchParam}${groupFilterParam}`)
  }, [router, sortType, tag, searchInput, groupFilter])

  const handleClearSearch = useCallback(() => {
    setSearchInput('')
    setPage(0)
    const tagParam = tag ? `&tag=${encodeURIComponent(tag)}` : ''
    const groupFilterParam = groupFilter !== 'ALL' ? `&groupFilter=${groupFilter}` : ''
    router.push(`/posts-list?page=1&sort=${sortType}${tagParam}${groupFilterParam}`)
  }, [router, sortType, tag, groupFilter])

  return (
    <div className="min-h-screen bg-white">
      <Header onLoginClick={() => router.push('/')} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {searchKeyword ? `"${searchKeyword}" 검색 결과` : tag ? `#${tag} 태그 게시글` : '전체 게시글'}
              </h1>
              <p className="text-gray-600">
                {searchKeyword ? `"${searchKeyword}" 검색 결과 ` : tag ? `#${tag} 태그가 포함된 ` : ''}총 {totalElements}개의 게시글
                {(tag || searchKeyword) && (
                  <button
                    onClick={() => router.push('/posts-list?page=1&sort=RESENT')}
                    className="ml-2 text-primary hover:underline"
                  >
                    필터 제거
                  </button>
                )}
              </p>
            </div>
            <Link
              href="/posts"
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors font-medium"
            >
              게시글 작성
            </Link>
          </div>

          {/* 검색 입력 필드 */}
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="제목 또는 본문에서 검색..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors"
              >
                검색
              </button>
              {searchKeyword && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  검색 초기화
                </button>
              )}
            </div>
          </form>

          {/* 필터 - 오른쪽 배치 */}
          <div className="flex items-center space-x-4 flex-wrap gap-4">
            <div className="flex items-center space-x-2">
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
              <button
                onClick={() => handleSortChange('LIKES')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  sortType === 'LIKES'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                좋아요순
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">유형:</span>
              <button
                onClick={() => handleGroupFilterChange('ALL')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  groupFilter === 'ALL'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => handleGroupFilterChange('GENERAL')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  groupFilter === 'GENERAL'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                일반 게시글
              </button>
              <button
                onClick={() => handleGroupFilterChange('GROUP')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  groupFilter === 'GROUP'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                모임 게시글
              </button>
            </div>
          </div>
        </div>

        {/* 게시글 목록 - 그리드 레이아웃 */}
        {loading && posts.length === 0 ? (
          <PostListSkeleton />
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            게시글이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
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

