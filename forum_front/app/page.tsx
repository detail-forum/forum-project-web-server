'use client'

import { useState, lazy, Suspense, useEffect } from 'react'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
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
      
      {/* 섹션 구분선 */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-4 text-sm text-gray-500 font-medium">
            최신 게시글
          </span>
        </div>
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

