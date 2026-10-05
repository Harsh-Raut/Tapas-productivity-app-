import { addDays, fromKey, inWindow, nowMinutes, startOfWeek, toKey, todayKey, toMinutes, weekday } from './date'
import type { Entry, Habit, Rule } from './types'

export type EntriesByDate = Map<string, Entry[]>

export const groupByDate = (entries: Entry[]): EntriesByDate => {
  const map: EntriesByDate = new Map()
  for (const e of entries) {
    const list = map.get(e.date)
    if (list) list.push(e)
    else map.set(e.date, [e])
  }
  return map
}

const createdKey = (h: Habit) => toKey(new Date(h.createdAt))

/** Does this habit appear on the given day? */
export const isScheduled = (h: Habit, date: string) => {
  if (h.archived) return false
  if (date < createdKey(h)) return false
  if (h.frequency.kind === 'weekdays') return h.frequency.days.includes(weekday(date))
  return true
}

export const habitTotal = (h: Habit, dayEntries: Entry[] = []) =>
  dayEntries.filter((e) => e.kind === 'habit' && e.refId === h.id).reduce((s, e) => s + e.value, 0)

/** 0..1 completion for one habit on one day. */
export const habitProgress = (h: Habit, dayEntries: Entry[] = []) => {
  const total = habitTotal(h, dayEntries)
  switch (h.type) {
    case 'check':
      return total >= 1 ? 1 : 0
    case 'avoid':
      return total >= 1 ? 0 : 1
    case 'number':
    case 'duration':
      return h.target ? Math.min(total / h.target, 1) : total > 0 ? 1 : 0
  }
}

export const ruleBroken = (r: Rule, dayEntries: Entry[] = []) =>
  dayEntries.some((e) => e.kind === 'rule' && e.refId === r.id && e.value >= 1)

/** A rule counts toward a day once its window is over (or it was broken). */
const ruleSettled = (r: Rule, date: string, today: string, dayEntries: Entry[]) => {
  if (ruleBroken(r, dayEntries)) return true
  if (date < today) return true
  if (date > today) return false
  const s = toMinutes(r.start)
  const e = toMinutes(r.end)
  return s <= e && nowMinutes() >= e
}

export interface DayScore {
  score: number | null // 0-100, null when nothing is scheduled
  earned: number
  possible: number
  habitsDone: number
  habitsTotal: number
}

export function dayScore(
  date: string,
  habits: Habit[],
  rules: Rule[],
  dayEntries: Entry[] = [],
  today = todayKey(),
): DayScore {
  let earned = 0
  let possible = 0
  let habitsDone = 0
  let habitsTotal = 0
  let anyScheduled = false

  for (const h of habits) {
    if (!isScheduled(h, date)) continue
    anyScheduled = true
    const p = habitProgress(h, dayEntries)
    // "X times a week" habits only count on days they were done, so rest days don't hurt.
    if (h.frequency.kind === 'timesPerWeek' && p === 0) continue
    earned += p * h.weight
    possible += h.weight
    habitsTotal++
    if (p >= 1) habitsDone++
  }

  // Days before any habit existed (e.g. before you joined) have no score, so kept rules can't inflate them.
  if (!anyScheduled) return { score: null, earned: 0, possible: 0, habitsDone: 0, habitsTotal: 0 }

  for (const r of rules) {
    if (r.archived || !ruleSettled(r, date, today, dayEntries)) continue
    possible += 1
    if (!ruleBroken(r, dayEntries)) earned += 1
  }

  return {
    score: possible ? Math.round((earned / possible) * 100) : null,
    earned,
    possible,
    habitsDone,
    habitsTotal,
  }
}

export function streak(h: Habit, byDate: EntriesByDate, weekStartsOn: 0 | 1, today = todayKey()) {
  const done = (d: string) => habitProgress(h, byDate.get(d)) >= 1
  const created = createdKey(h)

  if (h.frequency.kind === 'timesPerWeek') {
    const need = h.frequency.count
    const weekCount = (start: string) => {
      let n = 0
      for (let i = 0; i < 7; i++) {
        const d = addDays(start, i)
        if (d <= today && done(d)) n++
      }
      return n
    }
    let wk = startOfWeek(today, weekStartsOn)
    let count = 0
    // The current week doesn't break the streak until it's over.
    if (weekCount(wk) >= need) count++
    wk = addDays(wk, -7)
    while (addDays(wk, 6) >= created && weekCount(wk) >= need) {
      count++
      wk = addDays(wk, -7)
    }
    return { current: count, unit: 'wk' as const }
  }

  let d = today
  if (!done(d)) d = addDays(d, -1) // today isn't over yet
  let count = 0
  while (d >= created) {
    if (isScheduled(h, d)) {
      if (!done(d)) break
      count++
    }
    d = addDays(d, -1)
  }
  return { current: count, unit: 'd' as const }
}

export function bestStreak(h: Habit, byDate: EntriesByDate, today = todayKey()) {
  if (h.frequency.kind === 'timesPerWeek') return null
  let best = 0
  let run = 0
  for (let d = createdKey(h); d <= today; d = addDays(d, 1)) {
    if (!isScheduled(h, d)) continue
    if (habitProgress(h, byDate.get(d)) >= 1) best = Math.max(best, ++run)
    else if (d !== today) run = 0
  }
  return best
}

/** Completion rate over scheduled days in the last `days` days (excluding today unless done). */
export function completionRate(h: Habit, byDate: EntriesByDate, days: number, today = todayKey()) {
  let scheduled = 0
  let done = 0
  for (let i = 0; i < days; i++) {
    const d = addDays(today, -i)
    if (!isScheduled(h, d)) continue
    const p = habitProgress(h, byDate.get(d))
    // Today only counts once it's done; "avoid" habits aren't settled until the day ends.
    if (d === today && (p < 1 || h.type === 'avoid')) continue
    scheduled++
    done += p
  }
  return scheduled ? done / scheduled : null
}

export const scoreColor = (score: number | null) => {
  if (score === null) return 'var(--cell-empty)'
  if (score >= 90) return 'var(--score-5)'
  if (score >= 70) return 'var(--score-4)'
  if (score >= 50) return 'var(--score-3)'
  if (score >= 25) return 'var(--score-2)'
  return 'var(--score-1)'
}

export const isFutureDate = (date: string) => fromKey(date) > fromKey(todayKey())

/** Which time block is active now (or the next one today). */
export function currentBlock<T extends { start: string; end: string; days: number[] }>(blocks: T[], date: string) {
  const wd = weekday(date)
  const m = nowMinutes()
  const todays = blocks.filter((b) => b.days.includes(wd)).sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
  const now = todays.find((b) => inWindow(m, b.start, b.end))
  const next = todays.find((b) => toMinutes(b.start) > m)
  return { now, next }
}
