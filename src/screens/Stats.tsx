import { useMemo, useState } from 'react'
import type { Core } from '../lib/useData'
import { useRangeEntries } from '../lib/useData'
import { addDays, DAY_LETTERS, formatDuration, formatTime, fromKey, prettyDate, startOfWeek, todayKey, weekday } from '../lib/date'
import { hhmm, sleepMinutes, targetHits, targetMinutes, useSleepRange } from '../lib/sleep'
import { bestStreak, completionRate, dayScore, habitProgress, isScheduled, scoreColor, streak, type EntriesByDate } from '../lib/scoring'
import { arcActive, arcDay, arcHabits } from '../lib/arcs'
import type { Arc } from '../lib/types'
import { Card, Empty, SectionTitle, Segmented } from '../components/ui'

const HEATMAP_WEEKS = 17

export default function Stats({ core }: { core: Core }) {
  const today = todayKey()
  const ws = core.settings!.weekStartsOn
  const heatStart = addDays(startOfWeek(today, ws), -7 * (HEATMAP_WEEKS - 1))
  const earliestArc = core.arcs.reduce((m, a) => (a.startDate < m ? a.startDate : m), heatStart)
  const from = earliestArc < heatStart ? earliestArc : heatStart
  const byDate = useRangeEntries(from, today)

  const [arcId, setArcId] = useState<string | null>(null)
  const arc = core.arcs.find((a) => a.id === arcId) ?? core.arcs.find((a) => arcActive(a)) ?? core.arcs[0]

  const scores = useMemo(() => {
    const m = new Map<string, number | null>()
    if (!byDate) return m
    for (let d = from; d <= today; d = addDays(d, 1)) m.set(d, dayScore(d, core.habits, core.rules, byDate.get(d), today).score)
    return m
  }, [byDate, core.habits, core.rules, from, today])

  if (!byDate) return null

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Stats</h1>

      {arc && (
        <>
          {core.arcs.length > 1 && (
            <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
              {core.arcs.map((a) => (
                <button key={a.id} onClick={() => setArcId(a.id)} className={`shrink-0 rounded-full px-3 py-1 text-xs ${a.id === arc.id ? 'bg-accent text-accent-ink' : 'bg-surface text-muted'}`}>
                  {a.emoji} {a.name}
                </button>
              ))}
            </div>
          )}
          <ArcGrid arc={arc} core={core} byDate={byDate} />
        </>
      )}

      <SectionTitle>Last 14 days</SectionTitle>
      <TrendChart scores={scores} today={today} />

      <SectionTitle>Consistency</SectionTitle>
      <Heatmap scores={scores} start={heatStart} today={today} weekStartsOn={ws} />

      <HabitStats core={core} byDate={byDate} />

      <SleepStats core={core} />

      <BlockReality core={core} byDate={byDate} />

      <SectionTitle>Insights</SectionTitle>
      <InsightsTeaser scores={scores} />
    </div>
  )
}

function ArcGrid({ arc, core, byDate }: { arc: Arc; core: Core; byDate: EntriesByDate }) {
  const today = todayKey()
  const hs = arcHabits(arc, core.habits)
  const cols = arc.lengthDays > 60 ? 10 : arc.lengthDays > 21 ? 10 : 7
  const days = Array.from({ length: arc.lengthDays }, (_, i) => addDays(arc.startDate, i))
  const scored = days.filter((d) => d <= today).map((d) => dayScore(d, hs, core.rules, byDate.get(d), today).score)
  const valid = scored.filter((s): s is number => s !== null)
  const avg = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null
  const strong = valid.filter((s) => s >= 70).length
  let run = 0
  for (let i = scored.length - 1; i >= 0; i--) {
    const s = scored[i]
    if (i === scored.length - 1 && (s === null || s < 70)) continue // today still in progress
    if (s !== null && s >= 70) run++
    else break
  }
  const d = arcDay(arc, today)

  return (
    <Card className="mt-3 p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-lg font-bold">{arc.emoji} {arc.name}</div>
        <div className="text-sm text-muted">
          {d < 1 ? `starts in ${1 - d}d` : d > arc.lengthDays ? 'complete' : <>Day <span className="font-semibold text-ink">{d}</span>/{arc.lengthDays}</>}
        </div>
      </div>
      <div className="mt-4 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {days.map((day, i) => {
          const future = day > today
          const s = future ? null : scored[i]
          return (
            <div
              key={day}
              title={`${prettyDate(day)}${s !== null ? ` · ${s}` : ''}`}
              className={`flex aspect-square items-center justify-center rounded-md text-[9px] ${day === today ? 'ring-2 ring-brand' : ''} ${future ? 'border border-dashed border-line' : ''}`}
              style={{ background: future ? 'transparent' : scoreColor(s), color: s !== null && s >= 70 ? 'var(--cell-ink-strong)' : 'var(--color-muted)' }}
            >
              {i + 1}
            </div>
          )
        })}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Avg score" value={avg ?? '–'} />
        <Stat label="Strong days" value={strong} hint="≥70" />
        <Stat label="Strong streak" value={run} />
      </div>
    </Card>
  )
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl bg-bg py-2">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}{hint ? ` ${hint}` : ''}</div>
    </div>
  )
}

function TrendChart({ scores, today }: { scores: Map<string, number | null>; today: string }) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13))
  const vals = days.map((d) => scores.get(d) ?? null)
  const valid = vals.filter((v): v is number => v !== null)
  const avg = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null
  const W = 320
  const H = 120
  const bw = W / 14
  return (
    <Card className="p-4">
      <div className="mb-2 flex justify-between text-xs text-muted">
        <span>Daily score</span>
        {avg !== null && <span>avg <span className="font-semibold text-ink">{Math.round(avg)}</span></span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H + 16}`} className="w-full">
        {[25, 50, 75, 100].map((y) => (
          <line key={y} x1={0} x2={W} y1={H - (y / 100) * H} y2={H - (y / 100) * H} stroke="var(--color-line)" strokeWidth={0.5} />
        ))}
        {avg !== null && <line x1={0} x2={W} y1={H - (avg / 100) * H} y2={H - (avg / 100) * H} stroke="var(--color-brand)" strokeDasharray="3 3" strokeWidth={1} opacity={0.6} />}
        {vals.map((v, i) => {
          const h = v === null ? 2 : Math.max(2, (v / 100) * H)
          return (
            <g key={i}>
              <rect x={i * bw + 3} y={H - h} width={bw - 6} height={h} rx={3} fill={v === null ? 'var(--color-surface-2)' : scoreColor(v)} />
              <text x={i * bw + bw / 2} y={H + 12} textAnchor="middle" fontSize={8} fill={days[i] === today ? 'var(--color-brand)' : 'var(--color-muted)'}>
                {DAY_LETTERS[weekday(days[i])]}
              </text>
            </g>
          )
        })}
      </svg>
    </Card>
  )
}

function Heatmap({ scores, start, today, weekStartsOn }: { scores: Map<string, number | null>; start: string; today: string; weekStartsOn: 0 | 1 }) {
  const weeks = Array.from({ length: HEATMAP_WEEKS }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)))
  const labels = Array.from({ length: 7 }, (_, i) => DAY_LETTERS[(i + weekStartsOn) % 7])
  return (
    <Card className="p-4">
      <div className="flex gap-1">
        <div className="flex flex-col gap-1 pr-1">
          {labels.map((l, i) => <div key={i} className="flex h-3.5 items-center text-[8px] text-muted">{i % 2 === 0 ? l : ''}</div>)}
        </div>
        {weeks.map((wk, wi) => (
          <div key={wi} className="flex flex-1 flex-col gap-1">
            {wk.map((d) => (
              <div
                key={d}
                title={d}
                className={`h-3.5 rounded-[3px] ${d === today ? 'ring-1 ring-brand' : ''}`}
                style={{ background: d > today ? 'transparent' : scoreColor(scores.get(d) ?? null) }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] text-muted">
        <span>{fromKey(start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        <span className="flex items-center gap-1">
          less {[null, 10, 30, 60, 80, 95].map((s, i) => <span key={i} className="h-2.5 w-2.5 rounded-sm" style={{ background: scoreColor(s) }} />)} more
        </span>
      </div>
    </Card>
  )
}

function HabitStats({ core, byDate }: { core: Core; byDate: EntriesByDate }) {
  const today = todayKey()
  const [range, setRange] = useState<'7' | '30' | '90'>('30')
  const live = core.habits.filter((h) => !h.archived)
  if (!live.length) return null
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13))

  const rows = live
    .map((h) => ({ h, rate: completionRate(h, byDate, +range, today), st: streak(h, byDate, core.settings!.weekStartsOn, today), best: bestStreak(h, byDate, today) }))
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1))

  return (
    <>
      <SectionTitle action={<div className="w-36"><Segmented value={range} onChange={setRange} options={[{ value: '7', label: '7d' }, { value: '30', label: '30d' }, { value: '90', label: '90d' }]} /></div>}>
        Habits
      </SectionTitle>
      <Card className="divide-y divide-line">
        {rows.map(({ h, rate, st, best }) => (
          <div key={h.id} className="px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="text-lg">{h.emoji}</div>
              <div className="min-w-0 flex-1 truncate text-sm font-medium">{h.name}</div>
              <div className="text-right">
                <div className="text-sm font-semibold">{rate === null ? '–' : `${Math.round(rate * 100)}%`}</div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-3 pl-8">
              <div className="flex flex-1 gap-[3px]">
                {last14.map((d) => {
                  const sched = isScheduled(h, d)
                  const p = sched ? habitProgress(h, byDate.get(d)) : 0
                  return (
                    <div
                      key={d}
                      className="h-3 flex-1 rounded-[2px]"
                      style={{ background: !sched ? 'transparent' : p >= 1 ? 'var(--color-good)' : p > 0 ? 'color-mix(in srgb, var(--color-good) 40%, transparent)' : 'var(--color-surface-2)', border: !sched ? '1px dashed var(--color-line)' : undefined }}
                    />
                  )
                })}
              </div>
              <div className="w-20 text-right text-[11px] text-muted">
                <span className="font-semibold text-amber">🔥 {st.current}</span>{st.unit}{best !== null && best > 0 ? ` · best ${best}` : ''}
              </div>
            </div>
          </div>
        ))}
      </Card>
    </>
  )
}

/** Plan vs reality: how often each time block actually happened on time. */
function BlockReality({ core, byDate }: { core: Core; byDate: EntriesByDate }) {
  const today = todayKey()
  const rows = core.blocks.map((b) => {
    const c = [0, 0, 0]
    for (let i = 0; i < 30; i++) {
      const e = byDate.get(addDays(today, -i))?.find((x) => x.kind === 'block' && x.refId === b.id)
      if (e) c[e.value]++
    }
    return { b, c, total: c[0] + c[1] + c[2] }
  }).filter((r) => r.total > 0)

  return (
    <>
      <SectionTitle>Plan vs reality · 30d</SectionTitle>
      {rows.length === 0 ? (
        <Card className="p-4 text-sm text-muted">Tap <span className="text-good">On time</span> / <span className="text-warn">Late</span> / <span className="text-bad">Skipped</span> next to a time block on the Today screen to see where your day drifts.</Card>
      ) : (
        <Card className="space-y-3 p-4">
          {rows.map(({ b, c, total }) => (
            <div key={b.id}>
              <div className="mb-1 flex justify-between text-xs">
                <span>{b.emoji} {b.name}</span>
                <span className="text-muted">{Math.round((c[0] / total) * 100)}% on time</span>
              </div>
              <div className="flex h-2 overflow-hidden rounded-full bg-surface-2">
                <div className="bg-good" style={{ width: `${(c[0] / total) * 100}%` }} />
                <div className="bg-warn" style={{ width: `${(c[1] / total) * 100}%` }} />
                <div className="bg-bad" style={{ width: `${(c[2] / total) * 100}%` }} />
              </div>
            </div>
          ))}
        </Card>
      )}
    </>
  )
}

function InsightsTeaser({ scores }: { scores: Map<string, number | null> }) {
  const logged = [...scores.values()].filter((s) => s !== null && s > 0).length
  const need = 14
  if (logged >= need) {
    return <Empty emoji="🔬" title="Insight engine coming next" text="You have enough data — personal correlations arrive in the next update." />
  }
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="text-2xl">🔬</div>
        <div className="flex-1">
          <div className="text-sm font-semibold">Personal insights unlock at {need} days</div>
          <div className="text-xs text-muted">tapas will find what actually drives your best days — e.g. “Deep work is 34% higher when you sleep before 10:30”.</div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-brand" style={{ width: `${(logged / need) * 100}%` }} />
          </div>
          <div className="mt-1 text-[10px] text-muted">{logged}/{need} days logged</div>
        </div>
      </div>
    </Card>
  )
}

/** Last 14 nights: duration vs target, average bedtime and how often you hit lights-out. */
function SleepStats({ core }: { core: Core }) {
  const today = todayKey()
  const from = addDays(today, -13)
  const nights = useSleepRange(from, today)
  const s = core.settings!
  if (!nights) return null

  const target = targetMinutes(s.bedTime, s.wakeTime)
  const days = Array.from({ length: 14 }, (_, i) => addDays(from, i))
  const byDate = new Map(nights.map((n) => [n.date, n]))
  const logged = nights.filter((n) => n.wakeAt)
  const durations = logged.map((n) => sleepMinutes(n)!)
  const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null

  // Average bedtime, measured from noon so 11 PM and 1 AM average sensibly.
  const bedMins = logged.map((n) => {
    const d = new Date(n.bedAt)
    const m = d.getHours() * 60 + d.getMinutes()
    return m < 12 * 60 ? m + 24 * 60 : m
  })
  const avgBed = bedMins.length ? Math.round(bedMins.reduce((a, b) => a + b, 0) / bedMins.length) % (24 * 60) : null
  const spread = bedMins.length > 1 ? Math.round(Math.sqrt(bedMins.reduce((a, m) => a + (m - (bedMins.reduce((x, y) => x + y, 0) / bedMins.length)) ** 2, 0) / bedMins.length)) : null
  const onTime = logged.length ? Math.round((logged.filter((n) => targetHits(n, s.bedTime, s.wakeTime)?.bedOk).length / logged.length) * 100) : null

  const W = 320
  const H = 110
  const bw = W / 14
  const maxM = Math.max(target + 120, ...durations, 1)
  const y = (m: number) => H - (m / maxM) * H

  return (
    <>
      <SectionTitle>Sleep · 14 nights</SectionTitle>
      {logged.length === 0 ? (
        <Card className="p-4 text-sm text-muted">Tap <span className="font-semibold text-ink">Going to sleep</span> at night and <span className="font-semibold text-ink">I’m awake</span> in the morning on the Today screen — your sleep pattern shows up here.</Card>
      ) : (
        <Card className="p-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Avg sleep" value={avg !== null ? formatDuration(avg) : '–'} />
            <Stat label="Avg bedtime" value={avgBed !== null ? formatTime(hhmm(new Date(2000, 0, 1, Math.floor(avgBed / 60), avgBed % 60).getTime())).replace(' ', '\u00a0') : '–'} />
            <Stat label="On time" value={onTime !== null ? `${onTime}%` : '–'} />
          </div>
          <svg viewBox={`0 0 ${W} ${H + 16}`} className="mt-4 w-full overflow-visible">
            <line x1={0} x2={W} y1={y(target)} y2={y(target)} stroke="var(--color-ice)" strokeDasharray="3 3" strokeWidth={1} opacity={0.8} />
            <text x={W} y={y(target) - 4} textAnchor="end" fontSize={8} fill="var(--color-muted)">target {formatDuration(target)}</text>
            {days.map((d, i) => {
              const n = byDate.get(d)
              const m = n ? sleepMinutes(n) : null
              const h = m ? Math.max(3, H - y(m)) : 3
              const short = m !== null && m < target - 30
              return (
                <g key={d}>
                  <rect
                    x={i * bw + 3} y={H - h} width={bw - 6} height={h} rx={3}
                    fill={m === null ? 'var(--color-surface-2)' : short ? 'var(--color-amber)' : 'var(--color-ice)'}
                    className={m !== null && !short ? 'glow-stroke' : ''}
                  />
                  <text x={i * bw + bw / 2} y={H + 12} textAnchor="middle" fontSize={8} fill={d === today ? 'var(--color-brand)' : 'var(--color-muted)'}>
                    {DAY_LETTERS[weekday(d)]}
                  </text>
                </g>
              )
            })}
          </svg>
          {spread !== null && (
            <div className="mt-2 text-[11px] text-muted">
              Bedtime varies by <span className="font-semibold text-ink">±{formatDuration(spread)}</span> — {spread <= 30 ? 'rock-solid rhythm.' : spread <= 60 ? 'fairly consistent.' : 'a steadier bedtime will help recovery.'}
            </div>
          )}
        </Card>
      )}
    </>
  )
}
