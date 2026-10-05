import { useEffect, useState } from 'react'

export type ThemePref = 'system' | 'light' | 'dark'

const KEY = 'tapas-theme'
const META_COLORS = { light: '#f6fafb', dark: '#101a20' }

export const readTheme = (): ThemePref => {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

/** Sets data-theme on <html> (index.html runs the same logic before first paint). */
export function applyTheme(pref: ThemePref) {
  const root = document.documentElement
  if (pref === 'system') delete root.dataset.theme
  else root.dataset.theme = pref
  const dark = pref === 'dark' || (pref === 'system' && systemDark())
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? META_COLORS.dark : META_COLORS.light)
}

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(readTheme)

  useEffect(() => {
    applyTheme(pref)
    if (pref !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [pref])

  const set = (p: ThemePref) => {
    try {
      if (p === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, p)
    } catch {
      // storage unavailable (private mode) — theme still applies for this session
    }
    setPref(p)
  }

  return [pref, set] as const
}
