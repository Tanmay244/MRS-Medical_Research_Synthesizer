import { cn } from '../lib/utils'

interface ConfidenceBarProps {
  confidence: number
  quality?: number
  className?: string
}

export function ConfidenceBar({ confidence, quality = 0.85, className }: ConfidenceBarProps) {
  const confPct = Math.round(confidence * 100)
  const qualityPct = Math.round(quality * 100)
  const confColor =
    confPct >= 80 ? 'bg-emerald-500' : confPct >= 60 ? 'bg-amber-500' : 'bg-red-500/80'

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>Confidence</span>
        <span className="font-medium text-slate-200">{confPct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={cn('h-full rounded-full transition-all', confColor)}
          style={{ width: `${confPct}%` }}
        />
      </div>
      {quality !== undefined && (
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span>Evidence quality</span>
          <span>{qualityPct}%</span>
        </div>
      )}
    </div>
  )
}
