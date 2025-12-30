'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import { postApi } from '@/services/api'
import type { PostListDTO } from '@/types/api'
import Header from '@/components/Header'
import PostCard from '@/components/PostCard'
import LoginModal from '@/components/LoginModal'

export default function MyPostsPage() {
  const router = useRouter()
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [posts, setPosts] = useState<PostListDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    if (!isAuthenticated) {
      setShowLoginModal(true)
      return
    }
    fetchPosts()
  }, [page, isAuthenticated])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const response = await postApi.getMyPostList(page, 10, 'RESENT')
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white">
        <Header onLoginClick={() => setShowLoginModal(true)} />
        {showLoginModal && (
          <LoginModal
            isOpen={showLoginModal}
            onClose={() => {
              setShowLoginModal(false)
              router.push('/')
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header onLoginClick={() => setShowLoginModal(true)} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">내 게시글</h1>
          <p className="text-gray-600">작성한 게시글을 관리하세요</p>
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
    </div>
  )
}

