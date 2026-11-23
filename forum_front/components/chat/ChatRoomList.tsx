'use client'

import type { GroupChatRoomDTO } from '@/types/api'

interface Props {
  groupName?: string
  rooms: GroupChatRoomDTO[]
  currentRoomId: number
  canCreate: boolean
  onBack: () => void
  onSelect: (roomId: number) => void
  onCreate: () => void
}

/** 모임 채팅 왼쪽: 모임 이름과 채팅방 목록 */
export default function ChatRoomList({ groupName, rooms, currentRoomId, canCreate, onBack, onSelect, onCreate }: Props) {
  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-800">{groupName || '모임'}</h2>
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700 text-sm">
            ← 모임
          </button>
        </div>
        {canCreate && (
          <button
            onClick={onCreate}
            className="w-full mt-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm transition"
          >
            + 채팅방 추가
          </button>
        )}
      </div>

      {/* 채팅방 목록 */}
      <div className="flex-1 overflow-y-auto">
        {rooms.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">채팅방이 없습니다.</div>
        ) : (
          <div className="p-2">
            {rooms.map((room) => (
              <div
                key={room.id}
                onClick={() => onSelect(room.id)}
                className={`p-3 rounded-lg cursor-pointer transition mb-1 ${
                  room.id === currentRoomId ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {room.profileImageUrl ? (
                      <img src={room.profileImageUrl} alt={room.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">{room.name.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-800 truncate">{room.name}</h3>
                      {room.isAdminRoom && (
                        <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">관리자</span>
                      )}
                    </div>
                    {room.description && <p className="text-xs text-gray-500 truncate mt-0.5">{room.description}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
