'use client'

import { motion } from 'framer-motion'

// 텍스트를 문자 단위로 분할하여 애니메이션하는 컴포넌트
function SplitText({ text, delay = 0, className = '' }: { text: string; delay?: number; className?: string }) {
  const chars = text.split('')
  
  return (
    <span className={className}>
      {chars.map((char, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: delay + index * 0.05,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{ display: 'inline-block' }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </span>
  )
}

// 페이드 인 애니메이션 컴포넌트
function FadeContent({ children, delay = 0, duration = 1 }: { children: React.ReactNode; delay?: number; duration?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  )
}

// 바운스 애니메이션 컴포넌트
function Bounce({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: 0.7,
        type: 'spring',
        stiffness: 200,
        damping: 10,
      }}
      whileHover={{ scale: 1.05 }}
    >
      {children}
    </motion.div>
  )
}

export default function Hero() {
  return (
    <section className="bg-gradient-to-br from-primary/10 via-white to-secondary/10 py-20 relative overflow-hidden">
      {/* 배경 애니메이션 효과 */}
      <div className="absolute inset-0 opacity-20">
        <motion.div
          className="absolute top-0 left-1/4 w-72 h-72 bg-primary rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute top-0 right-1/4 w-72 h-72 bg-secondary rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 4,
            delay: 0.7,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute -bottom-8 left-1/2 w-72 h-72 bg-primary rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 4,
            delay: 1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
      {/* 아래쪽을 페이지 배경으로 자연스럽게 잇는다 */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 mb-6">
            <SplitText text="개발자들을 위한" delay={0.1} />
            <br />
            <span className="text-primary">
              <SplitText text="SNS 서비스" delay={0.5} />
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

