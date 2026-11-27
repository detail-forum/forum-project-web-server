import type {
  ApiResponse,
} from '@/types/api'
import { apiClient } from './apiClient'

// Direct Chat API
export const directChatApi = {
  // 1대1 채팅방 목록 조회
  getMyRooms: async (): Promise<ApiResponse<import('@/types/api').DirectChatRoomDTO[]>> => {
    // baseURL이 /api로 끝나므로 /chat/direct/rooms만 사용
    // nginx가 /api/를 제거하므로 실제 백엔드 경로는 /api/chat/direct/rooms가 됨
    const response = await apiClient.get<ApiResponse<import('@/types/api').DirectChatRoomDTO[]>>('/chat/direct/rooms')
    return response.data
  },

  // 1대1 채팅방 생성 또는 조회
  getOrCreateRoom: async (otherUserId: number): Promise<ApiResponse<import('@/types/api').DirectChatRoomDTO>> => {
    const response = await apiClient.post<ApiResponse<import('@/types/api').DirectChatRoomDTO>>('/chat/direct/rooms', {
      otherUserId,
    })
    return response.data
  },

  // 1대1 채팅 메시지 목록 조회
  getMessages: async (roomId: number, page: number = 0, size: number = 50): Promise<ApiResponse<import('@/types/api').DirectChatMessagePageDTO>> => {
    const response = await apiClient.get<ApiResponse<import('@/types/api').DirectChatMessagePageDTO>>(`/chat/direct/rooms/${roomId}/messages`, {
      params: { page, size },
    })
    return response.data
  },

  // 1대1 채팅 메시지 전송
  sendMessage: async (chatRoomId: number, data: import('@/types/api').CreateDirectMessageDTO): Promise<ApiResponse<import('@/types/api').DirectChatMessageDTO>> => {
    const response = await apiClient.post<ApiResponse<import('@/types/api').DirectChatMessageDTO>>(`/chat/direct/rooms/${chatRoomId}/messages`, data)
    return response.data
  },
}
