'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import { postApi } from '@/services/api'
import type { PostListDTO } from '@/types/api'
import Header from '@/components/Header'
import LoginModal from '@/components/LoginModal'
import { format, parseISO, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface Statistics {
  totalPosts: number
  totalViews: number
  totalLikes: number
  averageViews: number
  averageLikes: number
}

interface MonthlyData {
  month: string
  posts: number
  views: number
  likes: number
}

interface TagData {
  name: string
  value: number
  [key: string]: string | number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658']

export default function DashboardPage() {
  const router = useRouter()
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [allPosts, setAllPosts] = useState<PostListDTO[]>([])
  const [statistics, setStatistics] = useState<Statistics>({
    totalPosts: 0,
    totalViews: 0,
    totalLikes: 0,
    averageViews: 0,
    averageLikes: 0,
  })
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [tagData, setTagData] = useState<TagData[]>([])
  const [topPosts, setTopPosts] = useState<PostListDTO[]>([])
  const [sortBy, setSortBy] = useState<'views' | 'likes'>('views')

  useEffect(() => {
    if (!isAuthenticated) {
      setShowLoginModal(true)
    } else {
      fetchAllPosts()
    }
  }, [isAuthenticated])

  const fetchAllPosts = async () => {
    try {
      setLoading(true)
      const allPostsData: PostListDTO[] = []
      let page = 0
      let hasMore = true

      // 모든 게시물 가져오기 (페이지네이션)
      while (hasMore) {
        const response = await postApi.getMyPostList(page, 100, 'RESENT')
        if (response.success && response.data) {
          const posts = response.data.content || []
          allPostsData.push(...posts)
          
          if (posts.length < 100 || page >= response.data.totalPages - 1) {
            hasMore = false
          } else {
            page++
          }
        } else {
          hasMore = false
        }
      }

      setAllPosts(allPostsData)
      calculateStatistics(allPostsData)
      calculateMonthlyData(allPostsData)
      calculateTagData(allPostsData)
      calculateTopPosts(allPostsData)
    } catch (error) {
      console.error('게시물 통계 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStatistics = (posts: PostListDTO[]) => {
    const totalPosts = posts.length
    const totalViews = posts.reduce((sum, post) => sum + (post.views || post.Views || 0), 0)
    const totalLikes = posts.reduce((sum, post) => sum + (post.likeCount || 0), 0)
    const averageViews = totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0
    const averageLikes = totalPosts > 0 ? Math.round(totalLikes / totalPosts) : 0

    setStatistics({
      totalPosts,
      totalViews,
      totalLikes,
      averageViews,
      averageLikes,
    })
  }

  const calculateMonthlyData = (posts: PostListDTO[]) => {
    const now = new Date()
    const sixMonthsAgo = subMonths(now, 5)
    const months = eachMonthOfInterval({
      start: startOfMonth(sixMonthsAgo),
      end: endOfMonth(now),
    })

    const monthlyMap = new Map<string, { posts: number; views: number; likes: number }>()

    // 초기화
    months.forEach((month) => {
      const key = format(month, 'yyyy-MM', { locale: ko })
      monthlyMap.set(key, { posts: 0, views: 0, likes: 0 })
    })

    // 게시물 데이터 집계
    posts.forEach((post) => {
      try {
        const postDate = parseISO(post.createDateTime)
        const monthKey = format(postDate, 'yyyy-MM', { locale: ko })
        
        if (monthlyMap.has(monthKey)) {
          const data = monthlyMap.get(monthKey)!
          data.posts += 1
          data.views += post.views || post.Views || 0
          data.likes += post.likeCount || 0
        }
      } catch (error) {
        console.error('날짜 파싱 오류:', error, post.createDateTime)
      }
    })

    const monthlyArray: MonthlyData[] = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month: format(parseISO(`${month}-01`), 'M월', { locale: ko }),
        posts: data.posts,
        views: data.views,
        likes: data.likes,
      }))
      .sort((a, b) => {
        const aDate = parseISO(months.find((m) => format(m, 'M월', { locale: ko }) === a.month)?.toISOString() || '')
        const bDate = parseISO(months.find((m) => format(m, 'M월', { locale: ko }) === b.month)?.toISOString() || '')
        return aDate.getTime() - bDate.getTime()
      })

    setMonthlyData(monthlyArray)
  }

  const calculateTagData = (posts: PostListDTO[]) => {
    const tagMap = new Map<string, number>()

    posts.forEach((post) => {
      if (post.tags && post.tags.length > 0) {
        post.tags.forEach((tag) => {
          const count = tagMap.get(tag) || 0
          tagMap.set(tag, count + 1)
        })
      }
    })

    const tagArray: TagData[] = Array.from(tagMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7) // 상위 7개만 표시

    setTagData(tagArray)
  }

  const calculateTopPosts = (posts: PostListDTO[]) => {
    const sorted = [...posts].sort((a, b) => {
      if (sortBy === 'views') {
        return (b.views || b.Views || 0) - (a.views || a.Views || 0)
      } else {
        return (b.likeCount || 0) - (a.likeCount || 0)
      }
    })

    setTopPosts(sorted.slice(0, 5))
  }

  useEffect(() => {
    if (allPosts.length > 0) {
      calculateTopPosts(allPosts)
    }
  }, [sortBy, allPosts])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onLoginClick={() => {}} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-gray-500">통계를 불러오는 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onLoginClick={() => setShowLoginModal(true)} />
      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => {
            setShowLoginModal(false)
            fetchAllPosts()
          }}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">게시물 통계 대시보드</h1>
          <p className="text-gray-600">내 게시물의 통계를 한눈에 확인하세요</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">전체 게시물</div>
            <div className="text-3xl font-bold text-gray-900">{statistics.totalPosts}</div>
            <div className="text-xs text-gray-500 mt-1">개</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">총 조회수</div>
            <div className="text-3xl font-bold text-blue-600">{statistics.totalViews.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">회</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">총 좋아요</div>
            <div className="text-3xl font-bold text-red-600">{statistics.totalLikes.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">개</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">평균 조회수</div>
            <div className="text-3xl font-bold text-green-600">{statistics.averageViews.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">회/게시물</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">평균 좋아요</div>
            <div className="text-3xl font-bold text-purple-600">{statistics.averageLikes.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">개/게시물</div>
          </div>
        </div>

        {/* 차트 그리드 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 월별 게시물 작성 추이 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">월별 게시물 작성 추이</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="posts" stroke="#0088FE" strokeWidth={2} name="게시물 수" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 월별 조회수/좋아요 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">월별 조회수 & 좋아요</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="views" fill="#00C49F" name="조회수" />
                <Bar dataKey="likes" fill="#FF8042" name="좋아요" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 태그 분포 및 인기 게시물 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 태그별 게시물 분포 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">태그별 게시물 분포</h2>
            {tagData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={tagData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {tagData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                태그가 있는 게시물이 없습니다.
              </div>
            )}
          </div>

          {/* 인기 게시물 TOP 5 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">인기 게시물 TOP 5</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setSortBy('views')}
                  className={`px-3 py-1 text-sm rounded-lg transition ${
                    sortBy === 'views'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  조회수
                </button>
                <button
                  onClick={() => setSortBy('likes')}
                  className={`px-3 py-1 text-sm rounded-lg transition ${
                    sortBy === 'likes'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  좋아요
                </button>
              </div>
            </div>
            {topPosts.length > 0 ? (
              <div className="space-y-3">
                {topPosts.map((post, index) => (
                  <div
                    key={post.id}
                    onClick={() => {
                      if (post.groupId) {
                        router.push(`/social-gathering/${post.groupId}/posts/${post.id}`)
                      } else {
                        router.push(`/posts/${post.id}`)
                      }
                    }}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-bold text-blue-600">#{index + 1}</span>
                          <h3 className="font-semibold text-gray-900 truncate">{post.title}</h3>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>👁️ {post.views || post.Views || 0}</span>
                          <span>❤️ {post.likeCount || 0}</span>
                          {post.groupName && (
                            <span className="text-blue-600">#{post.groupName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">게시물이 없습니다.</div>
            )}
          </div>
        </div>

        {/* 전체 게시물 링크 */}
        <div className="text-center">
          <button
            onClick={() => router.push('/my-posts')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
          >
            전체 게시물 보기
          </button>
        </div>
      </div>
    </div>
  )
}
