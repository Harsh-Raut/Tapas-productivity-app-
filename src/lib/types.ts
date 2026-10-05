// Core data model. Everything is user-defined; templates just pre-fill these tables.

export type ID = string

export interface Settings {
  id: 'app'
  name: string
  wakeTime: string // "HH:MM"
  bedTime: string // "HH:MM"
  onboarded: boolean
  weekStartsOn: 0 | 1 // 0 = Sunday, 1 = Monday
  createdAt: number
}

export interface Goal {
  id: ID
  title: string
  emoji: string
  why?: string
  targetDate?: string // YYYY-MM-DD
  color: string
  archived?: boolean
  order: number
  createdAt: number
}

export interface TimeBlock {
  id: ID
  name: string
  emoji: string
  start: string // "HH:MM"
  end: string // "HH:MM"
  color: string
  days: number[] // 0-6, Sunday = 0
  note?: string
  order: number
}

/**
 * check    – done / not done
 * number   – reach a target amount (protein g, water L, pages)
 * duration – reach a target number of minutes (deep work)
 * avoid    – kept unless you log a slip (no phone, no snooze)
 */
export type HabitType = 'check' | 'number' | 'duration' | 'avoid'

export type Frequency =
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: number[] }
  | { kind: 'timesPerWeek'; count: number }

export interface Preset {
  label: string
  value: number
}

export interface Habit {
  id: ID
  name: string
  emoji: string
  type: HabitType
  target?: number // number/duration types
  unit?: string // "g", "L", "min"
  frequency: Frequency
  blockId?: ID
  goalId?: ID
  weight: 1 | 2 | 3 // importance in the daily score
  presets: Preset[]
  reminder?: string // "HH:MM"
  archived?: boolean
  order: number
  createdAt: number
}

/** A boundary that is active inside a time window, e.g. "Kitchen closed 19:00–22:00". */
export interface Rule {
  id: ID
  name: string
  emoji: string
  start: string // "HH:MM"
  end: string // "HH:MM"
  goalId?: ID
  archived?: boolean
  order: number
}

/** A time-boxed challenge (30/60/90 days). */
export interface Arc {
  id: ID
  name: string
  emoji: string
  description?: string
  startDate: string // YYYY-MM-DD
  lengthDays: number
  habitIds: ID[] // empty = all habits count
  createdAt: number
}

export type EntryKind = 'habit' | 'rule' | 'block'

/**
 * One logged event.
 * habit: value = amount (check: 1, number/duration: amount, avoid: 1 = slip)
 * rule:  value = 1 means the rule was broken
 * block: value = 0 on time, 1 late, 2 skipped (plan vs reality)
 */
export interface Entry {
  id: ID
  date: string // YYYY-MM-DD
  kind: EntryKind
  refId: ID
  value: number
  label?: string
  at: number // timestamp
}

/**
 * One night of sleep. `date` is the morning it ended (YYYY-MM-DD); it stays ''
 * while the night is in progress (after "Going to sleep", before "I'm awake").
 */
export interface Sleep {
  id: ID
  date: string
  bedAt: number // timestamp
  wakeAt?: number // timestamp
}

export interface CheckIn {
  date: string // YYYY-MM-DD (primary key)
  energy?: number // 1-5
  mood?: number // 1-5
  sleepQuality?: number // 1-5
  symptoms?: Record<string, number> // e.g. { reflux: 2 }
  note?: string
}
