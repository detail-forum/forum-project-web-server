'use client'

import { useRef, useState } from 'react'
import { groupApi, imageUploadApi } from '@/services/api'
import type { GroupChatRoomDTO } from '@/types/api'
import ImageCropModal from '@/components/ImageCropModal'

interface Props {
  groupId: number
  room: GroupChatRoomDTO
  isGroupAdmin: boolean
  canOpenSettings: boolean
  memberCount: number
  onOpenSettings: () => void
  onOpenSearch: () => void
  onToggleMembers: () => void
  /** 채팅방 정보(프로필 이미지)가 바뀌었을 때 */
  onRoomUpdated: () => Promise<void> | void
}

/** 채팅방 이름·설명과 설정, 검색, 멤버 버튼. 관리자는 채팅방 프로필 이미지를 바꿀 수 있다. */
export default function ChatRoomHeader({
  groupId,
  room,
  isGroupAdmin,
  canOpenSettings,
  memberCount,
  onOpenSettings,
  onOpenSearch,
  onToggleMembers,
  onRoomUpdated,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedImage, setSelectedImage] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => setSelectedImage(event.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleCrop = async (croppedImageBlob: Blob) => {
    try {
      const file = new File([croppedImageBlob], 'profile.jpg', { type: 'image/jpeg' })
      const upload = await imageUploadApi.uploadImage(file)
      if (upload.success && upload.data) {
        await groupApi.updateChatRoom(groupId, room.id, { profileImageUrl: upload.data.url })
        await onRoomUpdated()
        setSelectedImage('')
        alert('채팅방 프로필 이미지가 업데이트되었습니다.')
      }
    } catch (error) {
      console.error('프로필 이미지 업로드 실패:', error)
      alert('프로필 이미지 업로드에 실패했습니다.')
    }
  }

  return (
    <div className="p-4 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          {room.profileImageUrl ? (
            <img
              src={room.profileImageUrl}
              alt={room.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center border-2 border-gray-200">
              <span className="text-blue-600 font-semibold text-2xl">{room.name.charAt(0)}</span>
            </div>
          )}
          {isGroupAdmin && (
            <button
              onClick={() => inputRef.current?.click()}
              className="absolute bottom-0 right-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-blue-600 transition"
              title="프로필 이미지 변경"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-800">{room.name}</h3>
              {room.isAdminRoom && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">관리자 전용</span>}
              {canOpenSettings && (
                <button onClick={onOpenSettings} className="text-gray-400 hover:text-gray-600 transition" title="설정">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          {room.description && <p className="text-sm text-gray-500 mt-0.5">{room.description}</p>}
        </div>
        {/* 검색 버튼 및 멤버 수 표시 */}
        <div className="flex items-center gap-2">
          <button onClick={onOpenSearch} className="p-2 text-gray-400 hover:text-gray-600 transition" title="채팅 검색">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button
            onClick={onToggleMembers}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition flex items-center gap-1"
            title="멤버 목록"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>{memberCount}</span>
          </button>
        </div>
      </div>

      {selectedImage && (
        <ImageCropModal
          isOpen
          imageSrc={selectedImage}
          onClose={() => setSelectedImage('')}
          onCrop={handleCrop}
          aspectRatio={1}
        />
      )}
    </div>
  )
}
