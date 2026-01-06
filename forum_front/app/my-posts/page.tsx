'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import { postApi } from '@/services/api'
import type { PostListDTO } from '@/types/api'
import Header from '@/components/Header'
import PostCard from '@/components/PostCard'
import LoginModal from '@/components/LoginModal'

export default function MyPostsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [posts, setPosts] = useState<PostListDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [tag, setTag] = useState<string | null>(null)
  const [myTags, setMyTags] = useState<string[]>([])
  const [loadingTags, setLoadingTags] = useState(false)

  useEffect(() => {
    const tagParam = searchParams.get('tag')
    setTag(tagParam)
  }, [searchParams])

  useEffect(() => {
    if (!isAuthenticated) {
      // 모달이 이미 열려있지 않을 때만 열기
      if (!showLoginModal) {
        setShowLoginModal(true)
      }
    } else {
      // 로그인되면 모달 닫기
      setShowLoginModal(false)
      fetchPosts()
      fetchMyTags()
    }
  }, [page, isAuthenticated, tag])

  const fetchMyTags = async () => {
    try {
      setLoadingTags(true)
      const response = await postApi.getMyTags()
      if (response.success && response.data) {
        setMyTags(response.data)
      }
    } catch (error) {
      console.error('내 태그 목록 조회 실패:', error)
    } finally {
      setLoadingTags(false)
    }
  }

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const response = await postApi.getMyPostList(page, 10, 'RESENT', tag || undefined)
      if (response.success && response.data) {
        setPosts(response.data.content || [])
        setTotalPages(response.data.totalPages || 0)
      }
    } catch (error) {
      console.error('내 게시글 목록 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (postId: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm('정말 이 게시글을 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await postApi.deletePost(postId)
      if (response.success) {
        fetchPosts()
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '게시글 삭제에 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Header onLoginClick={() => setShowLoginModal(true)} />
      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => {
            setShowLoginModal(false)
            fetchPosts()
            fetchMyTags()
          }}
        />
      )}
      {!isAuthenticated && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-20">
            <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">내 게시글</h1>
              <Link href="/my-posts/dashboard">
                <button className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-secondary transition-colors text-xs shadow-lg">
                  통계
                </button>
              </Link>
            </div>
            <p className="text-gray-600 mb-6">내 게시글을 보려면 로그인이 필요합니다.</p>
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-secondary transition-colors"
            >
              로그인하기
            </button>
          </div>
        </div>
      )}
      {isAuthenticated && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            {/* 통계 버튼 추가 */}
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-3xl font-bold text-gray-900">
                {tag ? `#${tag} 태그 내 게시글` : '내 게시글'}
              </h1>
              <Link href="/my-posts/dashboard">
                <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors text-sm shadow-lg">
                  통계 보기
                </button>
              </Link>
            </div>
            <p className="text-gray-600 mb-4">
              {tag ? `#${tag} 태그가 포함된 ` : ''}작성한 게시글을 관리하세요
              {tag && (
                <button
                  onClick={() => router.push('/my-posts')}
                  className="ml-2 text-primary hover:underline"
                >
                  필터 제거
                </button>
              )}
            </p>
            
            {/* 내가 사용한 태그 목록 */}
            {myTags.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-medium text-gray-700 mb-2">내가 사용한 태그:</h2>
                <div className="flex flex-wrap gap-2">
                  {myTags.map((tagName) => (
                    <button
                      key={tagName}
                      onClick={() => router.push(`/my-posts?tag=${encodeURIComponent(tagName)}`)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        tag === tagName
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      #{tagName}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

        {loading && posts.length === 0 ? (
          <div className="text-center text-gray-500">로딩 중...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            작성한 게시글이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {posts.map((post) => (
              <div key={post.id} className="relative group">
                <PostCard post={post} />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2 z-10">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      router.push(`/posts/${post.id}/edit`)
                    }}
                    className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-secondary transition-colors text-xs shadow-lg"
                  >
                    수정
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDelete(post.id, e)
                    }}
                    className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xs shadow-lg"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center mt-8 space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              이전
            </button>
            <span className="px-4 py-2 text-gray-700">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              다음
            </button>
          </div>
        )}
        </div>
      )}
    </div>
  )
}

