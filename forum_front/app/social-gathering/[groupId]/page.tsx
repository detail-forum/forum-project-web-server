'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import { groupApi, postApi } from '@/services/api'
import type { GroupDetailDTO, GroupPostListDTO, GroupChatRoomDTO, GroupMemberDTO, UpdateGroupDTO, PostListDTO } from '@/types/api'
import Header from '@/components/Header'
import LoginModal from '@/components/LoginModal'
import PostCard from '@/components/PostCard'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { getUsernameFromToken } from '@/utils/jwt'

type TabType = 'intro' | 'posts' | 'chat' | 'manage'

  export default function GroupDetailPage() {
    const params = useParams()
  const router = useRouter()
  const groupId = Number(params.groupId)
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const currentUsername = getUsernameFromToken()
  const [activeTab, setActiveTab] = useState<TabType>('intro')
  const [group, setGroup] = useState<GroupDetailDTO | null>(null)
  const [posts, setPosts] = useState<PostListDTO[]>([])
  const [chatRooms, setChatRooms] = useState<GroupChatRoomDTO[]>([])
  const [members, setMembers] = useState<GroupMemberDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editProfileImageUrl, setEditProfileImageUrl] = useState('')
  const [sortType, setSortType] = useState<'RESENT' | 'HITS' | 'LIKES'>('RESENT')
  const [isPublicFilter, setIsPublicFilter] = useState<boolean | undefined>(undefined) // undefined: 전체, true: 공개만, false: 비공개만
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteGroupName, setDeleteGroupName] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (groupId) {
      fetchGroupDetail()
      fetchChatRooms()
    }
  }, [groupId])

  useEffect(() => {
    if (activeTab === 'posts' && groupId) {
      fetchPosts()
    } else if (activeTab === 'manage' && groupId) {
      fetchMembers()
    }
  }, [activeTab, groupId, sortType, isPublicFilter])

  useEffect(() => {
    if (group) {
      setEditName(group.name)
      setEditDescription(group.description)
      setEditProfileImageUrl(group.profileImageUrl || '')
      
      // 프론트엔드에서도 모임 주인 확인 (백엔드가 제대로 인식하지 못하는 경우 대비)
      if (currentUsername && group.ownerUsername === currentUsername) {
        if (!group.isMember || !group.isAdmin) {
          console.log('Frontend override: Owner detected, setting isMember=true, isAdmin=true')
          setGroup({
            ...group,
            isMember: true,
            isAdmin: true,
          })
        }
      }
    }
  }, [group, currentUsername])

  const fetchGroupDetail = async () => {
    try {
      setLoading(true)
      const response = await groupApi.getGroupDetail(groupId)
      if (response.success && response.data) {
        console.log('Group detail response:', response.data)
        console.log('Is Member:', response.data.isMember)
        console.log('Is Admin:', response.data.isAdmin)
        console.log('Owner Username:', response.data.ownerUsername)
        console.log('Current Username:', currentUsername)
        
        // 프론트엔드에서도 모임 주인 확인 (백엔드가 제대로 인식하지 못하는 경우 대비)
        if (currentUsername && response.data.ownerUsername === currentUsername) {
          response.data.isMember = true
          response.data.isAdmin = true
          console.log('Frontend override: Set isMember=true, isAdmin=true (owner detected)')
        }
        
        setGroup(response.data)
      }
    } catch (error) {
      console.error('모임 상세 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPosts = async () => {
    try {
      setPostsLoading(true)
      console.log('모임 게시글 조회 시작, groupId:', groupId, 'sortType:', sortType, 'isPublic:', isPublicFilter)
      // 모임별 게시글 API 사용 (isPublic 필터는 멤버인 경우에만 적용)
      const response = await postApi.getGroupPostList(groupId, 0, 20, sortType, group?.isMember ? isPublicFilter : undefined)
      console.log('모임 게시글 API 응답:', response)
      if (response.success && response.data) {
        const content = response.data.content || []
        console.log('모임 게시글 목록:', content, '개수:', content.length)
        setPosts(content)
      } else {
        console.warn('모임 게시글 조회 실패 또는 데이터 없음:', response)
        setPosts([])
      }
    } catch (error: any) {
      console.error('모임 활동 게시물 조회 실패:', error)
      console.error('에러 상세:', error.response?.data || error.message)
      setPosts([])
    } finally {
      setPostsLoading(false)
    }
  }

  const fetchChatRooms = async () => {
    try {
      const response = await groupApi.getChatRooms(groupId)
      if (response.success && response.data) {
        setChatRooms(response.data)
      }
    } catch (error) {
      console.error('채팅방 목록 조회 실패:', error)
    }
  }

  const fetchMembers = async () => {
    try {
      const response = await groupApi.getGroupMembers(groupId)
      if (response.success && response.data) {
        setMembers(response.data)
      }
    } catch (error) {
      console.error('멤버 목록 조회 실패:', error)
    }
  }

  const handleToggleAdmin = async (userId: number, currentIsAdmin: boolean) => {
    if (!confirm(`정말로 이 멤버의 관리자 권한을 ${currentIsAdmin ? '해제' : '부여'}하시겠습니까?`)) {
      return
    }

    try {
      const response = await groupApi.updateMemberAdmin(groupId, userId, !currentIsAdmin)
      if (response.success) {
        await fetchMembers()
        alert(`관리자 권한이 ${!currentIsAdmin ? '부여' : '해제'}되었습니다.`)
      }
    } catch (error: any) {
      console.error('관리자 권한 변경 실패:', error)
      alert(error.response?.data?.message || '관리자 권한 변경에 실패했습니다.')
    }
  }

  const handleJoin = async () => {
    if (!isAuthenticated) {
      setShowLoginModal(true)
      return
    }

    try {
      const response = await groupApi.joinGroup(groupId)
      if (response.success) {
        await fetchGroupDetail()
        // 가입 여부 재확인
        const membershipResponse = await groupApi.checkMembership(groupId)
        if (membershipResponse.success && membershipResponse.data) {
          alert('모임에 가입되었습니다!')
        }
      }
    } catch (error: any) {
      console.error('모임 가입 실패:', error)
      alert(error.response?.data?.message || '모임 가입에 실패했습니다.')
    }
  }

  const handleLeave = async () => {
    if (!confirm('정말 모임에서 탈퇴하시겠습니까?')) return

    try {
      const response = await groupApi.leaveGroup(groupId)
      if (response.success) {
        await fetchGroupDetail()
        // 가입 여부 재확인
        const membershipResponse = await groupApi.checkMembership(groupId)
        if (membershipResponse.success && !membershipResponse.data) {
          alert('모임에서 탈퇴되었습니다.')
          router.push('/social-gathering')
        }
      }
    } catch (error: any) {
      console.error('모임 탈퇴 실패:', error)
      const errorMessage = error.response?.data?.message || '모임 탈퇴에 실패했습니다.'
      
      // 모임 주인 탈퇴 시도 오류인 경우 더 명확한 메시지 표시
      if (errorMessage.includes('모임 주인은 탈퇴할 수 없습니다')) {
        alert('모임 주인은 탈퇴할 수 없습니다.\n\n모임을 삭제하려면 모임 관리 탭에서 "모임 삭제하기" 기능을 사용하세요.')
      } else {
        alert(errorMessage)
      }
    }
  }

  const handlePostClick = (postId: number) => {
    router.push(`/social-gathering/${groupId}/posts/${postId}`)
  }

  const handleChatRoomClick = (roomId: number) => {
    router.push(`/social-gathering/${groupId}/chat/${roomId}`)
  }

  const handleUpdateGroup = async () => {
    if (!group) return

    try {
      const updateData: UpdateGroupDTO = {
        name: editName,
        description: editDescription,
        profileImageUrl: editProfileImageUrl || undefined,
      }
      const response = await groupApi.updateGroup(groupId, updateData)
      if (response.success) {
        setIsEditingDescription(false)
        fetchGroupDetail()
        alert('모임 정보가 수정되었습니다.')
      }
    } catch (error: any) {
      console.error('모임 수정 실패:', error)
      alert(error.response?.data?.message || '모임 수정에 실패했습니다.')
    }
  }

  const handleDeleteGroup = async () => {
    if (!group) return

    if (deleteGroupName.trim() !== group.name) {
      alert('모임 이름이 일치하지 않습니다.')
      return
    }

    try {
      setDeleting(true)
      const response = await groupApi.deleteGroup(groupId, deleteGroupName.trim())
      if (response.success) {
        alert('모임이 삭제되었습니다.')
        router.push('/social-gathering')
      }
    } catch (error: any) {
      console.error('모임 삭제 실패:', error)
      alert(error.response?.data?.message || '모임 삭제에 실패했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Header onLoginClick={() => {}} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          로딩 중...
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div>
        <Header onLoginClick={() => {}} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          모임을 찾을 수 없습니다.
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header onLoginClick={() => setShowLoginModal(true)} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 모임 헤더 */}
        <div className="mb-8">
          {group.profileImageUrl && (
            <img
              src={group.profileImageUrl}
              alt={group.name}
              className="w-full h-64 object-cover rounded-lg mb-4"
            />
          )}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">{group.name}</h1>
              <p className="text-gray-600 mb-4">{group.description}</p>
              <div className="flex gap-4 text-sm text-gray-500">
                <span>멤버: {group.memberCount}명</span>
                <span>주인: {group.ownerNickname}</span>
                <span>
                  생성일: {format(new Date(group.createdTime), 'yyyy년 MM월 dd일', { locale: ko })}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {group.isMember ? (
                // 모임 주인은 탈퇴 버튼을 표시하지 않음
                group.ownerUsername !== currentUsername && (
                  <button
                    onClick={handleLeave}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition"
                  >
                    탈퇴하기
                  </button>
                )
              ) : (
                <button
                  onClick={handleJoin}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition"
                >
                  가입하기
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 탭 */}
        <div className="border-b mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('intro')}
              className={`pb-2 px-4 ${
                activeTab === 'intro'
                  ? 'border-b-2 border-blue-500 text-blue-500 font-semibold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              소개
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`pb-2 px-4 ${
                activeTab === 'posts'
                  ? 'border-b-2 border-blue-500 text-blue-500 font-semibold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              활동
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`pb-2 px-4 ${
                activeTab === 'chat'
                  ? 'border-b-2 border-blue-500 text-blue-500 font-semibold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              채팅방
            </button>
            {group.isAdmin && (
              <button
                onClick={() => setActiveTab('manage')}
                className={`pb-2 px-4 ${
                  activeTab === 'manage'
                    ? 'border-b-2 border-blue-500 text-blue-500 font-semibold'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                모임 관리
              </button>
            )}
          </div>
        </div>

        {/* 탭 컨텐츠 */}
        {activeTab === 'intro' && (
          <div className="prose max-w-none">
            <h2 className="text-2xl font-bold mb-4">모임 소개</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{group.description || '모임 설명이 없습니다.'}</p>
          </div>
        )}

        {activeTab === 'posts' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">모임 활동</h2>
              {group.isMember && (
                <button
                  onClick={() => router.push(`/social-gathering/${groupId}/posts/create`)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition"
                >
                  글쓰기
                </button>
              )}
            </div>
            
            {/* 필터링 UI */}
            <div className="mb-6 flex flex-wrap gap-4 items-center">
              {/* 정렬 필터 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">정렬:</span>
                <button
                  onClick={() => setSortType('RESENT')}
                  className={`px-3 py-1 text-sm rounded transition ${
                    sortType === 'RESENT'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  최신순
                </button>
                <button
                  onClick={() => setSortType('HITS')}
                  className={`px-3 py-1 text-sm rounded transition ${
                    sortType === 'HITS'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  조회수순
                </button>
                <button
                  onClick={() => setSortType('LIKES')}
                  className={`px-3 py-1 text-sm rounded transition ${
                    sortType === 'LIKES'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  좋아요순
                </button>
              </div>
              
              {/* 공개/비공개 필터 (멤버만) */}
              {group.isMember && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">공개 범위:</span>
                  <button
                    onClick={() => setIsPublicFilter(undefined)}
                    className={`px-3 py-1 text-sm rounded transition ${
                      isPublicFilter === undefined
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    전체
                  </button>
                  <button
                    onClick={() => setIsPublicFilter(true)}
                    className={`px-3 py-1 text-sm rounded transition ${
                      isPublicFilter === true
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    외부 공개
                  </button>
                  <button
                    onClick={() => setIsPublicFilter(false)}
                    className={`px-3 py-1 text-sm rounded transition ${
                      isPublicFilter === false
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    모임 전용
                  </button>
                </div>
              )}
            </div>
            
            {postsLoading ? (
              <div className="text-center text-gray-500 py-12">로딩 중...</div>
            ) : posts.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                등록된 활동이 없습니다.
                <br />
                <span className="text-sm">모임 게시글을 작성해보세요!</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">채팅방</h2>
              {group.isAdmin && (
                <button
                  onClick={() => {
                    const name = prompt('채팅방 이름을 입력하세요:')
                    if (name && name.length >= 2) {
                      groupApi
                        .createChatRoom(groupId, { name, description: '' })
                        .then(() => {
                          fetchChatRooms()
                        })
                        .catch((error) => {
                          console.error('채팅방 생성 실패:', error)
                          alert('채팅방 생성에 실패했습니다.')
                        })
                    }
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition"
                >
                  채팅방 추가
                </button>
              )}
            </div>
            {chatRooms.length === 0 ? (
              <div className="text-center text-gray-500 py-12">채팅방이 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {chatRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => handleChatRoomClick(room.id)}
                    className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition cursor-pointer"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-lg">
                          {room.name.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-800 text-lg">
                          {room.name}
                        </h3>
                        {room.isAdminRoom && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                            관리자
                          </span>
                        )}
                      </div>
                      {room.description && (
                        <p className="text-sm text-gray-500 truncate">
                          {room.description}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'manage' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">모임 관리</h2>

            {/* 소개 수정 */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">모임 정보 수정</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">모임 이름</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">모임 소개</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">프로필 이미지 URL</label>
                  <input
                    type="text"
                    value={editProfileImageUrl}
                    onChange={(e) => setEditProfileImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleUpdateGroup}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition"
                >
                  저장하기
                </button>
              </div>
            </div>

            {/* 모임 삭제 */}
            {group?.isAdmin && (
              <div className="mb-8 border-t pt-8">
                <h3 className="text-xl font-semibold mb-4 text-red-600">위험한 작업</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800 mb-4">
                    모임을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
                  </p>
                  <button
                    onClick={() => {
                      setShowDeleteModal(true)
                      setDeleteGroupName('')
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition"
                  >
                    모임 삭제하기
                  </button>
                </div>
              </div>
            )}

            {/* 멤버 관리 */}
            <div>
              <h3 className="text-xl font-semibold mb-4">멤버 관리</h3>
              {members.length === 0 ? (
                <div className="text-center text-gray-500 py-12">멤버가 없습니다.</div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">사용자</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">역할</th>
                        {group?.isAdmin && (
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">관리</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {members
                        .sort((a, b) => {
                          // 주인을 맨 위로
                          if (a.isOwner && !b.isOwner) return -1
                          if (!a.isOwner && b.isOwner) return 1
                          // 관리자를 다음으로
                          if (a.isAdmin && !b.isAdmin) return -1
                          if (!a.isAdmin && b.isAdmin) return 1
                          // 나머지는 이름순
                          return a.nickname.localeCompare(b.nickname)
                        })
                        .map((member) => (
                          <tr key={member.userId}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {member.profileImageUrl ? (
                                  <img
                                    src={member.profileImageUrl}
                                    alt={member.nickname}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
                                    {member.nickname.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium">{member.nickname}</div>
                                  <div className="text-sm text-gray-500">@{member.username}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                {member.isOwner && (
                                  <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded font-semibold">
                                    주인
                                  </span>
                                )}
                                {member.isAdmin && !member.isOwner && (
                                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                    관리자
                                  </span>
                                )}
                                {!member.isOwner && !member.isAdmin && (
                                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                                    멤버
                                  </span>
                                )}
                              </div>
                            </td>
                            {group?.isAdmin && (
                              <td className="px-4 py-3">
                                {!member.isOwner && (
                                  <button
                                    onClick={() => handleToggleAdmin(member.userId, member.isAdmin)}
                                    className={`px-3 py-1 text-xs rounded transition ${
                                      member.isAdmin
                                        ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                        : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                    }`}
                                    title={member.isAdmin ? '관리자 권한 해제' : '관리자 권한 부여'}
                                  >
                                    {member.isAdmin ? '관리자 해제' : '관리자 부여'}
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => {
            setShowLoginModal(false)
            fetchGroupDetail()
          }}
        />
      )}

      {/* 모임 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-red-600 mb-4">모임 삭제 확인</h3>
            <p className="text-gray-700 mb-4">
              정말로 이 모임을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <p className="text-sm text-gray-600 mb-2">
              삭제를 확인하려면 모임 이름을 정확히 입력하세요:
            </p>
            <p className="text-sm font-semibold text-gray-800 mb-4">
              모임 이름: <span className="text-blue-600">{group?.name}</span>
            </p>
            <input
              type="text"
              value={deleteGroupName}
              onChange={(e) => setDeleteGroupName(e.target.value)}
              placeholder="모임 이름을 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteGroupName('')
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                disabled={deleting}
              >
                취소
              </button>
              <button
                onClick={handleDeleteGroup}
                disabled={deleting || deleteGroupName.trim() !== group?.name}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? '삭제 중...' : '삭제하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
