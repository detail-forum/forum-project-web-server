import type {
  ApiResponse,
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  RefreshTokenRequest,
} from '@/types/api'
import { logout } from '@/store/slices/authSlice'
import { apiClient } from './apiClient'

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

  requestPasswordReset: (email: string) =>
    apiClient.post<ApiResponse<void>>('/auth/password-reset/request', { email }).then(r => r.data),

  resetPassword: (token: string, newPassword: string) =>
    apiClient.post<ApiResponse<void>>('/auth/password-reset/confirm', { token, newPassword }).then(r => r.data),

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
