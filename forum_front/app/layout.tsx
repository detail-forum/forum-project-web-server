import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ReduxProvider from '@/components/ReduxProvider'

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
      <body className={inter.className}>
        <ReduxProvider>{children}</ReduxProvider>
      </body>
    </html>
  )
}

