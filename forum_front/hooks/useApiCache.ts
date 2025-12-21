import { useRef, useCallback } from 'react'
import { cache } from '@/utils/cache'

interface CacheOptions {
  ttl?: number // Time to live in milliseconds (default: 1 minute)
  key?: string
}

export function useApiCache<T>(
  apiCall: () => Promise<T>,
  options: CacheOptions = {}
) {
  const { ttl = 60000, key } = options
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchWithCache = useCallback(async (cacheKey: string): Promise<T> => {
    // 캐시 확인
    const cached = cache.get<T>(cacheKey)
    if (cached) {
      return cached
    }

    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // 새 요청 생성
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const data = await apiCall()
      
      // 요청이 취소되지 않았으면 캐시에 저장
      if (!abortController.signal.aborted) {
        cache.set(cacheKey, data, ttl)
      }
      
      return data
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw error
      }
      throw error
    }
  }, [apiCall, ttl])

  return { fetchWithCache }
}

