import { getDb } from '../db/connection.js'
import { ThumbnailService } from './ThumbnailService.js'
import { VectorSearchEngine, vectorSearchEngine } from './VectorSearchEngine.js'
import type { SearchQuery, SearchResult } from '@splatvault/shared-types'

const thumbnailService = new ThumbnailService()

interface AssetRow {
  id: string
  type: string
  path: string
  filename: string
  size: number
  created_at: number
  modified_at: number
  thumbnail_path?: string | null
  duration?: number | null
  frame_count?: number | null
  indexed_at?: number | null
}

function mapDbRowToAsset(row: AssetRow) {
  return {
    id: row.id,
    type: row.type,
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

export class SearchEngine {
  keywordSearch(options: SearchQuery = {}): { assets: any[]; total: number; query: SearchQuery } {
    const db = getDb()
    const params: any[] = []
    const conditions: string[] = []

    if (options.keyword) {
      conditions.push('filename LIKE ?')
      params.push(`%${options.keyword}%`)
    }

    if (options.type) {
      conditions.push('type = ?')
      params.push(options.type)
    }

    if (options.path) {
      conditions.push('path LIKE ?')
      params.push(`%${options.path.replace(/\//g, '\\')}%`)
    }

    if (options.dateFrom) {
      conditions.push('created_at >= ?')
      params.push(options.dateFrom)
    }

    if (options.dateTo) {
      conditions.push('created_at <= ?')
      params.push(options.dateTo + 86400000 - 1)
    }

    let query = 'SELECT * FROM assets'
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    query += ' ORDER BY created_at DESC'

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count')
    const total = (db.prepare(countQuery).get(...params) as { count: number }).count

    const limit = options.limit ?? 50
    const offset = options.offset ?? 0
    const pagedQuery = `${query} LIMIT ? OFFSET ?`
    params.push(limit, offset)

    const rows = db.prepare(pagedQuery).all(...params) as AssetRow[]
    const assets = rows.map(mapDbRowToAsset)

    return { assets, total, query: options }
  }

  async vectorSearch(options: SearchQuery): Promise<{ assets: SearchResult[]; total: number; query: SearchQuery }> {
    const topK = options.topK ?? 50
    const keyword = options.keyword

    let vectorResults: {
      asset: any; score: number; matchFrameTime?: number; source: 'image' | 'video_frame' | 'text'
    }[]

    if (keyword) {
      vectorResults = await vectorSearchEngine.searchByText(keyword, topK, {
        path: options.path,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo,
      })
    } else {
      return { assets: [], total: 0, query: options }
    }

    // Apply type filter
    if (options.type) {
      vectorResults = vectorResults.filter(r => r.asset.type === options.type)
    }

    // Deduplicate by asset id (keep highest score)
    const seen = new Map<string, typeof vectorResults[0]>()
    for (const r of vectorResults) {
      const existing = seen.get(r.asset.id)
      if (!existing || r.score > existing.score) {
        seen.set(r.asset.id, r)
      }
    }

    const deduped = Array.from(seen.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)

    return {
      assets: deduped.map(r => ({
        asset: r.asset,
        score: r.score,
        matchFrameTime: r.matchFrameTime,
        matchType: 'vector' as const,
      })),
      total: deduped.length,
      query: options,
    }
  }

  async searchImageByImage(imagePath: string, topK: number = 50): Promise<SearchResult[]> {
    const results = await vectorSearchEngine.searchByImage(imagePath, topK)
    return results.map(r => ({
      asset: r.asset,
      score: r.score,
      matchFrameTime: r.matchFrameTime,
      matchType: 'vector' as const,
    }))
  }

  async searchImageByBase64(imageBase64: string, topK: number = 50): Promise<SearchResult[]> {
    const results = await vectorSearchEngine.searchByBase64(imageBase64, topK)
    return results.map(r => ({
      asset: r.asset,
      score: r.score,
      matchFrameTime: r.matchFrameTime,
      matchType: 'vector' as const,
    }))
  }
}
