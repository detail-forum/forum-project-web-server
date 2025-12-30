'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import { followApi } from '@/services/api'
import type { UserInfoDTO } from '@/types/api'
import Header from '@/components/Header'
import LoginModal from '@/components/LoginModal'

function FollowersContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [users, setUsers] = useState<UserInfoDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState<UserInfoDTO | null>(null)
  const username = params.username as string
  const type = searchParams.get('type') || 'followers' // 'followers' or 'following'

  useEffect(() => {
    if (username) {
      fetchData()
    }
  }, [username, type])

  const fetchData = async () => {
    try {
      setLoading(true)
      // 사용자 정보 조회
      const userInfoResponse = await followApi.getUserInfo(username)
      if (userInfoResponse.success && userInfoResponse.data) {
        setUserInfo(userInfoResponse.data)
        
        // 팔로워 또는 팔로잉 목록 조회
        if (type === 'followers') {
          const response = await followApi.getFollowers(userInfoResponse.data.id)
          if (response.success && response.data) {
            setUsers(response.data)
          }
        } else {
          const response = await followApi.getFollowing(userInfoResponse.data.id)
          if (response.success && response.data) {
            setUsers(response.data)
          }
        }
      }
    } catch (error) {
      console.error('데이터 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async (userId: number, currentFollowing: boolean) => {
    if (!isAuthenticated) {
      setShowLoginModal(true)
      return
    }

    try {
      if (currentFollowing) {
        await followApi.unfollowUser(userId)
      } else {
        await followApi.followUser(userId)
      }
      // 목록 새로고침
      fetchData()
    } catch (error: any) {
      alert(error.response?.data?.message || '팔로우 처리에 실패했습니다.')
    }
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {userInfo?.username}의 {type === 'followers' ? '팔로워' : '팔로잉'}
          </h1>
          <div className="flex space-x-4 mt-4">
            <button
              onClick={() => router.push(`/users/${username}/followers?type=followers`)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                type === 'followers'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              팔로워 {userInfo?.followerCount || 0}
            </button>
            <button
              onClick={() => router.push(`/users/${username}/followers?type=following`)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                type === 'following'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              팔로잉 {userInfo?.followingCount || 0}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-500">로딩 중...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {type === 'followers' ? '팔로워가 없습니다.' : '팔로잉이 없습니다.'}
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{user.username}</h3>
                    <p className="text-sm text-gray-500">{user.nickname}</p>
                    <div className="flex space-x-4 mt-1 text-xs text-gray-400">
                      <span>팔로워 {user.followerCount}</span>
                      <span>팔로잉 {user.followingCount}</span>
                    </div>
                  </div>
                </div>
                {isAuthenticated && (
                  <button
                    onClick={() => handleFollow(user.id, user.isFollowing)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      user.isFollowing
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-primary text-white hover:bg-secondary'
                    }`}
                  >
                    {user.isFollowing ? '언팔로우' : '팔로우'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function FollowersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white">
        <Header onLoginClick={() => {}} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-gray-500">로딩 중...</div>
        </div>
      </div>
    }>
      <FollowersContent />
    </Suspense>
  )
}
