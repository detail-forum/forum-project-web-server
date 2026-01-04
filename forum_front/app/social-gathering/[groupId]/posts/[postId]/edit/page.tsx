'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import { groupApi, imageUploadApi } from '@/services/api'
import type { GroupPostDetailDTO } from '@/types/api'
import Header from '@/components/Header'
import ImageCropModal from '@/components/ImageCropModal'
import LoginModal from '@/components/LoginModal'

export default function EditGroupPostPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = Number(params.groupId)
  const postId = Number(params.postId)
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [post, setPost] = useState<GroupPostDetailDTO | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState<string | undefined>(undefined)
  const [isPublic, setIsPublic] = useState<boolean | null>(null)
  const [showImageCrop, setShowImageCrop] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      setShowLoginModal(true)
    } else {
      fetchPost()
    }
  }, [groupId, postId, isAuthenticated])

  const fetchPost = async () => {
    try {
      setLoading(true)
      const response = await groupApi.getGroupPostDetail(groupId, postId)
      if (response.success && response.data) {
        setPost(response.data)
        setTitle(response.data.title)
        setBody(response.data.body)
        setProfileImageUrl(response.data.profileImageUrl)
        
        // isPublic 값을 처리 (boolean, number(0/1), 또는 undefined/null)
        const isPublicValue = response.data.isPublic !== undefined && response.data.isPublic !== null
          ? (typeof response.data.isPublic === 'boolean' 
              ? response.data.isPublic 
              : (typeof response.data.isPublic === 'number' 
                  ? response.data.isPublic !== 0 
                  : Boolean(response.data.isPublic)))
          : true // 기본값
        
        setIsPublic(isPublicValue)
      }
    } catch (error) {
      console.error('게시물 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          setImagePreview(e.target.result as string)
          setShowImageCrop(true)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageCrop = async (croppedBlob: Blob) => {
    try {
      // Blob을 File로 변환
      const croppedFile = new File([croppedBlob], 'cropped-image.jpg', { type: 'image/jpeg' })
      const response = await imageUploadApi.uploadImage(croppedFile)
      if (response.success && response.data) {
        setProfileImageUrl(response.data.url)
      }
    } catch (error) {
      console.error('이미지 업로드 실패:', error)
    } finally {
      setShowImageCrop(false)
      setSelectedImage(null)
      setImagePreview('')
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
      setSaving(true)
      // 태그 문자열을 배열로 변환 (쉼표로 구분, 공백 제거, 빈 값 제거)
      const tags = tagInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
      
      const response = await groupApi.updateGroupPost(groupId, postId, {
        title,
        body,
        profileImageUrl,
        isPublic: isPublic ?? true,
        tags: tags.length > 0 ? tags : undefined,
      })

      if (response.success) {
        router.push(`/social-gathering/${groupId}/posts/${postId}`)
      }
    } catch (error: any) {
      console.error('게시물 수정 실패:', error)
      alert(error.response?.data?.message || '게시물 수정에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Header onLoginClick={() => {}} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          로딩 중...
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div>
        <Header onLoginClick={() => {}} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          게시물을 찾을 수 없습니다.
        </div>
      </div>
    )
  }

  if (!post.canEdit) {
    return (
      <div>
        <Header onLoginClick={() => {}} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          수정 권한이 없습니다.
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header onLoginClick={() => setShowLoginModal(true)} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-4">
          <button
            onClick={() => router.push(`/social-gathering/${groupId}/posts/${postId}`)}
            className="text-blue-500 hover:text-blue-600"
          >
            ← 게시물로 돌아가기
          </button>
        </div>

        <h1 className="text-2xl font-bold mb-6">모임 활동 수정</h1>

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
              태그 (쉼표로 구분)
            </label>
            <input
              type="text"
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="예: redux, react"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              태그를 쉼표로 구분하여 입력하세요. 예: redux, react, javascript
            </p>
            {tagInput && (
              <div className="mt-2 flex flex-wrap gap-2">
                {tagInput
                  .split(',')
                  .map(tag => tag.trim())
                  .filter(tag => tag.length > 0)
                  .map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-500 text-white text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
              </div>
            )}
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

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
              외부 게시물로 공개 (모임 외부에서도 볼 수 있게 함)
              </span>
              <button
              type="button"
              onClick={() => setIsPublic((prev) => prev !== null ? !prev : true)}
              className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none ${
                isPublic === true ? 'bg-blue-500' : 'bg-gray-300'
              }`}
              >
              <span
                className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                isPublic === true ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded transition disabled:opacity-50"
            >
              {saving ? '수정 중...' : '수정하기'}
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

      {showImageCrop && imagePreview && (
        <ImageCropModal
          isOpen={showImageCrop}
          imageSrc={imagePreview}
          onCrop={handleImageCrop}
          onClose={() => {
            setShowImageCrop(false)
            setSelectedImage(null)
            setImagePreview('')
          }}
        />
      )}

      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => {
            setShowLoginModal(false)
            fetchPost()
          }}
        />
      )}
    </div>
  )
}
