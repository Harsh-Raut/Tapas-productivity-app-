import { useEffect, useState } from 'react'

export type Tab = 'today' | 'stats' | 'habits' | 'plan' | 'settings'
const TABS: Tab[] = ['today', 'stats', 'habits', 'plan', 'settings']

const read = (): Tab => {
  const h = window.location.hash.replace('#/', '') as Tab
  return TABS.includes(h) ? h : 'today'
}

/** Minimal hash router — enough for a 5-tab app. */
export function useTab() {
  const [tab, setTab] = useState<Tab>(read)
  useEffect(() => {
    const onHash = () => setTab(read())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return tab
}

export const go = (tab: Tab) => {
  window.location.hash = `/${tab}`
}
