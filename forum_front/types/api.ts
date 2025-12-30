export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
  nickname: string
  email: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface PostListDTO {
  id: number
  title: string
  username: string
  views?: number  // 조회수 (선택적)
  Views?: number  // 백엔드에서 대문자로 올 수 있음 (대체)
  createDateTime: string
  updateDateTime: string
  profileImageUrl?: string  // 게시물 프로필 이미지 URL
  likeCount: number
  tags?: string[]  // 태그 목록
}

export interface PostDetailDTO {
  title: string
  body: string
  username: string
  views?: string  // Jackson이 소문자로 변환 (기본값)
  Views?: string  // 백엔드에서 대문자로 올 수 있음 (대체)
  createDateTime: string
  updateDateTime: string
  profileImageUrl?: string
  likeCount: number
  isLiked: boolean
  tags?: string[]  // 태그 목록
}

export interface CreatePost {
  title: string
  body: string
  profileImageUrl?: string
  tags?: string[]  // 태그 목록
}

export interface PatchPost {
  title?: string
  body?: string
  profileImageUrl?: string
  tags?: string[]  // 태그 목록
}

export interface CommentDTO {
  id: number
  body: string
  username: string
  userId: number
  postId: number
  parentCommentId: number | null
  isPinned: boolean
  likeCount: number
  isLiked: boolean
  createDateTime: string
  updateDateTime: string
  replies: CommentDTO[]
}

export interface CreateCommentDTO {
  body: string
  postId: number
  parentCommentId?: number | null
}

export interface UpdateCommentDTO {
  body: string
}

