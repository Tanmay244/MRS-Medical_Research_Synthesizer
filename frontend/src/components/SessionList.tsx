import { ChevronRight, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { DEMO_SESSIONS, getDemoKeyFromQuestion } from '../data/demoData'
import { useDashboard } from '../contexts/DashboardContext'

export function SessionList() {
  const { runDemoQueryRef } = useDashboard()
  const [expandedId, setExpandedId] = useState<string | null>(DEMO_SESSIONS[0]?.id ?? null)

  const handleSelectQuery = (question: string) => {
    const demoKey = getDemoKeyFromQuestion(question)
    runDemoQueryRef.current?.(demoKey, question)
  }

  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 shadow-md">
      <div className="flex items-center gap-2 border-b border-slate-800/60 px-3 py-2">
        <MessageSquare className="h-4 w-4 text-slate-400" />
        <span className="text-xs font-semibold text-slate-200">Sessions</span>
      </div>
      <ul className="divide-y divide-slate-800/60">
        {DEMO_SESSIONS.map((session) => {
          const isOpen = expandedId === session.id
          return (
            <li key={session.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs hover:bg-slate-800/40"
                onClick={() => setExpandedId(isOpen ? null : session.id)}
              >
                <span className="font-medium text-slate-200">{session.name}</span>
                <ChevronRight
                  className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                />
              </button>
              {isOpen && (
                <ul className="border-t border-slate-800/60 bg-slate-950/80 pb-2 pr-2 pt-1">
                  {session.queries.map((q) => (
                    <li key={q.id}>
                      <button
                        type="button"
                        className="w-full rounded-lg px-3 py-2 text-left text-[11px] text-slate-300 hover:bg-slate-800/60 hover:text-slate-100"
                        onClick={() => handleSelectQuery(q.question)}
                      >
                        <span className="line-clamp-2">{q.question}</span>
                        <span className="mt-0.5 block text-[10px] text-slate-500">
                          {new Date(q.created_at).toLocaleDateString()}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
