import { useState } from 'react'
import { useDashboard } from '../contexts/DashboardContext'
import { Button } from './ui/button'

const STEPS = [
  { title: 'Ask a question', body: 'Type a clinical question or pick a suggested topic.' },
  { title: 'Get a synthesis', body: 'Review the AI-generated brief with evidence and citations.' },
  { title: 'Pin & export', body: 'Pin answers to Highlights and copy as Markdown or references.' },
]

interface TourProps {
  onClose?: () => void
}

export function Tour({ onClose }: TourProps) {
  const { tourDone, setTourDone } = useDashboard()
  const [step, setStep] = useState(0)

  if (tourDone) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  const finish = () => {
    setTourDone(true)
    localStorage.setItem('tourDone', 'true')
    onClose?.()
  }

  return (
    <div className="rounded-2xl border border-sky-500/40 bg-slate-950/95 p-4 shadow-xl backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-400">
          Quick tour
        </span>
        <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={finish}>
          Skip
        </Button>
      </div>
      <h3 className="text-sm font-semibold text-slate-100">{current.title}</h3>
      <p className="mt-1 text-xs text-slate-400">{current.body}</p>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Step ${i + 1}`}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === step ? 'bg-sky-400' : 'bg-slate-600'
              }`}
              onClick={() => setStep(i)}
            />
          ))}
        </div>
        {isLast ? (
          <Button size="sm" onClick={finish}>
            Got it
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setStep((s) => s + 1)}>
            Next
          </Button>
        )}
      </div>
    </div>
  )
}
