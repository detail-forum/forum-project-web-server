const defaultTheme = require('tailwindcss/defaultTheme')

// 색 값은 globals.css의 CSS 변수에 있다. 다크 모드는 변수만 바꾸므로 기존 클래스(bg-white, text-gray-700 등)를 고치지 않아도 따라간다.
const scale = (name) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((step) => [
      step,
      `rgb(var(--c-${name}-${step}) / <alpha-value>)`,
    ])
  )

const primary = { DEFAULT: '#12B886', ...scale('primary') }

/** @type {import('tailwindcss').Config} */
module.exports = {
  // 테마는 <html data-theme>로 정한다. utils/theme.ts 참고.
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        white: 'rgb(var(--c-white) / <alpha-value>)',
        gray: scale('gray'),
        red: scale('red'),
        yellow: scale('yellow'),
        green: scale('green'),
        primary,
        // 브랜드색을 하나로 맞춘다. 기존 blue-* 클래스도 브랜드 초록으로 보인다.
        blue: primary,
        secondary: '#20C997',
      },
      // 글자색 white는 이미지·색 버튼 위에 쓰이므로 다크 모드에서도 흰색이다.
      textColor: { white: '#fff' },
      // 배경용 회색은 따로 둔다. 다크 모드에서 옅은 단계만 어두워지고, 진한 단계(툴팁·말풍선)는 진하게 남는다.
      backgroundColor: { gray: scale('graybg') },
      fontFamily: {
        sans: ['"Pretendard Variable"', 'Pretendard', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
}
