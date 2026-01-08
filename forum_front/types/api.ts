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
  groupId?: number  // 모임 ID
  groupName?: string  // 모임 이름
}

export interface PostDetailDTO {
  id?: number  // 게시글 ID (선택적)
  title: string
  body: string
  username: string
  nickname?: string  // 닉네임 (선택적)
  views?: string  // Jackson이 소문자로 변환 (기본값)
  Views?: string  // 백엔드에서 대문자로 올 수 있음 (대체)
  createDateTime: string
  updateDateTime: string
  profileImageUrl?: string
  likeCount: number
  isLiked: boolean
  tags?: string[]  // 태그 목록
  groupId?: number  // 모임 ID
  groupName?: string  // 모임 이름
  isPublic?: boolean  // 모임 외부 노출 여부
  canEdit?: boolean  // 수정 권한
  canDelete?: boolean  // 삭제 권한
}

export interface CreatePost {
  title: string
  body: string
  profileImageUrl?: string
  tags?: string[]  // 태그 목록
  groupId?: number  // 모임 ID (모임 게시글인 경우)
}

export interface PatchPost {
  title?: string
  body?: string
  profileImageUrl?: string
  tags?: string[]  // 태그 목록
  isPublic?: boolean  // 모임 외부 노출 여부 (모임 게시글인 경우만 사용)
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
  nickname?: string
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
  displayName?: string  // 채팅방별 별명
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
  isPublic?: boolean  // 모임 외부 노출 여부
  likeCount?: number  // 좋아요 수
  isLiked?: boolean  // 현재 사용자가 좋아요를 눌렀는지 여부
  tags?: string[]  // 태그 목록
}

export interface CreateGroupPostDTO {
  title: string
  body: string
  profileImageUrl?: string
  isPublic?: boolean  // 모임 외부 노출 여부
  tags?: string[]  // 태그 목록
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
  displayName?: string  // 채팅방별 별명
  profileImageUrl?: string
  isAdmin: boolean
  createdTime: string
  readCount?: number
  replyToMessageId?: number  // 답장한 메시지 ID
  replyToMessage?: {  // 답장한 메시지 정보
    id: number
    message: string
    username: string
    nickname: string
    displayName?: string
    profileImageUrl?: string
  }
  reactions?: ReactionInfo[]  // 반응 정보
  myReactions?: string[]  // 현재 사용자가 추가한 반응 목록
  messageType?: 'TEXT' | 'IMAGE' | 'FILE'  // 메시지 타입
  fileUrl?: string  // 이미지/파일 URL
  fileName?: string  // 파일명 (파일 타입일 때만)
  fileSize?: number  // 파일 크기 (바이트, 파일 타입일 때만)
}

export interface ReactionInfo {
  emoji: string
  count: number
}

export interface CreateGroupChatMessageDTO {
  message: string
  replyToMessageId?: number  // 답장한 메시지 ID
  messageType?: 'TEXT' | 'IMAGE' | 'FILE'  // 메시지 타입
  fileUrl?: string  // 이미지/파일 URL
  fileName?: string  // 파일명 (파일 타입일 때만)
  fileSize?: number  // 파일 크기 (바이트, 파일 타입일 때만)
}

// Direct Chat 관련 타입
export interface DirectChatRoomDTO {
  id: number
  otherUserId: number
  otherUsername: string
  otherNickname: string
  otherProfileImageUrl?: string
  lastMessage?: string
  lastMessageTime?: string
  unreadCount: number
  updatedTime?: string
}

export interface DirectChatMessageDTO {
  id: number
  roomId: number
  senderId: number
  username: string
  nickname: string
  profileImageUrl?: string
  message: string
  createdTime: string
  messageType: 'TEXT' | 'IMAGE' | 'FILE'
  fileUrl?: string
  fileName?: string
  fileSize?: number
  isRead: boolean
}

export interface DirectChatMessagePageDTO {
  content: DirectChatMessageDTO[]
  totalElements: number
  totalPages: number
}

export interface CreateDirectMessageDTO {
  message?: string
  messageType?: 'TEXT' | 'IMAGE' | 'FILE'
  fileUrl?: string
  fileName?: string
  fileSize?: number
}

// Notification 관련 타입
export type NotificationType = 'ADMIN_NOTICE' | 'NEW_FOLLOWER' | 'NEW_MESSAGE' | 'POST_LIKE' | 'COMMENT_REPLY'

export interface NotificationDTO {
  id: number
  type: NotificationType
  title: string
  message: string
  relatedUserId?: number
  relatedUserNickname?: string
  relatedUserProfileImageUrl?: string
  relatedPostId?: number
  relatedGroupPostId?: number
  relatedGroupId?: number  // 그룹 게시글의 그룹 ID
  relatedCommentId?: number
  isRead: boolean
  createdTime: string
}
