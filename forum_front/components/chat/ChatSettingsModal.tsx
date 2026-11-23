'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { groupApi } from '@/services/api'
import type { GroupChatRoomDTO, GroupMemberDTO } from '@/types/api'

interface Props {
  groupId: number
  room: GroupChatRoomDTO
  rooms: GroupChatRoomDTO[]
  isGroupAdmin: boolean
  /** 내 멤버 정보. 별명 변경에 쓴다 */
  myMember?: GroupMemberDTO
  onClose: () => void
  onRoomsChanged: () => Promise<void> | void
  onMembersChanged: () => void
}

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'
const tabClass = (active: boolean) =>
  `px-4 py-2 text-sm font-medium transition ${active ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`

/** 채팅방 설정: 관리자는 채팅방 이름·설명 수정과 삭제, 모두는 내 별명 변경 */
export default function ChatSettingsModal({ groupId, room, rooms, isGroupAdmin, myMember, onClose, onRoomsChanged, onMembersChanged }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'room' | 'displayName'>(isGroupAdmin ? 'room' : 'displayName')
  const [roomName, setRoomName] = useState(room.name)
  const [roomDescription, setRoomDescription] = useState(room.description || '')
  const [updatingRoom, setUpdatingRoom] = useState(false)
  const [deletingRoom, setDeletingRoom] = useState(false)
  const [displayName, setDisplayName] = useState(myMember?.displayName || '')
  const [updatingDisplayName, setUpdatingDisplayName] = useState(false)

  const saveRoom = async () => {
    if (!roomName.trim() || roomName.length < 2) {
      alert('채팅방 이름은 2자 이상이어야 합니다.')
      return
    }
    try {
      setUpdatingRoom(true)
      await groupApi.updateChatRoom(groupId, room.id, { name: roomName, description: roomDescription || undefined })
      await onRoomsChanged()
      alert('채팅방 정보가 수정되었습니다.')
      onClose()
    } catch (error: any) {
      alert(error.response?.data?.message || '채팅방 수정에 실패했습니다.')
    } finally {
      setUpdatingRoom(false)
    }
  }

  const deleteRoom = async () => {
    if (!confirm(`정말로 "${room.name}" 채팅방을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return
    try {
      setDeletingRoom(true)
      await groupApi.deleteChatRoom(groupId, room.id)
      await onRoomsChanged()
      // 남은 첫 채팅방으로, 없으면 모임 화면으로
      const remaining = rooms.filter((r) => r.id !== room.id)
      router.push(remaining.length > 0 ? `/social-gathering/${groupId}/chat/${remaining[0].id}` : `/social-gathering/${groupId}`)
      alert('채팅방이 삭제되었습니다.')
    } catch (error: any) {
      console.error('채팅방 삭제 실패:', error)
      alert(error.response?.data?.message || '채팅방 삭제에 실패했습니다.')
    } finally {
      setDeletingRoom(false)
    }
  }

  const saveDisplayName = async () => {
    try {
      setUpdatingDisplayName(true)
      if (!myMember) {
        alert('멤버 정보를 찾을 수 없습니다.')
        return
      }
      const response = await groupApi.updateMemberDisplayName(groupId, myMember.userId, displayName.trim() || undefined)
      if (response.success) {
        alert('별명이 변경되었습니다.')
        onMembersChanged()
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '별명 변경에 실패했습니다.')
    } finally {
      setUpdatingDisplayName(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">채팅방 설정</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isGroupAdmin && (
          <div className="flex gap-2 mb-4 border-b border-gray-200">
            <button onClick={() => setTab('room')} className={tabClass(tab === 'room')}>
              서버 관리
            </button>
            <button onClick={() => setTab('displayName')} className={tabClass(tab === 'displayName')}>
              별명 설정
            </button>
          </div>
        )}

        {tab === 'room' && isGroupAdmin && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">채팅방 이름</label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="채팅방 이름"
                className={inputClass}
                disabled={updatingRoom || deletingRoom}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">채팅방 설명 (선택사항)</label>
              <textarea
                value={roomDescription}
                onChange={(e) => setRoomDescription(e.target.value)}
                placeholder="채팅방 설명"
                rows={3}
                className={inputClass}
                disabled={updatingRoom || deletingRoom}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveRoom}
                disabled={updatingRoom || deletingRoom || !roomName.trim() || roomName.length < 2}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatingRoom ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={deleteRoom}
                disabled={updatingRoom || deletingRoom}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingRoom ? '삭제 중...' : '채팅방 삭제'}
              </button>
            </div>
          </div>
        )}

        {tab === 'displayName' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">내 별명 (이 채팅방에서만 표시)</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="별명을 입력하세요 (선택사항)"
                maxLength={30}
                className={inputClass}
                disabled={updatingDisplayName}
              />
              <p className="mt-1 text-xs text-gray-500">{displayName.length}/30 (비워두면 기본 닉네임이 표시됩니다)</p>
            </div>
            <button
              onClick={saveDisplayName}
              disabled={updatingDisplayName}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition disabled:opacity-50"
            >
              {updatingDisplayName ? '저장 중...' : '저장'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
