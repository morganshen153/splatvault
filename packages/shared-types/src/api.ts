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

export interface ListCollectionsResponse {
  collections: any[]
  total: number
}

export interface CollectionDetail {
  id: string
  projectId: string
  name: string
  description?: string
  assetCount?: number
}

export interface AddToCollectionResponse {
  added: string[]
  count: number
}

// Tags API
export interface CreateTagRequest {
  name: string
  color?: string
}

export interface ListTagsResponse {
  tags: Tag[]
  total: number
}

export interface BatchTagRequest {
  assetIds: string[]
  tagIds: string[]
}

export interface BatchTagResponse {
  tagged: { assetId: string; tagId: string }[]
  count: number
}

// Export API
export interface ExportRequest {
  assetIds: string[]
  format: 'json' | 'csv'
}

export interface ExportResponse {
  success: boolean
  exportId: string
  filename: string
  totalAssets: number
  downloadUrl: string
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
