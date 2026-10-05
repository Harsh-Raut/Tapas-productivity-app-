import { useState } from 'react'
import { db } from '../lib/db'
import { TEMPLATES, applyTemplate, type Template } from '../lib/templates'
import { Button, Card, Field, inputCls } from '../components/ui'
import { LogoMark, Wordmark } from '../components/Logo'

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [template, setTemplate] = useState<Template>(TEMPLATES[0])
  const [wake, setWake] = useState(TEMPLATES[0].wakeTime)
  const [bed, setBed] = useState(TEMPLATES[0].bedTime)
  const [busy, setBusy] = useState(false)

  const pick = (t: Template) => {
    setTemplate(t)
    setWake(t.wakeTime)
    setBed(t.bedTime)
  }

  const finish = async () => {
    setBusy(true)
    await applyTemplate(template)
    await db.settings.put({
      id: 'app', name: name.trim(), wakeTime: wake, bedTime: bed, onboarded: true, weekStartsOn: 1, createdAt: Date.now(),
    })
  }

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col px-5 pb-8 pt-[max(env(safe-area-inset-top),2rem)]">
      <div className="mb-8 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-brand' : 'bg-surface-2'}`} />
        ))}
      </div>

      {step === 0 && (
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-3">
            <LogoMark size={48} />
            <Wordmark className="text-3xl" />
          </div>
          <h1 className="mt-8 text-[32px] font-bold leading-[38px]">Health. Focus. Discipline.</h1>
          <p className="mt-2 text-muted">One calm system for your day. Set your goals, design your routine, and see who you become — one honest log at a time.</p>
          <div className="mt-8">
            <Field label="What should we call you?">
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoFocus />
            </Field>
          </div>
          <div className="mt-auto">
            <Button className="w-full py-3.5" disabled={!name.trim()} onClick={() => setStep(1)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-1 flex-col">
          <h1 className="text-2xl font-bold">Pick a starting system</h1>
          <p className="mt-1 text-sm text-muted">Everything is editable afterwards — habits, times, goals, rules.</p>
          <div className="mt-6 space-y-3">
            {TEMPLATES.map((t) => (
              <Card key={t.id} onClick={() => pick(t)} className={`p-4 ${template.id === t.id ? 'border-brand! bg-accent/5' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{t.emoji}</div>
                  <div className="flex-1">
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-sm text-muted">{t.tagline}</div>
                    {t.habits.length > 0 && (
                      <div className="mt-2 text-xs text-muted">
                        {t.habits.length} habits · {t.blocks.length} time blocks · {t.rules.length} rule{t.rules.length === 1 ? '' : 's'}{t.arc ? ` · ${t.arc.days}-day arc` : ''}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div className="mt-auto flex gap-3 pt-6">
            <Button variant="soft" onClick={() => setStep(0)}>Back</Button>
            <Button className="flex-1 py-3.5" onClick={() => setStep(2)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-1 flex-col">
          <h1 className="text-2xl font-bold">Your sleep anchors</h1>
          <p className="mt-1 text-sm text-muted">Fixed sleep timing is the foundation everything else stands on.</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Field label="Wake up">
              <input type="time" className={inputCls} value={wake} onChange={(e) => setWake(e.target.value)} />
            </Field>
            <Field label="Lights out">
              <input type="time" className={inputCls} value={bed} onChange={(e) => setBed(e.target.value)} />
            </Field>
          </div>
          <Card className="p-4 text-sm text-muted">
            Starting with <span className="font-semibold text-ink">{template.emoji} {template.name}</span>
            {template.arc && <> — your {template.arc.days}-day arc begins today.</>}
          </Card>
          <div className="mt-auto flex gap-3 pt-6">
            <Button variant="soft" onClick={() => setStep(1)}>Back</Button>
            <Button className="flex-1 py-3.5" disabled={busy} onClick={finish}>Let’s begin</Button>
          </div>
        </div>
      )}
    </div>
  )
}
