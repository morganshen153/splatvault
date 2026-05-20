import type { Asset } from './asset.js'

export interface SearchQuery {
  text?: string
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
