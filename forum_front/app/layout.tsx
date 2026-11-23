import type { Metadata } from 'next'
import './globals.css'
import ReduxProvider from '@/components/ReduxProvider'
import Footer from '@/components/Footer'
import ClickSpark from '@/components/ClickSpark/ClickSpark'
import { themeInitScript } from '@/utils/theme'

export const metadata: Metadata = {
  title: 'rjsgud\'s forum',
  description: '게시판 서비스',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // data-theme은 아래 스크립트가 hydration 전에 넣으므로 경고를 끈다.
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* 한글 폰트. dynamic-subset은 화면에 쓰인 글자만 내려받는다. */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="font-sans flex flex-col min-h-screen">
        <ReduxProvider>
          <div className="flex-1">
            <ClickSpark
              lightBgColor="rgba(18,184,134,1)"
              darkBgColor="rgba(18,184,134,1)"
                sparkColor='rgba(18,184,134,1)'
                sparkSize={10}
                sparkRadius={15}
                sparkCount={8}
                duration={400}
                >
              {children}
            </ClickSpark>
          </div>
          <Footer />
        </ReduxProvider>
      </body>
    </html>
  )
}

