import type {
  ApiResponse,
  PostListDTO,
  PostDetailDTO,
  CreatePost,
  PatchPost,
} from '@/types/api'
import { cache } from '@/utils/cache'
import { apiClient } from './apiClient'

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

  // 모임 게시글(group_posts)은 posts와 id가 겹칠 수 있어 groupPost=true로 구분한다.
  toggleLike: async (id: number, groupPost = false): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.post<ApiResponse<boolean>>(`/post/${id}/like`, null, {
      params: groupPost ? { groupPost: true } : undefined,
    })
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
