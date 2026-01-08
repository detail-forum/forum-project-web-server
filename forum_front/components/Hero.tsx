'use client'

import { useEffect, useState } from 'react'
import { SplitText, FadeContent, Bounce } from '@appletosolutions/reactbits'

export default function Hero() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <section className="bg-gradient-to-br from-primary/10 via-white to-secondary/10 py-20 relative overflow-hidden">
      {/* 배경 애니메이션 효과 */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-secondary rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-700"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-primary rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            <SplitText
              text="개발자들을 위한"
              duration={0.8}
              delay={0.1}
              from={{ opacity: 0, y: 50 }}
              to={{ opacity: 1, y: 0 }}
              splitType="chars"
            />
            <br />
            <span className="text-primary">
              <SplitText
                text="SNS 서비스"
                duration={0.8}
                delay={0.5}
                from={{ opacity: 0, y: 50 }}
                to={{ opacity: 1, y: 0 }}
                splitType="chars"
              />
            </span>
          </h1>
          
          <FadeContent delay={0.3} duration={1}>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
              지식을 공유하고 소통하는 공간입니다.
              <br />
              다양한 주제의 게시글을 작성하고 읽어보세요.
            </p>
          </FadeContent>

          <FadeContent delay={0.5} duration={1}>
            <div className="flex flex-wrap justify-center gap-6 text-sm md:text-base text-gray-500">
              <Bounce>
                <div className="flex items-center space-x-2 group cursor-pointer">
                  <span className="w-3 h-3 bg-primary rounded-full group-hover:scale-125 transition-transform"></span>
                  <span className="group-hover:text-primary transition-colors">자유로운 글쓰기</span>
                </div>
              </Bounce>
              <Bounce>
                <div className="flex items-center space-x-2 group cursor-pointer">
                  <span className="w-3 h-3 bg-primary rounded-full group-hover:scale-125 transition-transform"></span>
                  <span className="group-hover:text-primary transition-colors">실시간 소통</span>
                </div>
              </Bounce>
              <Bounce>
                <div className="flex items-center space-x-2 group cursor-pointer">
                  <span className="w-3 h-3 bg-primary rounded-full group-hover:scale-125 transition-transform"></span>
                  <span className="group-hover:text-primary transition-colors">지식 공유</span>
                </div>
              </Bounce>
            </div>
          </FadeContent>
        </div>
      </div>
    </section>
  )
}

