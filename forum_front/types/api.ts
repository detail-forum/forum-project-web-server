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

export interface UserInfoDTO {
  id: number
  username: string
  nickname: string
  email: string
  profileImageUrl?: string
  githubLink?: string
  followerCount: number
  followingCount: number
  isFollowing: boolean
}

export interface User {
  id: number
  username: string
  nickname: string
  email: string
  profileImageUrl?: string
  githubLink?: string
  isDeleted: boolean
  createdDate: string
}

export interface UpdateProfile {
  profileImageUrl?: string
  email?: string
  githubLink?: string
}

export interface ChangePassword {
  currentPassword: string
  newPassword: string
}

// Group 관련 타입
export interface GroupListDTO {
  id: number
  name: string
  description: string
  ownerUsername: string
  ownerNickname: string
  profileImageUrl?: string
  memberCount: number
  createdTime: string
  isMember: boolean
  isAdmin: boolean
}

export interface GroupDetailDTO {
  id: number
  name: string
  description: string
  ownerUsername: string
  ownerNickname: string
  profileImageUrl?: string
  memberCount: number
  createdTime: string
  updatedTime: string
  isMember: boolean
  isAdmin: boolean
}

export interface CreateGroupDTO {
  name: string
  description?: string
  profileImageUrl?: string
}

export interface UpdateGroupDTO {
  name?: string
  description?: string
  profileImageUrl?: string
}

export interface GroupMemberDTO {
  userId: number
  username: string
  nickname: string
  profileImageUrl?: string
  isAdmin: boolean
  isOwner: boolean
}

export interface GroupPostListDTO {
  id: number
  title: string
  body: string
  username: string
  nickname: string
  Views?: string
  createDateTime: string
  updateDateTime: string
  profileImageUrl?: string
}

export interface GroupPostDetailDTO {
  id: number
  title: string
  body: string
  username: string
  nickname: string
  Views?: string
  createDateTime: string
  updateDateTime: string
  profileImageUrl?: string
  isAuthor: boolean
  canEdit: boolean
  canDelete: boolean
}

export interface CreateGroupPostDTO {
  title: string
  body: string
  profileImageUrl?: string
}

export interface GroupChatRoomDTO {
  id: number
  name: string
  description?: string
  profileImageUrl?: string
  isAdminRoom: boolean
  createdTime: string
}

export interface CreateGroupChatRoomDTO {
  name: string
  description?: string
}

export interface UpdateGroupChatRoomDTO {
  name?: string
  description?: string
  profileImageUrl?: string
}

export interface GroupChatMessageDTO {
  id: number
  message: string
  username: string
  nickname: string
  profileImageUrl?: string
  isAdmin: boolean
  createdTime: string
}

export interface CreateGroupChatMessageDTO {
  message: string
}
