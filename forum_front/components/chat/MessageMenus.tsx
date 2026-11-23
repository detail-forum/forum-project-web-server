'use client'

import type { MessageActions } from '@/hooks/useMessageActions'

/** 우클릭 메뉴와 반응 고르기 창. useMessageActions의 상태를 그린다. */
export function MessageOverlays({ actions }: { actions: MessageActions }) {
  return (
    <>
      {actions.contextMenu && <MessageContextMenu menu={actions.contextMenu} {...actions.menuHandlers} />}
      {actions.reactingMessageId && (
        <ReactionPicker
          onPick={(emoji) => actions.toggleReaction(actions.reactingMessageId!, emoji)}
          onClose={actions.closeReactionPicker}
        />
      )}
    </>
  )
}

export interface ContextMenuState {
  x: number
  y: number
  messageId: number
  isMyMessage: boolean
}

const itemClass = 'w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'

/** 메시지 우클릭 메뉴. 내 메시지면 수정·삭제도 보인다. */
export function MessageContextMenu({
  menu,
  onReact,
  onEdit,
  onReply,
  onDelete,
}: {
  menu: ContextMenuState
  onReact: (messageId: number) => void
  onEdit: (messageId: number) => void
  onReply: (messageId: number) => void
  onDelete: (messageId: number) => void
}) {
  return (
    <div
      className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[120px]"
      style={{ left: `${menu.x}px`, top: `${menu.y}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <button onClick={() => onReact(menu.messageId)} className={itemClass}>
        반응 추가
      </button>
      {menu.isMyMessage && (
        <button onClick={() => onEdit(menu.messageId)} className={itemClass}>
          수정
        </button>
      )}
      <button onClick={() => onReply(menu.messageId)} className={itemClass}>
        답글
      </button>
      {menu.isMyMessage && (
        <button onClick={() => onDelete(menu.messageId)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
          삭제
        </button>
      )}
    </div>
  )
}

export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

/** 반응 고르기 창 */
export function ReactionPicker({ onPick, onClose }: { onPick: (emoji: string) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-lg p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="text-sm font-semibold mb-3">반응 선택</div>
        <div className="flex gap-2">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onPick(emoji)}
              className="text-2xl hover:scale-125 transition-transform px-2 py-1 hover:bg-gray-100 rounded"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="mt-3 w-full px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">
          취소
        </button>
      </div>
    </div>
  )
}
