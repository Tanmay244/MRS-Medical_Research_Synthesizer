import { useMemo, useState, useCallback, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pin, Sparkles, Stethoscope } from 'lucide-react'
import apiClient from '../api/client'
import type { ResearchQueryPayload, ResearchResponse } from '../api/types'
import { getDemoResponse, getDefaultAnswerSegments, getDemoKeyFromQuestion, DEMO_SESSIONS } from '../data/demoData'
import { useDashboard } from '../contexts/DashboardContext'
import { useToast } from '../contexts/ToastContext'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Textarea } from './ui/textarea'
import { Skeleton } from './ui/skeleton'
import { Expandable } from './ui/expandable'
import { SuggestedQuestions } from './SuggestedQuestions'
import { QueryTemplates } from './QueryTemplates'
import { CopyExport } from './CopyExport'
import { CitationCard } from './CitationCard'
import { ConfidenceBar } from './ConfidenceBar'
import { CautionNote } from './CautionNote'
import { InlineProvenance } from './InlineProvenance'
import { EmptyState, DEMO_QUESTION } from './EmptyState'

interface QueryFormState {
  question: string
  maxResults: number
  startYear?: number
  endYear?: number
  journals: string
}

const defaultState: QueryFormState = {
  question: '',
  maxResults: 10,
  journals: '',
}

export function QueryConsole() {
  const queryClient = useQueryClient()
  const { pinAnswer, runDemoQueryRef } = useDashboard()
  const { addToast } = useToast()
  const [form, setForm] = useState<QueryFormState>(defaultState)
  const [response, setResponse] = useState<ResearchResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(true)
  const [highlightedCitationId, setHighlightedCitationId] = useState<string | null>(null)
  const [lastDemoKey, setLastDemoKey] = useState<string>('default')

  const mutation = useMutation({
    mutationFn: async ({
      payload,
      demoKey,
    }: {
      payload: ResearchQueryPayload
      demoKey?: string
    }) => {
      if (isDemoMode) {
        await new Promise((r) => setTimeout(r, 750))
        const key = demoKey ?? getDemoKeyFromQuestion(payload.question)
        setLastDemoKey(key)
        return getDemoResponse(key)
      }
      const result = await apiClient.post<ResearchResponse>('/query', payload)
      return result.data
    },
    onSuccess: (data) => {
      setResponse(data)
      setErrorMessage(null)
      queryClient.invalidateQueries({ queryKey: ['query-history'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
    },
    onError: (error: unknown) => {
      setErrorMessage(
        error instanceof Error ? error.message : 'Query failed. Check server logs for details.',
      )
      setResponse(null)
    },
  })

  const runDemoQuery = useCallback(
    (demoKey: string, question?: string) => {
      const q = question ?? (form.question || DEMO_QUESTION)
      setForm((prev) => ({ ...prev, question: q }))
      mutation.mutate({ payload: { question: q, max_results: 10 }, demoKey })
    },
    [mutation],
  )

  useEffect(() => {
    runDemoQueryRef.current = runDemoQuery
    return () => {
      runDemoQueryRef.current = null
    }
  }, [runDemoQuery, runDemoQueryRef])

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)
    if (!form.question.trim()) {
      setErrorMessage('Enter a question to submit a query.')
      return
    }
    const filters: Record<string, unknown> = {}
    if (form.startYear && form.endYear && form.startYear > form.endYear) {
      setErrorMessage('Start year cannot be greater than end year.')
      return
    }
    if (form.startYear && form.endYear) filters.year_range = [form.startYear, form.endYear]
    const journalList = form.journals.split(',').map((x) => x.trim()).filter(Boolean)
    if (journalList.length > 0) filters.journal = journalList
    const payload: ResearchQueryPayload = {
      question: form.question.trim(),
      max_results: form.maxResults,
      filters: Object.keys(filters).length ? filters : undefined,
    }
    mutation.mutate({ payload, demoKey: isDemoMode ? getDemoKeyFromQuestion(payload.question) : undefined })
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (form.question.trim() && !mutation.isPending) {
          const formEl = document.querySelector('form')
          formEl?.requestSubmit()
        }
      }
      if (e.key === 'Escape') {
        setHighlightedCitationId(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [form.question, mutation.isPending])

  const disableSubmit = useMemo(
    () => !form.question.trim() || mutation.isPending,
    [form.question, mutation.isPending],
  )

  const segments = useMemo(() => {
    if (!response || lastDemoKey !== 'default') return null
    return getDefaultAnswerSegments()
  }, [response, lastDemoKey])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Card className="shrink-0">
        <CardHeader className="flex flex-row items-start gap-3 border-b border-slate-800/60">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 text-slate-50 shadow-md shadow-sky-500/50">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle>Ask a research question</CardTitle>
              <Badge variant="outline">Demo mode</Badge>
            </div>
            <CardDescription>
              Use suggested questions or templates for instant demo results. Toggle demo off for live API.
            </CardDescription>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
            <Button
              type="button"
              variant={isDemoMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setIsDemoMode((prev) => !prev)
                setResponse(null)
                setErrorMessage(null)
              }}
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              {isDemoMode ? 'Demo on' : 'Demo off'}
            </Button>
            <QueryTemplates
              disabled={mutation.isPending}
              onSelect={(question, demoKey) => {
                setForm((prev) => ({ ...prev, question }))
                mutation.mutate({ payload: { question, max_results: 10 }, demoKey })
              }}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <SuggestedQuestions
            disabled={mutation.isPending}
            onSelect={(label, demoKey) => runDemoQuery(demoKey, label)}
          />
          <form className="grid gap-4 md:grid-cols-5" onSubmit={onSubmit}>
            <div className="md:col-span-5">
              <label className="mb-1.5 block text-xs font-medium text-slate-300">Question</label>
              <Textarea
                value={form.question}
                onChange={(e) => setForm((prev) => ({ ...prev, question: e.target.value }))}
                rows={4}
                required
                placeholder="e.g. How do GLP‑1 agonists change cardiovascular risk in high‑risk type 2 diabetes?"
              />
            </div>
            <div className="space-y-1 md:col-span-1">
              <label className="text-xs font-medium text-slate-300">Max results</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={form.maxResults}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, maxResults: Number(e.target.value) || 10 }))
                }
                className="border-slate-500/90 bg-slate-800/50 focus-visible:border-sky-500/70 focus-visible:ring-sky-500/30"
              />
            </div>
            <div className="space-y-1 md:col-span-1">
              <label className="text-xs font-medium text-slate-300">Start year</label>
              <Input
                type="number"
                min={1900}
                max={2100}
                value={form.startYear ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    startYear: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="border-slate-500/90 bg-slate-800/50 focus-visible:border-sky-500/70 focus-visible:ring-sky-500/30"
              />
            </div>
            <div className="space-y-1 md:col-span-1">
              <label className="text-xs font-medium text-slate-300">End year</label>
              <Input
                type="number"
                min={1900}
                max={2100}
                value={form.endYear ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    endYear: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="border-slate-500/90 bg-slate-800/50 focus-visible:border-sky-500/70 focus-visible:ring-sky-500/30"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-slate-300">Restrict journals</label>
              <Input
                type="text"
                value={form.journals}
                onChange={(e) => setForm((prev) => ({ ...prev, journals: e.target.value }))}
                placeholder="Comma‑separated journal names"
                className="border-slate-500/90 bg-slate-800/50 focus-visible:border-sky-500/70 focus-visible:ring-sky-500/30"
              />
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2 md:col-span-5">
              <span className="text-[10px] text-slate-500">⌘↵ Submit · Esc clear citation</span>
              <div className="flex gap-2">
                <Button type="submit" disabled={disableSubmit}>
                  {mutation.isPending ? 'Running…' : 'Run synthesis'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setForm(defaultState)
                    setResponse(null)
                    setErrorMessage(null)
                    setHighlightedCitationId(null)
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
          </form>

          {errorMessage && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {errorMessage}
            </p>
          )}
        </CardContent>
      </Card>

      {mutation.isPending && (
        <Card className="min-h-[280px] flex-1 shrink-0">
          <CardContent className="space-y-4 py-6">
            <Skeleton className="h-4 w-full max-w-3xl" />
            <Skeleton className="h-4 w-full max-w-2xl" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-32" />
            </div>
          </CardContent>
        </Card>
      )}

      {!mutation.isPending && !response && (
        <Card className="flex min-h-[280px] flex-1 flex-col shrink-0">
          <CardContent className="flex flex-1 flex-col gap-6 py-6">
            <EmptyState onTryDemo={() => runDemoQuery('default', DEMO_QUESTION)} disabled={mutation.isPending} />
            <div className="border-t border-slate-800/60 pt-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Recent queries</h3>
              <SessionListInline onSelectQuery={(q) => runDemoQuery(getDemoKeyFromQuestion(q), q)} />
            </div>
          </CardContent>
        </Card>
      )}

      {!mutation.isPending && response && (
        <Card className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden shrink-0">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>AI‑generated research brief</CardTitle>
              <CardDescription>
                Synthesised summary with evidence, conflicts, and limitations. Click underlined text to highlight citations.
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <ConfidenceBar confidence={response.confidence} />
              <span className="text-[11px] text-slate-500">
                {response.query_time.toFixed(2)}s · {response.total_sources} sources
                {response.evidence_cutoff && ` · Evidence to ${response.evidence_cutoff}`}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    pinAnswer(form.question, response)
                    addToast('Pinned to Highlights', 'success')
                  }}
                >
                  <Pin className="mr-1.5 h-4 w-4" />
                  Pin
                </Button>
                <CopyExport question={form.question} response={response} />
              </div>
            </div>
          </CardHeader>

          <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto">
            {segments ? (
              <InlineProvenance
                segments={segments}
                sources={response.sources}
                highlightedId={highlightedCitationId}
                onHighlight={setHighlightedCitationId}
              />
            ) : (
              <p className="text-sm leading-relaxed text-slate-100">{response.answer}</p>
            )}

            {response.caution_note && (
              <CautionNote text={response.caution_note} />
            )}

            <Expandable title="Supporting evidence" defaultOpen={true}>
              <ul className="space-y-1.5 text-sm text-slate-200">
                {response.evidence?.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Expandable>

            {response.conflicts?.length ? (
              <Expandable title="Conflicting signals" defaultOpen={false}>
                <ul className="space-y-1.5 text-sm text-amber-100">
                  {response.conflicts.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Expandable>
            ) : null}

            {response.limitations?.length ? (
              <Expandable title="Limitations" defaultOpen={false}>
                <ul className="space-y-1.5 text-sm text-slate-200">
                  {response.limitations.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Expandable>
            ) : null}

            <Expandable title="Key citations" defaultOpen={true}>
              <ScrollArea className="max-h-60">
                <ul className="space-y-2 pr-2">
                  {response.sources.map((citation) => (
                    <CitationCard
                      key={citation.id}
                      citation={citation}
                      highlighted={citation.id === highlightedCitationId}
                    />
                  ))}
                </ul>
              </ScrollArea>
            </Expandable>
          </CardContent>
        </Card>
      )}

      {response && (
        <Card className="shrink-0">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Recent queries</CardTitle>
              <CardDescription>Click a query to run it again; sessions are in the sidebar.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <SessionListInline onSelectQuery={(q) => runDemoQuery(getDemoKeyFromQuestion(q), q)} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SessionListInline({ onSelectQuery }: { onSelectQuery: (question: string) => void }) {
  const flatQueries = DEMO_SESSIONS.flatMap((s) =>
    s.queries.map((q) => ({ ...q, sessionName: s.name }))
  ).slice(0, 5)
  return (
    <div className="space-y-2">
      {flatQueries.map((q) => (
        <button
          key={q.id}
          type="button"
          className="w-full rounded-xl border border-slate-800/60 bg-slate-950/60 px-3 py-2.5 text-left text-xs hover:bg-slate-800/40"
          onClick={() => onSelectQuery(q.question)}
        >
          <p className="font-medium text-slate-100">{q.question}</p>
          <span className="mt-1 block text-[10px] text-slate-500">{q.sessionName}</span>
        </button>
      ))}
    </div>
  )
}
