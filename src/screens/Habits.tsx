import { useState } from 'react'
import type { Core } from '../lib/useData'
import { db, uid } from '../lib/db'
import { deleteHabit } from '../lib/actions'
import { DAY_SHORT } from '../lib/date'
import type { Frequency, Habit, HabitType, Preset } from '../lib/types'
import { Button, Card, DayPicker, Empty, Field, SectionTitle, Segmented, Sheet, inputCls } from '../components/ui'

const TYPE_INFO: Record<HabitType, { label: string; hint: string }> = {
  check: { label: 'Yes / No', hint: 'Done or not done — e.g. “Morning sunlight”.' },
  number: { label: 'Amount', hint: 'Reach a target amount — e.g. 124 g protein, 3.5 L water.' },
  duration: { label: 'Time', hint: 'Reach a number of minutes — e.g. 90 min deep work.' },
  avoid: { label: 'Avoid', hint: 'Kept by default; log a slip if it happens — e.g. “No phone first 3 hours”.' },
}

const describeFrequency = (f: Frequency) => {
  if (f.kind === 'daily') return 'Every day'
  if (f.kind === 'timesPerWeek') return `${f.count}× a week`
  if (f.days.length === 7) return 'Every day'
  return f.days.map((d) => DAY_SHORT[d]).join(' ')
}

export default function Habits({ core }: { core: Core }) {
  const [editing, setEditing] = useState<Habit | 'new' | null>(null)
  const { habits, goals, blocks } = core
  const active = habits.filter((h) => !h.archived)
  const archived = habits.filter((h) => h.archived)

  const groups = [
    ...goals.filter((g) => !g.archived).map((g) => ({ key: g.id, title: `${g.emoji} ${g.title}`, items: active.filter((h) => h.goalId === g.id) })),
    { key: 'none', title: 'No goal', items: active.filter((h) => !h.goalId || !goals.some((g) => g.id === h.goalId)) },
  ].filter((g) => g.items.length)

  return (
    <div>
      <header className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Habits</h1>
        <Button onClick={() => setEditing('new')}>+ New</Button>
      </header>

      {active.length === 0 && <Empty emoji="✨" title="Build your system" text="Habits are the daily actions that move your goals." />}

      {groups.map((g) => (
        <section key={g.key}>
          <SectionTitle>{g.title}</SectionTitle>
          <Card className="divide-y divide-line">
            {g.items.map((h) => {
              const block = blocks.find((b) => b.id === h.blockId)
              return (
                <button key={h.id} onClick={() => setEditing(h)} className="flex w-full items-center gap-3 px-3 py-3 text-left active:bg-surface-2">
                  <div className="text-xl">{h.emoji}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{h.name}</div>
                    <div className="truncate text-xs text-muted">
                      {TYPE_INFO[h.type].label}
                      {h.target ? ` · ${h.target} ${h.type === 'duration' ? 'min' : h.unit ?? ''}` : ''}
                      {' · '}{describeFrequency(h.frequency)}
                      {block ? ` · ${block.emoji} ${block.name}` : ''}
                    </div>
                  </div>
                  <div className="text-xs text-muted">{'●'.repeat(h.weight)}</div>
                </button>
              )
            })}
          </Card>
        </section>
      ))}

      {archived.length > 0 && (
        <>
          <SectionTitle>Archived</SectionTitle>
          <Card className="divide-y divide-line opacity-60">
            {archived.map((h) => (
              <button key={h.id} onClick={() => setEditing(h)} className="flex w-full items-center gap-3 px-3 py-3 text-left">
                <div className="text-xl">{h.emoji}</div>
                <div className="flex-1 truncate text-sm">{h.name}</div>
              </button>
            ))}
          </Card>
        </>
      )}

      {editing && <HabitEditor core={core} habit={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function HabitEditor({ core, habit, onClose }: { core: Core; habit: Habit | null; onClose: () => void }) {
  const [name, setName] = useState(habit?.name ?? '')
  const [emoji, setEmoji] = useState(habit?.emoji ?? '✅')
  const [type, setType] = useState<HabitType>(habit?.type ?? 'check')
  const [target, setTarget] = useState(habit?.target?.toString() ?? '')
  const [unit, setUnit] = useState(habit?.unit ?? '')
  const [freqKind, setFreqKind] = useState<Frequency['kind']>(habit?.frequency.kind ?? 'daily')
  const [days, setDays] = useState<number[]>(habit?.frequency.kind === 'weekdays' ? habit.frequency.days : [1, 2, 3, 4, 5])
  const [perWeek, setPerWeek] = useState(habit?.frequency.kind === 'timesPerWeek' ? habit.frequency.count : 3)
  const [blockId, setBlockId] = useState(habit?.blockId ?? '')
  const [goalId, setGoalId] = useState(habit?.goalId ?? '')
  const [weight, setWeight] = useState<1 | 2 | 3>(habit?.weight ?? 2)
  const [presets, setPresets] = useState<Preset[]>(habit?.presets ?? [])
  const [pLabel, setPLabel] = useState('')
  const [pValue, setPValue] = useState('')

  const needsTarget = type === 'number' || type === 'duration'

  const save = async () => {
    const frequency: Frequency =
      freqKind === 'daily' ? { kind: 'daily' } : freqKind === 'weekdays' ? { kind: 'weekdays', days } : { kind: 'timesPerWeek', count: perWeek }
    const t = parseFloat(target)
    const data = {
      name: name.trim(),
      emoji: emoji.trim() || '✅',
      type,
      target: needsTarget && Number.isFinite(t) ? t : undefined,
      unit: type === 'number' ? unit.trim() || undefined : type === 'duration' ? 'min' : undefined,
      frequency,
      blockId: blockId || undefined,
      goalId: goalId || undefined,
      weight,
      presets: needsTarget ? presets : [],
    }
    if (habit) await db.habits.update(habit.id, data)
    else await db.habits.add({ ...data, id: uid(), order: core.habits.length, createdAt: Date.now() })
    onClose()
  }

  const addPreset = () => {
    const v = parseFloat(pValue)
    if (!pLabel.trim() || !Number.isFinite(v)) return
    setPresets([...presets, { label: pLabel.trim(), value: v }])
    setPLabel('')
    setPValue('')
  }

  return (
    <Sheet open onClose={onClose} title={habit ? 'Edit habit' : 'New habit'}>
      <div className="flex gap-2">
        <Field label="Icon">
          <input className={`${inputCls} w-16! text-center text-xl`} value={emoji} onChange={(e) => setEmoji(e.target.value)} />
        </Field>
        <div className="flex-1">
          <Field label="Name">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Deep work" autoFocus={!habit} />
          </Field>
        </div>
      </div>

      <Field label="Type" hint={TYPE_INFO[type].hint}>
        <Segmented value={type} onChange={setType} options={(Object.keys(TYPE_INFO) as HabitType[]).map((t) => ({ value: t, label: TYPE_INFO[t].label }))} />
      </Field>

      {needsTarget && (
        <div className="flex gap-2">
          <div className="flex-1">
            <Field label="Daily target">
              <input className={inputCls} inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={type === 'duration' ? '90' : '124'} />
            </Field>
          </div>
          <div className="w-28">
            <Field label="Unit">
              {type === 'duration' ? <div className={`${inputCls} text-muted`}>min</div> : (
                <input className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="g, L, pages" />
              )}
            </Field>
          </div>
        </div>
      )}

      {needsTarget && (
        <Field label="Quick-log presets" hint="One-tap buttons on the Today screen — e.g. “Isolate scoop = 27”.">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {presets.map((p, i) => (
              <span key={i} className="flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs">
                {p.label} · {p.value}
                <button type="button" className="text-muted" onClick={() => setPresets(presets.filter((_, j) => j !== i))}>✕</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input className={inputCls} placeholder="Label" value={pLabel} onChange={(e) => setPLabel(e.target.value)} />
            <input className={`${inputCls} w-20!`} inputMode="decimal" placeholder="Amt" value={pValue} onChange={(e) => setPValue(e.target.value)} />
            <Button variant="soft" onClick={addPreset}>Add</Button>
          </div>
        </Field>
      )}

      <Field label="How often">
        <Segmented
          value={freqKind}
          onChange={setFreqKind}
          options={[{ value: 'daily', label: 'Every day' }, { value: 'weekdays', label: 'Specific days' }, { value: 'timesPerWeek', label: 'X per week' }]}
        />
      </Field>
      {freqKind === 'weekdays' && <div className="-mt-2 mb-4"><DayPicker value={days} onChange={setDays} /></div>}
      {freqKind === 'timesPerWeek' && (
        <div className="-mt-2 mb-4 flex items-center gap-3">
          <input type="range" min={1} max={7} value={perWeek} onChange={(e) => setPerWeek(+e.target.value)} className="flex-1 accent-(--color-brand)" />
          <span className="w-16 text-sm">{perWeek}× / wk</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field label="Time block">
          <select className={inputCls} value={blockId} onChange={(e) => setBlockId(e.target.value)}>
            <option value="">Anytime</option>
            {core.blocks.map((b) => <option key={b.id} value={b.id}>{b.emoji} {b.name}</option>)}
          </select>
        </Field>
        <Field label="Goal">
          <select className={inputCls} value={goalId} onChange={(e) => setGoalId(e.target.value)}>
            <option value="">None</option>
            {core.goals.filter((g) => !g.archived).map((g) => <option key={g.id} value={g.id}>{g.emoji} {g.title}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Importance" hint="Weights this habit in your daily score.">
        <Segmented value={String(weight) as '1' | '2' | '3'} onChange={(v) => setWeight(+v as 1 | 2 | 3)} options={[{ value: '1', label: 'Nice to have' }, { value: '2', label: 'Important' }, { value: '3', label: 'Non-negotiable' }]} />
      </Field>

      <Button className="mt-2 w-full py-3" disabled={!name.trim() || (needsTarget && !target)} onClick={save}>
        {habit ? 'Save changes' : 'Create habit'}
      </Button>

      {habit && (
        <div className="mt-3 flex gap-2">
          <Button variant="soft" className="flex-1" onClick={async () => { await db.habits.update(habit.id, { archived: !habit.archived }); onClose() }}>
            {habit.archived ? 'Restore' : 'Archive'}
          </Button>
          <Button variant="danger" className="flex-1" onClick={async () => {
            if (confirm(`Delete "${habit.name}" and all its history? Archive keeps the history.`)) { await deleteHabit(habit.id); onClose() }
          }}>
            Delete
          </Button>
        </div>
      )}
    </Sheet>
  )
}
