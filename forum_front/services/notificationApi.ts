import type {
  ApiResponse,
  NotificationDTO,
} from '@/types/api'
import { apiClient } from './apiClient'

// Notification API
export const notificationApi = {
  getNotifications: async (page: number = 0, size: number = 20): Promise<ApiResponse<{
    content: NotificationDTO[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
    last: boolean;
  }>> => {
    const response = await apiClient.get<ApiResponse<{
      content: NotificationDTO[];
      totalElements: number;
      totalPages: number;
      number: number;
      size: number;
      last: boolean;
    }>>(
      '/notification',
      { params: { page, size } }
    )
    return response.data as ApiResponse<{
      content: NotificationDTO[];
      totalElements: number;
      totalPages: number;
      number: number;
      size: number;
      last: boolean;
    }>
  },

  getUnreadCount: async (): Promise<ApiResponse<number>> => {
    const response = await apiClient.get<ApiResponse<number>>('/notification/unread-count')
    return response.data
  },

  markAllAsRead: async (): Promise<ApiResponse<void>> => {
    const response = await apiClient.put<ApiResponse<void>>('/notification/read-all')
    return response.data
  },

  markAsRead: async (notificationId: number): Promise<ApiResponse<NotificationDTO>> => {
    const response = await apiClient.put<ApiResponse<NotificationDTO>>(`/notification/${notificationId}/read`)
    return response.data
  },

  getReadStatus: async (notificationId: number): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.get<ApiResponse<boolean>>(`/notification/${notificationId}/read-status`)
    return response.data
  },
}
