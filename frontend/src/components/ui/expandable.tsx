import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/utils'

interface ExpandableProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
  titleClassName?: string
}

export function Expandable({ title, defaultOpen = true, children, className, titleClassName }: ExpandableProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={cn('rounded-xl border border-slate-800/60 bg-slate-950/40', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-300 transition-colors hover:bg-slate-800/40 hover:text-slate-100',
          titleClassName,
        )}
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {title}
      </button>
      {open && <div className="border-t border-slate-800/60 px-3 py-2.5">{children}</div>}
    </section>
  )
}
