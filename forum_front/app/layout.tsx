import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ReduxProvider from '@/components/ReduxProvider'
import Footer from '@/components/Footer'
import ClickSpark from '@/components/ClickSpark/ClickSpark'

const inter = Inter({ subsets: ['latin'] })

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
    <html lang="ko">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
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

