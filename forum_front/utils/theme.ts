export type ThemeMode = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'theme'

declare global {
  interface Window {
    __applyTheme?: () => void
  }
}

/**
 * layout.tsx의 <head>에서 화면을 그리기 전에 실행한다(새로고침 때 깜빡임 방지).
 * 저장된 선택이 없으면 OS 설정을 따르고, OS 설정이 바뀌면 즉시 따라간다.
 */
export const themeInitScript = `(function(){
  var media = window.matchMedia('(prefers-color-scheme: dark)');
  function apply() {
    var mode = null;
    try { mode = localStorage.getItem('${STORAGE_KEY}'); } catch (e) {}
    var dark = mode === 'dark' || (mode !== 'light' && media.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }
  window.__applyTheme = apply;
  apply();
  media.addEventListener('change', apply);
})();`

export function getThemeMode(): ThemeMode {
  try {
    const mode = localStorage.getItem(STORAGE_KEY)
    return mode === 'light' || mode === 'dark' ? mode : 'system'
  } catch {
    return 'system'
  }
}

function isDark(mode: ThemeMode) {
  return mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
}

export function setThemeMode(mode: ThemeMode) {
  const root = document.documentElement
  const apply = () => {
    try {
      if (mode === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // 저장이 막힌 브라우저(사생활 보호 모드 등)에서는 이번 화면에만 적용된다.
      root.dataset.theme = isDark(mode) ? 'dark' : 'light'
      return
    }
    window.__applyTheme?.()
  }

  // 밝기가 실제로 바뀔 때 화면이 천천히 밝아지거나 어두워지게 한다. 지원하지 않는 브라우저나 동작 줄이기 설정이면 바로 바꾼다.
  const changing = (root.dataset.theme === 'dark') !== isDark(mode)
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!changing || reduceMotion || !document.startViewTransition) {
    apply()
    return
  }
  root.classList.add('theme-fade')
  document.startViewTransition(apply).finished.finally(() => root.classList.remove('theme-fade'))
}
