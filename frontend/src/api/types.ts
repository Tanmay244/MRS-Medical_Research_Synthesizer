export type StudyType = 'RCT' | 'Meta-analysis' | 'Guideline' | 'Observational' | 'Review'
export type RiskOfBias = 'low' | 'medium' | 'high'

export interface Citation {
  id: string
  paper_title: string
  authors: string[]
  year: number
  journal: string
  excerpt: string
  page_number?: number
  confidence: number
  study_type?: StudyType
  risk_of_bias?: RiskOfBias
  risk_of_bias_note?: string
}

export interface ResearchResponse {
  answer: string
  sources: Citation[]
  confidence: number
  query_time: number
  total_sources: number
  evidence: string[]
  limitations: string[]
  conflicts: string[]
  metadata: Record<string, unknown>
  evidence_cutoff?: string
  caution_note?: string
}

export interface PinnedAnswer {
  id: string
  question: string
  response: ResearchResponse
  pinnedAt: string
}

export interface SessionItem {
  id: string
  name: string
  queries: QueryHistoryRecord[]
  createdAt: string
}

export interface QueryTemplate {
  id: string
  label: string
  description: string
  question: string
  demoKey: string
}

export interface ResearchQueryPayload {
  question: string
  filters?: Record<string, unknown>
  max_results?: number
}

export interface MetricsResponse {
  ingestion_latency_ms: number
  retrieval_latency_ms: number
  generation_latency_ms: number
  documents_indexed: number
}

export interface HealthResponse {
  status: string
  bedrock: boolean
  vector_store: boolean
  s3: boolean
}

export interface DocumentListItem {
  id: string
  title?: string
  authors?: string
  journal?: string
  year?: number | null
  chunks: number
}

export interface DocumentUploadResponse {
  document_id: string
  chunks_indexed: number
  duplicate: boolean
}

export interface QueryHistoryRecord {
  id: string
  question: string
  answer: string
  created_at: string
  metadata: Record<string, unknown>
}

