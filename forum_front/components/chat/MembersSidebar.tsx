'use client'

import { useRouter } from 'next/navigation'
import type { GroupMemberDTO } from '@/types/api'

/** 모임 멤버 목록 사이드바. 멤버를 누르면 프로필로 간다. */
export default function MembersSidebar({ members, onClose }: { members: GroupMemberDTO[]; onClose: () => void }) {
  const router = useRouter()
  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">멤버 ({members.length}명)</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {members.length === 0 ? (
          <div className="text-center text-gray-500 text-sm">멤버가 없습니다.</div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                onClick={() => router.push(`/users/${member.username}`)}
              >
                <div className="flex-shrink-0">
                  {member.profileImageUrl ? (
                    <img src={member.profileImageUrl} alt={member.nickname} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-semibold">
                      {member.nickname.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 truncate">{member.nickname}</span>
                    {member.isOwner && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">주인</span>}
                    {member.isAdmin && !member.isOwner && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">관리자</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">@{member.username}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
