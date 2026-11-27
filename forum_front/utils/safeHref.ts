// 글 본문 링크는 사용자 입력이다. javascript: 같은 스킴이 실행되지 않게 http(s)·mailto·상대 경로만 통과시킨다.
export const safeHref = (url?: string) => (url && /^(https?:|mailto:|\/|#)/i.test(url) ? url : undefined)
