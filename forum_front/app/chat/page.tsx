'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import Header from '@/components/Header'
import LoginModal from '@/components/LoginModal'
import GifPicker from '@/components/GifPicker'
import { getUsernameFromToken } from '@/utils/jwt'
import { directChatApi, followApi, groupApi } from '@/services/api'
import type { DirectChatRoomDTO, GroupDetailDTO, GroupMemberDTO } from '@/types/api'
import { useDirectChatMessages } from '@/hooks/useDirectChatMessages'
import { useGroupChatMessages } from '@/hooks/useGroupChatMessages'
import { useMessageActions } from '@/hooks/useMessageActions'
import InboxRoomList, { type InboxGroupRoom, type InboxTab } from '@/components/chat/InboxRoomList'
import InboxChatHeader from '@/components/chat/InboxChatHeader'
import MessageList from '@/components/chat/MessageList'
import { groupReadLabel } from '@/components/chat/MessageItem'
import MessageComposer from '@/components/chat/MessageComposer'
import { MessageOverlays } from '@/components/chat/MessageMenus'
import ChatSearchSidebar from '@/components/chat/ChatSearchSidebar'
import MembersSidebar from '@/components/chat/MembersSidebar'

type Sidebar = 'none' | 'search' | 'members'

/** 내 1대1 채팅과 내가 속한 모든 모임의 채팅을 한 화면에서 본다. ?user=아이디 로 1대1을 바로 연다. */
export default function ChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const currentUsername = useMemo(() => (isAuthenticated ? getUsernameFromToken() : null), [isAuthenticated])

  const [tab, setTab] = useState<InboxTab>('direct')
  const [directRooms, setDirectRooms] = useState<DirectChatRoomDTO[]>([])
  const [groupRooms, setGroupRooms] = useState<InboxGroupRoom[]>([])
  const [selectedDirectId, setSelectedDirectId] = useState<number | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<{ groupId: number; roomId: number } | null>(null)
  const [groupDetail, setGroupDetail] = useState<GroupDetailDTO | null>(null)
  const [members, setMembers] = useState<GroupMemberDTO[]>([])
  const [sidebar, setSidebar] = useState<Sidebar>('none')
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const direct = useDirectChatMessages({
    roomId: selectedDirectId,
    enabled: isAuthenticated && tab === 'direct' && !!selectedDirectId,
    currentUsername,
  })
  const group = useGroupChatMessages({
    groupId: selectedGroup?.groupId || 0,
    roomId: selectedGroup?.roomId || 0,
    enabled: isAuthenticated && tab === 'group' && !!selectedGroup,
    currentUsername,
  })
  const actions = useMessageActions(group, currentUsername)

  const fetchDirectRooms = useCallback(async () => {
    try {
      const response = await directChatApi.getMyRooms()
      if (response.success && response.data) setDirectRooms(response.data)
    } catch (error) {
      console.error('1대1 채팅방 목록 조회 실패:', error)
    }
  }, [])

  // 내가 속한 모임마다 채팅방을 받아 한 목록으로 합친다
  const fetchGroupRooms = useCallback(async () => {
    try {
      const groups = await groupApi.getGroupList(0, 100, true)
      const list: { id: number; name: string }[] = groups.success ? groups.data?.content ?? [] : []
      const perGroup = await Promise.all(
        list.map(async (g) => {
          try {
            const response = await groupApi.getChatRooms(g.id)
            return (response.success ? response.data ?? [] : []).map((room) => ({ ...room, groupId: g.id, groupName: g.name }))
          } catch (error) {
            console.error(`그룹 ${g.id}의 채팅방 조회 실패:`, error)
            return []
          }
        }),
      )
      setGroupRooms(perGroup.flat())
    } catch (error) {
      console.error('그룹 채팅방 목록 조회 실패:', error)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !currentUsername) return
    if (tab === 'direct') fetchDirectRooms()
    else fetchGroupRooms()
  }, [isAuthenticated, currentUsername, tab, fetchDirectRooms, fetchGroupRooms])

  // ?user=아이디: 그 사람과의 1대1 방을 만들거나 찾아서 연다
  useEffect(() => {
    const targetUsername = searchParams.get('user')
    if (!targetUsername || !isAuthenticated || !currentUsername || tab !== 'direct') return
    if (targetUsername === currentUsername) return
    ;(async () => {
      try {
        const userInfo = await followApi.getUserInfo(targetUsername)
        if (!userInfo.success || !userInfo.data?.id) {
          alert('사용자를 찾을 수 없습니다.')
          router.replace('/chat')
          return
        }
        const room = await directChatApi.getOrCreateRoom(userInfo.data.id)
        if (room.success && room.data) {
          await fetchDirectRooms()
          setSelectedDirectId(room.data.id)
          router.replace('/chat')
        } else {
          alert(room.message || '채팅방을 생성할 수 없습니다.')
        }
      } catch (error: any) {
        alert(error.response?.data?.message || error.message || '채팅을 시작할 수 없습니다.')
        router.replace('/chat')
      }
    })()
  }, [searchParams, isAuthenticated, currentUsername, tab, router, fetchDirectRooms])

  useEffect(() => {
    if (tab !== 'group' || !selectedGroup) return
    groupApi
      .getGroupDetail(selectedGroup.groupId)
      .then((response) => response.success && response.data && setGroupDetail(response.data))
      .catch((error) => console.error('그룹 상세 조회 실패:', error))
  }, [tab, selectedGroup])

  useEffect(() => {
    if (sidebar !== 'members' || !selectedGroup) return
    groupApi
      .getGroupMembers(selectedGroup.groupId)
      .then((response) => response.success && response.data && setMembers(response.data))
      .catch((error) => console.error('멤버 목록 조회 실패:', error))
  }, [sidebar, selectedGroup])

  const messages = tab === 'direct' ? direct.messages : group.messages
  // 메시지가 바뀌면 맨 아래로
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const changeTab = (next: InboxTab) => {
    setTab(next)
    setSelectedDirectId(null)
    setSelectedGroup(null)
    setSidebar('none')
  }

  const currentDirect = tab === 'direct' ? directRooms.find((r) => r.id === selectedDirectId) : undefined
  const currentGroup =
    tab === 'group' ? groupRooms.find((r) => r.groupId === selectedGroup?.groupId && r.id === selectedGroup?.roomId) : undefined

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white">
        <Header onLoginClick={() => setShowLoginModal(true)} />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-lg text-gray-600 mb-4">로그인이 필요합니다.</p>
            <button onClick={() => setShowLoginModal(true)} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              로그인
            </button>
          </div>
        </div>
        {showLoginModal && <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header onLoginClick={() => setShowLoginModal(true)} />

      <div className="flex-1 flex overflow-hidden">
        <InboxRoomList
          tab={tab}
          onTabChange={changeTab}
          directRooms={directRooms}
          groupRooms={groupRooms}
          selectedDirectId={selectedDirectId}
          selectedGroup={selectedGroup}
          onSelectDirect={setSelectedDirectId}
          onSelectGroup={(room) => setSelectedGroup({ groupId: room.groupId, roomId: room.id })}
        />

        <div className="flex-1 flex flex-col bg-white">
          {currentDirect ? (
            <>
              <InboxChatHeader variant="direct" title={currentDirect.otherNickname} imageUrl={currentDirect.otherProfileImageUrl} />
              <MessageList
                containerRef={containerRef}
                endRef={endRef}
                messages={direct.messages}
                currentUsername={currentUsername}
                readLabelOf={(m, isMine) => (isMine && m.isRead ? '✓' : undefined)}
                typingUsers={direct.typingUsers}
                showConnectionWarning={false}
              />
              <MessageComposer
                isAuthenticated={isAuthenticated}
                onRequireLogin={() => setShowLoginModal(true)}
                isConnected={direct.isConnected}
                requireConnection={false}
                sending={direct.sending}
                uploadingImage={direct.uploadingImage}
                uploadingFile={direct.uploadingFile}
                replyingTo={null}
                onCancelReply={() => {}}
                onSend={direct.send}
                onStartTyping={direct.startTyping}
                onStopTyping={direct.stopTyping}
                onPickImage={direct.sendImage}
                onPickFile={direct.sendFile}
                focusKey={currentDirect.id}
              />
            </>
          ) : currentGroup && selectedGroup ? (
            <>
              <InboxChatHeader
                variant="group"
                title={currentGroup.name}
                subtitle={currentGroup.groupName}
                imageUrl={currentGroup.profileImageUrl}
                memberCount={groupDetail?.memberCount}
                onOpenSearch={() => setSidebar('search')}
                onToggleMembers={groupDetail ? () => setSidebar(sidebar === 'members' ? 'none' : 'members') : undefined}
              />
              <MessageList
                containerRef={containerRef}
                endRef={endRef}
                messages={group.messages}
                currentUsername={currentUsername}
                readLabelOf={(m, isMine) =>
                  isMine && groupDetail?.memberCount ? groupReadLabel(groupDetail.memberCount, m.readCount) : undefined
                }
                typingUsers={group.typingUsers}
                showConnectionWarning={!group.isConnected}
                editing={actions.editing}
                onContextMenu={actions.onContextMenu}
                onToggleReaction={actions.toggleReaction}
              />
              <MessageComposer
                isAuthenticated={isAuthenticated}
                onRequireLogin={() => setShowLoginModal(true)}
                isConnected={group.isConnected}
                sending={group.sending}
                uploadingImage={group.uploadingImage}
                uploadingFile={group.uploadingFile}
                replyingTo={actions.replyingTo}
                onCancelReply={() => actions.setReplyingTo(null)}
                onSend={async (text) => {
                  const sent = await group.send(text, actions.replyingTo)
                  if (sent) actions.setReplyingTo(null)
                  return sent
                }}
                onStartTyping={group.startTyping}
                onStopTyping={group.stopTyping}
                onPickImage={group.sendImage}
                onPickFile={group.sendFile}
                onOpenGif={() => setShowGifPicker(true)}
                focusKey={`${selectedGroup.groupId}-${selectedGroup.roomId}`}
              />
              <MessageOverlays actions={actions} />
              <GifPicker isOpen={showGifPicker} onClose={() => setShowGifPicker(false)} onSelect={group.sendGif} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <p className="text-lg mb-2">채팅방을 선택해주세요</p>
                <p className="text-sm">왼쪽에서 채팅방을 선택하면 대화를 시작할 수 있습니다.</p>
              </div>
            </div>
          )}
        </div>

        {currentGroup && selectedGroup && sidebar === 'search' && (
          <ChatSearchSidebar
            groupId={selectedGroup.groupId}
            roomId={selectedGroup.roomId}
            loadedMessages={group.messages}
            onClose={() => setSidebar('none')}
          />
        )}
        {currentGroup && sidebar === 'members' && <MembersSidebar members={members} onClose={() => setSidebar('none')} />}
      </div>

      {showLoginModal && <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />}
    </div>
  )
}
