import { useEffect, useState } from 'react'
import { diffDays, todayKey } from './date'
import type { Arc, Habit } from './types'

/** 1-based day number inside an arc (may be <1 before start or >length after the end). */
export const arcDay = (arc: Arc, date = todayKey()) => diffDays(date, arc.startDate) + 1

export const arcActive = (arc: Arc, date = todayKey()) => {
  const d = arcDay(arc, date)
  return d >= 1 && d <= arc.lengthDays
}

export const arcHabits = (arc: Arc, habits: Habit[]) =>
  arc.habitIds.length ? habits.filter((h) => arc.habitIds.includes(h.id)) : habits

/** Current time, refreshed every `ms` so countdowns and the "now" block stay fresh. */
export function useTick(ms = 30_000) {
  const [now, set] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => set(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}
