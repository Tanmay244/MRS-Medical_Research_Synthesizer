import type { Citation, RiskOfBias, StudyType } from '../api/types'
import { Badge } from './ui/badge'
import { cn } from '../lib/utils'

const STUDY_LABELS: Record<StudyType, string> = {
  RCT: 'RCT',
  'Meta-analysis': 'Meta',
  Guideline: 'Guideline',
  Observational: 'Observational',
  Review: 'Review',
}

const RISK_COLORS: Record<RiskOfBias, string> = {
  low: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  high: 'bg-red-500/15 text-red-300 border-red-500/40',
}

export function CitationCard({
  citation,
  className,
  highlighted,
}: {
  citation: Citation
  className?: string
  highlighted?: boolean
}) {
  const riskClass = citation.risk_of_bias ? RISK_COLORS[citation.risk_of_bias] : ''

  return (
    <li
      className={cn(
        'space-y-1.5 rounded-xl border border-slate-800/60 bg-slate-950/40 p-3 transition-colors',
        highlighted && 'ring-2 ring-sky-400/50',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-medium text-slate-100">{citation.paper_title}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {citation.study_type && (
            <Badge variant="outline" className="text-[10px]">
              {STUDY_LABELS[citation.study_type]}
            </Badge>
          )}
          {citation.risk_of_bias && (
            <span
              className={cn(
                'rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase',
                riskClass,
              )}
              title={citation.risk_of_bias_note}
            >
              {citation.risk_of_bias} RoB
            </span>
          )}
          <span className="text-slate-500">
            {citation.journal} • {citation.year}
          </span>
        </div>
      </div>
      <p className="text-xs text-slate-300">{citation.excerpt}</p>
      <p className="text-[11px] text-slate-500">
        Citation confidence {(citation.confidence * 100).toFixed(1)}%
      </p>
    </li>
  )
}
