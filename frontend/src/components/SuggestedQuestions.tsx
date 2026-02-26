import { SUGGESTED_QUESTIONS } from '../data/demoData'
import { Button } from './ui/button'

interface SuggestedQuestionsProps {
  onSelect: (question: string, demoKey: string) => void
  disabled?: boolean
}

export function SuggestedQuestions({ onSelect, disabled }: SuggestedQuestionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] text-slate-500">Try:</span>
      {SUGGESTED_QUESTIONS.map(({ label, demoKey }) => (
        <Button
          key={demoKey}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onSelect(label, demoKey)}
          className="h-8 min-h-8 shrink-0 text-xs"
        >
          {label}
        </Button>
      ))}
    </div>
  )
}
