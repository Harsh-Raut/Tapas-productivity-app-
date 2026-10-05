import Dexie, { type EntityTable } from 'dexie'
import type { Arc, CheckIn, Entry, Goal, Habit, Rule, Settings, Sleep, TimeBlock } from './types'

// Local-first storage (IndexedDB). When accounts arrive, these tables sync to a backend.
export const db = new Dexie('tapas') as Dexie & {
  settings: EntityTable<Settings, 'id'>
  goals: EntityTable<Goal, 'id'>
  blocks: EntityTable<TimeBlock, 'id'>
  habits: EntityTable<Habit, 'id'>
  rules: EntityTable<Rule, 'id'>
  arcs: EntityTable<Arc, 'id'>
  entries: EntityTable<Entry, 'id'>
  checkins: EntityTable<CheckIn, 'date'>
  sleeps: EntityTable<Sleep, 'id'>
}

db.version(1).stores({
  settings: 'id',
  goals: 'id, order',
  blocks: 'id, order',
  habits: 'id, order, blockId, goalId',
  rules: 'id, order',
  arcs: 'id, startDate',
  entries: 'id, date, [date+kind], refId, [refId+date]',
  checkins: 'date',
})

db.version(2).stores({
  sleeps: 'id, date, bedAt',
})

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

export async function exportAll() {
  const [settings, goals, blocks, habits, rules, arcs, entries, checkins, sleeps] = await Promise.all([
    db.settings.toArray(),
    db.goals.toArray(),
    db.blocks.toArray(),
    db.habits.toArray(),
    db.rules.toArray(),
    db.arcs.toArray(),
    db.entries.toArray(),
    db.checkins.toArray(),
    db.sleeps.toArray(),
  ])
  return { version: 2, exportedAt: new Date().toISOString(), settings, goals, blocks, habits, rules, arcs, entries, checkins, sleeps }
}

export async function importAll(data: Awaited<ReturnType<typeof exportAll>>) {
  if (data?.version !== 1 && data?.version !== 2) throw new Error('Unrecognised backup file')
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
    await db.settings.bulkPut(data.settings)
    await db.goals.bulkPut(data.goals)
    await db.blocks.bulkPut(data.blocks)
    await db.habits.bulkPut(data.habits)
    await db.rules.bulkPut(data.rules)
    await db.arcs.bulkPut(data.arcs)
    await db.entries.bulkPut(data.entries)
    await db.checkins.bulkPut(data.checkins)
    await db.sleeps.bulkPut(data.sleeps ?? [])
  })
}

export async function resetAll() {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
}
