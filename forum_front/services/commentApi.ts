import type {
  ApiResponse,
  CommentDTO,
  CreateCommentDTO,
  UpdateCommentDTO,
} from '@/types/api'
import { apiClient } from './apiClient'

// Comment API
export const commentApi = {
  getComments: async (postId: number): Promise<ApiResponse<CommentDTO[]>> => {
    const response = await apiClient.get<ApiResponse<CommentDTO[]>>('/comment', {
      params: { postId },
    })
    return response.data
  },

  createComment: async (data: CreateCommentDTO): Promise<ApiResponse<CommentDTO>> => {
    const response = await apiClient.post<ApiResponse<CommentDTO>>('/comment', data)
    return response.data
  },

  updateComment: async (id: number, data: UpdateCommentDTO): Promise<ApiResponse<CommentDTO>> => {
    const response = await apiClient.patch<ApiResponse<CommentDTO>>(`/comment/${id}`, data)
    return response.data
  },

  deleteComment: async (id: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/comment/${id}`)
    return response.data
  },

  toggleLike: async (id: number): Promise<ApiResponse<CommentDTO>> => {
    const response = await apiClient.post<ApiResponse<CommentDTO>>(`/comment/${id}/like`)
    return response.data
  },

  togglePin: async (id: number): Promise<ApiResponse<CommentDTO>> => {
    const response = await apiClient.post<ApiResponse<CommentDTO>>(`/comment/${id}/pin`)
    return response.data
  },
}
