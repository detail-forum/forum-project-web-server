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

// 프로덕션: 외부 서버 URL 사용
// 개발 환경에서는 환경 변수로 localhost:8081 사용 가능
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://211.110.30.142/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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
  getPostList: (page = 0, size = 10, sortType = 'RESENT') =>
    apiClient
      .get<ApiResponse<{ content: PostListDTO[]; totalElements: number; totalPages: number }>>(
        '/post',
        { params: { page, size, sortType } }
      )
      .then(r => r.data),

  getMyPostList: (page = 0, size = 10, sortType = 'RESENT') =>
    apiClient
      .get<ApiResponse<{ content: PostListDTO[]; totalElements: number; totalPages: number }>>(
        '/post/my-post',
        { params: { page, size, sortType } }
      )
      .then(r => r.data),

  getPostDetail: (id: number) =>
    apiClient.get<ApiResponse<PostDetailDTO>>(`/post/${id}`).then(r => r.data),

  createPost: (data: CreatePost) =>
    apiClient.post<ApiResponse<void>>('/post', data).then(r => r.data),

  updatePost: (id: number, data: PatchPost) =>
    apiClient.patch<ApiResponse<void>>(`/post/${id}`, data).then(r => r.data),

  deletePost: (id: number) =>
    apiClient.delete<ApiResponse<void>>(`/post/${id}`).then(r => r.data),
}
