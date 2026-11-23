'use client'

import { useRef, useState } from 'react'
import { groupApi, imageUploadApi } from '@/services/api'
import ImageCropModal from '@/components/ImageCropModal'

interface Props {
  groupId: number
  onClose: () => void
  onCreated: () => Promise<void> | void
}

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'

/** 새 채팅방 만들기: 이름, 설명, 프로필 이미지(선택) */
export default function CreateChatRoomModal({ groupId, onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  // 고른 직후에는 data URL(자르기 전), 자른 뒤에는 업로드된 URL
  const [image, setImage] = useState('')
  const [cropping, setCropping] = useState(false)
  const [creating, setCreating] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const clearImage = () => {
    setImage('')
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setImage(event.target?.result as string)
      setCropping(true)
    }
    reader.readAsDataURL(file)
  }

  const handleCrop = async (croppedImageBlob: Blob) => {
    try {
      const file = new File([croppedImageBlob], 'profile.jpg', { type: 'image/jpeg' })
      const upload = await imageUploadApi.uploadImage(file)
      if (upload.success && upload.data) {
        setImage(upload.data.url)
        setCropping(false)
      }
    } catch (error) {
      console.error('이미지 업로드 실패:', error)
      alert('이미지 업로드에 실패했습니다.')
    }
  }

  const create = async () => {
    if (!name.trim() || name.length < 2) {
      alert('채팅방 이름은 2자 이상이어야 합니다.')
      return
    }
    try {
      setCreating(true)
      const response = await groupApi.createChatRoom(groupId, { name, description: description || undefined })
      if (response.success && response.data) {
        if (image) await groupApi.updateChatRoom(groupId, response.data, { profileImageUrl: image })
        await onCreated()
        onClose()
        alert('채팅방이 생성되었습니다.')
      }
    } catch (error: any) {
      console.error('채팅방 생성 실패:', error)
      alert(error.response?.data?.message || '채팅방 생성에 실패했습니다.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">새 채팅방 만들기</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                채팅방 이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="채팅방 이름을 입력하세요 (2자 이상)"
                className={inputClass}
                disabled={creating}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">채팅방 설명 (선택사항)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="채팅방 설명을 입력하세요"
                rows={3}
                className={inputClass}
                disabled={creating}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">채팅방 프로필 이미지 (선택사항)</label>
              <div className="flex items-center gap-4">
                {image ? (
                  <div className="relative">
                    <img src={image} alt="프로필 미리보기" className="w-20 h-20 rounded-full object-cover border-2 border-gray-200" />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition"
                      title="이미지 제거"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                    <span className="text-gray-400 text-xs">이미지 없음</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={creating}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-sm transition disabled:opacity-50"
                >
                  {image ? '이미지 변경' : '이미지 선택'}
                </button>
                <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button
              onClick={create}
              disabled={creating || !name.trim() || name.length < 2}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? '생성 중...' : '생성'}
            </button>
            <button
              onClick={onClose}
              disabled={creating}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded transition disabled:opacity-50"
            >
              취소
            </button>
          </div>
        </div>
      </div>

      {cropping && image && (
        <ImageCropModal
          isOpen
          imageSrc={image}
          onClose={() => {
            setCropping(false)
            clearImage()
          }}
          onCrop={handleCrop}
          aspectRatio={1}
        />
      )}
    </>
  )
}
