import { ref } from 'vue'

type Theme = 'light' | 'dark'
const KEY = 'aptoph.web.theme'

const theme = ref<Theme>('light')

function apply(value: Theme) {
  theme.value = value
  document.documentElement.classList.toggle('dark', value === 'dark')
}

/**
 * Class-based dark mode (`.dark` on <html>).
 * Defaults to the OS preference until the user picks one.
 */
export function initTheme() {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(KEY)
  } catch {
    // ignore
  }
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  apply(stored === 'dark' || stored === 'light' ? stored : prefersDark ? 'dark' : 'light')
}

export function useTheme() {
  function toggle() {
    const next = theme.value === 'dark' ? 'light' : 'dark'
    apply(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // ignore
    }
  }
  return { theme, toggle }
}
