'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import { postApi, imageUploadApi } from '@/services/api'
import Header from '@/components/Header'
import ImageInsertButton from '@/components/ImageInsertButton'
import ImageCropModal from '@/components/ImageCropModal'
import LoginModal from '@/components/LoginModal'
import Image from 'next/image'

export default function CreatePostPage() {
  const router = useRouter()
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [formData, setFormData] = useState({ title: '', body: '', profileImageUrl: '' })
  const [profileImagePreview, setProfileImagePreview] = useState<string>('')
  const [uploadingProfile, setUploadingProfile] = useState(false)
  const [showCropModal, setShowCropModal] = useState(false)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const profileImageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setShowLoginModal(true)
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white">
        <Header onLoginClick={() => setShowLoginModal(true)} />
        {showLoginModal && (
          <LoginModal
            isOpen={showLoginModal}
            onClose={() => {
              setShowLoginModal(false)
              router.push('/')
            }}
          />
        )}
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 프로필 이미지 URL이 있는지 확인
      console.log('제출할 데이터:', formData)
      const response = await postApi.createPost(formData)
      if (response.success) {
        router.push('/')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '게시글 작성에 실패했습니다.')
      console.error('게시글 작성 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleImageInserted = (markdown: string) => {
    // 이미지 마크다운을 본문에 추가
    setFormData({
      ...formData,
      body: formData.body + '\n' + markdown + '\n',
    })
  }

  const handleProfileImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.')
      return
    }

    // 파일 크기 검증 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하여야 합니다.')
      return
    }

    // 파일을 선택하고 크롭 모달 열기
    setSelectedImageFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        setProfileImagePreview(e.target.result as string)
        setShowCropModal(true)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      setUploadingProfile(true)
      
      // Blob을 File로 변환
      const croppedFile = new File([croppedBlob], 'cropped-image.jpg', { type: 'image/jpeg' })
      
      // 크롭된 이미지 업로드
      const response = await imageUploadApi.uploadImage(croppedFile)
      
      if (response.success && response.data) {
        const imageUrl = response.data.url
        setFormData({
          ...formData,
          profileImageUrl: imageUrl,
        })
        
        // 미리보기 URL 생성
        const baseUrl = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL || ''
        const previewUrl = imageUrl.startsWith('http') 
          ? imageUrl 
          : `${baseUrl}${imageUrl}`
        setProfileImagePreview(previewUrl)
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '프로필 이미지 업로드에 실패했습니다.')
      console.error('프로필 이미지 업로드 실패:', error)
    } finally {
      setUploadingProfile(false)
      if (profileImageInputRef.current) {
        profileImageInputRef.current.value = ''
      }
    }
  }

  const handleRemoveProfileImage = () => {
    setFormData({
      ...formData,
      profileImageUrl: '',
    })
    setProfileImagePreview('')
  }

  return (
    <div className="min-h-screen bg-white">
      <Header onLoginClick={() => setShowLoginModal(true)} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">게시글 작성</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 프로필 이미지 업로드 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              게시물 프로필 이미지 (선택)
            </label>
            <div className="flex items-start space-x-4">
              {profileImagePreview ? (
                <div className="relative w-48 h-32 border border-gray-300 rounded-lg overflow-hidden bg-gray-100">
                  <Image
                    src={profileImagePreview}
                    alt="프로필 이미지 미리보기"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={handleRemoveProfileImage}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    title="이미지 제거"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="w-48 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs text-gray-500">이미지 없음</p>
                  </div>
                </div>
              )}
              <div className="flex-1">
                <input
                  ref={profileImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => profileImageInputRef.current?.click()}
                  disabled={uploadingProfile}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingProfile ? '업로드 중...' : profileImagePreview ? '이미지 변경' : '이미지 선택'}
                </button>
                <p className="mt-1 text-xs text-gray-500">
                  카드에 표시될 대표 이미지를 선택하세요. (최대 10MB)
                </p>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              제목 (10자 이상)
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              minLength={10}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="body" className="block text-sm font-medium text-gray-700">
                본문 (10자 이상)
              </label>
              <ImageInsertButton
                onImageInserted={handleImageInserted}
                textareaRef={textareaRef}
              />
            </div>
            <textarea
              ref={textareaRef}
              id="body"
              name="body"
              value={formData.body}
              onChange={handleChange}
              required
              minLength={10}
              rows={15}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              이미지 버튼을 클릭하여 이미지를 업로드하고 삽입할 수 있습니다.
            </p>
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || formData.title.length < 10 || formData.body.length < 10}
              className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '작성 중...' : '작성하기'}
            </button>
          </div>
        </form>

        {/* 이미지 크롭 모달 */}
        {showCropModal && profileImagePreview && (
          <ImageCropModal
            isOpen={showCropModal}
            imageSrc={profileImagePreview}
            onClose={() => {
              setShowCropModal(false)
              setProfileImagePreview('')
              setSelectedImageFile(null)
            }}
            onCrop={handleCropComplete}
            aspectRatio={1}
          />
        )}
      </div>
    </div>
  )
}

