'use client'

import { useState, lazy, Suspense } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import { PostListSkeleton } from '@/components/SkeletonLoader'

// 동적 임포트로 코드 스플리팅
const RecentPosts = lazy(() => import('@/components/RecentPosts'))
const LoginModal = lazy(() => import('@/components/LoginModal'))

export default function Home() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)

  return (
    <div className="min-h-screen bg-white">
      <Header onLoginClick={() => setIsLoginModalOpen(true)} />
      <Hero />
      <Suspense fallback={<PostListSkeleton />}>
        <RecentPosts />
      </Suspense>
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

