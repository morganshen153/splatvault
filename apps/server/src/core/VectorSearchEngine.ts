import { getDb } from '../db/connection.js'
import { embeddingBridge } from './EmbeddingBridge.js'
import { ThumbnailService } from './ThumbnailService.js'
import type { Asset } from '@splatvault/shared-types'

const thumbnailService = new ThumbnailService()

export interface VectorSearchResult {
  asset: Asset
  score: number
  matchFrameTime?: number
  source: 'image' | 'video_frame' | 'text'
}

interface EmbeddingRow {
  asset_id: string
  model: string
  vector: Buffer
  source: string
  frame_time: number | null
}

interface AssetRow {
  id: string
  type: string
  path: string
  filename: string
  size: number
  created_at: number
  modified_at: number
  thumbnail_path: string | null
  duration: number | null
  frame_count: number | null
  indexed_at: number | null
}

export class VectorSearchEngine {
  searchByVector(
    queryVector: Float32Array, model: string, topK: number = 50,
    filters?: { path?: string; dateFrom?: number; dateTo?: number }
  ): VectorSearchResult[] {
    const db = getDb()

    const conditions: string[] = ["e.model = ?"]
    const params: unknown[] = [model]

    if (filters?.path) {
      conditions.push('a.path LIKE ?')
      params.push(`%${filters.path.replace(/\//g, '\\')}%`)
    }
    if (filters?.dateFrom) {
      conditions.push('a.created_at >= ?')
      params.push(filters.dateFrom)
    }
    if (filters?.dateTo) {
      conditions.push('a.created_at <= ?')
      params.push(filters.dateTo)
    }

    // Load embeddings with their asset info
    const rows = db.prepare(`
      SELECT e.asset_id, e.model, e.vector, e.source, e.frame_time,
             a.id, a.type, a.path, a.filename, a.size,
             a.created_at, a.modified_at, a.thumbnail_path,
             a.duration, a.frame_count, a.indexed_at
      FROM asset_embeddings e
      JOIN assets a ON e.asset_id = a.id
      WHERE ${conditions.join(' AND ')}
    `).all(...params) as (EmbeddingRow & AssetRow)[]

    if (rows.length === 0) return []

    // Compute cosine similarity for all
    const scored: { row: typeof rows[0]; score: number }[] = []

    for (const row of rows) {
      const storedVector = new Float32Array(row.vector.buffer)
      const score = cosineSimilarity(queryVector, storedVector)
      if (isFinite(score) && score > 0) {
        scored.push({ row, score })
      }
    }

    // Sort by score descending, take topK
    scored.sort((a, b) => b.score - a.score)
    const top = scored.slice(0, topK)

    return top.map(item => ({
      asset: mapRowToAsset(item.row),
      score: Math.round(item.score * 1000) / 1000,
      matchFrameTime: item.row.frame_time ?? undefined,
      source: (item.row.source === 'video_frame' ? 'video_frame' :
               item.row.type === 'image' ? 'image' : 'text') as VectorSearchResult['source'],
    }))
  }

  async searchByText(
    text: string, topK: number = 50,
    filters?: { path?: string; dateFrom?: number; dateTo?: number }
  ): Promise<VectorSearchResult[]> {
    const vector = await embeddingBridge.embedText(text)
    const model = embeddingBridge.getModel()
    return this.searchByVector(vector, model, topK, filters)
  }

  async searchByImage(
    imagePath: string, topK: number = 50,
    filters?: { path?: string; dateFrom?: number; dateTo?: number }
  ): Promise<VectorSearchResult[]> {
    const vector = await embeddingBridge.embedImage(imagePath)
    const model = embeddingBridge.getModel()
    return this.searchByVector(vector, model, topK, filters)
  }

  async searchByBase64(
    imageBase64: string, topK: number = 50,
    filters?: { path?: string; dateFrom?: number; dateTo?: number }
  ): Promise<VectorSearchResult[]> {
    const { writeFileSync, unlinkSync } = await import('fs')
    const { join } = await import('path')
    const tmpPath = join(process.cwd(), 'data', 'tmp', `query_${Date.now()}.jpg`)
    try {
      const { existsSync, mkdirSync } = await import('fs')
      const dir = join(process.cwd(), 'data', 'tmp')
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

      const buffer = Buffer.from(imageBase64, 'base64')
      writeFileSync(tmpPath, buffer)
      return await this.searchByImage(tmpPath, topK, filters)
    } finally {
      try { unlinkSync(tmpPath) } catch {}
    }
  }
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, normA = 0, normB = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

function mapRowToAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    type: row.type as Asset['type'],
    path: row.path,
    filename: row.filename,
    size: row.size,
    createdAt: row.created_at,
    modifiedAt: row.modified_at,
    thumbnailPath: row.thumbnail_path ? thumbnailService.getThumbnailUrl(row.id) : undefined,
    duration: row.duration ?? undefined,
    frameCount: row.frame_count ?? undefined,
    indexedAt: row.indexed_at ?? undefined,
  }
}

export const vectorSearchEngine = new VectorSearchEngine()
