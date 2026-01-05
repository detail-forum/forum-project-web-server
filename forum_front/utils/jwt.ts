// JWT 토큰에서 payload 추출
export function decodeJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    return null
  }
}

// JWT 토큰에서 username 추출
export function getUsernameFromToken(): string | null {
  if (typeof window === 'undefined') return null
  
  const { getCookie } = require('@/utils/cookies')
  const token = getCookie('accessToken')
  if (!token) return null

  const decoded = decodeJWT(token)
  return decoded?.sub || decoded?.username || null
}

// JWT 토큰 만료 여부 확인
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = decodeJWT(token)
    if (!decoded || !decoded.exp) return true
    
    // exp는 초 단위이므로 밀리초로 변환
    const expirationTime = decoded.exp * 1000
    const currentTime = Date.now()
    
    // 만료 시간이 현재 시간보다 작으면 만료됨
    return expirationTime < currentTime
  } catch (error) {
    return true
  }
}

// JWT 토큰 만료까지 남은 시간 (밀리초)
export function getTokenExpirationTime(token: string): number | null {
  try {
    const decoded = decodeJWT(token)
    if (!decoded || !decoded.exp) return null
    
    const expirationTime = decoded.exp * 1000
    const currentTime = Date.now()
    
    return Math.max(0, expirationTime - currentTime)
  } catch (error) {
    return null
  }
}

// JWT 토큰이 곧 만료될지 확인 (5분 이내)
export function isTokenExpiringSoon(token: string): boolean {
  const timeUntilExpiration = getTokenExpirationTime(token)
  if (timeUntilExpiration === null) return true
  
  // 5분(300000ms) 이내면 곧 만료됨
  return timeUntilExpiration < 5 * 60 * 1000
}
