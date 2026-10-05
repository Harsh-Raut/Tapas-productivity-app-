import { useState } from 'react'
import type { Core } from '../lib/useData'
import { useRangeEntries } from '../lib/useData'
import { db, uid } from '../lib/db'
import { deleteBlock, deleteGoal, deleteRule } from '../lib/actions'
import { addDays, DAY_SHORT, formatDuration, formatTime, fromKey, todayKey, toMinutes } from '../lib/date'
import { completionRate } from '../lib/scoring'
import { arcActive, arcDay } from '../lib/arcs'
import { PALETTE } from '../lib/templates'
import type { Arc, Goal, Rule, TimeBlock } from '../lib/types'
import { Bar, Button, Card, ColorPicker, DayPicker, Empty, Field, SectionTitle, Segmented, Sheet, inputCls } from '../components/ui'

type View = 'goals' | 'schedule' | 'rules' | 'arcs'

export default function Plan({ core }: { core: Core }) {
  const [view, setView] = useState<View>('goals')
  return (
    <div>
      <h1 className="mb-3 text-2xl font-bold">Plan</h1>
      <Segmented
        value={view}
        onChange={setView}
        options={[{ value: 'goals', label: 'Goals' }, { value: 'schedule', label: 'Schedule' }, { value: 'rules', label: 'Rules' }, { value: 'arcs', label: 'Arcs' }]}
      />
      {view === 'goals' && <Goals core={core} />}
      {view === 'schedule' && <Schedule core={core} />}
      {view === 'rules' && <Rules core={core} />}
      {view === 'arcs' && <Arcs core={core} />}
    </div>
  )
}

/* ---------------- Goals ---------------- */

function Goals({ core }: { core: Core }) {
  const [editing, setEditing] = useState<Goal | 'new' | null>(null)
  const today = todayKey()
  const byDate = useRangeEntries(addDays(today, -13), today)
  const goals = core.goals.filter((g) => !g.archived)

  return (
    <>
      <SectionTitle action={<button className="text-sm text-brand" onClick={() => setEditing('new')}>+ Goal</button>}>Your goals</SectionTitle>
      {goals.length === 0 && <Empty emoji="🎯" title="What are you working toward?" text="Goals give your habits a reason. Link habits to a goal to see it move." />}
      <div className="space-y-3">
        {goals.map((g) => {
          const hs = core.habits.filter((h) => h.goalId === g.id && !h.archived)
          const rates = byDate ? hs.map((h) => completionRate(h, byDate, 14)).filter((r): r is number => r !== null) : []
          const avg = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null
          const daysLeft = g.targetDate ? Math.ceil((fromKey(g.targetDate).getTime() - fromKey(today).getTime()) / 86_400_000) : null
          return (
            <Card key={g.id} onClick={() => setEditing(g)} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl" style={{ background: `${g.color}22` }}>{g.emoji}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{g.title}</div>
                  {g.why && <div className="text-xs text-muted">{g.why}</div>}
                  <div className="mt-3 flex justify-between text-xs text-muted">
                    <span>{hs.length} habit{hs.length === 1 ? '' : 's'}{daysLeft !== null ? ` · ${daysLeft > 0 ? `${daysLeft} days left` : 'deadline passed'}` : ''}</span>
                    <span>{avg === null ? '—' : `${Math.round(avg * 100)}%`} <span className="opacity-70">14d</span></span>
                  </div>
                  <div className="mt-1.5"><Bar value={avg ?? 0} color={g.color} /></div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
      {editing && <GoalEditor goal={editing === 'new' ? null : editing} count={core.goals.length} onClose={() => setEditing(null)} />}
    </>
  )
}

function GoalEditor({ goal, count, onClose }: { goal: Goal | null; count: number; onClose: () => void }) {
  const [title, setTitle] = useState(goal?.title ?? '')
  const [emoji, setEmoji] = useState(goal?.emoji ?? '🎯')
  const [why, setWhy] = useState(goal?.why ?? '')
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? '')
  const [color, setColor] = useState(goal?.color ?? PALETTE[count % PALETTE.length])

  const save = async () => {
    const data = { title: title.trim(), emoji: emoji || '🎯', why: why.trim() || undefined, targetDate: targetDate || undefined, color }
    if (goal) await db.goals.update(goal.id, data)
    else await db.goals.add({ ...data, id: uid(), order: count, createdAt: Date.now() })
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={goal ? 'Edit goal' : 'New goal'}>
      <div className="flex gap-2">
        <Field label="Icon"><input className={`${inputCls} w-16! text-center text-xl`} value={emoji} onChange={(e) => setEmoji(e.target.value)} /></Field>
        <div className="flex-1"><Field label="Goal"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Visible jawline in 90 days" /></Field></div>
      </div>
      <Field label="Why it matters"><textarea className={`${inputCls} min-h-20`} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Your reason, for the days motivation runs out." /></Field>
      <Field label="Target date (optional)"><input type="date" className={inputCls} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} /></Field>
      <Field label="Colour"><ColorPicker value={color} onChange={setColor} colors={PALETTE} /></Field>
      <Button className="mt-2 w-full py-3" disabled={!title.trim()} onClick={save}>{goal ? 'Save' : 'Create goal'}</Button>
      {goal && (
        <Button variant="danger" className="mt-3 w-full" onClick={async () => {
          if (confirm('Delete this goal? Its habits are kept.')) { await deleteGoal(goal.id); onClose() }
        }}>Delete goal</Button>
      )}
    </Sheet>
  )
}

/* ---------------- Schedule ---------------- */

function Schedule({ core }: { core: Core }) {
  const [editing, setEditing] = useState<TimeBlock | 'new' | null>(null)
  const { blocks, settings } = core
  const wake = toMinutes(settings!.wakeTime)
  const bed = toMinutes(settings!.bedTime)
  // Timeline spans from 30 min before wake to 30 min after bed (or the widest block).
  const starts = blocks.map((b) => toMinutes(b.start))
  const ends = blocks.map((b) => toMinutes(b.end))
  const from = Math.max(0, Math.min(wake, ...starts) - 30)
  const to = Math.min(24 * 60, Math.max(bed, ...ends) + 30)
  const span = to - from
  const pct = (m: number) => ((m - from) / span) * 100
  const hours: number[] = []
  for (let h = Math.ceil(from / 60); h * 60 <= to; h++) hours.push(h)

  return (
    <>
      <SectionTitle action={<button className="text-sm text-brand" onClick={() => setEditing('new')}>+ Block</button>}>Your ideal day</SectionTitle>
      {blocks.length === 0 ? (
        <Empty emoji="🗓️" title="Design your day" text="Time blocks group your habits into the parts of your day — Morning, Deep work, Wind down." />
      ) : (
        <Card className="p-3">
          <div className="relative" style={{ height: Math.max(420, span * 0.8) }}>
            {hours.map((h) => (
              <div key={h} className="absolute inset-x-0 flex items-center gap-2" style={{ top: `${pct(h * 60)}%` }}>
                <span className="w-10 -translate-y-1/2 text-right text-[10px] text-muted">{formatTime(`${String(h).padStart(2, '0')}:00`).replace(':00', '')}</span>
                <div className="h-px flex-1 -translate-y-1/2 bg-line/60" />
              </div>
            ))}
            {[{ m: wake, label: '☀️ Wake' }, { m: bed, label: '🌙 Lights out' }].map((a) => (
              <div key={a.label} className="absolute left-12 right-0 flex items-center" style={{ top: `${pct(a.m)}%` }}>
                <div className="h-px flex-1 -translate-y-1/2 border-t border-dashed border-brand/60" />
                <span className="-translate-y-1/2 pl-1 text-[10px] text-brand">{a.label}</span>
              </div>
            ))}
            {blocks.map((b) => {
              const s = toMinutes(b.start)
              const e = Math.max(toMinutes(b.end), s + 15)
              return (
                <button
                  key={b.id}
                  onClick={() => setEditing(b)}
                  className="absolute left-12 right-16 overflow-hidden rounded-lg border-l-4 px-2 py-1 text-left"
                  style={{ top: `${pct(s)}%`, height: `${pct(e) - pct(s)}%`, borderColor: b.color, background: `${b.color}26` }}
                >
                  <div className="truncate text-xs font-semibold">{b.emoji} {b.name}{e - s < 50 && <span className="font-normal text-muted"> · {formatDuration(e - s)}</span>}</div>
                  {e - s >= 50 && <div className="truncate text-[10px] text-muted">{formatTime(b.start)} · {formatDuration(e - s)}</div>}
                </button>
              )
            })}
          </div>
        </Card>
      )}
      {editing && <BlockEditor block={editing === 'new' ? null : editing} count={blocks.length} onClose={() => setEditing(null)} />}
    </>
  )
}

function BlockEditor({ block, count, onClose }: { block: TimeBlock | null; count: number; onClose: () => void }) {
  const [name, setName] = useState(block?.name ?? '')
  const [emoji, setEmoji] = useState(block?.emoji ?? '⏱️')
  const [start, setStart] = useState(block?.start ?? '09:00')
  const [end, setEnd] = useState(block?.end ?? '10:00')
  const [days, setDays] = useState(block?.days ?? [0, 1, 2, 3, 4, 5, 6])
  const [note, setNote] = useState(block?.note ?? '')
  const [color, setColor] = useState(block?.color ?? PALETTE[count % PALETTE.length])

  const save = async () => {
    const data = { name: name.trim(), emoji: emoji || '⏱️', start, end, days, note: note.trim() || undefined, color }
    if (block) await db.blocks.update(block.id, data)
    else await db.blocks.add({ ...data, id: uid(), order: count })
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={block ? 'Edit time block' : 'New time block'}>
      <div className="flex gap-2">
        <Field label="Icon"><input className={`${inputCls} w-16! text-center text-xl`} value={emoji} onChange={(e) => setEmoji(e.target.value)} /></Field>
        <div className="flex-1"><Field label="Name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Deep work" /></Field></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Starts"><input type="time" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label="Ends"><input type="time" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
      </div>
      <Field label="Days"><DayPicker value={days} onChange={setDays} /></Field>
      <Field label="Intention (optional)"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Zero phone, zero context switching" /></Field>
      <Field label="Colour"><ColorPicker value={color} onChange={setColor} colors={PALETTE} /></Field>
      <Button className="mt-2 w-full py-3" disabled={!name.trim() || !days.length} onClick={save}>{block ? 'Save' : 'Create block'}</Button>
      {block && (
        <Button variant="danger" className="mt-3 w-full" onClick={async () => {
          if (confirm('Delete this block? Its habits move to “Anytime”.')) { await deleteBlock(block.id); onClose() }
        }}>Delete block</Button>
      )}
    </Sheet>
  )
}

/* ---------------- Rules ---------------- */

function Rules({ core }: { core: Core }) {
  const [editing, setEditing] = useState<Rule | 'new' | null>(null)
  const rules = core.rules.filter((r) => !r.archived)
  return (
    <>
      <SectionTitle action={<button className="text-sm text-brand" onClick={() => setEditing('new')}>+ Rule</button>}>Boundaries</SectionTitle>
      {rules.length === 0 && <Empty emoji="🛡️" title="Set your boundaries" text="Rules are time windows you protect — “Kitchen closed 7–10 PM”, “No caffeine after 2 PM”. They count as kept unless you mark them broken." />}
      <Card className="divide-y divide-line">
        {rules.map((r) => (
          <button key={r.id} onClick={() => setEditing(r)} className="flex w-full items-center gap-3 px-3 py-3 text-left active:bg-surface-2">
            <div className="text-xl">{r.emoji}</div>
            <div className="flex-1">
              <div className="text-sm font-medium">{r.name}</div>
              <div className="text-xs text-muted">{formatTime(r.start)} – {formatTime(r.end)}</div>
            </div>
          </button>
        ))}
      </Card>
      {editing && <RuleEditor core={core} rule={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function RuleEditor({ core, rule, onClose }: { core: Core; rule: Rule | null; onClose: () => void }) {
  const [name, setName] = useState(rule?.name ?? '')
  const [emoji, setEmoji] = useState(rule?.emoji ?? '🛡️')
  const [start, setStart] = useState(rule?.start ?? '20:00')
  const [end, setEnd] = useState(rule?.end ?? '23:59')
  const [goalId, setGoalId] = useState(rule?.goalId ?? '')

  const save = async () => {
    const data = { name: name.trim(), emoji: emoji || '🛡️', start, end, goalId: goalId || undefined }
    if (rule) await db.rules.update(rule.id, data)
    else await db.rules.add({ ...data, id: uid(), order: core.rules.length })
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={rule ? 'Edit rule' : 'New rule'}>
      <div className="flex gap-2">
        <Field label="Icon"><input className={`${inputCls} w-16! text-center text-xl`} value={emoji} onChange={(e) => setEmoji(e.target.value)} /></Field>
        <div className="flex-1"><Field label="Rule"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kitchen closed" /></Field></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="From"><input type="time" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label="Until"><input type="time" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
      </div>
      <Field label="Goal">
        <select className={inputCls} value={goalId} onChange={(e) => setGoalId(e.target.value)}>
          <option value="">None</option>
          {core.goals.map((g) => <option key={g.id} value={g.id}>{g.emoji} {g.title}</option>)}
        </select>
      </Field>
      <Button className="mt-2 w-full py-3" disabled={!name.trim()} onClick={save}>{rule ? 'Save' : 'Create rule'}</Button>
      {rule && (
        <Button variant="danger" className="mt-3 w-full" onClick={async () => {
          if (confirm('Delete this rule and its history?')) { await deleteRule(rule.id); onClose() }
        }}>Delete rule</Button>
      )}
    </Sheet>
  )
}

/* ---------------- Arcs ---------------- */

function Arcs({ core }: { core: Core }) {
  const [editing, setEditing] = useState<Arc | 'new' | null>(null)
  const today = todayKey()
  return (
    <>
      <SectionTitle action={<button className="text-sm text-brand" onClick={() => setEditing('new')}>+ Arc</button>}>Challenges</SectionTitle>
      {core.arcs.length === 0 && <Empty emoji="❄️" title="Start an arc" text="An arc is a time-boxed challenge — 30, 60 or 90 days — with a visible finish line." />}
      <div className="space-y-3">
        {core.arcs.map((a) => {
          const d = arcDay(a, today)
          const status = arcActive(a, today) ? `Day ${d} of ${a.lengthDays}` : d < 1 ? `Starts in ${1 - d} days` : 'Completed'
          return (
            <Card key={a.id} onClick={() => setEditing(a)} className="p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{a.emoji} {a.name}</div>
                <div className="text-xs text-muted">{status}</div>
              </div>
              {a.description && <div className="mt-1 text-xs text-muted">{a.description}</div>}
              <div className="mt-3"><Bar value={Math.max(0, Math.min(d, a.lengthDays)) / a.lengthDays} /></div>
            </Card>
          )
        })}
      </div>
      {editing && <ArcEditor core={core} arc={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function ArcEditor({ core, arc, onClose }: { core: Core; arc: Arc | null; onClose: () => void }) {
  const [name, setName] = useState(arc?.name ?? '')
  const [emoji, setEmoji] = useState(arc?.emoji ?? '🔥')
  const [description, setDescription] = useState(arc?.description ?? '')
  const [startDate, setStartDate] = useState(arc?.startDate ?? todayKey())
  const [length, setLength] = useState(arc?.lengthDays ?? 30)
  const [habitIds, setHabitIds] = useState<string[]>(arc?.habitIds ?? [])
  const live = core.habits.filter((h) => !h.archived)

  const save = async () => {
    const data = { name: name.trim(), emoji: emoji || '🔥', description: description.trim() || undefined, startDate, lengthDays: length, habitIds }
    if (arc) await db.arcs.update(arc.id, data)
    else await db.arcs.add({ ...data, id: uid(), createdAt: Date.now() })
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={arc ? 'Edit arc' : 'New arc'}>
      <div className="flex gap-2">
        <Field label="Icon"><input className={`${inputCls} w-16! text-center text-xl`} value={emoji} onChange={(e) => setEmoji(e.target.value)} /></Field>
        <div className="flex-1"><Field label="Name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Winter Arc" /></Field></div>
      </div>
      <Field label="Mission"><textarea className={`${inputCls} min-h-16`} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Starts"><input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
        <Field label="Length (days)"><input className={inputCls} inputMode="numeric" value={length} onChange={(e) => setLength(Math.max(1, +e.target.value || 1))} /></Field>
      </div>
      <div className="-mt-2 mb-4 flex gap-2">
        {[21, 30, 60, 90].map((n) => (
          <button key={n} type="button" onClick={() => setLength(n)} className={`flex-1 rounded-lg py-1.5 text-xs ${length === n ? 'bg-accent text-accent-ink' : 'bg-bg text-muted'}`}>{n}d</button>
        ))}
      </div>
      <Field label="Habits that count" hint={habitIds.length ? `${habitIds.length} selected` : 'None selected = every habit counts.'}>
        <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl bg-bg p-2">
          {live.map((h) => {
            const on = habitIds.includes(h.id)
            return (
              <button key={h.id} type="button" onClick={() => setHabitIds(on ? habitIds.filter((x) => x !== h.id) : [...habitIds, h.id])}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${on ? 'bg-accent/15' : ''}`}>
                <span className={`flex h-4 w-4 items-center justify-center rounded text-[10px] ${on ? 'bg-accent text-accent-ink' : 'border border-line'}`}>{on ? '✓' : ''}</span>
                {h.emoji} {h.name}
              </button>
            )
          })}
        </div>
      </Field>
      <Button className="mt-2 w-full py-3" disabled={!name.trim()} onClick={save}>{arc ? 'Save' : 'Start arc'}</Button>
      {arc && (
        <Button variant="danger" className="mt-3 w-full" onClick={async () => {
          if (confirm('Delete this arc? Your habit history is kept.')) { await db.arcs.delete(arc.id); onClose() }
        }}>Delete arc</Button>
      )}
      <p className="mt-3 text-center text-xs text-muted">Ends {fromKey(addDays(startDate, length - 1)).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} · {DAY_SHORT[fromKey(addDays(startDate, length - 1)).getDay()]}</p>
    </Sheet>
  )
}
