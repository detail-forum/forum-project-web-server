'use client'

interface Props {
  title: string
  subtitle?: string
  imageUrl?: string
  /** 1대1은 상대 프로필(회색), 그룹은 채팅방(파란색) 자리표시 */
  variant: 'direct' | 'group'
  memberCount?: number
  onOpenSearch?: () => void
  onToggleMembers?: () => void
}

/** /chat 오른쪽 위: 대화 상대나 채팅방 이름. 그룹이면 검색·멤버 버튼 */
export default function InboxChatHeader({ title, subtitle, imageUrl, variant, memberCount, onOpenSearch, onToggleMembers }: Props) {
  return (
    <div className="p-4 border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="w-10 h-10 rounded-full object-cover" />
          ) : variant === 'direct' ? (
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-600 font-semibold">{title.charAt(0).toUpperCase()}</span>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-semibold">{title.charAt(0)}</span>
            </div>
          )}
          {subtitle ? (
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
              <p className="text-xs text-gray-500">{subtitle}</p>
            </div>
          ) : (
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onOpenSearch && (
            <button onClick={onOpenSearch} className="p-2 text-gray-400 hover:text-gray-600 transition" title="채팅 검색">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          )}
          {onToggleMembers && (
            <button
              onClick={onToggleMembers}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition flex items-center gap-1"
              title="멤버 목록"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>{memberCount || 0}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
