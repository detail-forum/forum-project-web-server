import axios from 'axios'
import type {
  ApiResponse,
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  PostListDTO,
  PostDetailDTO,
  CreatePost,
  PatchPost,
} from '@/types/api'
import { cache } from '@/utils/cache'

// 프로덕션: HTTPS 도메인 사용
// 개발 환경에서는 환경 변수로 localhost:8081 사용 가능
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://forum.rjsgud.com/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10초 타임아웃
})

// 요청 인터셉터: 토큰 자동 추가
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 응답 인터셉터: 에러 처리
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 에러 상세 정보 로깅
    if (error.response) {
      console.error('API Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        url: error.config?.url,
        method: error.config?.method,
        data: error.response.data,
      })
    } else if (error.request) {
      console.error('Network Error:', error.request)
    } else {
      console.error('Error:', error.message)
    }

    // 401 에러 처리
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<ApiResponse<LoginResponse>>('/auth/login', data).then(r => r.data),

  register: (data: RegisterRequest) =>
    apiClient.post<ApiResponse<void>>('/auth/register', data).then(r => r.data),
}

// Post API
export const postApi = {
  getPostList: async (page: number = 0, size: number = 10, sortType: string = 'RESENT'): Promise<ApiResponse<{ content: PostListDTO[]; totalElements: number; totalPages: number }>> => {
    // 캐시 키 생성
    const cacheKey = `postList_${page}_${size}_${sortType}`
    const cached = cache.get<ApiResponse<{ content: PostListDTO[]; totalElements: number; totalPages: number }>>(cacheKey)
    
    if (cached) {
      return cached
    }

    const response = await apiClient.get<ApiResponse<{ content: PostListDTO[]; totalElements: number; totalPages: number }>>(
      '/post',
      { params: { page, size, sortType } }
    )
    
    // 30초 캐시
    cache.set(cacheKey, response.data, 30000)
    return response.data
  },

  getMyPostList: async (page: number = 0, size: number = 10, sortType: string = 'RESENT'): Promise<ApiResponse<{ content: PostListDTO[]; totalElements: number; totalPages: number }>> => {
    const response = await apiClient.get<ApiResponse<{ content: PostListDTO[]; totalElements: number; totalPages: number }>>(
      '/post/my-post',
      { params: { page, size, sortType } }
    )
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
}
