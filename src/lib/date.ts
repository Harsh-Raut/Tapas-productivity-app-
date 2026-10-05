// All dates are local-calendar "YYYY-MM-DD" strings; times are "HH:MM".

const pad = (n: number) => String(n).padStart(2, '0')

export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const todayKey = () => toKey(new Date())

export const fromKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (key: string, n: number) => {
  const d = fromKey(key)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

export const diffDays = (a: string, b: string) =>
  Math.round((fromKey(a).getTime() - fromKey(b).getTime()) / 86_400_000)

export const weekday = (key: string) => fromKey(key).getDay()

export const startOfWeek = (key: string, weekStartsOn: 0 | 1) => {
  const wd = weekday(key)
  return addDays(key, -((wd - weekStartsOn + 7) % 7))
}

export const rangeKeys = (from: string, to: string) => {
  const out: string[] = []
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k)
  return out
}

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export const nowMinutes = () => {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

/** Is minute-of-day `m` inside [start, end)? Handles windows crossing midnight. */
export const inWindow = (m: number, start: string, end: string) => {
  const s = toMinutes(start)
  const e = toMinutes(end)
  return s <= e ? m >= s && m < e : m >= s || m < e
}

export const formatDuration = (mins: number) => {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export const formatTime = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  return `${((h + 11) % 12) + 1}:${pad(m)} ${suffix}`
}

export const prettyDate = (key: string) => {
  const t = todayKey()
  if (key === t) return 'Today'
  if (key === addDays(t, -1)) return 'Yesterday'
  if (key === addDays(t, 1)) return 'Tomorrow'
  return fromKey(key).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
