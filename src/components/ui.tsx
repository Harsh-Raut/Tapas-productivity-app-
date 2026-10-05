import { useEffect, type ReactNode } from 'react'

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`rounded-2xl bg-surface border border-line ${onClick ? 'active:bg-surface-2 cursor-pointer' : ''} ${className}`}>
      {children}
    </div>
  )
}

type BtnVariant = 'primary' | 'ghost' | 'danger' | 'soft'
const btnStyles: Record<BtnVariant, string> = {
  primary: 'bg-accent text-accent-ink font-semibold glow',
  soft: 'bg-surface-2 text-ink',
  ghost: 'text-muted',
  danger: 'bg-bad/15 text-bad',
}

export function Button({
  children, onClick, variant = 'primary', className = '', type = 'button', disabled,
}: { children: ReactNode; onClick?: () => void; variant?: BtnVariant; className?: string; type?: 'button' | 'submit'; disabled?: boolean }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-sm transition active:scale-[0.98] disabled:opacity-40 ${btnStyles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="animate-sheet max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-line bg-surface pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-full bg-surface-2 px-3 py-1 text-sm text-muted">Close</button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export const inputCls =
  'w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-ink outline-none focus:border-brand placeholder:text-muted/60'

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-xl bg-bg p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg px-2 py-1.5 text-xs transition ${value === o.value ? 'bg-surface-2 font-semibold text-ink' : 'text-muted'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Ring({ value, size = 120, stroke = 10, color = 'var(--color-ice)', children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-surface-2)" strokeWidth={stroke} fill="none" />
        <circle
          className={v > 0 ? 'glow-stroke' : ''}
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

export function Bar({ value, color = 'var(--color-ice)' }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-surface-2">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color, boxShadow: value > 0 ? `0 0 8px -1px ${color === 'var(--color-ice)' ? 'var(--glow)' : 'transparent'}` : undefined }}
      />
    </div>
  )
}

export function Empty({ emoji, title, text, action }: { emoji: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 text-4xl">{emoji}</div>
      <div className="font-semibold">{title}</div>
      {text && <p className="mt-1 text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between px-1">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{children}</h3>
      {action}
    </div>
  )
}

export function DayPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  return (
    <div className="flex gap-1.5">
      {letters.map((l, i) => {
        const on = value.includes(i)
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(on ? value.filter((d) => d !== i) : [...value, i].sort())}
            className={`h-9 flex-1 rounded-lg text-sm font-medium ${on ? 'bg-accent text-accent-ink' : 'bg-bg text-muted'}`}
          >
            {l}
          </button>
        )
      })}
    </div>
  )
}

export function ColorPicker({ value, onChange, colors }: { value: string; onChange: (c: string) => void; colors: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`h-8 w-8 rounded-full ${value === c ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''}`}
          style={{ background: c }}
        />
      ))}
    </div>
  )
}
