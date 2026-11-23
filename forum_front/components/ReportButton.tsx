'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { reportApi } from '@/services/api'
import type { ReportTargetType } from '@/types/api'

const REASONS = ['스팸·광고', '욕설·비하·혐오', '음란·선정적인 내용', '개인정보 노출', '기타']

interface ReportButtonProps {
  targetType: ReportTargetType
  targetId: number
  className?: string
}

/** 신고 버튼과 사유 선택 창. 로그인한 사용자이고 자기 글이 아닐 때만 렌더링한다(호출하는 쪽에서 판단). */
export default function ReportButton({ targetType, targetId, className = '' }: ReportButtonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(REASONS[0])
  const [detail, setDetail] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const submit = async () => {
    const text = reason === '기타' ? detail.trim() : detail.trim() ? `${reason}: ${detail.trim()}` : reason
    if (!text) {
      alert('신고 사유를 적어주세요.')
      return
    }
    setSending(true)
    try {
      const res = await reportApi.create(targetType, targetId, text.slice(0, 300))
      alert(res.message || '신고가 접수되었습니다.')
      setOpen(false)
      setDetail('')
    } catch (error: any) {
      alert(error.response?.data?.message || '신고에 실패했습니다.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`text-sm text-gray-500 hover:text-red-500 transition-colors ${className}`}
      >
        신고
      </button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="report-title"
              className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="report-title" className="mb-3 text-lg font-bold text-gray-900">
                신고하기
              </h2>
              <div className="space-y-1">
                {REASONS.map((r) => (
                  <label key={r} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100">
                    <input
                      type="radio"
                      name="report-reason"
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="accent-primary"
                    />
                    <span className="text-sm text-gray-800">{r}</span>
                  </label>
                ))}
              </div>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                maxLength={250}
                rows={3}
                placeholder={reason === '기타' ? '신고 사유를 적어주세요.' : '덧붙일 내용 (선택)'}
                className="mt-3 w-full rounded-lg border border-gray-300 p-2 text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">관리자가 확인한 뒤 처리합니다. 같은 글은 한 번만 신고할 수 있어요.</p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={sending}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {sending ? '보내는 중…' : '신고'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
