import { Sparkles } from 'lucide-react'
import { Button } from './ui/button'

interface EmptyStateProps {
  onTryDemo: () => void
  disabled?: boolean
}

const DEMO_QUESTION = 'What are the key clinical takeaways for GLP-1 agonists in type 2 diabetes?'

export function EmptyState({ onTryDemo, disabled }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800/70 bg-slate-950/40 py-12 text-center">
      <Sparkles className="mb-3 h-10 w-10 text-sky-400/70" />
      <h3 className="text-sm font-semibold text-slate-200">No result yet</h3>
      <p className="mt-1 max-w-xs text-xs text-slate-400">
        Ask a research question above, or try a demo query to see a full synthesis with citations.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4"
        disabled={disabled}
        onClick={onTryDemo}
      >
        Try: &quot;{DEMO_QUESTION.slice(0, 50)}…&quot;
      </Button>
    </div>
  )
}

export { DEMO_QUESTION }
