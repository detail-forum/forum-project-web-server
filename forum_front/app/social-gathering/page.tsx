'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import Header from '@/components/Header'
import { groupApi } from '@/services/api'
import type { GroupListDTO } from '@/types/api'

export default function SocialGatheringPage() {
  const router = useRouter()
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const [groups, setGroups] = useState<GroupListDTO[]>([])
  const [filteredGroups, setFilteredGroups] = useState<GroupListDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMyGroups, setShowMyGroups] = useState(false)

  useEffect(() => {
    fetchGroups()
  }, [showMyGroups])

  const fetchGroups = async () => {
    try {
      setLoading(true)
      const response = await groupApi.getGroupList(0, 100, showMyGroups && isAuthenticated ? true : undefined)
      if (response.success && response.data) {
        // Page 객체에서 content 추출
        const content = response.data.content || response.data
        const groupsList = Array.isArray(content) ? content : []
        setGroups(groupsList)
        setFilteredGroups(groupsList)
      }
    } catch (error) {
      console.error('모임 목록 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredGroups(groups)
    } else {
      const filtered = groups.filter(group =>
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredGroups(filtered)
    }
  }, [searchQuery, groups])
  
  const handleMyGroupsToggle = () => {
    setShowMyGroups(!showMyGroups)
    setSearchQuery('') // 필터 변경 시 검색어 초기화
  }

  const handleGroupClick = (groupId: number) => {
    router.push(`/social-gathering/${groupId}`)
  }

  const handleCreateGroup = () => {
    router.push('/social-gathering/create')
  }

  return (
    <div>
      <Header onLoginClick={() => {}} />
      {/* 배너 영역 */}
      <div 
        className="p-8 text-center relative"
        style={{
          backgroundImage: 'url(/asset/groupbanner.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg">
            마음이 맞는 사람들끼리 모여서 활동해봐요!
          </h1>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">모임</h2>
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition"
              onClick={handleCreateGroup}
            >
              모임 만들기
            </button>
          </div>
          
          {/* 검색 및 필터링 */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-4">
              {isAuthenticated && (
                <button
                  onClick={handleMyGroupsToggle}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    showMyGroups
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  내 모임 보기
                </button>
              )}
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="모임 이름 또는 설명으로 검색..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* 모임 리스트 */}
          {loading ? (
            <div className="mt-6 text-center">로딩 중...</div>
          ) : filteredGroups.length === 0 ? (
            <div className="mt-6 text-center text-gray-500">
              {searchQuery ? '검색 결과가 없습니다.' : '등록된 모임이 없습니다.'}
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  className="border p-4 rounded shadow hover:shadow-lg transition cursor-pointer"
                  onClick={() => handleGroupClick(group.id)}
                >
                  <div className="w-full h-48 rounded mb-4 overflow-hidden bg-gray-200 flex items-center justify-center">
                    {group.profileImageUrl ? (
                      <img
                        src={group.profileImageUrl}
                        alt={group.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                        <span className="text-white text-4xl font-bold">
                          {group.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold">{group.name}</h3>
                  <p className="text-gray-600 text-sm mt-2 line-clamp-2">{group.description}</p>
                  <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
                    <span>멤버: {group.memberCount}명</span>
                    <span>주인: {group.ownerNickname}</span>
                  </div>
                  {group.isMember && (
                    <span className="mt-2 inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                      가입됨
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {/* 푸터 영역 */}
        <div className="mt-12 text-center text-gray-500">
          © 2023 소모임 플랫폼. All rights reserved.
        </div>
      </div>
    </div>
  )
}
  