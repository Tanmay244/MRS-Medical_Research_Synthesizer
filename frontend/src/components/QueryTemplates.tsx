import { ChevronDown, FileText } from 'lucide-react'
import { useState } from 'react'
import { QUERY_TEMPLATES } from '../data/demoData'
import { Button } from './ui/button'

interface QueryTemplatesProps {
  onSelect: (question: string, demoKey: string) => void
  disabled?: boolean
}

export function QueryTemplates({ onSelect, disabled }: QueryTemplatesProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="gap-1.5"
      >
        <FileText className="h-4 w-4" />
        Templates
        <ChevronDown className={open ? 'rotate-180' : ''} />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-xl border border-slate-800/70 bg-slate-950/95 py-2 shadow-xl backdrop-blur-xl">
            {QUERY_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                className="w-full px-3 py-2 text-left text-xs hover:bg-slate-800/60"
                onClick={() => {
                  onSelect(t.question, t.demoKey)
                  setOpen(false)
                }}
              >
                <span className="font-medium text-slate-100">{t.label}</span>
                <span className="mt-0.5 block text-[11px] text-slate-400">{t.description}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
