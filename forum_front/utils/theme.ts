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

export function setThemeMode(mode: ThemeMode) {
  try {
    if (mode === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // 저장이 막힌 브라우저(사생활 보호 모드 등)에서는 이번 화면에만 적용된다.
    document.documentElement.dataset.theme =
      mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ? 'dark'
        : 'light'
    return
  }
  window.__applyTheme?.()
}
