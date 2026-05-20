import type { Asset, SearchQuery, SearchResult, Project, Collection, Tag } from './index.js'

// Health
export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error'
  version: string
  uptime: number
  dbConnected: boolean
}

// Assets API
export interface ListAssetsRequest {
  type?: Asset['type']
  projectId?: string
  limit?: number
  offset?: number
}

export interface ListAssetsResponse {
  assets: Asset[]
  total: number
}

// Search API
export interface SearchRequest extends SearchQuery {}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  query: SearchQuery
}

// Projects API
export interface CreateProjectRequest {
  name: string
  description?: string
  rootPath?: string
}

export interface ListProjectsResponse {
  projects: Project[]
}

// Collections API
export interface CreateCollectionRequest {
  projectId: string
  name: string
  description?: string
}

export interface AddToCollectionRequest {
  assetIds: string[]
  note?: string
}

// Import API
export interface ImportDirectoryRequest {
  path: string
  projectId?: string
}

export interface ImportStatus {
  taskId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  totalFiles: number
  processedFiles: number
  errors: string[]
}
