'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import { motion } from 'framer-motion'
import Header from '@/components/Header'
import { groupApi } from '@/services/api'
import type { GroupListDTO } from '@/types/api'
import RotatingText from '@/components/RotatingText'
import AnimatedBackground from '@/components/AnimatedBackground'

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

  const bannerWords = ['함께 성장하는', '지식을 나누는', '관심사를 공유하는', '새로운 인연을 만나는']

  return (
    <div className="min-h-screen bg-white">
      <Header onLoginClick={() => {}} />
      {/* 배너 영역 - AnimatedBackground와 RotatingText 사용 */}
      <section className="relative overflow-hidden py-20 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <AnimatedBackground variant="particles" className="opacity-30" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
            >
              <RotatingText
                words={bannerWords}
                duration={3}
                className="text-primary"
              />
              <br />
              <span className="text-gray-800">모임을 시작해보세요!</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl text-gray-600 mt-6 max-w-2xl mx-auto"
            >
              마음이 맞는 사람들끼리 모여서 활동하고, 지식을 공유하며 함께 성장해요
            </motion.p>
          </div>
        </div>
      </section>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex justify-between items-center mb-8"
          >
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">모임 탐색</h2>
              <p className="text-gray-600">관심사가 맞는 모임을 찾아보세요</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCreateGroup}
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all"
            >
              + 모임 만들기
            </motion.button>
          </motion.div>
          
          {/* 검색 및 필터링 - 개선된 디자인 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8 space-y-4"
          >
            <div className="flex items-center gap-4 flex-wrap">
              {isAuthenticated && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleMyGroupsToggle}
                  className={`px-5 py-2.5 rounded-lg font-medium transition-all shadow-md ${
                    showMyGroups
                      ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  내 모임 보기
                </motion.button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="모임 이름 또는 설명으로 검색..."
                className="w-full px-5 py-3 pl-12 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
              />
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </motion.div>
          
          {/* 모임 리스트 - 개선된 카드 디자인 */}
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-12 text-center text-gray-500 py-20"
            >
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4">모임을 불러오는 중...</p>
            </motion.div>
          ) : filteredGroups.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 text-center py-20"
            >
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-xl text-gray-600 mb-2">
                {searchQuery ? '검색 결과가 없습니다.' : '등록된 모임이 없습니다.'}
              </p>
              {!searchQuery && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCreateGroup}
                  className="mt-4 bg-primary text-white px-6 py-3 rounded-lg font-semibold shadow-lg"
                >
                  첫 모임 만들기
                </motion.button>
              )}
            </motion.div>
          ) : (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGroups.map((group, index) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="bg-white border-2 border-gray-100 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer group"
                  onClick={() => handleGroupClick(group.id)}
                >
                  <div className="w-full h-48 relative overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20">
                    {group.profileImageUrl ? (
                      <img
                        src={group.profileImageUrl}
                        alt={group.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                        <span className="text-white text-5xl font-bold">
                          {group.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {group.isMember && (
                      <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg">
                        가입됨
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                      {group.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[40px]">
                      {group.description || '설명이 없습니다.'}
                    </p>
                    <div className="flex justify-between items-center text-sm text-gray-500 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="font-medium">{group.memberCount}명</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>{group.ownerNickname}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
        {/* 푸터 영역 - 개선된 디자인 */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 pt-8 border-t border-gray-200 text-center text-gray-500"
        >
          <p className="text-sm">© 2024 소모임 플랫폼. All rights reserved.</p>
        </motion.div>
      </div>
    </div>
  )
}
  