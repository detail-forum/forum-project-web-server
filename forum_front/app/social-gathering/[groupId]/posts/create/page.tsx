'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import { groupApi, imageUploadApi } from '@/services/api'
import Header from '@/components/Header'
import ImageCropModal from '@/components/ImageCropModal'
import LoginModal from '@/components/LoginModal'

export default function CreateGroupPostPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = Number(params.groupId)
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState<string | undefined>(undefined)
  const [showImageCrop, setShowImageCrop] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      setShowLoginModal(true)
    }
  }, [isAuthenticated])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      setShowImageCrop(true)
    }
  }

  const handleImageCrop = async (croppedFile: File) => {
    try {
      const response = await imageUploadApi.uploadImage(croppedFile)
      if (response.success && response.data) {
        setProfileImageUrl(response.data.url)
      }
    } catch (error) {
      console.error('이미지 업로드 실패:', error)
    } finally {
      setShowImageCrop(false)
      setSelectedImage(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isAuthenticated) {
      setShowLoginModal(true)
      return
    }

    if (title.length < 10) {
      alert('제목은 10자 이상이어야 합니다.')
      return
    }

    if (body.length < 10) {
      alert('본문은 10자 이상이어야 합니다.')
      return
    }

    try {
      setLoading(true)
      const response = await groupApi.createGroupPost(groupId, {
        title,
        body,
        profileImageUrl,
      })

      if (response.success && response.data) {
        router.push(`/social-gathering/${groupId}/posts/${response.data}`)
      }
    } catch (error: any) {
      console.error('게시물 작성 실패:', error)
      alert(error.response?.data?.message || '게시물 작성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Header onLoginClick={() => setShowLoginModal(true)} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-4">
          <button
            onClick={() => router.push(`/social-gathering/${groupId}`)}
            className="text-blue-500 hover:text-blue-600"
          >
            ← 모임으로 돌아가기
          </button>
        </div>

        <h1 className="text-2xl font-bold mb-6">모임 활동 글쓰기</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제목 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="제목을 입력하세요 (10자 이상)"
              required
              minLength={10}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              본문 *
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={15}
              placeholder="본문을 입력하세요 (10자 이상). 마크다운 문법을 사용할 수 있습니다."
              required
              minLength={10}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              대표 이미지
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
            />
            {profileImageUrl && (
              <div className="mt-4">
                <img
                  src={profileImageUrl}
                  alt="게시물 이미지"
                  className="w-48 h-48 object-cover rounded"
                />
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded transition disabled:opacity-50"
            >
              {loading ? '작성 중...' : '작성하기'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded transition"
            >
              취소
            </button>
          </div>
        </form>
      </div>

      {showImageCrop && selectedImage && (
        <ImageCropModal
          imageFile={selectedImage}
          onCrop={handleImageCrop}
          onClose={() => {
            setShowImageCrop(false)
            setSelectedImage(null)
          }}
        />
      )}

      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => {
            setShowLoginModal(false)
          }}
        />
      )}
    </div>
  )
}
