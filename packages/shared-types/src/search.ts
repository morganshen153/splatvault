import type { Asset } from './asset.js'

export interface SearchQuery {
  keyword?: string
  type?: 'image' | 'video' | 'text'
  path?: string
  dateFrom?: number
  dateTo?: number
  limit?: number
  offset?: number
  // 未来扩展
  imageBase64?: string
  assetType?: 'image' | 'video' | 'text'
  projectId?: string
  tags?: string[]
  topK?: number
}

export interface SearchResult {
  asset: Asset
  score: number
  matchFrameTime?: number
}
