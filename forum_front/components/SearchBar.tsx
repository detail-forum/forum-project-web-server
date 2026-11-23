'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { postApi, groupApi, followApi } from '@/services/api'
import type { PostListDTO, GroupListDTO, UserInfoDTO } from '@/types/api'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

type SearchTab = 'all' | 'posts' | 'users' | 'groups'

interface SearchResults {
  posts: PostListDTO[]
  users: UserInfoDTO[]
  groups: GroupListDTO[]
}

export default function SearchBar() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<SearchTab>('all')
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<SearchResults>({
    posts: [],
    users: [],
    groups: [],
  })
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  // 디바운스된 검색 실행
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    if (searchQuery.trim().length === 0) {
      setShowResults(false)
      setResults({ posts: [], users: [], groups: [] })
      return
    }

    if (searchQuery.trim().length < 2) {
      return
    }

    const timer = setTimeout(() => {
      performSearch(searchQuery.trim())
    }, 300)

    setDebounceTimer(timer)

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [searchQuery])

  // 검색 수행
  const performSearch = async (query: string) => {
    setIsSearching(true)
    setShowResults(true)

    try {
      const [postsResponse, groupsResponse, usersResponse] = await Promise.all([
        // 게시물 검색 (결과 수 증가: 10 -> 50)
        postApi.getPostList(0, 50, 'RESENT', undefined, query, undefined).catch(() => ({ success: false, data: { content: [] } })),
        // 모임 검색 (백엔드 API 사용)
        groupApi.searchGroups(query).catch(() => ({ success: false, data: [] })),
        // 사용자 검색 (결과 수 증가: 20 -> 50)
        followApi.searchUsers(query).catch(() => ({ success: false, data: [] })),
      ])

      // 게시물 결과
      const posts = postsResponse.success && postsResponse.data?.content
        ? postsResponse.data.content
        : []

      // 모임 결과 (백엔드 검색 API 사용)
      const groups = groupsResponse.success && groupsResponse.data
        ? groupsResponse.data
        : []

      // 사용자 검색 결과
      const users = usersResponse.success && usersResponse.data
        ? usersResponse.data
        : []

      setResults({
        posts,
        users,
        groups,
      })
    } catch (error) {
      console.error('검색 실패:', error)
      setResults({ posts: [], users: [], groups: [] })
    } finally {
      setIsSearching(false)
    }
  }

  // 검색 결과 필터링
  const getFilteredResults = () => {
    if (activeTab === 'all') {
      return results
    } else if (activeTab === 'posts') {
      return { ...results, users: [], groups: [] }
    } else if (activeTab === 'users') {
      return { ...results, posts: [], groups: [] }
    } else if (activeTab === 'groups') {
      return { ...results, posts: [], users: [] }
    }
    return results
  }

  const filteredResults = getFilteredResults()
  const hasResults = filteredResults.posts.length > 0 || 
                     filteredResults.users.length > 0 || 
                     filteredResults.groups.length > 0

  // 검색어 하이라이트 함수
  const highlightText = (text: string, query: string) => {
    if (!query || !text) return text
    
    const regex = new RegExp(`(${query})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-gray-900 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  // 외부 클릭 시 검색 결과 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    if (showResults) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showResults])

  return (
    <div ref={searchRef} className="relative w-full max-w-3xl mx-auto">
      {/* 검색 입력창 */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (searchQuery.trim().length >= 2) {
              setShowResults(true)
            }
          }}
          placeholder="게시물, 사용자, 모임 검색..."
          className="w-full px-6 py-4 pl-12 pr-32 text-lg bg-white border border-gray-200 rounded-full shadow-lg shadow-gray-900/5 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all"
        />
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {isSearching && (
          <div className="absolute right-20 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          </div>
        )}
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('')
              setShowResults(false)
              setResults({ posts: [], users: [], groups: [] })
            }}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 검색 결과 */}
      {showResults && searchQuery.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 max-h-[800px] overflow-y-auto">
          {/* 탭 */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 pt-4">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                전체 ({results.posts.length + results.users.length + results.groups.length})
              </button>
              <button
                onClick={() => setActiveTab('posts')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === 'posts'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                게시물 ({results.posts.length})
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === 'users'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                사용자 ({results.users.length})
              </button>
              <button
                onClick={() => setActiveTab('groups')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === 'groups'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                모임 ({results.groups.length})
              </button>
            </div>
          </div>

          {/* 결과 목록 */}
          <div className="p-4">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-gray-600">검색 중...</span>
              </div>
            ) : !hasResults ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-gray-500 font-medium">검색 결과가 없습니다</p>
                <p className="text-sm text-gray-400 mt-1">다른 검색어를 시도해보세요</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 게시물 결과 */}
                {filteredResults.posts.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      게시물 ({filteredResults.posts.length}개)
                    </h3>
                    <div className="space-y-2">
                      {filteredResults.posts.slice(0, 20).map((post) => (
                        <Link
                          key={post.id}
                          href={`/posts/${post.id}`}
                          onClick={() => setShowResults(false)}
                          className="block p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                        >
                          <div className="flex items-start gap-3">
                            {post.profileImageUrl && (
                              <img
                                src={post.profileImageUrl}
                                alt={post.username}
                                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 truncate">
                                {highlightText(post.title, searchQuery)}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {post.username} · {format(new Date(post.createDateTime), 'yyyy.MM.dd', { locale: ko })}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                      {filteredResults.posts.length > 20 && (
                        <div className="text-center py-2 text-sm text-gray-500">
                          외 {filteredResults.posts.length - 20}개의 게시물 더 보기
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 사용자 결과 */}
                {filteredResults.users.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      사용자 ({filteredResults.users.length}개)
                    </h3>
                    <div className="space-y-2">
                      {filteredResults.users.slice(0, 20).map((user) => (
                        <Link
                          key={user.id}
                          href={`/users/${user.username}`}
                          onClick={() => setShowResults(false)}
                          className="block p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                        >
                          <div className="flex items-center gap-3">
                            {user.profileImageUrl ? (
                              <img
                                src={user.profileImageUrl}
                                alt={user.nickname}
                                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                                <span className="text-gray-600 font-semibold">
                                  {user.nickname.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900">
                                {highlightText(user.nickname, searchQuery)}
                              </h4>
                              <p className="text-sm text-gray-600">
                                @{highlightText(user.username, searchQuery)}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                      {filteredResults.users.length > 20 && (
                        <div className="text-center py-2 text-sm text-gray-500">
                          외 {filteredResults.users.length - 20}명의 사용자 더 보기
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 모임 결과 */}
                {filteredResults.groups.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      모임 ({filteredResults.groups.length}개)
                    </h3>
                    <div className="space-y-2">
                      {filteredResults.groups.slice(0, 20).map((group) => (
                        <Link
                          key={group.id}
                          href={`/social-gathering/${group.id}`}
                          onClick={() => setShowResults(false)}
                          className="block p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                        >
                          <div className="flex items-start gap-3">
                            {group.profileImageUrl ? (
                              <img
                                src={group.profileImageUrl}
                                alt={group.name}
                                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-blue-600 font-semibold text-sm">
                                  {group.name.charAt(0)}
                                </span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900">
                                {highlightText(group.name, searchQuery)}
                              </h4>
                              {group.description && (
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {highlightText(group.description, searchQuery)}
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                      {filteredResults.groups.length > 20 && (
                        <div className="text-center py-2 text-sm text-gray-500">
                          외 {filteredResults.groups.length - 20}개의 모임 더 보기
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
