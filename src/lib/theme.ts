const KEY = 'refresher-exam/theme'

export type Theme = 'light' | 'dark'

export function getTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // storage unavailable — fall through to system preference
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light'
}

export function setTheme(t: Theme): void {
  try {
    localStorage.setItem(KEY, t)
  } catch {
    // storage unavailable — theme still applies for this session
  }
  document.documentElement.dataset.theme = t
}

export function initTheme(): Theme {
  const t = getTheme()
  document.documentElement.dataset.theme = t
  return t
}
