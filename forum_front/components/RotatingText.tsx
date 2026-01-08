'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

interface RotatingTextProps {
  words: string[]
  duration?: number
  className?: string
  baseText?: string
  separator?: string
}

export default function RotatingText({
  words,
  duration = 2,
  className = '',
  baseText = '',
  separator = ' ',
}: RotatingTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length)
        setIsAnimating(false)
      }, 600) // 애니메이션 시간
    }, duration * 1000)

    return () => clearInterval(interval)
  }, [words.length, duration])

  const currentWord = words[currentIndex]
  const chars = currentWord.split('')

  return (
    <span className={className}>
      {baseText && <span>{baseText}</span>}
      {baseText && separator && <span>{separator}</span>}
      <span className="relative inline-block min-w-[200px] text-left">
        <AnimatePresence mode="wait">
          <motion.span
            key={currentIndex}
            className="inline-block"
            initial={false}
          >
            {chars.map((char, index) => {
              // 오른쪽부터 시작하므로 역순으로 delay 적용
              const delay = (chars.length - 1 - index) * 0.05
              
              return (
                <motion.span
                  key={`${currentIndex}-${index}`}
                  initial={{ opacity: 0, y: 30, rotateX: -90 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0, 
                    rotateX: 0 
                  }}
                  exit={{ 
                    opacity: 0, 
                    y: -30, 
                    rotateX: 90 
                  }}
                  transition={{
                    duration: 0.4,
                    delay: delay,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="inline-block"
                  style={{ 
                    transformStyle: 'preserve-3d',
                    display: 'inline-block'
                  }}
                >
                  {char === ' ' ? '\u00A0' : char}
                </motion.span>
              )
            })}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  )
}
