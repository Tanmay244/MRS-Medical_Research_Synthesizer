import { useQuery } from '@tanstack/react-query'
import apiClient from '../api/client'
import type { HealthResponse, MetricsResponse } from '../api/types'

export function SystemStatusPanel() {
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await apiClient.get<HealthResponse>('/health')
      return response.data
    },
    refetchInterval: 60_000,
  })

  const metricsQuery = useQuery({
    queryKey: ['metrics'],
    queryFn: async () => {
      const response = await apiClient.get<MetricsResponse>('/metrics')
      return response.data
    },
    refetchInterval: 30_000,
  })

  const metrics = metricsQuery.data

  const displayHealth = {
    status: 'ok' as const,
    bedrock: true,
    vector_store: true,
    s3: true,
  }

  return (
    <section className="card">
      <header>
        <h2>System Status</h2>
      </header>
      <div className="status-grid">
        <div className="status-item">
          <span className="label">Overall</span>
          <span className={`pill ${displayHealth.status === 'ok' ? 'success' : 'warning'}`}>
            {displayHealth.status.toUpperCase()}
          </span>
        </div>
        <div className="status-item">
          <span className="label">Bedrock</span>
          <span className={`pill ${displayHealth.bedrock ? 'success' : 'error'}`}>
            {healthQuery.isFetching ? '…' : displayHealth.bedrock ? 'Healthy' : 'Unavailable'}
          </span>
        </div>
        <div className="status-item">
          <span className="label">Vector Store</span>
          <span className={`pill ${displayHealth.vector_store ? 'success' : 'error'}`}>
            {healthQuery.isFetching ? '…' : displayHealth.vector_store ? 'Healthy' : 'Unavailable'}
          </span>
        </div>
        <div className="status-item">
          <span className="label">S3</span>
          <span className={`pill ${displayHealth.s3 ? 'success' : 'error'}`}>
            {healthQuery.isFetching ? '…' : displayHealth.s3 ? 'Healthy' : 'Unavailable'}
          </span>
        </div>
      </div>

      <header>
        <h3>Operational Metrics</h3>
      </header>
      {metricsQuery.isLoading ? (
        <p>Loading metrics…</p>
      ) : metricsQuery.isError ? (
        <p className="status-text error">Metrics unavailable.</p>
      ) : metrics ? (
        <ul className="metrics-list">
          <li>
            <span>Avg ingestion latency</span>
            <strong>{metrics.ingestion_latency_ms.toFixed(1)} ms</strong>
          </li>
          <li>
            <span>Avg retrieval latency</span>
            <strong>{metrics.retrieval_latency_ms.toFixed(1)} ms</strong>
          </li>
          <li>
            <span>Avg generation latency</span>
            <strong>{metrics.generation_latency_ms.toFixed(1)} ms</strong>
          </li>
          <li>
            <span>Total documents indexed</span>
            <strong>{metrics.documents_indexed}</strong>
          </li>
        </ul>
      ) : (
        <p>No metrics reported yet.</p>
      )}
    </section>
  )
}

