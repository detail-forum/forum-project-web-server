import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/')
    const filename = params.path[params.path.length - 1]
    
    // 백엔드 URL 구성 (환경 변수에서 가져오기)
    // 로컬 개발 환경에서는 프로덕션 서버를 사용할 수 있도록 설정
    let uploadBaseUrl = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL
    
    // 환경 변수가 없으면 기본값 사용
    if (!uploadBaseUrl) {
      // 개발 환경에서는 프로덕션 서버 사용 (백엔드 서버가 없을 때)
      uploadBaseUrl = 'https://forum.rjsgud.com/uploads'
    }
    
    // URL 끝에 /uploads가 포함되어 있지 않으면 추가
    if (!uploadBaseUrl.endsWith('/uploads')) {
      uploadBaseUrl = uploadBaseUrl.replace(/\/$/, '') + '/uploads'
    }
    
    const backendUrl = `${uploadBaseUrl}/${path}`
    
    console.log(`[이미지 프록시] 요청: ${backendUrl}`)
    
    // 타임아웃을 위한 AbortController 생성
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    
    try {
      // 백엔드에서 이미지 가져오기
      const response = await fetch(backendUrl, {
        method: 'GET',
        headers: {
          'Accept': 'image/*',
        },
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
    
      if (!response.ok) {
        console.error(`[이미지 프록시] HTTP ${response.status}: ${backendUrl}`)
        return new NextResponse(`Image not found (${response.status})`, { 
          status: response.status 
        })
      }
      
      // 이미지 데이터 가져오기
      const imageBuffer = await response.arrayBuffer()
      
      // Content-Type 결정
      const contentType = response.headers.get('content-type') || 'image/jpeg'
      
      console.log(`[이미지 프록시] 성공: ${filename} (${contentType})`)
      
      // 이미지 반환
      return new NextResponse(imageBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
        },
      })
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error: any) {
    // AbortError (타임아웃 또는 취소)
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      console.error('[이미지 프록시] 요청 타임아웃 또는 취소됨')
      return new NextResponse(
        JSON.stringify({ 
          error: 'Request timeout',
          message: '이미지 요청이 시간 초과되었습니다.',
        }),
        { 
          status: 504,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }
    
    // 연결 거부 에러 처리
    if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      console.error('[이미지 프록시] 백엔드 서버에 연결할 수 없습니다:', error.message)
      return new NextResponse(
        JSON.stringify({ 
          error: 'Backend server is not running',
          message: '백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.',
        }),
        { 
          status: 503,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }
    
    // 네트워크 에러 처리
    if (error.message?.includes('fetch failed') || error.message?.includes('network')) {
      console.error('[이미지 프록시] 네트워크 오류:', error.message)
      return new NextResponse(
        JSON.stringify({ 
          error: 'Network error',
          message: '네트워크 오류가 발생했습니다. 인터넷 연결을 확인하세요.',
        }),
        { 
          status: 503,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }
    
    console.error('[이미지 프록시] 오류:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    })
    
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal Server Error',
        message: error.message || '이미지를 불러오는 중 오류가 발생했습니다.',
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}

