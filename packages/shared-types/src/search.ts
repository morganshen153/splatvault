import type { Asset } from './asset.js'

export interface SearchQuery {
  keyword?: string
  type?: 'image' | 'video' | 'text'
  path?: string
  dateFrom?: number
  dateTo?: number
  limit?: number
  offset?: number
  imageBase64?: string
  imagePath?: string
  /** If true, use vector search instead of filename LIKE */
  vector?: boolean
  topK?: number
  assetType?: 'image' | 'video' | 'text'
}

export interface SearchResult {
  asset: Asset
  score?: number
  matchFrameTime?: number
  /** 'keyword' = filename/LIKE hit, 'vector' = embedding similarity hit */
  matchType?: 'keyword' | 'vector'
}
