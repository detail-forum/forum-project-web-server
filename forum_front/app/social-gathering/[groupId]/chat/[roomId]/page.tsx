'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import { groupApi } from '@/services/api'
import type { GroupChatMessageDTO, GroupChatRoomDTO, GroupDetailDTO, GroupMemberDTO } from '@/types/api'
import Header from '@/components/Header'
import LoginModal from '@/components/LoginModal'
import GifPicker from '@/components/GifPicker'
import { getUsernameFromToken } from '@/utils/jwt'
import { useGroupChatMessages } from '@/hooks/useGroupChatMessages'
import { useChatScroll } from '@/hooks/useChatScroll'
import ChatRoomList from '@/components/chat/ChatRoomList'
import ChatRoomHeader from '@/components/chat/ChatRoomHeader'
import MessageList from '@/components/chat/MessageList'
import MessageComposer from '@/components/chat/MessageComposer'
import { MessageContextMenu, ReactionPicker, type ContextMenuState } from '@/components/chat/MessageMenus'
import ChatSearchSidebar from '@/components/chat/ChatSearchSidebar'
import MembersSidebar from '@/components/chat/MembersSidebar'
import ChatSettingsModal from '@/components/chat/ChatSettingsModal'
import CreateChatRoomModal from '@/components/chat/CreateChatRoomModal'

type Sidebar = 'none' | 'search' | 'members'

export default function ChatRoomPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = Number(params.groupId)
  const roomId = Number(params.roomId)
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const currentUsername = useMemo(() => (isAuthenticated ? getUsernameFromToken() : null), [isAuthenticated])

  const [group, setGroup] = useState<GroupDetailDTO | null>(null)
  const [chatRooms, setChatRooms] = useState<GroupChatRoomDTO[]>([])
  const [members, setMembers] = useState<GroupMemberDTO[]>([])
  const [sidebar, setSidebar] = useState<Sidebar>('none')
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [reactingMessageId, setReactingMessageId] = useState<number | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null)
  const [editMessageText, setEditMessageText] = useState('')
  const [replyingTo, setReplyingTo] = useState<GroupChatMessageDTO | null>(null)

  const fetchGroupDetail = useCallback(async () => {
    try {
      const response = await groupApi.getGroupDetail(groupId)
      if (response.success && response.data) setGroup(response.data)
    } catch (error) {
      console.error('모임 상세 조회 실패:', error)
    }
  }, [groupId])

  const fetchChatRooms = useCallback(async () => {
    try {
      const response = await groupApi.getChatRooms(groupId)
      if (response.success && response.data) setChatRooms(response.data)
    } catch (error) {
      console.error('채팅방 목록 조회 실패:', error)
    }
  }, [groupId])

  const fetchMembers = useCallback(async () => {
    try {
      const response = await groupApi.getGroupMembers(groupId)
      if (response.success && response.data) setMembers(response.data)
    } catch (error) {
      console.error('멤버 목록 조회 실패:', error)
    }
  }, [groupId])

  useEffect(() => {
    if (groupId) {
      fetchGroupDetail()
      fetchChatRooms()
    }
  }, [groupId, fetchGroupDetail, fetchChatRooms])

  // 내 별명을 알기 위해 들어올 때, 멤버 목록을 열 때 다시 받는다
  useEffect(() => {
    if (groupId && isAuthenticated) fetchMembers()
  }, [groupId, roomId, isAuthenticated, fetchMembers])
  useEffect(() => {
    if (groupId && sidebar === 'members') fetchMembers()
  }, [groupId, sidebar, fetchMembers])

  // 스크롤 훅은 messages가 필요하고 메시지 훅은 스크롤 콜백이 필요해서, 콜백은 ref로 이어 준다
  const scrollRef = useRef<ReturnType<typeof useChatScroll> | null>(null)
  const chat = useGroupChatMessages({
    groupId,
    roomId,
    enabled: isAuthenticated && !!groupId && !!roomId,
    currentUsername,
    onReplaced: () => scrollRef.current?.markReplaced(),
    onAppended: () => scrollRef.current?.followIfNearBottom(),
  })
  const scroll = useChatScroll(chat.messages, !chat.loading)
  scrollRef.current = scroll

  // 우클릭 메뉴는 바깥 아무 곳이나 누르면 닫는다
  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [contextMenu])

  const findMessage = (id: number) => chat.messages.find((m) => m.id === id)

  const handleContextMenu = (e: React.MouseEvent, messageId: number) => {
    e.preventDefault()
    const message = findMessage(messageId)
    if (!message) return
    setContextMenu({ x: e.clientX, y: e.clientY, messageId, isMyMessage: message.username === currentUsername })
  }

  const handleSend = async (text: string) => {
    const sent = await chat.send(text, replyingTo)
    if (sent) setReplyingTo(null)
    return sent
  }

  const handleSaveEdit = (messageId: number) => {
    if (!editMessageText.trim()) return
    chat.editMessageLocally(messageId, editMessageText)
    setEditingMessageId(null)
    setEditMessageText('')
  }

  const handleToggleReaction = async (messageId: number, emoji: string) => {
    if (await chat.toggleReaction(messageId, emoji)) {
      setReactingMessageId(null)
      setContextMenu(null)
    }
  }

  const handleGifSelect = (gifUrl: string) => {
    if (!isAuthenticated) {
      setShowLoginModal(true)
      return
    }
    chat.sendGif(gifUrl)
  }

  const currentRoom = chatRooms.find((room) => room.id === roomId)
  const myMember = members.find((m) => m.username === currentUsername)

  if (chat.loading) {
    return (
      <div className="flex flex-col h-screen">
        <Header onLoginClick={() => {}} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header onLoginClick={() => setShowLoginModal(true)} />
      <div className="flex-1 flex overflow-hidden">
        <ChatRoomList
          groupName={group?.name}
          rooms={chatRooms}
          currentRoomId={roomId}
          canCreate={!!group?.isAdmin}
          onBack={() => router.push(`/social-gathering/${groupId}`)}
          onSelect={(id) => router.push(`/social-gathering/${groupId}/chat/${id}`)}
          onCreate={() => setShowCreateRoomModal(true)}
        />

        <div className="flex-1 flex flex-col bg-white">
          {currentRoom ? (
            <>
              <ChatRoomHeader
                groupId={groupId}
                room={currentRoom}
                isGroupAdmin={!!group?.isAdmin}
                canOpenSettings={isAuthenticated}
                memberCount={group?.memberCount || 0}
                onOpenSettings={() => setShowSettingsModal(true)}
                onOpenSearch={() => setSidebar('search')}
                onToggleMembers={() => setSidebar(sidebar === 'members' ? 'none' : 'members')}
                onRoomUpdated={fetchChatRooms}
              />

              <MessageList
                containerRef={scroll.containerRef}
                endRef={scroll.endRef}
                messages={chat.messages}
                currentUsername={currentUsername}
                memberCount={group?.memberCount}
                typingUsers={chat.typingUsers}
                isConnected={chat.isConnected}
                editing={{
                  messageId: editingMessageId,
                  text: editMessageText,
                  setText: setEditMessageText,
                  onSave: handleSaveEdit,
                  onCancel: () => {
                    setEditingMessageId(null)
                    setEditMessageText('')
                  },
                }}
                onContextMenu={handleContextMenu}
                onToggleReaction={handleToggleReaction}
              />

              {contextMenu && (
                <MessageContextMenu
                  menu={contextMenu}
                  onReact={(id) => {
                    setReactingMessageId(id)
                    setContextMenu(null)
                  }}
                  onEdit={(id) => {
                    const message = findMessage(id)
                    if (!message) return
                    setEditingMessageId(id)
                    setEditMessageText(message.message)
                    setContextMenu(null)
                  }}
                  onReply={(id) => {
                    const message = findMessage(id)
                    if (!message) return
                    setReplyingTo(message)
                    setContextMenu(null)
                  }}
                  onDelete={async (id) => {
                    if (await chat.deleteMessage(id)) setContextMenu(null)
                  }}
                />
              )}

              {reactingMessageId && (
                <ReactionPicker
                  onPick={(emoji) => handleToggleReaction(reactingMessageId, emoji)}
                  onClose={() => setReactingMessageId(null)}
                />
              )}

              <MessageComposer
                isAuthenticated={isAuthenticated}
                isConnected={chat.isConnected}
                sending={chat.sending}
                uploadingImage={chat.uploadingImage}
                uploadingFile={chat.uploadingFile}
                replyingTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
                onSend={handleSend}
                onRequireLogin={() => setShowLoginModal(true)}
                onStartTyping={chat.startTyping}
                onStopTyping={chat.stopTyping}
                onPickImage={chat.sendImage}
                onPickFile={chat.sendFile}
                onOpenGif={() => setShowGifPicker(true)}
              />
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

        {sidebar === 'search' && (
          <ChatSearchSidebar
            groupId={groupId}
            roomId={roomId}
            loadedMessages={chat.messages}
            onClose={() => setSidebar('none')}
          />
        )}
        {sidebar === 'members' && <MembersSidebar members={members} onClose={() => setSidebar('none')} />}
      </div>

      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => setShowLoginModal(false)}
        />
      )}

      {showSettingsModal && currentRoom && (
        <ChatSettingsModal
          groupId={groupId}
          room={currentRoom}
          rooms={chatRooms}
          isGroupAdmin={!!group?.isAdmin}
          myMember={myMember}
          onClose={() => setShowSettingsModal(false)}
          onRoomsChanged={fetchChatRooms}
          onMembersChanged={fetchMembers}
        />
      )}

      {showCreateRoomModal && (
        <CreateChatRoomModal
          groupId={groupId}
          onClose={() => setShowCreateRoomModal(false)}
          onCreated={fetchChatRooms}
        />
      )}

      <GifPicker isOpen={showGifPicker} onClose={() => setShowGifPicker(false)} onSelect={handleGifSelect} />
    </div>
  )
}
