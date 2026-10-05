import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { formatDuration, formatTime, nowMinutes, prettyDate, todayKey, toMinutes } from '../lib/date'
import { saveCheckIn } from '../lib/actions'
import {
  cancelSleep, deleteSleep, hhmm, saveNight, sleepMinutes, startSleep, suggestNight, targetHits, targetMinutes,
  usePendingSleep, useSleepOn, wakeUp,
} from '../lib/sleep'
import { useTick } from '../lib/arcs'
import type { Settings, Sleep } from '../lib/types'
import { Bar, Button, Card, SectionTitle, Sheet, inputCls } from './ui'

const QUALITY = ['😵', '🥱', '😐', '😌', '😴']
const STALE_MS = 18 * 3_600_000

export default function SleepCard({ date, settings }: { date: string; settings: Settings }) {
  const now = useTick()
  const today = todayKey()
  const pending = usePendingSleep()
  const night = useSleepOn(date)
  const [editing, setEditing] = useState(false)

  if (pending === undefined && date === today) return null // still loading

  // Past days: show the night if logged, otherwise a quiet link to add it.
  if (date !== today) {
    return (
      <>
        <SectionTitle>Sleep</SectionTitle>
        {night ? (
          <Summary night={night} settings={settings} onEdit={() => setEditing(true)} />
        ) : (
          <Card onClick={() => setEditing(true)} className="p-3 text-sm text-muted">🌙 Log sleep for the night before {prettyDate(date).toLowerCase()}</Card>
        )}
        {editing && <SleepSheet wakeDate={date} night={night} settings={settings} onClose={() => setEditing(false)} />}
      </>
    )
  }

  const m = nowMinutes()
  const eveningFrom = Math.min(18 * 60, toMinutes(settings.bedTime) - 3 * 60)
  const isEvening = m >= eveningFrom || m < 3 * 60
  const isMorning = m >= 3 * 60 && m < 15 * 60

  let body
  if (pending && now - pending.bedAt < STALE_MS) {
    body = <Sleeping pending={pending} now={now} />
  } else if (pending) {
    // Forgot to tap "I'm awake" — confirm the night with the start time we already have.
    body = <LogNight wakeDate={today} settings={settings} existing={pending} initialBed={hhmm(pending.bedAt)} />
  } else if (night) {
    body = <Summary night={night} settings={settings} onEdit={() => setEditing(true)} />
  } else if (isEvening) {
    body = <GoingToSleep settings={settings} />
  } else if (isMorning) {
    body = <LogNight wakeDate={today} settings={settings} />
  } else {
    body = <Card onClick={() => setEditing(true)} className="p-3 text-sm text-muted">🌙 Log last night’s sleep</Card>
  }

  return (
    <>
      <SectionTitle>Sleep</SectionTitle>
      {body}
      {editing && <SleepSheet wakeDate={today} night={night} settings={settings} onClose={() => setEditing(false)} />}
    </>
  )
}

function GoingToSleep({ settings }: { settings: Settings }) {
  const target = toMinutes(settings.bedTime)
  const m = nowMinutes()
  const until = target - m
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="text-3xl">🌙</div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">Heading to bed?</div>
        <div className="text-xs text-muted">
          Lights-out target {formatTime(settings.bedTime)}
          {until > 0 && until < 6 * 60 ? ` · in ${formatDuration(until)}` : until <= 0 && until > -6 * 60 ? ` · ${formatDuration(-until)} past` : ''}
        </div>
      </div>
      <Button onClick={() => startSleep()}>Going to sleep</Button>
    </Card>
  )
}

function Sleeping({ pending, now }: { pending: Sleep; now: number }) {
  const elapsed = Math.round((now - pending.bedAt) / 60_000)
  return (
    <Card className="p-5 text-center">
      <div className="text-4xl">😴</div>
      <div className="mt-2 text-sm text-muted">Sleeping since {formatTime(hhmm(pending.bedAt))}</div>
      <div className="mt-1 text-3xl font-bold">{formatDuration(Math.max(0, elapsed))}</div>
      <Button className="mt-4 w-full py-3.5 text-base" onClick={() => wakeUp(pending)}>☀️ I’m awake</Button>
      <button className="mt-3 text-xs text-muted" onClick={() => cancelSleep(pending)}>Cancel — I’m not sleeping yet</button>
    </Card>
  )
}

function LogNight({ wakeDate, settings, existing, initialBed }: { wakeDate: string; settings: Settings; existing?: Sleep; initialBed?: string }) {
  const guess = suggestNight(settings.bedTime)
  return (
    <Card className="p-4">
      <div className="font-semibold">☀️ Good morning — how did you sleep?</div>
      <div className="mb-3 text-xs text-muted">
        {existing ? 'You tapped “Going to sleep” — confirm when you woke up.' : guess.fromActivity ? 'Bedtime pre-filled from when you last used tapas.' : 'Times pre-filled from your targets — adjust if needed.'}
      </div>
      <SleepForm wakeDate={wakeDate} existing={existing} initialBed={initialBed ?? guess.bed} initialWake={guess.wake} />
    </Card>
  )
}

function SleepForm({ wakeDate, existing, initialBed, initialWake, onDone }: { wakeDate: string; existing?: Sleep; initialBed: string; initialWake: string; onDone?: () => void }) {
  const [bed, setBed] = useState(initialBed)
  const [wake, setWake] = useState(initialWake)
  const [err, setErr] = useState('')
  const save = async () => {
    try {
      await saveNight(wakeDate, bed, wake, existing)
      onDone?.()
    } catch (e) {
      setErr((e as Error).message)
    }
  }
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">Fell asleep<input type="time" className={`${inputCls} mt-1`} value={bed} onChange={(e) => setBed(e.target.value)} /></label>
        <label className="text-xs text-muted">Woke up<input type="time" className={`${inputCls} mt-1`} value={wake} onChange={(e) => setWake(e.target.value)} /></label>
      </div>
      {err && <div className="mt-2 text-xs text-bad">{err}</div>}
      <Button className="mt-3 w-full" onClick={save}>Save sleep</Button>
    </div>
  )
}

function Summary({ night, settings, onEdit }: { night: Sleep; settings: Settings; onEdit: () => void }) {
  const mins = sleepMinutes(night) ?? 0
  const target = targetMinutes(settings.bedTime, settings.wakeTime)
  const hits = targetHits(night, settings.bedTime, settings.wakeTime)
  const quality = useLiveQuery(() => db.checkins.get(night.date), [night.date])?.sleepQuality
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted">Last night</div>
          <div className="text-2xl font-bold">{formatDuration(mins)}</div>
          <div className="text-xs text-muted">{formatTime(hhmm(night.bedAt))} → {formatTime(hhmm(night.wakeAt!))}</div>
        </div>
        <button onClick={onEdit} className="rounded-full bg-surface-2 px-3 py-1 text-xs text-muted">Edit</button>
      </div>
      <div className="mt-3"><Bar value={mins / target} color={mins >= target - 30 ? 'var(--color-ice)' : 'var(--color-amber)'} /></div>
      <div className="mt-1 text-[11px] text-muted">{mins >= target ? 'Target reached' : `${formatDuration(target - mins)} short of ${formatDuration(target)} target`}</div>
      {hits && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Pill ok={hits.bedOk} yes={`Lights out by ${formatTime(settings.bedTime)}`} no="Late to bed" />
          <Pill ok={hits.wakeOk} yes={`Up by ${formatTime(settings.wakeTime)}`} no="Slept in" />
        </div>
      )}
      <div className="mt-3 flex items-center gap-2">
        <span className="w-14 text-xs text-muted">Quality</span>
        <div className="flex flex-1 justify-between">
          {QUALITY.map((f, i) => {
            const on = quality === i + 1
            return (
              <button
                key={i}
                onClick={() => saveCheckIn(night.date, { sleepQuality: on ? undefined : i + 1 })}
                className={`h-9 w-9 rounded-full text-lg transition ${on ? 'scale-110 bg-accent/25 ring-1 ring-brand' : 'opacity-50 grayscale'}`}
              >
                {f}
              </button>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

function Pill({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${ok ? 'bg-mint/40 text-good' : 'bg-amber/15 text-amber'}`}>
      {ok ? `✓ ${yes}` : no}
    </span>
  )
}

function SleepSheet({ wakeDate, night, settings, onClose }: { wakeDate: string; night?: Sleep; settings: Settings; onClose: () => void }) {
  const guess = suggestNight(settings.bedTime)
  return (
    <Sheet open onClose={onClose} title={`Sleep · night before ${prettyDate(wakeDate).toLowerCase()}`}>
      <SleepForm
        wakeDate={wakeDate}
        existing={night}
        initialBed={night ? hhmm(night.bedAt) : settings.bedTime}
        initialWake={night?.wakeAt ? hhmm(night.wakeAt) : wakeDate === todayKey() ? guess.wake : settings.wakeTime}
        onDone={onClose}
      />
      {night && (
        <Button variant="danger" className="mt-3 w-full" onClick={async () => { await deleteSleep(night); onClose() }}>
          Delete this night
        </Button>
      )}
    </Sheet>
  )
}
