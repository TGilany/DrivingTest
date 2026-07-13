import { useState } from 'react'
import { getTheme, setTheme, type Theme } from '../lib/theme'

export function ThemeToggle() {
  const [theme, set] = useState<Theme>(getTheme)
  const flip = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    set(next)
  }
  return (
    <button
      className="fixed top-3.5 right-3.5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-xl shadow dark:border-slate-600 dark:bg-slate-900"
      onClick={flip}
      aria-label="Toggle dark mode"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
