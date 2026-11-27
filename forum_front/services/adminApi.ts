import type {
  ApiResponse,
  AdminStats,
  AdminUser,
  AdminPost,
  AdminComment,
  AdminReport,
  ReportStatus,
  ReportTargetType,
  PageOf,
} from '@/types/api'
import { cache } from '@/utils/cache'
import { apiClient } from './apiClient'

// 관리자 전용. 서버가 /admin/** 를 ROLE_ADMIN에게만 연다.
export const adminApi = {
  getStats: async (): Promise<ApiResponse<AdminStats>> =>
    (await apiClient.get<ApiResponse<AdminStats>>('/admin/stats')).data,

  getUsers: async (keyword = '', page = 0, size = 20): Promise<ApiResponse<PageOf<AdminUser>>> =>
    (await apiClient.get<ApiResponse<PageOf<AdminUser>>>('/admin/users', { params: { keyword, page, size } })).data,

  setSuspended: async (userId: number, suspended: boolean): Promise<ApiResponse<void>> =>
    (await apiClient.patch<ApiResponse<void>>(`/admin/users/${userId}/suspension`, { suspended })).data,

  getPosts: async (keyword = '', groupPost = false, page = 0, size = 20): Promise<ApiResponse<PageOf<AdminPost>>> =>
    (await apiClient.get<ApiResponse<PageOf<AdminPost>>>('/admin/posts', { params: { keyword, groupPost, page, size } })).data,

  deletePost: async (id: number, groupPost: boolean): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/admin/posts/${id}`, { params: { groupPost } })
    cache.clear()
    return response.data
  },

  getComments: async (keyword = '', page = 0, size = 20): Promise<ApiResponse<PageOf<AdminComment>>> =>
    (await apiClient.get<ApiResponse<PageOf<AdminComment>>>('/admin/comments', { params: { keyword, page, size } })).data,

  deleteComment: async (id: number): Promise<ApiResponse<void>> =>
    (await apiClient.delete<ApiResponse<void>>(`/admin/comments/${id}`)).data,

  sendNotice: async (title: string, message: string): Promise<ApiResponse<number>> =>
    (await apiClient.post<ApiResponse<number>>('/admin/notices', { title, message })).data,

  getReports: async (status: ReportStatus = 'OPEN', page = 0, size = 20): Promise<ApiResponse<PageOf<AdminReport>>> =>
    (await apiClient.get<ApiResponse<PageOf<AdminReport>>>('/admin/reports', { params: { status, page, size } })).data,

  handleReport: async (id: number, action: 'DELETE' | 'DISMISS'): Promise<ApiResponse<number>> => {
    const response = await apiClient.patch<ApiResponse<number>>(`/admin/reports/${id}`, { action })
    if (action === 'DELETE') cache.clear()
    return response.data
  },
}

export const reportApi = {
  create: async (targetType: ReportTargetType, targetId: number, reason: string): Promise<ApiResponse<void>> =>
    (await apiClient.post<ApiResponse<void>>('/reports', { targetType, targetId, reason })).data,
}
