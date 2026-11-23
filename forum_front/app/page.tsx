'use client'

import { useState, lazy, Suspense, useEffect } from 'react'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import SearchBar from '@/components/SearchBar'
import { PostListSkeleton } from '@/components/SkeletonLoader'

// 동적 임포트로 코드 스플리팅
const RecentPosts = lazy(() => import('@/components/RecentPosts'))
const LoginModal = lazy(() => import('@/components/LoginModal'))

export default function Home() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <Header onLoginClick={() => setIsLoginModalOpen(true)} />
      <Hero />
      
      {/* 통합 검색 바 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-8 relative z-20">
        <SearchBar />
      </div>
      
      <div className={`transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
        <Suspense fallback={<PostListSkeleton />}>
          <RecentPosts />
        </Suspense>
      </div>

      {isLoginModalOpen && (
        <Suspense fallback={null}>
          <LoginModal
            isOpen={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
          />
        </Suspense>
      )}
    </div>
  )
}

