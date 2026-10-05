import { useLiveQuery } from 'dexie-react-hooks'
import { db, uid } from './db'
import { addDays, fromKey, toKey, todayKey, toMinutes } from './date'
import type { Sleep } from './types'

/*
 * Smart-manual sleep log. A web app can't see screen on/off, so we:
 *  - offer one-tap "Going to sleep" / "I'm awake",
 *  - remember when tapas was last used at night and first opened in the morning,
 *    and pre-fill last night's times from those if you forgot to tap.
 */

const LAST_ACTIVE = 'tapas-last-active'
const FIRST_OPEN = 'tapas-first-open'

const store = {
  get(k: string) {
    try { return localStorage.getItem(k) } catch { return null }
  },
  set(k: string, v: string) {
    try { localStorage.setItem(k, v) } catch { /* storage unavailable */ }
  },
}

/** Call once at startup: records first open of the day and last activity whenever the app is hidden. */
export function trackActivity() {
  const markOpen = () => {
    const today = todayKey()
    const first = store.get(FIRST_OPEN)
    if (!first || toKey(new Date(+first)) !== today) store.set(FIRST_OPEN, String(Date.now()))
  }
  const markActive = () => store.set(LAST_ACTIVE, String(Date.now()))
  markOpen()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') markActive()
    else markOpen()
  })
  window.addEventListener('pagehide', markActive)
}

const pad = (n: number) => String(n).padStart(2, '0')
export const hhmm = (ts: number) => {
  const d = new Date(ts)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Builds timestamps for a night ending on `wakeDate`. Bedtimes from noon onward belong to the previous evening. */
export function nightTimes(wakeDate: string, bed: string, wake: string) {
  const bedDay = toMinutes(bed) >= 12 * 60 ? addDays(wakeDate, -1) : wakeDate
  const at = (day: string, t: string) => {
    const d = fromKey(day)
    d.setMinutes(toMinutes(t))
    return d.getTime()
  }
  return { bedAt: at(bedDay, bed), wakeAt: at(wakeDate, wake) }
}

/** Best guess for last night, from app activity. */
export function suggestNight(defaultBed: string) {
  const now = Date.now()
  const today = todayKey()
  const yesterdayEvening = fromKey(addDays(today, -1)).getTime() + 18 * 3_600_000
  const last = Number(store.get(LAST_ACTIVE))
  const first = Number(store.get(FIRST_OPEN))
  const bed = last && last >= yesterdayEvening && last < now - 3 * 3_600_000 ? hhmm(last) : defaultBed
  const wake = first && toKey(new Date(first)) === today ? hhmm(first) : hhmm(now)
  return { bed, wake, fromActivity: bed !== defaultBed }
}

export const sleepMinutes = (s: Sleep) => (s.wakeAt ? Math.round((s.wakeAt - s.bedAt) / 60_000) : null)

export const startSleep = () => db.sleeps.add({ id: uid(), date: '', bedAt: Date.now() })

export const wakeUp = (s: Sleep) => {
  const now = Date.now()
  return db.sleeps.update(s.id, { wakeAt: now, date: toKey(new Date(now)) })
}

export const cancelSleep = (s: Sleep) => db.sleeps.delete(s.id)

/** Creates or replaces the night ending on `wakeDate`. */
export async function saveNight(wakeDate: string, bed: string, wake: string, existing?: Sleep) {
  const { bedAt, wakeAt } = nightTimes(wakeDate, bed, wake)
  if (wakeAt <= bedAt) throw new Error('Wake time must be after bedtime')
  await db.transaction('rw', db.sleeps, async () => {
    if (existing) await db.sleeps.delete(existing.id)
    await db.sleeps.where('date').equals(wakeDate).delete()
    await db.sleeps.add({ id: existing?.id ?? uid(), date: wakeDate, bedAt, wakeAt })
  })
}

export const deleteSleep = (s: Sleep) => db.sleeps.delete(s.id)

/** The night in progress, if "Going to sleep" was tapped. undefined = loading, null = none. */
export const usePendingSleep = () =>
  useLiveQuery(async () => (await db.sleeps.where('date').equals('').first()) ?? null)

export const useSleepOn = (date: string) => useLiveQuery(() => db.sleeps.where('date').equals(date).first(), [date])

export const useSleepRange = (from: string, to: string) =>
  useLiveQuery(() => db.sleeps.where('date').between(from, to, true, true).toArray(), [from, to])

/** Did bedtime / wake time land within 15 minutes of the targets in Settings? */
export function targetHits(s: Sleep, bedTarget: string, wakeTarget: string) {
  if (!s.wakeAt) return null
  const minsOf = (ts: number) => {
    const d = new Date(ts)
    return d.getHours() * 60 + d.getMinutes()
  }
  // Shift times so the evening flows into the night without wrapping at midnight.
  const shift = (m: number) => (m < 12 * 60 ? m + 24 * 60 : m)
  const bedOk = shift(minsOf(s.bedAt)) <= shift(toMinutes(bedTarget)) + 15
  const wakeOk = minsOf(s.wakeAt) <= toMinutes(wakeTarget) + 15
  return { bedOk, wakeOk }
}

/** Target sleep length implied by the bedtime and wake targets. */
export function targetMinutes(bedTarget: string, wakeTarget: string) {
  const diff = toMinutes(wakeTarget) - toMinutes(bedTarget)
  return diff > 0 ? diff : diff + 24 * 60
}
