import type { Citation } from '../api/types'
import { cn } from '../lib/utils'

export interface AnswerSegment {
  text: string
  citationIds?: string[]
}

interface InlineProvenanceProps {
  segments: AnswerSegment[]
  sources: Citation[]
  highlightedId: string | null
  onHighlight: (id: string | null) => void
  className?: string
}

function idToIndex(sources: Citation[], id: string): number {
  const i = sources.findIndex((s) => s.id === id)
  return i >= 0 ? i + 1 : 0
}

export function InlineProvenance({
  segments,
  sources,
  highlightedId,
  onHighlight,
  className,
}: InlineProvenanceProps) {
  return (
    <p className={cn('text-sm leading-relaxed text-slate-100', className)}>
      {segments.map((seg, i) => {
        const hasCitation = seg.citationIds && seg.citationIds.length > 0
        const isHighlighted =
          hasCitation && seg.citationIds!.some((id) => id === highlightedId)
        const indices = hasCitation
          ? seg.citationIds!.map((id) => idToIndex(sources, id)).filter(Boolean)
          : []
        return (
          <span key={i}>
            {hasCitation && indices.length > 0 ? (
              <span
                role="button"
                tabIndex={0}
                className={cn(
                  'cursor-pointer rounded px-0.5 underline decoration-sky-400/60 decoration-dotted underline-offset-2 transition-colors hover:bg-sky-500/20',
                  isHighlighted && 'bg-sky-500/25 ring-1 ring-sky-400/50',
                )}
                onClick={() => onHighlight(isHighlighted ? null : seg.citationIds![0])}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onHighlight(isHighlighted ? null : seg.citationIds![0])
                  }
                }}
              >
                {seg.text}
                <sup className="ml-0.5 text-[10px] text-sky-400">
                  [{indices.join(', ')}]
                </sup>
              </span>
            ) : (
              seg.text
            )}
          </span>
        )
      })}
    </p>
  )
}
