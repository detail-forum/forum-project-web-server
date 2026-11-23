import { fileUploadApi, imageUploadApi } from '@/services/api'

/**
 * 채팅 첨부 파일을 올리고 메시지에 넣을 정보를 돌려준다.
 * 파일 업로드 API가 실패하면 이미지 업로드 API로 한 번 더 올린다.
 */
export async function uploadChatFile(file: File): Promise<{ fileUrl: string; fileName: string; fileSize: number }> {
  try {
    const upload = await fileUploadApi.uploadFile(file)
    if (!upload.success || !upload.data) throw new Error('파일 업로드 실패')
    return {
      fileUrl: upload.data.url,
      fileName: upload.data.originalFilename || file.name,
      fileSize: upload.data.fileSize || file.size,
    }
  } catch {
    const upload = await imageUploadApi.uploadImage(file)
    if (!upload.success || !upload.data) throw new Error('파일 업로드 실패')
    return { fileUrl: upload.data.url, fileName: file.name, fileSize: file.size }
  }
}
