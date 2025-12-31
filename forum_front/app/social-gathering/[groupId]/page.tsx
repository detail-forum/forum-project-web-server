'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import { groupApi } from '@/services/api'
import type { GroupDetailDTO, GroupPostListDTO, GroupChatRoomDTO, GroupMemberDTO, UpdateGroupDTO } from '@/types/api'
import Header from '@/components/Header'
import LoginModal from '@/components/LoginModal'
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
  const [posts, setPosts] = useState<GroupPostListDTO[]>([])
  const [chatRooms, setChatRooms] = useState<GroupChatRoomDTO[]>([])
  const [members, setMembers] = useState<GroupMemberDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editProfileImageUrl, setEditProfileImageUrl] = useState('')

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
  }, [activeTab, groupId])

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
      const response = await groupApi.getGroupPostList(groupId, 0, 20)
      if (response.success && response.data) {
        // Page 객체에서 content 추출
        const content = response.data.content || response.data
        setPosts(Array.isArray(content) ? content : [])
      }
    } catch (error) {
      console.error('모임 활동 게시물 조회 실패:', error)
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
        }
      }
    } catch (error: any) {
      console.error('모임 탈퇴 실패:', error)
      alert(error.response?.data?.message || '모임 탈퇴에 실패했습니다.')
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
                <button
                  onClick={handleLeave}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition"
                >
                  탈퇴하기
                </button>
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
            {posts.length === 0 ? (
              <div className="text-center text-gray-500 py-12">등록된 활동이 없습니다.</div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => handlePostClick(post.id)}
                    className="border p-4 rounded hover:shadow-lg transition cursor-pointer"
                  >
                    <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-2">{post.body}</p>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>{post.nickname} ({post.username})</span>
                      <span>
                        {format(new Date(post.createDateTime), 'yyyy-MM-dd HH:mm', { locale: ko })}
                      </span>
                    </div>
                  </div>
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
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {members.map((member) => (
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
                                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                                  주인
                                </span>
                              )}
                              {member.isAdmin && (
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
    </div>
  )
}
