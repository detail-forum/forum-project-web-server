'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 채팅 메시지 영역의 자동 스크롤.
 * 사용자가 아래쪽에 있을 때만 새 메시지를 따라 내려가고, 위를 보고 있으면 건드리지 않는다.
 * 목록을 통째로 다시 받은 직후(markReplaced)에는 한 번 건너뛴다.
 * ready는 메시지 영역이 화면에 붙었는지 여부다 (로딩 화면 동안에는 false).
 */
export function useChatScroll(messages: unknown[], ready: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const distanceFromBottom = () => {
    const el = containerRef.current
    return el ? el.scrollHeight - el.scrollTop - el.clientHeight : 0
  }

  const scrollToBottom = () => {
    if (containerRef.current && endRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }

  const checkScrollPosition = useCallback(() => {
    if (!containerRef.current) return
    setIsScrolledToBottom(distanceFromBottom() < 50)
    setIsUserScrolling(true)
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    scrollTimeoutRef.current = setTimeout(() => setIsUserScrolling(false), 200)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let debounce: NodeJS.Timeout | null = null
    const handleScroll = () => {
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(checkScrollPosition, 50)
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (debounce) clearTimeout(debounce)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [checkScrollPosition, ready])

  useEffect(() => {
    if (initialLoad) {
      setInitialLoad(false)
      return
    }
    if (isScrolledToBottom && !isUserScrolling) {
      const timeoutId = setTimeout(() => {
        if (containerRef.current && !isUserScrolling && distanceFromBottom() < 100) scrollToBottom()
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [messages, isScrolledToBottom, initialLoad, isUserScrolling])

  return {
    containerRef,
    endRef,
    /** 목록을 통째로 다시 받았을 때 */
    markReplaced: () => setInitialLoad(true),
    /** 새 메시지가 붙었을 때: 아래쪽 근처면 따라 내려간다 */
    followIfNearBottom: () => {
      if (containerRef.current && distanceFromBottom() < 100) scrollToBottom()
    },
  }
}
