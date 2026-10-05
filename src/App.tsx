import { useCore } from './lib/useData'
import { useTab, go, type Tab } from './lib/router'
import { useTheme } from './lib/theme'
import Onboarding from './screens/Onboarding'
import Today from './screens/Today'
import Stats from './screens/Stats'
import Habits from './screens/Habits'
import Plan from './screens/Plan'
import SettingsScreen from './screens/Settings'

// 24px line icons, drawn with currentColor so they follow the active state.
const ICONS: Record<Tab, string> = {
  today: 'M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4 7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  stats: 'M4 20h16M7 16v-5M12 16V6M17 16v-8',
  habits: 'M9 12.5l2 2 4-4.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  plan: 'M4 6h16M4 12h10M4 18h7M18 15v6M15 18h6',
  settings: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
}

const NAV: { tab: Tab; label: string }[] = [
  { tab: 'today', label: 'Today' },
  { tab: 'stats', label: 'Stats' },
  { tab: 'habits', label: 'Habits' },
  { tab: 'plan', label: 'Plan' },
  { tab: 'settings', label: 'You' },
]

export default function App() {
  const core = useCore()
  const tab = useTab()
  const [theme, setTheme] = useTheme()

  if (!core) return <div className="min-h-full bg-bg" />
  if (!core.settings?.onboarded) return <Onboarding />

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col">
      <main className="flex-1 px-4 pb-28 pt-[max(env(safe-area-inset-top),1rem)]">
        {tab === 'today' && <Today core={core} />}
        {tab === 'stats' && <Stats core={core} />}
        {tab === 'habits' && <Habits core={core} />}
        {tab === 'plan' && <Plan core={core} />}
        {tab === 'settings' && <SettingsScreen core={core} theme={theme} onTheme={setTheme} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 backdrop-blur pb-safe">
        <div className="mx-auto flex max-w-lg">
          {NAV.map((n) => {
            const active = tab === n.tab
            return (
              <button
                key={n.tab}
                onClick={() => go(n.tab)}
                className={`flex flex-1 flex-col items-center gap-1 pb-1 pt-2.5 text-[11px] font-medium ${active ? 'text-brand' : 'text-muted'}`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" className={active ? "glow-stroke" : ""}>
                  <path d={ICONS[n.tab]} />
                </svg>
                {n.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
