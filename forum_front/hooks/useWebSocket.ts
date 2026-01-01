import { useEffect, useRef, useState, useCallback } from 'react'
import { Client, IMessage } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

// SockJS를 Client의 webSocketFactory에 사용하기 위한 타입 확장
declare module '@stomp/stompjs' {
  export interface Client {
    webSocketFactory?: () => any
  }
}

interface UseWebSocketOptions {
  groupId: number
  roomId: number
  onMessage?: (message: any) => void
  onTyping?: (data: { username: string; isTyping: boolean }) => void
  onRead?: (data: { messageId: number; username: string; readCount: number }) => void
  enabled?: boolean
}

export function useWebSocket({
  groupId,
  roomId,
  onMessage,
  onTyping,
  onRead,
  enabled = true,
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const clientRef = useRef<Client | null>(null)
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // 토큰 가져오기
  const getToken = useCallback(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('accessToken')
  }, [])

  useEffect(() => {
    if (!enabled || !groupId || !roomId) return

    const token = getToken()
    if (!token) {
      console.warn('WebSocket 연결 실패: 토큰이 없습니다.')
      return
    }

    // API URL에서 /api 제거하고 WebSocket 엔드포인트 생성
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://forum.rjsgud.com/api'
    const wsUrl = apiUrl.replace('/api', '')
    const socketUrl = `${wsUrl}/ws`

    const client = new Client({
      webSocketFactory: () => {
        return new SockJS(socketUrl) as any
      },
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str) => {
        // 개발 환경에서만 디버그 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.log('STOMP:', str)
        }
      },
      onConnect: () => {
        setIsConnected(true)
        console.log('WebSocket 연결 성공')
        
        if (!clientRef.current) return

        // 채팅방 메시지 구독
        clientRef.current.subscribe(
          `/topic/chat/${groupId}/${roomId}`,
          (message: IMessage) => {
            try {
              const data = JSON.parse(message.body)
              onMessage?.(data)
            } catch (error) {
              console.error('메시지 파싱 오류:', error)
            }
          }
        )

        // 타이핑 인디케이터 구독
        clientRef.current.subscribe(
          `/topic/chat/${groupId}/${roomId}/typing`,
          (message: IMessage) => {
            try {
              const data = JSON.parse(message.body)
              onTyping?.(data)
              
              if (data.isTyping) {
                setTypingUsers(prev => new Set(prev).add(data.username))
                
                // 3초 후 자동으로 타이핑 종료
                const existingTimeout = typingTimeoutRef.current.get(data.username)
                if (existingTimeout) {
                  clearTimeout(existingTimeout)
                }
                
                const timeout = setTimeout(() => {
                  setTypingUsers(prev => {
                    const next = new Set(prev)
                    next.delete(data.username)
                    return next
                  })
                }, 3000)
                
                typingTimeoutRef.current.set(data.username, timeout)
              } else {
                setTypingUsers(prev => {
                  const next = new Set(prev)
                  next.delete(data.username)
                  return next
                })
                
                const timeout = typingTimeoutRef.current.get(data.username)
                if (timeout) {
                  clearTimeout(timeout)
                  typingTimeoutRef.current.delete(data.username)
                }
              }
            } catch (error) {
              console.error('타이핑 데이터 파싱 오류:', error)
            }
          }
        )

        // 읽음 표시 구독
        clientRef.current.subscribe(
          `/topic/chat/${groupId}/${roomId}/read`,
          (message: IMessage) => {
            try {
              const data = JSON.parse(message.body)
              onRead?.(data)
            } catch (error) {
              console.error('읽음 데이터 파싱 오류:', error)
            }
          }
        )
      },
      onDisconnect: () => {
        setIsConnected(false)
        console.log('WebSocket 연결 종료')
      },
      onStompError: (frame) => {
        console.error('STOMP 오류:', frame)
        setIsConnected(false)
      },
      onWebSocketError: (event) => {
        console.error('WebSocket 오류:', event)
        setIsConnected(false)
      },
    })

    clientRef.current = client
    client.activate()

    return () => {
      // 타이핑 타임아웃 정리
      typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout))
      typingTimeoutRef.current.clear()
      
      // 연결 종료
      if (clientRef.current) {
        clientRef.current.deactivate()
        clientRef.current = null
      }
    }
  }, [groupId, roomId, onMessage, onTyping, onRead, enabled, getToken])

  const sendMessage = useCallback((message: string) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish({
        destination: `/app/chat/${groupId}/${roomId}/send`,
        body: JSON.stringify({ message }),
      })
      return true
    }
    return false
  }, [groupId, roomId])

  const startTyping = useCallback(() => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish({
        destination: `/app/chat/${groupId}/${roomId}/typing/start`,
        body: JSON.stringify({}),
      })
    }
  }, [groupId, roomId])

  const stopTyping = useCallback(() => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish({
        destination: `/app/chat/${groupId}/${roomId}/typing/stop`,
        body: JSON.stringify({}),
      })
    }
  }, [groupId, roomId])

  const markAsRead = useCallback((messageId: number) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish({
        destination: `/app/chat/${groupId}/${roomId}/read`,
        body: JSON.stringify({ messageId }),
      })
    }
  }, [groupId, roomId])

  return {
    isConnected,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    typingUsers: Array.from(typingUsers),
  }
}
