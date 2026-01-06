'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import { followApi, userPostApi } from '@/services/api'
import type { UserInfoDTO, PostListDTO } from '@/types/api'
import Header from '@/components/Header'
import PostCard from '@/components/PostCard'
import LoginModal from '@/components/LoginModal'
import { getUsernameFromToken } from '@/utils/jwt'
import Image from 'next/image'
import { PostListSkeleton } from '@/components/SkeletonLoader'

type SortType = 'RESENT' | 'HITS' | 'LIKES'

function UserProfileContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [userInfo, setUserInfo] = useState<UserInfoDTO | null>(null)
  const [posts, setPosts] = useState<PostListDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [postLoading, setPostLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [sortType, setSortType] = useState<SortType>('RESENT')
  const [following, setFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const username = params.username as string
  const currentUsername = getUsernameFromToken()
  const isOwnProfile = isAuthenticated && currentUsername === username

  useEffect(() => {
    if (username) {
      fetchUserInfo()
      fetchPosts()
    }
  }, [username])

  useEffect(() => {
    if (username) {
      const pageParam = searchParams.get('page')
      const sortParam = searchParams.get('sort') as SortType | null
      
      if (pageParam) {
        setPage(parseInt(pageParam) - 1)
      }
      if (sortParam && (sortParam === 'RESENT' || sortParam === 'HITS' || sortParam === 'LIKES')) {
        setSortType(sortParam)
      }
    }
  }, [searchParams, username])

  useEffect(() => {
    if (username) {
      fetchPosts()
    }
  }, [page, sortType, username])

  const fetchUserInfo = async () => {
    try {
      setLoading(true)
      const response = await followApi.getUserInfo(username)
      if (response.success && response.data) {
        console.log('사용자 정보 응답:', response.data)
        console.log('isFollowing 값:', response.data.isFollowing)
        // userId가 있으면 별도로 팔로우 상태를 다시 확인 (이중 확인)
        let confirmedIsFollowing = response.data.isFollowing ?? false
        
        if (response.data.id && isAuthenticated) {
          try {
            const statusResponse = await followApi.getFollowStatus(response.data.id)
            if (statusResponse.success) {
              console.log('팔로우 상태 재확인 응답:', statusResponse.data)
              confirmedIsFollowing = statusResponse.data === true
            }
          } catch (statusError) {
            console.error('팔로우 상태 확인 실패:', statusError)
            // 상태 확인 실패해도 기본값 사용
          }
        }
        
        setUserInfo({
          ...response.data,
          isFollowing: confirmedIsFollowing,
        })
        setFollowing(confirmedIsFollowing)
      }
    } catch (error) {
      console.error('사용자 정보 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPosts = async () => {
    try {
      setPostLoading(true)
      const response = await userPostApi.getUserPostList(username, page, 10, sortType)
      if (response.success && response.data) {
        setPosts(response.data.content || [])
        setTotalPages(response.data.totalPages || 0)
        setTotalElements(response.data.totalElements || 0)
      }
    } catch (error) {
      console.error('게시글 목록 조회 실패:', error)
    } finally {
      setPostLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!isAuthenticated) {
      setShowLoginModal(true)
      return
    }
    if (!userInfo) return

    setFollowLoading(true)
    const previousFollowing = following
    const newFollowingState = !following
    
    // 낙관적 업데이트: 즉시 UI 업데이트
    setFollowing(newFollowingState)
    // userInfo도 즉시 업데이트
    if (userInfo) {
      setUserInfo({
        ...userInfo,
        isFollowing: newFollowingState,
      })
    }
    
    try {
      if (previousFollowing) {
        const response = await followApi.unfollowUser(userInfo.id)
        if (!response.success) {
          // 실패 시 이전 상태로 복원
          setFollowing(previousFollowing)
          if (userInfo) {
            setUserInfo({
              ...userInfo,
              isFollowing: previousFollowing,
            })
          }
          throw new Error(response.message || '언팔로우에 실패했습니다.')
        }
      } else {
        const response = await followApi.followUser(userInfo.id)
        if (!response.success) {
          // 실패 시 이전 상태로 복원
          setFollowing(previousFollowing)
          if (userInfo) {
            setUserInfo({
              ...userInfo,
              isFollowing: previousFollowing,
            })
          }
          throw new Error(response.message || '팔로우에 실패했습니다.')
        }
      }
      
      // 성공 시 사용자 정보 다시 조회
      fetchUserInfo()
    } catch (error: any) {
      alert(error.response?.data?.message || error.message || '팔로우 처리에 실패했습니다.')
      console.error('팔로우 처리 실패:', error)
    } finally {
      setFollowLoading(false)
    }
  }

  const handleSortChange = (newSortType: SortType) => {
    setSortType(newSortType)
    setPage(0)
    router.push(`/users/${username}?page=1&sort=${newSortType}`)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    router.push(`/users/${username}?page=${newPage + 1}&sort=${sortType}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header onLoginClick={() => {}} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-gray-500">로딩 중...</div>
        </div>
      </div>
    )
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-white">
        <Header onLoginClick={() => {}} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-gray-500">사용자를 찾을 수 없습니다.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header onLoginClick={() => setShowLoginModal(true)} />
      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 사용자 프로필 정보 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <div className="flex items-start space-x-6">
            {userInfo.profileImageUrl ? (
              <Image
                src={userInfo.profileImageUrl.startsWith('http') 
                  ? userInfo.profileImageUrl 
                  : `${process.env.NEXT_PUBLIC_UPLOAD_BASE_URL || ''}${userInfo.profileImageUrl}`}
                alt={userInfo.username}
                width={120}
                height={120}
                className="rounded-full object-cover border-4 border-gray-200"
                unoptimized
              />
            ) : (
              <div className="w-[120px] h-[120px] rounded-full bg-gray-300 flex items-center justify-center border-4 border-gray-200 flex-shrink-0">
                <span className="text-gray-600 font-medium text-4xl">
                  {userInfo.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{userInfo.username}</h1>
              <p className="text-gray-600 mb-4">{userInfo.nickname}</p>
              <div className="flex items-center space-x-6 mb-4">
                <button
                  onClick={() => router.push(`/users/${username}/followers?type=followers`)}
                  className="text-gray-700 hover:text-primary transition-colors"
                >
                  <span className="font-semibold">{userInfo.followerCount}</span> 팔로워
                </button>
                <button
                  onClick={() => router.push(`/users/${username}/followers?type=following`)}
                  className="text-gray-700 hover:text-primary transition-colors"
                >
                  <span className="font-semibold">{userInfo.followingCount}</span> 팔로잉
                </button>
                <span className="text-gray-700">
                  <span className="font-semibold">{totalElements}</span> 게시글
                </span>
              </div>
              {userInfo.githubLink && (
                <a
                  href={userInfo.githubLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  GitHub 프로필 보기
                </a>
              )}
              {!isOwnProfile && isAuthenticated && userInfo && (
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`px-6 py-2 rounded-lg transition-colors ${
                      following || userInfo.isFollowing
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-primary text-white hover:bg-secondary'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {followLoading ? '처리 중...' : (following || userInfo.isFollowing) ? '언팔로우' : '팔로우'}
                  </button>
                  {(following || userInfo.isFollowing) && (
                    <button
                      onClick={() => router.push(`/chat?user=${username}`)}
                      className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      채팅하기
                    </button>
                  )}
                </div>
              )}
              {isOwnProfile && (
                <button
                  onClick={() => router.push('/social')}
                  className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors"
                >
                  소셜 보기
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 정렬 필터 */}
        <div className="flex items-center space-x-4 mb-6">
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

        {/* 게시글 목록 */}
        {postLoading && posts.length === 0 ? (
          <PostListSkeleton />
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            게시글이 없습니다.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>

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
          </>
        )}
      </div>
    </div>
  )
}

export default function UserProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white">
        <Header onLoginClick={() => {}} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-gray-500">로딩 중...</div>
        </div>
      </div>
    }>
      <UserProfileContent />
    </Suspense>
  )
}
