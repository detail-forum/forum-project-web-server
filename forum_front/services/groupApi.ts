import type {
  ApiResponse,
} from '@/types/api'
import { apiClient } from './apiClient'

// Group API
export const groupApi = {
  createGroup: async (data: import('@/types/api').CreateGroupDTO): Promise<ApiResponse<number>> => {
    const response = await apiClient.post<ApiResponse<number>>('/group', data)
    return response.data
  },

  getGroupList: async (page: number = 0, size: number = 10, myGroups?: boolean): Promise<ApiResponse<any>> => {
    const params: any = { page, size }
    if (myGroups !== undefined) {
      params.myGroups = myGroups
    }
    const response = await apiClient.get<ApiResponse<any>>('/group', { params })
    return response.data
  },

  searchGroups: async (query: string): Promise<ApiResponse<import('@/types/api').GroupListDTO[]>> => {
    const response = await apiClient.get<ApiResponse<import('@/types/api').GroupListDTO[]>>('/group/search', {
      params: { query },
    })
    return response.data
  },

  getGroupDetail: async (groupId: number): Promise<ApiResponse<import('@/types/api').GroupDetailDTO>> => {
    const response = await apiClient.get<ApiResponse<import('@/types/api').GroupDetailDTO>>(`/group/${groupId}`)
    return response.data
  },

  joinGroup: async (groupId: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>(`/group/${groupId}/join`)
    return response.data
  },

  leaveGroup: async (groupId: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>(`/group/${groupId}/leave`)
    return response.data
  },

  updateGroup: async (groupId: number, data: import('@/types/api').UpdateGroupDTO): Promise<ApiResponse<void>> => {
    const response = await apiClient.patch<ApiResponse<void>>(`/group/${groupId}`, data)
    return response.data
  },

  getGroupMembers: async (groupId: number): Promise<ApiResponse<import('@/types/api').GroupMemberDTO[]>> => {
    const response = await apiClient.get<ApiResponse<import('@/types/api').GroupMemberDTO[]>>(`/group/${groupId}/members`)
    return response.data
  },

  updateMemberAdmin: async (groupId: number, userId: number, isAdmin: boolean): Promise<ApiResponse<void>> => {
    const response = await apiClient.patch<ApiResponse<void>>(`/group/${groupId}/members/${userId}/admin`, null, {
      params: { isAdmin },
    })
    return response.data
  },
  updateMemberDisplayName: async (groupId: number, userId: number, displayName?: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.patch<ApiResponse<void>>(`/group/${groupId}/members/${userId}/display-name`, null, {
      params: { displayName },
    })
    return response.data
  },

  checkMembership: async (groupId: number): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.get<ApiResponse<boolean>>(`/group/${groupId}/membership`)
    return response.data
  },

  deleteGroup: async (groupId: number, groupName: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/group/${groupId}`, {
      params: { groupName },
    })
    return response.data
  },

  getChatRooms: async (groupId: number): Promise<ApiResponse<import('@/types/api').GroupChatRoomDTO[]>> => {
    const response = await apiClient.get<ApiResponse<import('@/types/api').GroupChatRoomDTO[]>>(`/group/${groupId}/chat-rooms`)
    return response.data
  },

  createChatRoom: async (groupId: number, data: import('@/types/api').CreateGroupChatRoomDTO): Promise<ApiResponse<number>> => {
    const response = await apiClient.post<ApiResponse<number>>(`/group/${groupId}/chat-rooms`, data)
    return response.data
  },

  updateChatRoom: async (groupId: number, roomId: number, data: import('@/types/api').UpdateGroupChatRoomDTO): Promise<ApiResponse<void>> => {
    const response = await apiClient.patch<ApiResponse<void>>(`/group/${groupId}/chat-rooms/${roomId}`, data)
    return response.data
  },

  deleteChatRoom: async (groupId: number, roomId: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/group/${groupId}/chat-rooms/${roomId}`)
    return response.data
  },

  createGroupPost: async (groupId: number, data: import('@/types/api').CreateGroupPostDTO): Promise<ApiResponse<number>> => {
    const response = await apiClient.post<ApiResponse<number>>(`/group/${groupId}/posts`, data)
    return response.data
  },

  getGroupPostDetail: async (groupId: number, postId: number): Promise<ApiResponse<import('@/types/api').GroupPostDetailDTO>> => {
    const response = await apiClient.get<ApiResponse<import('@/types/api').GroupPostDetailDTO>>(`/group/${groupId}/posts/${postId}`)
    return response.data
  },

  updateGroupPost: async (groupId: number, postId: number, data: import('@/types/api').CreateGroupPostDTO): Promise<ApiResponse<void>> => {
    const response = await apiClient.patch<ApiResponse<void>>(`/group/${groupId}/posts/${postId}`, data)
    return response.data
  },

  deleteGroupPost: async (groupId: number, postId: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/group/${groupId}/posts/${postId}`)
    return response.data
  },

  sendChatMessage: async (groupId: number, roomId: number, data: import('@/types/api').CreateGroupChatMessageDTO): Promise<ApiResponse<number>> => {
    const response = await apiClient.post<ApiResponse<number>>(`/group/${groupId}/chat-rooms/${roomId}/messages`, data)
    return response.data
  },

  deleteChatMessage: async (groupId: number, roomId: number, messageId: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/group/${groupId}/chat-rooms/${roomId}/messages/${messageId}`)
    return response.data
  },

  toggleReaction: async (groupId: number, roomId: number, messageId: number, emoji: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>(`/group/${groupId}/chat-rooms/${roomId}/messages/${messageId}/reactions`, null, {
      params: { emoji },
    })
    return response.data
  },

  getChatMessages: async (groupId: number, roomId: number, page: number = 0, size: number = 50): Promise<ApiResponse<import('@/types/api').GroupChatMessageDTO[]>> => {
    const response = await apiClient.get<ApiResponse<import('@/types/api').GroupChatMessageDTO[]>>(`/group/${groupId}/chat-rooms/${roomId}/messages`, {
      params: { page, size },
    })
    return response.data
  },

  searchChatMessages: async (groupId: number, roomId: number, query: string, page: number = 0, size: number = 20): Promise<ApiResponse<{ content: import('@/types/api').GroupChatMessageDTO[]; totalElements: number; totalPages: number }>> => {
    const response = await apiClient.get<ApiResponse<{ content: import('@/types/api').GroupChatMessageDTO[]; totalElements: number; totalPages: number }>>(`/group/${groupId}/chat-rooms/${roomId}/messages/search`, {
      params: { query, page, size },
    })
    return response.data
  },
}
