import { PostListSkeleton } from '@/components/SkeletonLoader'

export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <PostListSkeleton />
      </div>
    </div>
  )
}

