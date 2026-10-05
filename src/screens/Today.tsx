import { useState } from 'react'
import type { Core } from '../lib/useData'
import { useCheckIn, useDayEntries, useRangeEntries } from '../lib/useData'
import { addDays, formatDuration, formatTime, inWindow, nowMinutes, prettyDate, startOfWeek, todayKey, toMinutes } from '../lib/date'
import { currentBlock, dayScore, habitProgress, habitTotal, isScheduled, ruleBroken } from '../lib/scoring'
import { addEntry, clearEntries, deleteEntry, saveCheckIn, setBlockStatus, toggleEntry } from '../lib/actions'
import { arcActive, arcDay, useTick } from '../lib/arcs'
import type { Entry, Habit, Rule, TimeBlock } from '../lib/types'
import { Bar, Button, Card, Empty, Ring, SectionTitle, Sheet, inputCls } from '../components/ui'
import { go } from '../lib/router'
import SleepCard from '../components/SleepCard'

const greeting = () => {
  const h = new Date().getHours()
  return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

const fmtValue = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''))

export default function Today({ core }: { core: Core }) {
  useTick()
  const today = todayKey()
  const [date, setDate] = useState(today)
  const entries = useDayEntries(date)
  const weekStart = startOfWeek(date, core.settings!.weekStartsOn)
  const week = useRangeEntries(weekStart, addDays(weekStart, 6))
  const [logging, setLogging] = useState<Habit | null>(null)

  const isToday = date === today
  const isFuture = date > today
  const { habits, rules, blocks, arcs } = core
  const live = habits.filter((h) => !h.archived)
  const scheduled = live.filter((h) => isScheduled(h, date))
  const score = dayScore(date, habits, rules, entries, today)
  const activeArc = arcs.find((a) => arcActive(a, date))
  const { now, next } = currentBlock(blocks, date)

  const weekCount = (h: Habit) => {
    let n = 0
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i)
      if (habitProgress(h, week?.get(d)) >= 1) n++
    }
    return n
  }

  // Group scheduled habits by time block; un-blocked habits go in "Anytime".
  const blockMap = new Map(blocks.map((b) => [b.id, b]))
  const groups: { block: TimeBlock | null; habits: Habit[] }[] = []
  const anytime = scheduled.filter((h) => !h.blockId || !blockMap.has(h.blockId))
  if (anytime.length) groups.push({ block: null, habits: anytime })
  for (const b of blocks) {
    const hs = scheduled.filter((h) => h.blockId === b.id)
    if (hs.length) groups.push({ block: b, habits: hs })
  }

  return (
    <div>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-muted">{greeting()}{core.settings?.name ? `, ${core.settings.name}` : ''}</div>
          <h1 className="text-2xl font-bold">{prettyDate(date)}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setDate(addDays(date, -1))} className="h-9 w-9 rounded-full bg-surface text-lg text-muted">‹</button>
          {!isToday && (
            <button onClick={() => setDate(today)} className="h-9 rounded-full bg-surface px-3 text-xs text-brand">Today</button>
          )}
          <button onClick={() => setDate(addDays(date, 1))} className="h-9 w-9 rounded-full bg-surface text-lg text-muted">›</button>
        </div>
      </header>

      {/* Hero: score + arc + now */}
      <Card className="flex items-center gap-4 p-4">
        <Ring value={(score.score ?? 0) / 100} size={108} stroke={10}>
          <div className="text-3xl font-bold leading-none">{score.score ?? '–'}</div>
          <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted">tapas score</div>
        </Ring>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <div className="text-xs text-muted">Habits done</div>
            <div className="text-lg font-semibold">{score.habitsDone}<span className="text-muted"> / {score.habitsTotal}</span></div>
          </div>
          {activeArc && (
            <div onClick={() => go('stats')} className="cursor-pointer">
              <div className="flex justify-between text-xs">
                <span className="truncate text-muted">{activeArc.emoji} {activeArc.name}</span>
                <span className="font-semibold">Day {arcDay(activeArc, date)}<span className="text-muted">/{activeArc.lengthDays}</span></span>
              </div>
              <div className="mt-1.5"><Bar value={arcDay(activeArc, date) / activeArc.lengthDays} /></div>
            </div>
          )}
        </div>
      </Card>

      {isToday && (now || next) && (
        <Card className="mt-3 flex items-center gap-3 p-3" >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl text-xl" style={{ background: `${(now ?? next)!.color}22` }}>
            {(now ?? next)!.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wider" style={{ color: (now ?? next)!.color }}>{now ? 'Now' : `Next · in ${formatDuration(toMinutes(next!.start) - nowMinutes())}`}</div>
            <div className="truncate font-semibold">{(now ?? next)!.name}</div>
            {(now ?? next)!.note && <div className="truncate text-xs text-muted">{(now ?? next)!.note}</div>}
          </div>
          <div className="text-right text-xs text-muted">
            {formatTime((now ?? next)!.start)}<br />{formatTime((now ?? next)!.end)}
          </div>
        </Card>
      )}

      {!isFuture && <SleepCard date={date} settings={core.settings!} />}

      {rules.filter((r) => !r.archived).length > 0 && (
        <>
          <SectionTitle>Rules</SectionTitle>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {rules.filter((r) => !r.archived).map((r) => (
              <RuleChip key={r.id} rule={r} date={date} entries={entries} disabled={isFuture} />
            ))}
          </div>
        </>
      )}

      {live.length === 0 && (
        <Empty emoji="🌱" title="No habits yet" text="Add your first habit to start tracking." action={<Button onClick={() => go('habits')}>Add a habit</Button>} />
      )}

      {groups.map(({ block, habits: hs }) => {
        const isNow = isToday && block && now?.id === block.id
        const status = block ? entries.find((e) => e.kind === 'block' && e.refId === block.id)?.value : undefined
        const started = block && (date < today || (isToday && nowMinutes() >= toMinutes(block.start)))
        return (
          <section key={block?.id ?? 'any'}>
            <SectionTitle action={block ? <span className="text-xs text-muted">{formatTime(block.start)}</span> : undefined}>
              <span className={isNow ? 'text-brand' : ''}>
                {block ? `${block.emoji} ${block.name}` : 'Anytime'}
                {isNow && ' · now'}
              </span>
            </SectionTitle>
            <Card className={`divide-y divide-line ${isNow ? 'border-brand/50' : ''}`}>
              {hs.map((h) => (
                <HabitRow
                  key={h.id} habit={h} date={date} entries={entries} disabled={isFuture}
                  weekCount={h.frequency.kind === 'timesPerWeek' ? weekCount(h) : undefined}
                  onOpen={() => setLogging(h)}
                />
              ))}
              {block && started && <BlockStatus value={status} onChange={(s) => setBlockStatus(date, block.id, s)} />}
            </Card>
          </section>
        )
      })}

      {!isFuture && <CheckInCard key={date} date={date} />}

      <LogSheet habit={logging} date={date} entries={entries} onClose={() => setLogging(null)} />
    </div>
  )
}

function HabitRow({ habit: h, date, entries, disabled, weekCount, onOpen }: {
  habit: Habit; date: string; entries: Entry[]; disabled: boolean; weekCount?: number; onOpen: () => void
}) {
  const total = habitTotal(h, entries)
  const p = habitProgress(h, entries)
  const done = p >= 1
  const sub =
    h.frequency.kind === 'timesPerWeek' ? `${weekCount}/${h.frequency.count} this week` : undefined

  if (h.type === 'check' || h.type === 'avoid') {
    const slipped = h.type === 'avoid' && total >= 1
    return (
      <div className="flex items-center gap-3 px-3 py-3">
        <div className="text-xl">{h.emoji}</div>
        <div className="min-w-0 flex-1">
          <div className={`truncate text-sm font-medium ${done ? '' : 'text-ink'}`}>{h.name}</div>
          {(sub || h.type === 'avoid') && (
            <div className={`text-xs ${slipped ? 'text-bad' : 'text-muted'}`}>{h.type === 'avoid' ? (slipped ? 'Slipped' : 'Holding') : sub}</div>
          )}
        </div>
        {h.type === 'check' ? (
          <button
            disabled={disabled}
            onClick={() => toggleEntry(date, 'habit', h.id)}
            className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition disabled:opacity-30 ${done ? 'border-good bg-good text-bg' : 'border-line text-transparent'}`}
          >
            ✓
          </button>
        ) : (
          <button
            disabled={disabled}
            onClick={() => toggleEntry(date, 'habit', h.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium disabled:opacity-30 ${slipped ? 'bg-bad/15 text-bad' : 'bg-surface-2 text-muted'}`}
          >
            {slipped ? 'Undo slip' : 'I slipped'}
          </button>
        )}
      </div>
    )
  }

  const unit = h.type === 'duration' ? 'min' : h.unit ?? ''
  return (
    <div className="px-3 py-3">
      <div className="flex items-center gap-3" onClick={disabled ? undefined : onOpen}>
        <div className="text-xl">{h.emoji}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <div className="truncate text-sm font-medium">{h.name}</div>
            <div className={`shrink-0 text-xs ${done ? 'text-good' : 'text-muted'}`}>
              <span className="font-semibold text-ink">{fmtValue(total)}</span>
              {h.target ? ` / ${fmtValue(h.target)}` : ''} {unit}
            </div>
          </div>
          <div className="mt-1.5"><Bar value={p} color={done ? 'var(--color-good)' : undefined} /></div>
          {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
        </div>
      </div>
      {!disabled && h.presets.length > 0 && (
        <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pl-9">
          {h.presets.slice(0, 4).map((pr) => (
            <button
              key={pr.label}
              onClick={() => addEntry(date, 'habit', h.id, pr.value, pr.label)}
              className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink active:bg-accent active:text-accent-ink"
            >
              + {pr.label}
            </button>
          ))}
          <button onClick={onOpen} className="shrink-0 rounded-full px-2.5 py-1 text-xs text-muted">more…</button>
        </div>
      )}
    </div>
  )
}

function LogSheet({ habit, date, entries, onClose }: { habit: Habit | null; date: string; entries: Entry[]; onClose: () => void }) {
  const [amount, setAmount] = useState('')
  const [label, setLabel] = useState('')
  if (!habit) return null
  const mine = entries.filter((e) => e.kind === 'habit' && e.refId === habit.id).sort((a, b) => a.at - b.at)
  const total = habitTotal(habit, entries)
  const unit = habit.type === 'duration' ? 'min' : habit.unit ?? ''

  const add = async () => {
    const v = parseFloat(amount)
    if (!Number.isFinite(v) || v === 0) return
    await addEntry(date, 'habit', habit.id, v, label.trim() || undefined)
    setAmount('')
    setLabel('')
  }

  return (
    <Sheet open onClose={onClose} title={`${habit.emoji} ${habit.name}`}>
      <div className="mb-4 flex items-center gap-4">
        <Ring value={habitProgress(habit, entries)} size={84} stroke={8}>
          <div className="text-lg font-bold leading-none">{fmtValue(total)}</div>
          <div className="text-[10px] text-muted">{unit}</div>
        </Ring>
        <div className="text-sm text-muted">
          {habit.target ? (
            total >= habit.target ? <span className="text-good">Target reached 🎯</span> : <>{fmtValue(habit.target - total)} {unit} to go</>
          ) : 'No target set'}
        </div>
      </div>

      {habit.presets.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {habit.presets.map((p) => (
            <button key={p.label} onClick={() => addEntry(date, 'habit', habit.id, p.value, p.label)} className="rounded-xl bg-surface-2 px-3 py-2 text-sm active:bg-accent active:text-accent-ink">
              {p.label} <span className="text-muted">+{fmtValue(p.value)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input className={`${inputCls} w-24!`} inputMode="decimal" placeholder={unit || 'amount'} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input className={`${inputCls} min-w-0`} placeholder="What was it?" value={label} onChange={(e) => setLabel(e.target.value)} />
        <Button onClick={add}>Add</Button>
      </div>

      {mine.length > 0 && (
        <>
          <SectionTitle action={<button className="text-xs text-bad" onClick={() => clearEntries(date, 'habit', habit.id)}>Clear all</button>}>Logged</SectionTitle>
          <div className="divide-y divide-line rounded-xl bg-bg">
            {mine.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{e.label ?? 'Custom'} <span className="text-muted">· {new Date(e.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></span>
                <span className="flex items-center gap-3">
                  <span className="font-medium">+{fmtValue(e.value)} {unit}</span>
                  <button className="text-muted" onClick={() => deleteEntry(e.id)}>✕</button>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Sheet>
  )
}

function RuleChip({ rule: r, date, entries, disabled }: { rule: Rule; date: string; entries: Entry[]; disabled: boolean }) {
  const broken = ruleBroken(r, entries)
  const isToday = date === todayKey()
  const m = nowMinutes()
  const active = isToday && inWindow(m, r.start, r.end)
  const untilStart = toMinutes(r.start) - m

  let status = `${formatTime(r.start)} – ${formatTime(r.end)}`
  if (broken) status = 'Broken'
  else if (active) status = `Active · until ${formatTime(r.end)}`
  else if (isToday && untilStart > 0 && untilStart <= 180) status = `Starts in ${formatDuration(untilStart)}`
  else if (!isToday && date < todayKey()) status = 'Kept'

  return (
    <button
      disabled={disabled}
      onClick={() => {
        if (broken || confirm(`Mark "${r.name}" as broken for ${prettyDate(date).toLowerCase()}?`)) toggleEntry(date, 'rule', r.id)
      }}
      className={`shrink-0 rounded-2xl border px-3 py-2 text-left disabled:opacity-40 ${broken ? 'border-bad/40 bg-bad/10' : active ? 'border-warn/40 bg-warn/10' : 'border-line bg-surface'}`}
    >
      <div className="text-sm font-medium">{r.emoji} {r.name}</div>
      <div className={`text-xs ${broken ? 'text-bad' : active ? 'text-warn' : 'text-muted'}`}>{status}</div>
    </button>
  )
}

const BLOCK_STATUS: { v: 0 | 1 | 2; label: string; cls: string }[] = [
  { v: 0, label: 'On time', cls: 'bg-good/15 text-good' },
  { v: 1, label: 'Late', cls: 'bg-warn/15 text-warn' },
  { v: 2, label: 'Skipped', cls: 'bg-bad/15 text-bad' },
]

/** Plan vs reality: one tap to say how this block actually went. */
function BlockStatus({ value, onChange }: { value?: number; onChange: (s: 0 | 1 | 2 | null) => void }) {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <span className="flex-1 text-[11px] text-muted">How did this block go?</span>
      {BLOCK_STATUS.map((s) => (
        <button
          key={s.v}
          onClick={() => onChange(value === s.v ? null : s.v)}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${value === s.v ? s.cls : 'bg-surface-2/60 text-muted'}`}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}

const SCALES: { key: 'energy' | 'mood'; label: string; faces: string[] }[] = [
  { key: 'energy', label: 'Energy', faces: ['🪫', '😮‍💨', '😐', '⚡', '🔥'] },
  { key: 'mood', label: 'Mood', faces: ['😞', '😕', '😐', '🙂', '😄'] },
]

function CheckInCard({ date }: { date: string }) {
  const ci = useCheckIn(date)
  const [note, setNote] = useState<string | null>(null)
  return (
    <>
      <SectionTitle>Check-in</SectionTitle>
      <Card className="space-y-3 p-4">
        {SCALES.map((s) => (
          <div key={s.key} className="flex items-center gap-3">
            <div className="w-14 text-xs text-muted">{s.label}</div>
            <div className="flex flex-1 justify-between">
              {s.faces.map((f, i) => {
                const v = i + 1
                const on = ci?.[s.key] === v
                return (
                  <button
                    key={i}
                    onClick={() => saveCheckIn(date, { [s.key]: on ? undefined : v })}
                    className={`h-9 w-9 rounded-full text-lg transition ${on ? 'scale-110 bg-accent/20 ring-1 ring-brand' : 'opacity-50 grayscale'}`}
                  >
                    {f}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        <textarea
          className={`${inputCls} min-h-16 text-sm`}
          placeholder="Anything worth remembering about today?"
          value={note ?? ci?.note ?? ''}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== null && saveCheckIn(date, { note })}
        />
      </Card>
    </>
  )
}
