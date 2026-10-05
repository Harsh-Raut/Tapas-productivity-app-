import { useRef, useState } from 'react'
import type { Core } from '../lib/useData'
import { db, exportAll, importAll, resetAll } from '../lib/db'
import { TEMPLATES, applyTemplate } from '../lib/templates'
import { todayKey } from '../lib/date'
import type { ThemePref } from '../lib/theme'
import { Button, Card, Field, SectionTitle, Segmented, inputCls } from '../components/ui'

export default function SettingsScreen({ core, theme, onTheme }: { core: Core; theme: ThemePref; onTheme: (t: ThemePref) => void }) {
  const s = core.settings!
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

  const update = (patch: Partial<typeof s>) => db.settings.update('app', patch)

  const download = async () => {
    const data = await exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `tapas-backup-${todayKey()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const restore = async (f: File) => {
    try {
      if (!confirm('Restoring replaces everything currently in the app. Continue?')) return
      await importAll(JSON.parse(await f.text()))
      setMsg('Backup restored ✓')
    } catch (e) {
      setMsg(`Couldn’t restore: ${(e as Error).message}`)
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">You</h1>

      <SectionTitle>Appearance</SectionTitle>
      <Card className="p-4">
        <Segmented
          value={theme}
          onChange={onTheme}
          options={[{ value: 'system', label: '◐ System' }, { value: 'light', label: '☀ Light' }, { value: 'dark', label: '☾ Dark' }]}
        />
      </Card>

      <SectionTitle>Profile</SectionTitle>
      <Card className="p-4">
        <Field label="Name">
          <input className={inputCls} defaultValue={s.name} onBlur={(e) => update({ name: e.target.value.trim() })} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Wake up"><input type="time" className={inputCls} value={s.wakeTime} onChange={(e) => update({ wakeTime: e.target.value })} /></Field>
          <Field label="Lights out"><input type="time" className={inputCls} value={s.bedTime} onChange={(e) => update({ bedTime: e.target.value })} /></Field>
        </div>
        <Field label="Week starts on">
          <Segmented value={String(s.weekStartsOn) as '0' | '1'} onChange={(v) => update({ weekStartsOn: +v as 0 | 1 })} options={[{ value: '1', label: 'Monday' }, { value: '0', label: 'Sunday' }]} />
        </Field>
      </Card>

      <SectionTitle>Add a template</SectionTitle>
      <Card className="divide-y divide-line">
        {TEMPLATES.filter((t) => t.habits.length).map((t) => (
          <button
            key={t.id}
            className="flex w-full items-center gap-3 px-3 py-3 text-left active:bg-surface-2"
            onClick={async () => {
              if (confirm(`Add ${t.name}'s goals, habits, blocks and rules on top of what you have?`)) {
                await applyTemplate(t)
                setMsg(`${t.name} added ✓`)
              }
            }}
          >
            <div className="text-xl">{t.emoji}</div>
            <div className="flex-1">
              <div className="text-sm font-medium">{t.name}</div>
              <div className="text-xs text-muted">{t.tagline}</div>
            </div>
            <div className="text-brand">+</div>
          </button>
        ))}
      </Card>

      <SectionTitle>Your data</SectionTitle>
      <Card className="space-y-3 p-4">
        <p className="text-xs text-muted">Everything is stored only on this device. Back it up now and then — clearing browser data erases it.</p>
        <div className="flex gap-2">
          <Button variant="soft" className="flex-1" onClick={download}>Export backup</Button>
          <Button variant="soft" className="flex-1" onClick={() => file.current?.click()}>Restore backup</Button>
        </div>
        <input ref={file} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
        {msg && <p className="text-center text-sm text-good">{msg}</p>}
      </Card>

      <SectionTitle>Danger zone</SectionTitle>
      <Button
        variant="danger"
        className="w-full"
        onClick={async () => {
          if (confirm('Erase all habits, logs and settings and start over? This cannot be undone.')) {
            await resetAll()
            window.location.hash = ''
          }
        }}
      >
        Reset everything
      </Button>

      <p className="mt-8 text-center text-xs text-muted">tapas · v0.2 · Health. Focus. Discipline.</p>
    </div>
  )
}
