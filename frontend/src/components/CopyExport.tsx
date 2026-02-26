import { Check, Copy, FileText } from 'lucide-react'
import { useState } from 'react'
import type { ResearchResponse } from '../api/types'
import { Button } from './ui/button'
import { useToast } from '../contexts/ToastContext'

function buildMarkdown(response: ResearchResponse, question: string): string {
  const lines = [
    `# Research summary`,
    '',
    `**Question:** ${question}`,
    '',
    '## Answer',
    '',
    response.answer,
    '',
    '## Evidence',
    ...(response.evidence?.map((e) => `- ${e}`) ?? []),
    '',
    '## Citations',
    ...(response.sources?.map(
      (s) =>
        `- **${s.paper_title}** (${s.journal}, ${s.year}). ${s.excerpt}`,
    ) ?? []),
  ]
  return lines.join('\n')
}

function buildReferencesOnly(response: ResearchResponse): string {
  return (response.sources ?? [])
    .map(
      (s) =>
        `${s.paper_title}. ${s.journal}. ${s.year}. ${s.authors?.join(', ')}.`,
    )
    .join('\n\n')
}

export function CopyExport({
  question,
  response,
}: {
  question: string
  response: ResearchResponse
}) {
  const [copied, setCopied] = useState<'answer' | 'markdown' | 'refs' | null>(null)
  const { addToast } = useToast()

  const copy = async (text: string, label: string, key: 'answer' | 'markdown' | 'refs') => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    addToast(`${label} copied to clipboard`, 'success')
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => copy(response.answer, 'Answer', 'answer')}
      >
        {copied === 'answer' ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
        Copy answer
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => copy(buildMarkdown(response, question), 'Markdown', 'markdown')}
      >
        {copied === 'markdown' ? <Check className="mr-1.5 h-4 w-4" /> : <FileText className="mr-1.5 h-4 w-4" />}
        Copy as Markdown
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => copy(buildReferencesOnly(response), 'References', 'refs')}
      >
        {copied === 'refs' ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
        Copy references
      </Button>
    </div>
  )
}
