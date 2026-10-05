import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { addDays } from './date'
import { groupByDate } from './scoring'

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order

/** Everything except entries — small tables, loaded once and kept live. */
export function useCore() {
  return useLiveQuery(async () => {
    const [settings, goals, blocks, habits, rules, arcs] = await Promise.all([
      db.settings.get('app'),
      db.goals.toArray(),
      db.blocks.toArray(),
      db.habits.toArray(),
      db.rules.toArray(),
      db.arcs.toArray(),
    ])
    return {
      settings,
      goals: goals.sort(byOrder),
      blocks: blocks.sort((a, b) => a.start.localeCompare(b.start)),
      habits: habits.sort(byOrder),
      rules: rules.sort(byOrder),
      arcs: arcs.sort((a, b) => b.startDate.localeCompare(a.startDate)),
    }
  })
}

export type Core = NonNullable<ReturnType<typeof useCore>>

export function useDayEntries(date: string) {
  return useLiveQuery(() => db.entries.where('date').equals(date).toArray(), [date]) ?? []
}

/** Entries for a date range, grouped by day. */
export function useRangeEntries(from: string, to: string) {
  return useLiveQuery(
    async () => groupByDate(await db.entries.where('date').between(from, addDays(to, 1), true, false).toArray()),
    [from, to],
  )
}

export function useCheckIn(date: string) {
  return useLiveQuery(() => db.checkins.get(date), [date])
}
