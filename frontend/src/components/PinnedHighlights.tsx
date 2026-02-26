import { Pin, X } from 'lucide-react'
import { useDashboard } from '../contexts/DashboardContext'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'

export function PinnedHighlights() {
  const { pinned, unpinAnswer } = useDashboard()

  if (pinned.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800/70 bg-slate-950/40 px-4 py-3 text-center text-[11px] text-slate-500">
        <Pin className="mx-auto mb-1.5 h-4 w-4 opacity-50" />
        Pin answers from the research brief to see them here.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 shadow-md">
      <div className="flex items-center gap-2 border-b border-slate-800/60 px-3 py-2">
        <Pin className="h-4 w-4 text-sky-400" />
        <span className="text-xs font-semibold text-slate-200">Pinned highlights</span>
      </div>
      <ScrollArea className="max-h-64">
        <ul className="space-y-2 p-2">
          {pinned.map((p) => (
            <li
              key={p.id}
              className="group rounded-xl border border-slate-800/60 bg-slate-950/60 p-2.5 text-xs"
            >
              <p className="font-medium text-slate-100 line-clamp-2">{p.question}</p>
              <p className="mt-1 line-clamp-2 text-[11px] text-slate-400">{p.response.answer}</p>
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                <span>{new Date(p.pinnedAt).toLocaleString()}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 opacity-0 group-hover:opacity-100"
                  onClick={() => unpinAnswer(p.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  )
}
