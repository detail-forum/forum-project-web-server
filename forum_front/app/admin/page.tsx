'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store/store'
import Header from '@/components/Header'
import { adminApi, authApi } from '@/services/api'
import { getErrorMessage } from '@/utils/errorHandler'
import type { AdminComment, AdminPost, AdminReport, AdminStats, AdminUser, PageOf, ReportStatus } from '@/types/api'

type Tab = 'overview' | 'reports' | 'users' | 'posts' | 'comments' | 'notice'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: '개요' },
  { id: 'reports', label: '신고' },
  { id: 'users', label: '사용자' },
  { id: 'posts', label: '게시글' },
  { id: 'comments', label: '댓글' },
  { id: 'notice', label: '공지' },
]

const formatDate = (value: string) => (value ? new Date(value).toLocaleString('ko-KR') : '')

export default function AdminPage() {
  const router = useRouter()
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  // null: 확인 중, true/false: 관리자 여부. 관리자가 아니면 관리 API를 아예 부르지 않는다.
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('overview')

  useEffect(() => {
    if (!isAuthenticated) {
      setIsAdmin(false)
      return
    }
    authApi
      .getCurrentUser()
      .then((res) => setIsAdmin(res.success && res.data?.role === 'ADMIN'))
      .catch(() => setIsAdmin(false))
  }, [isAuthenticated])

  return (
    <div className="min-h-screen bg-white">
      <Header onLoginClick={() => router.push('/')} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">서비스 관리</h1>
        <p className="text-gray-500 mb-6">신고를 처리하고 사용자, 게시글, 댓글을 관리하며 전체 공지를 보냅니다.</p>

        {isAdmin === null && <p className="text-gray-500">권한을 확인하는 중...</p>}
        {isAdmin === false && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-gray-700">
            관리자만 볼 수 있는 페이지입니다.{' '}
            <Link href="/" className="text-primary hover:underline">
              메인으로
            </Link>
          </div>
        )}
        {isAdmin && (
          <>
            <div className="inline-flex p-1 bg-gray-100 rounded-lg mb-6" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                    tab === t.id ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {tab === 'overview' && <Overview />}
            {tab === 'reports' && <ReportsTab />}
            {tab === 'users' && <UsersTab />}
            {tab === 'posts' && <PostsTab />}
            {tab === 'comments' && <CommentsTab />}
            {tab === 'notice' && <NoticeTab />}
          </>
        )}
      </main>
    </div>
  )
}

function Overview() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi
      .getStats()
      .then((res) => setStats(res.data))
      .catch((e) => setError(getErrorMessage(e)))
  }, [])

  if (error) return <ErrorBox message={error} />
  if (!stats) return <p className="text-gray-500">불러오는 중...</p>

  const items = [
    { label: '처리 대기 신고', value: stats.openReports },
    { label: '사용자', value: stats.users },
    { label: '정지된 사용자', value: stats.suspendedUsers },
    { label: '게시글', value: stats.posts },
    { label: '모임 게시글', value: stats.groupPosts },
    { label: '댓글', value: stats.comments },
    { label: '모임', value: stats.groups },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500">{item.label}</div>
          <div className="mt-1 text-3xl font-bold tracking-tight text-gray-900">{item.value.toLocaleString()}</div>
        </div>
      ))}
    </div>
  )
}

/** 검색어 + 페이지를 가진 목록. 탭마다 불러오는 함수만 다르다. */
function usePagedList<T>(load: (keyword: string, page: number) => Promise<{ data?: PageOf<T> }>) {
  const [keyword, setKeyword] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [data, setData] = useState<PageOf<T> | null>(null)
  const [error, setError] = useState('')

  const reload = useCallback(() => {
    setError('')
    load(query, page)
      .then((res) => setData(res.data ?? null))
      .catch((e) => setError(getErrorMessage(e)))
  }, [load, query, page])

  useEffect(() => {
    reload()
  }, [reload])

  const search = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(0)
    setQuery(keyword.trim())
  }

  return { keyword, setKeyword, search, page, setPage, data, error, reload }
}

function SearchForm({ value, onChange, onSubmit, placeholder }: {
  value: string
  onChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  placeholder: string
}) {
  return (
    <form onSubmit={onSubmit} className="flex gap-2 mb-4">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
      />
      <button type="submit" className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors">
        검색
      </button>
    </form>
  )
}

function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-3 mt-4 text-sm">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
        className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
      >
        이전
      </button>
      <span className="text-gray-500">
        {page + 1} / {totalPages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page + 1 >= totalPages}
        className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
      >
        다음
      </button>
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm mb-4">{message}</div>
}

const th = 'px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide'
const td = 'px-4 py-3 text-sm text-gray-700 align-top'

function Table({ head, children, empty }: { head: string[]; children: React.ReactNode; empty: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>{head.map((h) => <th key={h} className={th}>{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {empty ? (
            <tr>
              <td colSpan={head.length} className="px-4 py-10 text-center text-sm text-gray-500">
                결과가 없습니다.
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  )
}

function UsersTab() {
  const load = useCallback((keyword: string, page: number) => adminApi.getUsers(keyword, page), [])
  const list = usePagedList<AdminUser>(load)
  const [actionError, setActionError] = useState('')

  const toggle = async (user: AdminUser) => {
    const next = !user.suspended
    if (next && !confirm(`${user.username} 계정을 정지할까요? 바로 로그아웃되고 다시 로그인할 수 없습니다.`)) return
    try {
      setActionError('')
      await adminApi.setSuspended(user.id, next)
      list.reload()
    } catch (e) {
      setActionError(getErrorMessage(e))
    }
  }

  return (
    <section>
      <SearchForm value={list.keyword} onChange={list.setKeyword} onSubmit={list.search} placeholder="아이디, 닉네임, 이메일" />
      {(list.error || actionError) && <ErrorBox message={list.error || actionError} />}
      <Table head={['아이디', '닉네임', '이메일', '가입일', '상태', '']} empty={!list.data?.content.length}>
        {list.data?.content.map((u) => (
          <tr key={u.id}>
            <td className={td}>
              <Link href={`/users/${u.username}`} className="font-medium text-gray-900 hover:text-primary">
                {u.username}
              </Link>
              {u.role === 'ADMIN' && (
                <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-primary/10 text-primary">관리자</span>
              )}
            </td>
            <td className={td}>{u.nickname}</td>
            <td className={td}>
              {u.email}
              {!u.emailVerified && <span className="ml-1 text-xs text-gray-400">(미인증)</span>}
            </td>
            <td className={`${td} whitespace-nowrap`}>{formatDate(u.createdDate)}</td>
            <td className={td}>
              {u.suspended ? <span className="text-red-600 font-medium">정지</span> : <span className="text-gray-500">정상</span>}
            </td>
            <td className={`${td} text-right`}>
              {u.role !== 'ADMIN' && (
                <button
                  onClick={() => toggle(u)}
                  className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                    u.suspended
                      ? 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      : 'border-red-200 text-red-600 hover:bg-red-50'
                  }`}
                >
                  {u.suspended ? '정지 해제' : '정지'}
                </button>
              )}
            </td>
          </tr>
        ))}
      </Table>
      <Pager page={list.page} totalPages={list.data?.totalPages ?? 0} onChange={list.setPage} />
    </section>
  )
}

function PostsTab() {
  const [groupPost, setGroupPost] = useState(false)
  const load = useCallback((keyword: string, page: number) => adminApi.getPosts(keyword, groupPost, page), [groupPost])
  const list = usePagedList<AdminPost>(load)
  const [actionError, setActionError] = useState('')

  const remove = async (post: AdminPost) => {
    if (!confirm(`"${post.title}" 글을 삭제할까요?`)) return
    try {
      setActionError('')
      await adminApi.deletePost(post.id, post.groupPost)
      list.reload()
    } catch (e) {
      setActionError(getErrorMessage(e))
    }
  }

  const postUrl = (p: AdminPost) =>
    p.groupPost || p.groupId ? `/social-gathering/${p.groupId}/posts/${p.id}` : `/posts/${p.id}`

  return (
    <section>
      <div className="inline-flex p-1 bg-gray-100 rounded-lg mb-4">
        {[
          { value: false, label: '일반 게시글' },
          { value: true, label: '모임 게시글' },
        ].map((option) => (
          <button
            key={option.label}
            onClick={() => {
              setGroupPost(option.value)
              list.setPage(0)
            }}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              groupPost === option.value ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <SearchForm value={list.keyword} onChange={list.setKeyword} onSubmit={list.search} placeholder="제목으로 검색" />
      {(list.error || actionError) && <ErrorBox message={list.error || actionError} />}
      <Table head={['제목', '작성자', '조회수', '작성일', '']} empty={!list.data?.content.length}>
        {list.data?.content.map((p) => (
          <tr key={`${p.groupPost}-${p.id}`}>
            <td className={td}>
              <Link href={postUrl(p)} className="font-medium text-gray-900 hover:text-primary" target="_blank">
                {p.title}
              </Link>
            </td>
            <td className={td}>{p.username}</td>
            <td className={td}>{p.views}</td>
            <td className={`${td} whitespace-nowrap`}>{formatDate(p.createdTime)}</td>
            <td className={`${td} text-right`}>
              <button
                onClick={() => remove(p)}
                className="px-3 py-1 text-xs rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              >
                삭제
              </button>
            </td>
          </tr>
        ))}
      </Table>
      <Pager page={list.page} totalPages={list.data?.totalPages ?? 0} onChange={list.setPage} />
    </section>
  )
}

function CommentsTab() {
  const load = useCallback((keyword: string, page: number) => adminApi.getComments(keyword, page), [])
  const list = usePagedList<AdminComment>(load)
  const [actionError, setActionError] = useState('')

  const remove = async (comment: AdminComment) => {
    if (!confirm('이 댓글을 삭제할까요?')) return
    try {
      setActionError('')
      await adminApi.deleteComment(comment.id)
      list.reload()
    } catch (e) {
      setActionError(getErrorMessage(e))
    }
  }

  const postUrl = (c: AdminComment) =>
    c.groupPostId ? `/social-gathering/${c.groupId}/posts/${c.groupPostId}` : `/posts/${c.postId}`

  return (
    <section>
      <SearchForm value={list.keyword} onChange={list.setKeyword} onSubmit={list.search} placeholder="댓글 내용으로 검색" />
      {(list.error || actionError) && <ErrorBox message={list.error || actionError} />}
      <Table head={['내용', '작성자', '작성일', '']} empty={!list.data?.content.length}>
        {list.data?.content.map((c) => (
          <tr key={c.id}>
            <td className={`${td} max-w-md`}>
              <p className="whitespace-pre-wrap break-words">{c.body}</p>
              <Link href={postUrl(c)} className="text-xs text-primary hover:underline" target="_blank">
                원문 보기
              </Link>
            </td>
            <td className={td}>{c.username}</td>
            <td className={`${td} whitespace-nowrap`}>{formatDate(c.createdTime)}</td>
            <td className={`${td} text-right`}>
              <button
                onClick={() => remove(c)}
                className="px-3 py-1 text-xs rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              >
                삭제
              </button>
            </td>
          </tr>
        ))}
      </Table>
      <Pager page={list.page} totalPages={list.data?.totalPages ?? 0} onChange={list.setPage} />
    </section>
  )
}

const REPORT_STATUS: { value: ReportStatus; label: string }[] = [
  { value: 'OPEN', label: '대기' },
  { value: 'RESOLVED', label: '삭제 처리됨' },
  { value: 'DISMISSED', label: '문제없음' },
]
const TARGET_LABEL = { POST: '게시글', GROUP_POST: '모임 게시글', COMMENT: '댓글' } as const

function ReportsTab() {
  const [status, setStatus] = useState<ReportStatus>('OPEN')
  const load = useCallback((_keyword: string, page: number) => adminApi.getReports(status, page), [status])
  const list = usePagedList<AdminReport>(load)
  const [actionError, setActionError] = useState('')

  const handle = async (r: AdminReport, action: 'DELETE' | 'DISMISS') => {
    const ask =
      action === 'DELETE'
        ? `이 ${TARGET_LABEL[r.targetType]}을(를) 삭제하고 쌓인 신고 ${r.openCount}건을 처리할까요?`
        : `이 ${TARGET_LABEL[r.targetType]}에 쌓인 신고 ${r.openCount}건을 문제없음으로 닫을까요?`
    if (!confirm(ask)) return
    try {
      setActionError('')
      await adminApi.handleReport(r.id, action)
      list.reload()
    } catch (e) {
      setActionError(getErrorMessage(e))
    }
  }

  const targetUrl = (r: AdminReport) => {
    if (r.groupPostId) return `/social-gathering/${r.groupId}/posts/${r.groupPostId}`
    if (r.postId) return r.groupId && r.targetType === 'POST' ? `/social-gathering/${r.groupId}/posts/${r.postId}` : `/posts/${r.postId}`
    return null
  }

  return (
    <section>
      <div className="inline-flex p-1 bg-gray-100 rounded-lg mb-4">
        {REPORT_STATUS.map((option) => (
          <button
            key={option.value}
            onClick={() => {
              setStatus(option.value)
              list.setPage(0)
            }}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              status === option.value ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {(list.error || actionError) && <ErrorBox message={list.error || actionError} />}
      <Table head={['대상', '사유', '신고자', '신고일', '']} empty={!list.data?.content.length}>
        {list.data?.content.map((r) => {
          const url = targetUrl(r)
          return (
            <tr key={r.id}>
              <td className={`${td} max-w-sm`}>
                <div className="text-xs text-gray-500 mb-0.5">
                  {TARGET_LABEL[r.targetType]}
                  {r.targetAuthor && ` · ${r.targetAuthor}`}
                  {r.targetDeleted && <span className="ml-1 text-red-500">(삭제됨)</span>}
                  {status === 'OPEN' && r.openCount > 1 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-semibold">신고 {r.openCount}건</span>
                  )}
                </div>
                {url ? (
                  <Link href={url} className="font-medium text-gray-900 hover:text-primary break-words" target="_blank">
                    {r.targetTitle}
                  </Link>
                ) : (
                  <span className="text-gray-500">{r.targetTitle}</span>
                )}
              </td>
              <td className={`${td} max-w-xs`}>
                <p className="whitespace-pre-wrap break-words">{r.reason}</p>
              </td>
              <td className={td}>{r.reporter}</td>
              <td className={`${td} whitespace-nowrap`}>{formatDate(r.createdTime)}</td>
              <td className={`${td} text-right whitespace-nowrap`}>
                {r.status === 'OPEN' && (
                  <div className="flex justify-end gap-2">
                    {!r.targetDeleted && (
                      <button
                        onClick={() => handle(r, 'DELETE')}
                        className="px-3 py-1 text-xs rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        삭제
                      </button>
                    )}
                    <button
                      onClick={() => handle(r, 'DISMISS')}
                      className="px-3 py-1 text-xs rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      문제없음
                    </button>
                  </div>
                )}
              </td>
            </tr>
          )
        })}
      </Table>
      <Pager page={list.page} totalPages={list.data?.totalPages ?? 0} onChange={list.setPage} />
    </section>
  )
}

function NoticeTab() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return
    if (!confirm('모든 사용자에게 알림으로 보냅니다. 보낼까요?')) return
    try {
      setSending(true)
      const res = await adminApi.sendNotice(title.trim(), message.trim())
      setResult({ ok: true, text: res.message || '공지를 보냈습니다.' })
      setTitle('')
      setMessage('')
    } catch (err) {
      setResult({ ok: false, text: getErrorMessage(err) })
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={send} className="max-w-2xl space-y-4">
      <p className="text-sm text-gray-500">탈퇴하지 않은 모든 사용자의 알림함에 &quot;관리자 공지&quot;로 들어갑니다.</p>
      <div>
        <label htmlFor="notice-title" className="block text-sm font-medium text-gray-700 mb-1">
          제목
        </label>
        <input
          id="notice-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
        />
      </div>
      <div>
        <label htmlFor="notice-message" className="block text-sm font-medium text-gray-700 mb-1">
          내용 <span className="text-gray-400 font-normal">({message.length}/500)</span>
        </label>
        <textarea
          id="notice-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          rows={5}
          required
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
        />
      </div>
      {result && (
        <div className={`rounded-lg px-4 py-3 text-sm ${result.ok ? 'bg-primary/10 text-primary-800' : 'bg-red-50 text-red-700'}`}>
          {result.text}
        </div>
      )}
      <button
        type="submit"
        disabled={sending || !title.trim() || !message.trim()}
        className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
      >
        {sending ? '보내는 중...' : '전체 공지 보내기'}
      </button>
    </form>
  )
}
