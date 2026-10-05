import { db, uid } from './db'
import { todayKey } from './date'
import type { Arc, Frequency, Goal, Habit, Preset, Rule, TimeBlock } from './types'

// Templates reference each other by local keys; applyTemplate swaps them for real ids.
interface TGoal { key: string; title: string; emoji: string; why?: string; color: string }
interface TBlock { key: string; name: string; emoji: string; start: string; end: string; color: string; days?: number[]; note?: string }
interface THabit {
  name: string
  emoji: string
  type: Habit['type']
  target?: number
  unit?: string
  frequency?: Frequency
  block?: string
  goal?: string
  weight?: 1 | 2 | 3
  presets?: Preset[]
}
interface TRule { name: string; emoji: string; start: string; end: string; goal?: string }

export interface Template {
  id: string
  name: string
  emoji: string
  tagline: string
  wakeTime: string
  bedTime: string
  goals: TGoal[]
  blocks: TBlock[]
  habits: THabit[]
  rules: TRule[]
  arc?: { name: string; emoji: string; days: number; description: string }
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]
const MON_SAT = [1, 2, 3, 4, 5, 6]

export const PALETTE = ['#3e8fb0', '#2a8f6d', '#c46a9a', '#e7a34b', '#7c6cd0', '#c0563f', '#176b6b', '#7fa650']

export const TEMPLATES: Template[] = [
  {
    id: 'winter-arc',
    name: 'Winter Arc',
    emoji: '❄️',
    tagline: '90 days. Vedic discipline × modern performance science.',
    wakeTime: '05:00',
    bedTime: '22:00',
    goals: [
      { key: 'discipline', title: 'Top 1% discipline', emoji: '⚔️', why: 'Ruthless subtraction over addition.', color: '#3e8fb0' },
      { key: 'physique', title: 'Lean physique & sharp jawline', emoji: '💪', why: 'Lower body fat, progressive overload, 124 g protein.', color: '#2a8f6d' },
      { key: 'gut', title: 'Reflux-free gut', emoji: '🌿', why: 'Evening digestive discipline.', color: '#7fa650' },
      { key: 'work', title: 'Deep agency output', emoji: '🧠', why: '90–120 min of uninterrupted leverage daily.', color: '#7c6cd0' },
    ],
    blocks: [
      { key: 'dawn', name: 'Dawn Awakening', emoji: '🌅', start: '04:45', end: '05:30', color: '#e7a34b', note: 'Brahma Muhurta · warm water · tongue scraping · pranayama' },
      { key: 'forge', name: 'Physical Forge', emoji: '🏋️', start: '05:45', end: '07:15', color: '#c0563f', note: 'Heavy compounds · contrast shower' },
      { key: 'ignite', name: 'Metabolic Ignition', emoji: '🍳', start: '07:30', end: '08:15', color: '#2a8f6d', note: '35 g+ protein breakfast · morning sunlight' },
      { key: 'output', name: 'Executive Output', emoji: '🧠', start: '08:30', end: '11:30', color: '#7c6cd0', note: 'Monk mode · zero phone, zero context switching' },
      { key: 'apex', name: 'Midday Apex', emoji: '☀️', start: '12:30', end: '14:00', color: '#d9824a', note: 'Largest warm meal · 15 min NSDR' },
      { key: 'night', name: 'Ratri Charya', emoji: '🌙', start: '19:00', end: '21:30', color: '#3e8fb0', note: 'Light early dinner · foot massage · no screens' },
    ],
    habits: [
      { name: 'Wake at 5:00, no snooze', emoji: '⏰', type: 'check', block: 'dawn', goal: 'discipline', weight: 3 },
      { name: 'Warm water + tongue scraping', emoji: '🫗', type: 'check', block: 'dawn', goal: 'gut', weight: 1 },
      { name: 'Pranayama', emoji: '🌬️', type: 'duration', target: 10, unit: 'min', block: 'dawn', goal: 'discipline', weight: 1, presets: [{ label: '5m', value: 5 }, { label: '10m', value: 10 }] },
      { name: 'Strength training', emoji: '🏋️', type: 'check', block: 'forge', goal: 'physique', weight: 3, frequency: { kind: 'weekdays', days: MON_SAT } },
      { name: 'Log progressive overload', emoji: '📈', type: 'check', block: 'forge', goal: 'physique', weight: 1, frequency: { kind: 'weekdays', days: MON_SAT } },
      { name: 'Sunlight within 30 min', emoji: '🌞', type: 'check', block: 'ignite', goal: 'discipline', weight: 2 },
      {
        name: 'Protein', emoji: '🥩', type: 'number', target: 124, unit: 'g', goal: 'physique', weight: 3,
        presets: [
          { label: 'Isolate scoop', value: 27 },
          { label: '3 eggs', value: 18 },
          { label: 'Chicken 100 g', value: 31 },
          { label: 'Paneer 100 g', value: 18 },
          { label: 'Dal bowl', value: 9 },
          { label: 'Curd bowl', value: 8 },
        ],
      },
      { name: 'Water', emoji: '💧', type: 'number', target: 3.5, unit: 'L', goal: 'physique', weight: 2, presets: [{ label: 'Glass', value: 0.25 }, { label: 'Bottle', value: 0.5 }, { label: '1 L', value: 1 }] },
      { name: 'No phone first 3 hours', emoji: '📵', type: 'avoid', block: 'output', goal: 'discipline', weight: 2 },
      { name: 'Deep work', emoji: '🎯', type: 'duration', target: 90, unit: 'min', block: 'output', goal: 'work', weight: 3, presets: [{ label: '25m', value: 25 }, { label: '45m', value: 45 }, { label: '60m', value: 60 }, { label: '90m', value: 90 }] },
      { name: 'NSDR / Shavasana', emoji: '🧘', type: 'duration', target: 15, unit: 'min', block: 'apex', goal: 'work', weight: 1, presets: [{ label: '10m', value: 10 }, { label: '15m', value: 15 }] },
      { name: 'Sesame oil foot massage', emoji: '🦶', type: 'check', block: 'night', goal: 'gut', weight: 1 },
      { name: 'No screens 45 min before bed', emoji: '📴', type: 'avoid', block: 'night', goal: 'discipline', weight: 2 },
      { name: 'Lights out by 10 PM', emoji: '🛏️', type: 'check', block: 'night', goal: 'discipline', weight: 3 },
    ],
    rules: [
      { name: 'Kitchen closed', emoji: '🍽️', start: '19:00', end: '22:00', goal: 'gut' },
      { name: 'No caffeine', emoji: '☕', start: '14:00', end: '23:59', goal: 'gut' },
    ],
    arc: { name: 'Winter Arc', emoji: '❄️', days: 90, description: 'Master the 5 fundamentals: fixed sleep, clean fuel, progressive resistance, deep work, evening gut discipline.' },
  },
  {
    id: 'fitness',
    name: 'Fitness Starter',
    emoji: '🏃',
    tagline: 'Build the base: move, eat protein, sleep well.',
    wakeTime: '06:30',
    bedTime: '23:00',
    goals: [{ key: 'fit', title: 'Get fit & feel strong', emoji: '💪', color: '#2a8f6d' }],
    blocks: [
      { key: 'am', name: 'Morning move', emoji: '🏃', start: '07:00', end: '08:00', color: '#2a8f6d' },
      { key: 'pm', name: 'Wind down', emoji: '🌙', start: '22:00', end: '23:00', color: '#3e8fb0' },
    ],
    habits: [
      { name: 'Workout', emoji: '🏋️', type: 'check', block: 'am', goal: 'fit', weight: 3, frequency: { kind: 'timesPerWeek', count: 4 } },
      { name: 'Steps', emoji: '👟', type: 'number', target: 8000, unit: 'steps', goal: 'fit', weight: 2, presets: [{ label: '+1k', value: 1000 }, { label: '+5k', value: 5000 }] },
      { name: 'Protein', emoji: '🥚', type: 'number', target: 100, unit: 'g', goal: 'fit', weight: 2, presets: [{ label: '2 eggs', value: 12 }, { label: 'Shake', value: 25 }, { label: 'Chicken', value: 30 }] },
      { name: 'Water', emoji: '💧', type: 'number', target: 3, unit: 'L', goal: 'fit', weight: 1, presets: [{ label: 'Glass', value: 0.25 }, { label: 'Bottle', value: 0.5 }] },
      { name: 'In bed by 11 PM', emoji: '🛏️', type: 'check', block: 'pm', goal: 'fit', weight: 2 },
    ],
    rules: [{ name: 'No late snacks', emoji: '🍪', start: '21:00', end: '23:59', goal: 'fit' }],
    arc: { name: '30-day kickstart', emoji: '🔥', days: 30, description: 'Show up for 30 days straight.' },
  },
  {
    id: 'student',
    name: 'Student Focus',
    emoji: '📚',
    tagline: 'Deep study blocks, less scrolling, steady revision.',
    wakeTime: '07:00',
    bedTime: '23:30',
    goals: [{ key: 'exam', title: 'Ace my exams', emoji: '🎓', color: '#7c6cd0' }],
    blocks: [
      { key: 's1', name: 'Study block 1', emoji: '📖', start: '09:00', end: '12:00', color: '#7c6cd0' },
      { key: 's2', name: 'Study block 2', emoji: '✍️', start: '15:00', end: '18:00', color: '#3e8fb0' },
    ],
    habits: [
      { name: 'Focused study', emoji: '🎯', type: 'duration', target: 240, unit: 'min', goal: 'exam', weight: 3, presets: [{ label: '25m', value: 25 }, { label: '50m', value: 50 }, { label: '90m', value: 90 }] },
      { name: 'Revise yesterday’s notes', emoji: '🔁', type: 'check', block: 's1', goal: 'exam', weight: 2 },
      { name: 'Practice questions', emoji: '📝', type: 'number', target: 20, unit: 'Qs', block: 's2', goal: 'exam', weight: 2, presets: [{ label: '+5', value: 5 }, { label: '+10', value: 10 }] },
      { name: 'No social media', emoji: '📵', type: 'avoid', goal: 'exam', weight: 2 },
      { name: 'Move 20 min', emoji: '🚶', type: 'duration', target: 20, unit: 'min', weight: 1, presets: [{ label: '10m', value: 10 }, { label: '20m', value: 20 }] },
    ],
    rules: [{ name: 'Phone in another room', emoji: '📱', start: '09:00', end: '12:00', goal: 'exam' }],
    arc: { name: '60-day exam sprint', emoji: '🚀', days: 60, description: 'Consistent study every day until exams.' },
  },
  {
    id: 'blank',
    name: 'Start blank',
    emoji: '✨',
    tagline: 'Build your own system from scratch.',
    wakeTime: '06:00',
    bedTime: '23:00',
    goals: [],
    blocks: [],
    habits: [],
    rules: [],
  },
]

/** Adds a template's goals, blocks, habits, rules and arc to the database. */
export async function applyTemplate(t: Template) {
  const now = Date.now()
  const [goalCount, blockCount, habitCount, ruleCount] = await Promise.all([
    db.goals.count(), db.blocks.count(), db.habits.count(), db.rules.count(),
  ])

  const goalIds = new Map<string, string>()
  const goals: Goal[] = t.goals.map((g, i) => {
    const id = uid()
    goalIds.set(g.key, id)
    return { id, title: g.title, emoji: g.emoji, why: g.why, color: g.color, order: goalCount + i, createdAt: now }
  })

  const blockIds = new Map<string, string>()
  const blocks: TimeBlock[] = t.blocks.map((b, i) => {
    const id = uid()
    blockIds.set(b.key, id)
    return { id, name: b.name, emoji: b.emoji, start: b.start, end: b.end, color: b.color, days: b.days ?? ALL_DAYS, note: b.note, order: blockCount + i }
  })

  const habits: Habit[] = t.habits.map((h, i) => ({
    id: uid(),
    name: h.name,
    emoji: h.emoji,
    type: h.type,
    target: h.target,
    unit: h.unit,
    frequency: h.frequency ?? { kind: 'daily' },
    blockId: h.block ? blockIds.get(h.block) : undefined,
    goalId: h.goal ? goalIds.get(h.goal) : undefined,
    weight: h.weight ?? 1,
    presets: h.presets ?? [],
    order: habitCount + i,
    createdAt: now,
  }))

  const rules: Rule[] = t.rules.map((r, i) => ({
    id: uid(), name: r.name, emoji: r.emoji, start: r.start, end: r.end,
    goalId: r.goal ? goalIds.get(r.goal) : undefined, order: ruleCount + i,
  }))

  const arcs: Arc[] = t.arc
    ? [{ id: uid(), name: t.arc.name, emoji: t.arc.emoji, description: t.arc.description, startDate: todayKey(), lengthDays: t.arc.days, habitIds: [], createdAt: now }]
    : []

  await db.transaction('rw', [db.goals, db.blocks, db.habits, db.rules, db.arcs], async () => {
    await db.goals.bulkAdd(goals)
    await db.blocks.bulkAdd(blocks)
    await db.habits.bulkAdd(habits)
    await db.rules.bulkAdd(rules)
    await db.arcs.bulkAdd(arcs)
  })
}
