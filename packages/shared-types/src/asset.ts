export type AssetType = 'image' | 'video' | 'text'

export interface Asset {
  id: string
  type: AssetType
  path: string
  filename: string
  size: number
  createdAt: number
  modifiedAt: number
  thumbnailPath?: string
  duration?: number
  frameCount?: number
  indexedAt?: number
}

export interface AssetEmbedding {
  assetId: string
  model: string
  vector: Float32Array
  source: 'image' | 'text' | 'frame'
  frameTime?: number
}
