# tapas

**Health. Focus. Discipline.** A customisable habit, schedule and goal tracker. Installable PWA, offline-first, data stored on the device.

**Stack:** React + TypeScript + Vite · Tailwind CSS v4 · Manrope · Dexie (IndexedDB) · vite-plugin-pwa

## Features (v0.2)

- **Onboarding with templates** — Winter Arc, Fitness Starter, Student Focus, or blank
- **Goals → Habits → Time blocks** — every habit can belong to a goal and a part of your day
- **Habit types** — yes/no, amount (with target + unit), time (minutes), avoid (kept unless you log a slip)
- **Frequencies** — every day, specific weekdays, or X times per week
- **One-tap presets** — e.g. "Isolate scoop = 27 g protein"
- **Daily score (0–100)** — weighted by habit importance + rules kept
- **Rules** — protected time windows ("Kitchen closed 7–10 PM") with live countdowns
- **Arcs** — 21/30/60/90-day challenges with a day grid
- **Plan vs reality** — mark each time block on time / late / skipped
- **Sleep log** — one-tap "Going to sleep" / "I’m awake", morning auto-suggest from last app use, targets, quality, 14-night chart
- **Check-ins** — energy, mood, notes
- **Stats** — arc grid, 14-day trend, 17-week heatmap, streaks, completion rates
- **Backup** — export / restore JSON
- **Brand theme** — Deep Slate / Ice Blue / Mint / Amber; light, dark or follow system (You → Appearance)

## Develop

```bash
npm install
npm run dev
```

## Deploy (Vercel)

1. Push this folder to a GitHub repo.
2. In Vercel: **Add New → Project → Import** the repo. Framework preset: **Vite** (build `npm run build`, output `dist`). Deploy.
3. On Android, open the URL in Chrome → **⋮ → Install app**.

Every push to `main` redeploys; the installed app updates itself on next launch.

## Project layout

```
src/
  lib/        types, db (Dexie), scoring, templates, date utils, actions
  screens/    Onboarding, Today, Stats, Habits, Plan, Settings
  components/ shared UI (Card, Sheet, Ring, …)
```
