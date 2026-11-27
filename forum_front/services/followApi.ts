import type {
  ApiResponse,
} from '@/types/api'
import { apiClient } from './apiClient'

// Follow API
export const followApi = {
  followUser: async (userId: number): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.post<ApiResponse<boolean>>(`/follow/${userId}`)
    return response.data
  },

  unfollowUser: async (userId: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/follow/${userId}`)
    return response.data
  },

  getFollowStatus: async (userId: number): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.get<ApiResponse<boolean>>(`/follow/${userId}/status`)
    return response.data
  },

  getFollowerCount: async (userId: number): Promise<ApiResponse<number>> => {
    const response = await apiClient.get<ApiResponse<number>>(`/follow/${userId}/followers/count`)
    return response.data
  },

  getFollowingCount: async (userId: number): Promise<ApiResponse<number>> => {
    const response = await apiClient.get<ApiResponse<number>>(`/follow/${userId}/following/count`)
    return response.data
  },

  getFollowers: async (userId: number): Promise<ApiResponse<import('@/types/api').UserInfoDTO[]>> => {
    const response = await apiClient.get<ApiResponse<import('@/types/api').UserInfoDTO[]>>(`/follow/${userId}/followers`)
    return response.data
  },

  getFollowing: async (userId: number): Promise<ApiResponse<import('@/types/api').UserInfoDTO[]>> => {
    const response = await apiClient.get<ApiResponse<import('@/types/api').UserInfoDTO[]>>(`/follow/${userId}/following`)
    return response.data
  },

  getUserInfo: async (username: string): Promise<ApiResponse<import('@/types/api').UserInfoDTO>> => {
    const response = await apiClient.get<ApiResponse<import('@/types/api').UserInfoDTO>>(`/follow/user/${encodeURIComponent(username)}`)
    return response.data
  },

  searchUsers: async (query: string): Promise<ApiResponse<import('@/types/api').UserInfoDTO[]>> => {
    const response = await apiClient.get<ApiResponse<import('@/types/api').UserInfoDTO[]>>(`/follow/search`, {
      params: { query },
    })
    return response.data
  },
}
