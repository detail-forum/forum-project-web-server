import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import type {
  ApiResponse,
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  RefreshTokenRequest,
  PostListDTO,
  PostDetailDTO,
  CreatePost,
  PatchPost,
  CommentDTO,
  CreateCommentDTO,
  UpdateCommentDTO,
  NotificationDTO,
} from '@/types/api'
import { cache } from '@/utils/cache'
import { store } from '@/store/store'
import { updateTokens, logout } from '@/store/slices/authSlice'
import { getCookie, setCookie, removeCookie } from '@/utils/cookies'
import { isTokenExpired, isTokenExpiringSoon } from '@/utils/jwt'

// 프로덕션: HTTPS 도메인 사용
// 개발 환경에서는 환경 변수로 localhost:8081 사용 가능
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://forum.rjsgud.com/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10초 타임아웃
  withCredentials: true, // 쿠키를 포함하여 요청 전송
})

// 요청 인터셉터: 토큰 자동 추가
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      // Redux store에서 토큰 확인
      // 서버가 HttpOnly 쿠키로도 토큰을 설정하지만, Authorization 헤더도 함께 보냄 (이중 보안)
      const state = store.getState()
      const token = state.auth.accessToken
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 토큰 재발급 플래그 (무한 루프 방지)
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: any) => void
  reject: (error?: any) => void
}> = []

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// 응답 인터셉터: 에러 처리 및 토큰 자동 재발급
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // 에러 상세 정보 로깅
    if (error.response) {
      console.error('API Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        url: originalRequest?.url,
        method: originalRequest?.method,
        data: error.response.data,
      })
    } else if (error.request) {
      console.error('Network Error:', error.request)
    } else {
      console.error('Error:', error.message)
    }

    // 인증 확인 API는 인터셉터에서 제외 (무한 루프 방지)
    const isAuthCheckEndpoint = originalRequest?.url?.includes('/auth/verify') || 
                                 originalRequest?.url?.includes('/auth/me')

    // 401 또는 403 에러 처리 - 토큰 재발급 시도 (403도 인증 문제일 수 있음)
    if ((error.response?.status === 401 || error.response?.status === 403) && 
        typeof window !== 'undefined' && 
        originalRequest && 
        !originalRequest._retry &&
        !isAuthCheckEndpoint) { // 인증 확인 API는 제외
      if (isRefreshing) {
        // 이미 재발급 중이면 대기열에 추가
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            return apiClient(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      // Redux store에서 refreshToken 가져오기 (HttpOnly 쿠키는 JavaScript에서 읽을 수 없음)
      const state = store.getState()
      const refreshToken = state.auth.refreshToken

      if (!refreshToken) {
        // RefreshToken이 없으면 로그아웃 (인증 확인 API가 아닌 경우에만)
        processQueue(error)
        isRefreshing = false
        removeCookie('accessToken')
        removeCookie('refreshToken')
        store.dispatch(logout())

        // 사용자에게 명확한 메시지 표시
        let errorMessage = '로그인이 필요합니다.'
        if (
          error.response &&
          error.response.data &&
          typeof (error.response.data as any).message === 'string'
        ) {
          errorMessage = (error.response.data as any).message
        }
        console.warn('인증 실패:', errorMessage)

        // 인증 확인 API가 아닌 경우에만 리다이렉트 (무한 루프 방지)
        // 현재 경로가 홈이 아닌 경우에만 리다이렉트
        if (typeof window !== 'undefined' && window.location.pathname !== '/') {
          window.location.href = '/'
        }
        return Promise.reject(error)
      }
      
      // RefreshToken이 만료되었는지 확인
      if (isTokenExpired(refreshToken)) {
        processQueue(error)
        isRefreshing = false
        removeCookie('accessToken')
        removeCookie('refreshToken')
        store.dispatch(logout())
        
        console.warn('RefreshToken이 만료되었습니다. 다시 로그인해주세요.')
        // 현재 경로가 홈이 아닌 경우에만 리다이렉트 (무한 루프 방지)
        if (typeof window !== 'undefined' && window.location.pathname !== '/') {
          window.location.href = '/'
        }
        return Promise.reject(error)
      }

      try {
        // RefreshToken으로 새 AccessToken 발급
        // 서버가 쿠키에서 refreshToken을 읽을 수 있지만, 호환성을 위해 body에도 포함
        const response = await axios.post<ApiResponse<LoginResponse>>(
          `${API_BASE_URL}/auth/refresh`,
          refreshToken ? { refreshToken } as RefreshTokenRequest : {},
          { withCredentials: true }
        )

        if (response.data.success && response.data.data) {
          const { accessToken, refreshToken: newRefreshToken } = response.data.data

          // 서버가 HttpOnly 쿠키로 자동 설정하므로, 클라이언트는 Redux store만 업데이트
          // Redux 상태 업데이트 (UI 상태 관리용)
          store.dispatch(updateTokens({ accessToken, refreshToken: newRefreshToken }))

          // 대기 중인 요청들 처리
          processQueue(null, accessToken)

          // 원래 요청 재시도 (새 토큰을 명시적으로 설정)
          // 요청 인터셉터가 실행되기 전에 토큰을 설정하여 확실하게 적용
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`
          }
          
          // Redux 업데이트가 완료될 시간을 주기 위해 약간의 지연
          // 하지만 동기적으로 처리하기 위해 Promise.resolve() 사용
          isRefreshing = false
          
          // 새로운 요청 객체를 생성하여 토큰이 확실히 적용되도록 함
          const retryRequest = {
            ...originalRequest,
            headers: {
              ...originalRequest.headers,
              Authorization: `Bearer ${accessToken}`
            }
          }
          
          return apiClient(retryRequest)
        } else {
          throw new Error('토큰 재발급 실패')
        }
      } catch (refreshError: any) {
        // RefreshToken도 만료되었거나 유효하지 않음
        processQueue(refreshError as AxiosError)
        isRefreshing = false
        removeCookie('accessToken')
        removeCookie('refreshToken')
        store.dispatch(logout())
        
        // 사용자에게 명확한 메시지 표시
        const errorMessage = refreshError?.response?.data?.message || 
                            refreshError?.message || 
                            '세션이 만료되었습니다. 다시 로그인해주세요.'
        
        console.warn('토큰 재발급 실패:', errorMessage)
        
        // 사용자에게 알림 표시 (페이지 이동 전에 표시)
        if (typeof window !== 'undefined') {
          // 짧은 지연 후 alert 표시 (페이지 이동 전에 보이도록)
          setTimeout(() => {
            alert(errorMessage)
          }, 100)
        }
        
        window.location.href = '/'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)
  
// Auth API
export const authApi = {
  getCurrentUser: async (): Promise<ApiResponse<import('@/types/api').User>> => {
    const response = await apiClient.get<ApiResponse<import('@/types/api').User>>('/auth/me')
    return response.data
  },

  updateProfile: async (data: import('@/types/api').UpdateProfile): Promise<ApiResponse<void>> => {
    const response = await apiClient.patch<ApiResponse<void>>('/auth/profile', data)
    return response.data
  },

  changePassword: async (data: import('@/types/api').ChangePassword): Promise<ApiResponse<void>> => {
    const response = await apiClient.patch<ApiResponse<void>>('/auth/password', data)
    return response.data
  },

  deleteAccount: async (): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>('/auth/account')
    return response.data
  },
  login: (data: LoginRequest) =>
    apiClient.post<ApiResponse<LoginResponse>>('/auth/login', data).then(r => r.data),

  register: (data: RegisterRequest) =>
    apiClient.post<ApiResponse<void>>('/auth/register', data).then(r => r.data),

  verifyEmail: async (token: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.get<ApiResponse<void>>(`/auth/verify-email?token=${encodeURIComponent(token)}`)
    return response.data
  },

  resendVerificationEmail: async (email: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>(`/auth/resend-verification?email=${encodeURIComponent(email)}`)
    return response.data
  },

  refreshToken: (data: RefreshTokenRequest) =>
    apiClient.post<ApiResponse<LoginResponse>>('/auth/refresh', data).then(r => r.data),
  
  verifyAuth: async (): Promise<ApiResponse<LoginResponse>> => {
    const response = await apiClient.get<ApiResponse<LoginResponse>>('/auth/verify')
    return response.data
  },
  
  logout: async (): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>('/auth/logout')
    return response.data
  },
}

// Post API
export const postApi = {
  getPostList: async (page: number = 0, size: number = 10, sortType: string = 'RESENT', tag?: string, search?: string, groupFilter?: string): Promise<ApiResponse<{ content: PostListDTO[]; totalElements: number; totalPages: number }>> => {
    // 캐시 키 생성 (태그, 검색어, 모임 필터 포함)
    const cacheKey = `postList_${page}_${size}_${sortType}_${tag || ''}_${search || ''}_${groupFilter || ''}`
    const cached = cache.get<ApiResponse<{ content: PostListDTO[]; totalElements: number; totalPages: number }>>(cacheKey)
    
    if (cached) {
      return cached
    }

    const params: any = {
      page,
      size,
      sortType,
    }
    if (tag) {
      params.tag = tag
    }
    if (search) {
      params.search = search
    }
    if (groupFilter) {
      params.groupFilter = groupFilter
    }

    const response = await apiClient.get<ApiResponse<{ content: PostListDTO[]; totalElements: number; totalPages: number }>>(
      '/post',
      { params }
    )
    
    // 검색 결과는 캐시하지 않음 (검색어가 없을 때만 캐시)
    if (!search) {
      cache.set(cacheKey, response.data, 30000)
    }
    return response.data
  },

  getMyPostList: async (page: number = 0, size: number = 10, sortType: string = 'RESENT', tag?: string, groupFilter?: string): Promise<ApiResponse<{ content: PostListDTO[]; totalElements: number; totalPages: number }>> => {
    const params: any = { page, size, sortType }
    if (tag) {
      params.tag = tag
    }
    if (groupFilter) {
      params.groupFilter = groupFilter
    }
    const response = await apiClient.get<ApiResponse<{ content: PostListDTO[]; totalElements: number; totalPages: number }>>(
      '/post/my-post',
      { params }
    )
    return response.data
  },

  getMyTags: async (): Promise<ApiResponse<string[]>> => {
    const response = await apiClient.get<ApiResponse<string[]>>('/post/my-tags')
    return response.data
  },

  getPostDetail: async (id: number): Promise<ApiResponse<PostDetailDTO>> => {
    // 게시글 상세는 조회수 증가가 있으므로 캐시하지 않음
    const response = await apiClient.get<ApiResponse<PostDetailDTO>>(`/post/${id}`)
    return response.data
  },

  createPost: async (data: CreatePost): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>('/post', data)
    // 게시글 작성 후 목록 캐시 무효화
    cache.clear()
    return response.data
  },

  updatePost: async (id: number, data: PatchPost): Promise<ApiResponse<void>> => {
    const response = await apiClient.patch<ApiResponse<void>>(`/post/${id}`, data)
    // 게시글 수정 후 목록 캐시 무효화
    cache.clear()
    return response.data
  },

  deletePost: async (id: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/post/${id}`)
    // 게시글 삭제 후 목록 캐시 무효화
    cache.clear()
    return response.data
  },

  toggleLike: async (id: number): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.post<ApiResponse<boolean>>(`/post/${id}/like`)
    // 좋아요 후 목록 캐시 무효화
    cache.clear()
    return response.data
  },
  
  getGroupPostList: async (groupId: number, page: number = 0, size: number = 10, sortType: string = 'RESENT', isPublic?: boolean): Promise<ApiResponse<{ content: PostListDTO[]; totalElements: number; totalPages: number }>> => {
    const params: any = { page, size, sortType }
    if (isPublic !== undefined) {
      params.isPublic = isPublic
    }
    const response = await apiClient.get<ApiResponse<{ content: PostListDTO[]; totalElements: number; totalPages: number }>>(`/post/group/${groupId}`, {
      params,
    })
    return response.data
  },
}

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
}

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
    const response = await apiClient.get<ApiResponse<any>>('/group', {
      params,
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

  deleteImage: async (filename: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/upload/image/${filename}`)
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

// User Post API
export const userPostApi = {
  getUserPostList: async (username: string, page: number = 0, size: number = 10, sortType: string = 'RESENT'): Promise<ApiResponse<{ content: PostListDTO[]; totalElements: number; totalPages: number }>> => {
    const response = await apiClient.get<ApiResponse<{ content: PostListDTO[]; totalElements: number; totalPages: number }>>(
      `/post/user/${encodeURIComponent(username)}`,
      { params: { page, size, sortType } }
    )
    return response.data
  },

  getUserPostCount: async (username: string): Promise<ApiResponse<number>> => {
    const response = await apiClient.get<ApiResponse<number>>(`/post/user/${encodeURIComponent(username)}/count`)
    return response.data
  },
  
  getGroupPostList: async (groupId: number, page: number = 0, size: number = 10, sortType: string = 'RESENT', isPublic?: boolean): Promise<ApiResponse<{ content: PostListDTO[]; totalElements: number; totalPages: number }>> => {
    const params: any = { page, size, sortType }
    if (isPublic !== undefined) {
      params.isPublic = isPublic
    }
    const response = await apiClient.get<ApiResponse<{ content: PostListDTO[]; totalElements: number; totalPages: number }>>(`/post/group/${groupId}`, {
      params,
    })
    return response.data
  },
}

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
