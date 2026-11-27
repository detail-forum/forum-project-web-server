import type {
  ApiResponse,
} from '@/types/api'
import { apiClient } from './apiClient'

// Image Upload API
export const imageUploadApi = {
  uploadImage: async (file: File): Promise<ApiResponse<{ url: string; filename: string; originalFilename: string }>> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await apiClient.post<ApiResponse<{ url: string; filename: string; originalFilename: string }>>(
      '/upload/image',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },
}

// File Upload API
export const fileUploadApi = {
  uploadFile: async (file: File): Promise<ApiResponse<{ url: string; filename: string; originalFilename: string; fileSize: number }>> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await apiClient.post<ApiResponse<{ url: string; filename: string; originalFilename: string; fileSize: number }>>(
      '/upload/file',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },

  deleteFile: async (filename: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/upload/file/${filename}`)
    return response.data
  },
}
