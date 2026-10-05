import { db, uid } from './db'
import type { CheckIn, EntryKind } from './types'

export const addEntry = (date: string, kind: EntryKind, refId: string, value: number, label?: string) =>
  db.entries.add({ id: uid(), date, kind, refId, value, label, at: Date.now() })

export const clearEntries = (date: string, kind: EntryKind, refId: string) =>
  db.entries.where('[refId+date]').equals([refId, date]).filter((e) => e.kind === kind).delete()

export const deleteEntry = (id: string) => db.entries.delete(id)

export async function toggleEntry(date: string, kind: EntryKind, refId: string) {
  const n = await clearEntries(date, kind, refId)
  if (n === 0) await addEntry(date, kind, refId, 1)
}

export async function setBlockStatus(date: string, blockId: string, status: 0 | 1 | 2 | null) {
  await clearEntries(date, 'block', blockId)
  if (status !== null) await addEntry(date, 'block', blockId, status)
}

export async function saveCheckIn(date: string, patch: Partial<CheckIn>) {
  const existing = await db.checkins.get(date)
  await db.checkins.put({ ...existing, ...patch, date })
}

/** Deleting a goal/block keeps its habits, just unlinks them. */
export async function deleteGoal(id: string) {
  await db.transaction('rw', [db.goals, db.habits, db.rules], async () => {
    await db.habits.where('goalId').equals(id).modify({ goalId: undefined })
    await db.rules.filter((r) => r.goalId === id).modify({ goalId: undefined })
    await db.goals.delete(id)
  })
}

export async function deleteBlock(id: string) {
  await db.transaction('rw', [db.blocks, db.habits, db.entries], async () => {
    await db.habits.where('blockId').equals(id).modify({ blockId: undefined })
    await db.entries.where('refId').equals(id).delete()
    await db.blocks.delete(id)
  })
}

export async function deleteHabit(id: string) {
  await db.transaction('rw', [db.habits, db.entries, db.arcs], async () => {
    await db.entries.where('refId').equals(id).delete()
    await db.arcs.toCollection().modify((a) => { a.habitIds = a.habitIds.filter((h) => h !== id) })
    await db.habits.delete(id)
  })
}

export async function deleteRule(id: string) {
  await db.transaction('rw', [db.rules, db.entries], async () => {
    await db.entries.where('refId').equals(id).delete()
    await db.rules.delete(id)
  })
}
