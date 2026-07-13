import { describe, it, expect, beforeEach } from 'vitest'
import { getTheme, setTheme, initTheme } from './theme'

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

describe('theme', () => {
  it('defaults to light when nothing saved and no matchMedia dark', () => {
    expect(getTheme()).toBe('light')
  })

  it('setTheme persists and applies data-theme', () => {
    setTheme('dark')
    expect(localStorage.getItem('refresher-exam/theme')).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(getTheme()).toBe('dark')
  })

  it('initTheme applies saved theme to the document', () => {
    localStorage.setItem('refresher-exam/theme', 'dark')
    expect(initTheme()).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('ignores garbage saved values', () => {
    localStorage.setItem('refresher-exam/theme', 'purple')
    expect(getTheme()).toBe('light')
  })
})
