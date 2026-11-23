'use client'

import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { DirectChatRoomDTO, GroupChatRoomDTO } from '@/types/api'

export type InboxTab = 'direct' | 'group'

/** 내가 속한 모든 모임의 채팅방 하나 */
export interface InboxGroupRoom extends GroupChatRoomDTO {
  groupId: number
  groupName: string
}

interface Props {
  tab: InboxTab
  onTabChange: (tab: InboxTab) => void
  directRooms: DirectChatRoomDTO[]
  groupRooms: InboxGroupRoom[]
  selectedDirectId: number | null
  selectedGroup: { groupId: number; roomId: number } | null
  onSelectDirect: (roomId: number) => void
  onSelectGroup: (room: InboxGroupRoom) => void
}

const itemClass = (selected: boolean) =>
  `p-3 rounded-lg cursor-pointer transition mb-1 ${selected ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'}`
const tabClass = (active: boolean) =>
  `flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
    active ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`
const time = (value: string) => format(new Date(value), 'MM/dd HH:mm', { locale: ko })

/** /chat 왼쪽: 1대1·그룹 탭과 채팅방 목록 */
export default function InboxRoomList({
  tab,
  onTabChange,
  directRooms,
  groupRooms,
  selectedDirectId,
  selectedGroup,
  onSelectDirect,
  onSelectGroup,
}: Props) {
  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex gap-2">
          <button onClick={() => onTabChange('direct')} className={tabClass(tab === 'direct')}>
            1대1 채팅
          </button>
          <button onClick={() => onTabChange('group')} className={tabClass(tab === 'group')}>
            그룹 채팅
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'direct' ? (
          directRooms.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">1대1 채팅방이 없습니다.</div>
          ) : (
            <div className="p-2">
              {directRooms.map((room) => (
                <div key={room.id} onClick={() => onSelectDirect(room.id)} className={itemClass(selectedDirectId === room.id)}>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {room.otherProfileImageUrl ? (
                        <img src={room.otherProfileImageUrl} alt={room.otherNickname} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-gray-600 font-semibold">{room.otherNickname.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-gray-800 truncate">{room.otherNickname}</h3>
                        {room.unreadCount > 0 && (
                          <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">{room.unreadCount}</span>
                        )}
                      </div>
                      {room.lastMessage && <p className="text-xs text-gray-500 truncate">{room.lastMessage}</p>}
                      {room.lastMessageTime && <p className="text-xs text-gray-400 mt-0.5">{time(room.lastMessageTime)}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : groupRooms.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">그룹 채팅방이 없습니다.</div>
        ) : (
          <div className="p-2">
            {groupRooms.map((room) => (
              <div
                key={`${room.groupId}-${room.id}`}
                onClick={() => onSelectGroup(room)}
                className={itemClass(selectedGroup?.groupId === room.groupId && selectedGroup?.roomId === room.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {room.profileImageUrl ? (
                      <img src={room.profileImageUrl} alt={room.name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">{room.name.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <h3 className="font-medium text-gray-800 truncate">{room.name}</h3>
                        <span className="text-xs text-gray-400 truncate">({room.groupName})</span>
                      </div>
                    </div>
                    {room.createdTime && <p className="text-xs text-gray-400 mt-0.5">{time(room.createdTime)}</p>}
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
