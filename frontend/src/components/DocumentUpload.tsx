import { useMemo, useState } from 'react'
import { Upload } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../api/client'
import type { DocumentUploadResponse, HealthResponse } from '../api/types'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'

interface MetadataForm {
  title?: string
  authors?: string
  journal?: string
  year?: number
  doi?: string
  url?: string
}

const defaultMetadata: MetadataForm = {}

/** Stronger border for dark mode so Year, DOI, Source URL stand out */
const inputContrastClass =
  'border-slate-500/80 bg-slate-900/60 focus-visible:border-sky-500/70 focus-visible:ring-sky-500/30'

export function DocumentUploadCard() {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [metadata, setMetadata] = useState<MetadataForm>(defaultMetadata)
  const [message, setMessage] = useState<string | null>(null)

  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await apiClient.get<HealthResponse>('/health')
      return response.data
    },
    refetchInterval: 60_000,
  })

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error('Select a file before submitting')
      }

      const formData = new FormData()
      formData.append('file', file)

      const payload: Record<string, unknown> = {}
      Object.entries(metadata).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          payload[key] = value
        }
      })
      formData.append('metadata_json', JSON.stringify(payload))

      const response = await apiClient.post<DocumentUploadResponse>('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return response.data
    },
    onSuccess: (data) => {
      setMessage(
        data.duplicate
          ? 'Duplicate document detected. No new chunks indexed.'
          : `Uploaded successfully. ${data.chunks_indexed} chunks indexed.`,
      )
      setFile(null)
      setMetadata(defaultMetadata)
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
    },
    onError: (error: unknown) => {
      setMessage(error instanceof Error ? error.message : 'Upload failed')
    },
  })

  const s3Available = healthQuery.data?.s3 ?? true
  const disableSubmit = useMemo(
    () => !file || mutation.isPending || !s3Available,
    [file, mutation.isPending, s3Available],
  )

  return (
    <Card className="rounded-2xl border border-slate-800/70 bg-slate-950/70 shadow-lg shadow-black/30 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-800/60 px-4 py-3">
        <CardTitle className="text-base font-semibold tracking-tight text-slate-100">
          Upload Research Document
        </CardTitle>
        <CardDescription className="text-sm text-slate-400">
          PDF, TXT, or DOCX files are supported. Provide metadata for better provenance tracking.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 py-3">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            setMessage(null)
            mutation.mutate()
          }}
        >
          <div className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-xs font-medium text-slate-400">File</span>
            <div className="flex flex-wrap items-center gap-3">
              <input
                id="upload-file-input"
                type="file"
                accept=".pdf,.txt,.docx"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                required
                className="sr-only"
              />
              <label
                htmlFor="upload-file-input"
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-500/30 transition-transform hover:opacity-95 focus-visible:outline focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <Upload className="h-4 w-4" />
                Choose file
              </label>
              {file && (
                <span className="max-w-[200px] truncate text-sm text-slate-400 sm:max-w-[280px]" title={file.name}>
                  {file.name}
                </span>
              )}
            </div>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-400">Title</span>
            <Input
              value={metadata.title ?? ''}
              onChange={(event) => setMetadata((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Article title"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-400">Authors</span>
            <Input
              value={metadata.authors ?? ''}
              onChange={(event) => setMetadata((prev) => ({ ...prev, authors: event.target.value }))}
              placeholder="e.g. Smith J, Chen L"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-400">Journal</span>
            <Input
              value={metadata.journal ?? ''}
              onChange={(event) => setMetadata((prev) => ({ ...prev, journal: event.target.value }))}
              placeholder="Journal name"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-400">Year</span>
            <Input
              type="number"
              min={1900}
              max={2100}
              value={metadata.year ?? ''}
              onChange={(event) =>
                setMetadata((prev) => ({
                  ...prev,
                  year: event.target.value ? Number(event.target.value) : undefined,
                }))
              }
              placeholder="2024"
              className={inputContrastClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-400">DOI</span>
            <Input
              value={metadata.doi ?? ''}
              onChange={(event) => setMetadata((prev) => ({ ...prev, doi: event.target.value }))}
              placeholder="DOI"
              className={inputContrastClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-slate-400">Source URL</span>
            <Input
              type="url"
              value={metadata.url ?? ''}
              onChange={(event) => setMetadata((prev) => ({ ...prev, url: event.target.value }))}
              placeholder="Source URL"
              className={inputContrastClass}
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={disableSubmit}>
              {mutation.isPending ? 'Uploading…' : 'Upload Document'}
            </Button>
            {!s3Available && (
              <p className="mt-2 text-xs text-amber-300">
                Upload is disabled while S3 is unavailable. Check System Status.
              </p>
            )}
          </div>
        </form>
        {message && (
          <p
            className={
              message.startsWith('Uploaded')
                ? 'mt-3 text-sm text-emerald-300'
                : 'mt-3 text-sm text-amber-300'
            }
          >
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
