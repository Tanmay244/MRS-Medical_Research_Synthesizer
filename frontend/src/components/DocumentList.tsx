import { useQuery } from '@tanstack/react-query'
import apiClient from '../api/client'
import type { DocumentListItem } from '../api/types'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

interface DocumentListResponse {
  documents: DocumentListItem[]
}

export function DocumentList() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const response = await apiClient.get<DocumentListResponse>('/documents')
      return response.data
    },
    staleTime: 60_000,
  })

  return (
    <Card className="rounded-2xl border border-slate-800/70 bg-slate-950/70 shadow-lg shadow-black/30 backdrop-blur-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 px-4 py-3">
        <CardTitle className="text-base font-semibold tracking-tight text-slate-100">
          Indexed Documents
        </CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent className="px-4 py-3">
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading documents…</p>
        ) : isError ? (
          <p className="text-sm text-red-300">Unable to load documents.</p>
        ) : data && data.documents.length > 0 ? (
          <div className="overflow-x-auto rounded-lg" style={{ scrollbarGutter: 'stable' }}>
            <table className="w-full min-w-[640px] border-collapse text-sm table-fixed">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[22%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-700/70">
                  <th className="py-2.5 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">
                    Title
                  </th>
                  <th className="py-2.5 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">
                    Authors
                  </th>
                  <th className="py-2.5 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">
                    Journal
                  </th>
                  <th className="py-2.5 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">
                    Year
                  </th>
                  <th className="py-2.5 pl-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">
                    Chunks
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-slate-800/50 last:border-b-0 hover:bg-slate-800/30"
                  >
                    <td className="py-2.5 pr-3 text-slate-200">
                      <span className="block truncate whitespace-nowrap" title={doc.title ?? undefined}>
                        {doc.title ?? '—'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-300">
                      <span className="block truncate whitespace-nowrap" title={doc.authors ?? undefined}>
                        {doc.authors ?? '—'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-300">
                      <span className="block truncate whitespace-nowrap" title={doc.journal ?? undefined}>
                        {doc.journal ?? '—'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-300 whitespace-nowrap">
                      {doc.year ?? '—'}
                    </td>
                    <td className="py-2.5 pl-3 text-right text-slate-300 tabular-nums whitespace-nowrap">
                      {doc.chunks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No documents indexed yet.</p>
        )}
      </CardContent>
    </Card>
  )
}
