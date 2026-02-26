import { AlertTriangle } from 'lucide-react'

interface CautionNoteProps {
  text: string
  className?: string
}

export function CautionNote({ text, className }: CautionNoteProps) {
  return (
    <div
      className={`flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 ${className ?? ''}`}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
      <span>{text}</span>
    </div>
  )
}
