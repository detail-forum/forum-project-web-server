// 사용자 친화적인 에러 메시지 변환
export function getErrorMessage(error: any): string {
  if (!error) return '알 수 없는 오류가 발생했습니다.'

  // 네트워크 에러
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return '요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
  }

  if (!error.response) {
    return '네트워크 연결을 확인해주세요.'
  }

  const status = error.response?.status
  const data = error.response?.data

  // Validation 에러 처리 (400)
  if (status === 400) {
    // ValidationErrorDTO는 toString()으로 반환되므로 파싱 필요
    // 형식: "message: ...\nerrors:\n - field: error"
    if (typeof data === 'string') {
      // " - field: error" 형식으로 파싱
      const errorLines = data.split('\n').filter(line => line.trim().startsWith('-'))
      if (errorLines.length > 0) {
        const errorMessages = errorLines.map(line => {
          // " - field: error" 형식에서 error 부분 추출
          const match = line.match(/-\s*\w+:\s*(.+)$/)
          return match ? match[1].trim() : line.replace(/^-\s*\w+:\s*/, '').trim()
        })
        return errorMessages.join(', ')
      }
      
      // "message: ..." 형식에서 메시지 추출
      const messageMatch = data.match(/message:\s*(.+?)(?:\n|$)/)
      if (messageMatch) {
        return messageMatch[1].trim()
      }
    }

    // 일반 400 에러 (ApiResponse 형태)
    if (data?.message) {
      return data.message
    }
    return '입력한 정보를 다시 확인해주세요.'
  }

  // 401 Unauthorized
  if (status === 401) {
    if (data?.message) {
      // 로그인 관련 에러 메시지 개선
      const message = data.message
      if (message.includes('인증') || message.includes('토큰')) {
        return '로그인이 필요합니다. 다시 로그인해주세요.'
      }
      if (message.includes('비밀번호') || message.includes('아이디') || message.includes('Bad credentials')) {
        return '아이디 또는 비밀번호가 틀렸습니다.'
      }
      return message
    }
    return '아이디 또는 비밀번호가 틀렸습니다.'
  }

  // 403 Forbidden
  if (status === 403) {
    if (data?.message) {
      return data.message
    }
    return '접근 권한이 없습니다.'
  }

  // 404 Not Found
  if (status === 404) {
    if (data?.message) {
      return data.message
    }
    return '요청한 정보를 찾을 수 없습니다.'
  }

  // 500 Server Error
  if (status >= 500) {
    return '서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
  }

  // 기본 에러 메시지
  if (data?.message) {
    return data.message
  }

  return '오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
}

// 필드별 에러 추출 (Validation 에러용)
export function getFieldErrors(error: any): Record<string, string> {
  const fieldErrors: Record<string, string> = {}

  if (!error?.response?.data) return fieldErrors

  const data = error.response.data

  // ValidationErrorDTO 파싱 (toString() 형식)
  // 형식: "message: ...\nerrors:\n - field: error"
  if (typeof data === 'string') {
    // " - field: error" 형식으로 파싱
    const errorLines = data.split('\n').filter(line => line.trim().startsWith('-'))
    errorLines.forEach(line => {
      // " - field: error" 형식에서 field와 error 추출
      const match = line.match(/-\s*(\w+):\s*(.+)$/)
      if (match) {
        const field = match[1].trim()
        const errorMsg = match[2].trim()
        fieldErrors[field] = errorMsg
      }
    })
  }

  return fieldErrors
}

