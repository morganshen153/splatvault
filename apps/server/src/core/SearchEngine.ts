import { getDb } from '../db/connection.js'
import type { SearchQuery } from '@splatvault/shared-types'

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

interface Asset {
  id: string
  type: string
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

function mapDbRowToAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    type: row.type,
    path: row.path,
    filename: row.filename,
    size: row.size,
    createdAt: row.created_at,
    modifiedAt: row.modified_at,
    thumbnailPath: row.thumbnail_path ?? undefined,
    duration: row.duration ?? undefined,
    frameCount: row.frame_count ?? undefined,
    indexedAt: row.indexed_at ?? undefined,
  }
}

export interface SearchOptions extends SearchQuery {}

export interface SearchResult {
  assets: Asset[]
  total: number
  query: SearchQuery
}

export class SearchEngine {
  search(options: SearchOptions = {}): SearchResult {
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
      params.push(`%${options.path}%`)
    }

    if (options.dateFrom) {
      conditions.push('created_at >= ?')
      params.push(options.dateFrom)
    }

    if (options.dateTo) {
      conditions.push('created_at <= ?')
      params.push(options.dateTo)
    }

    let query = 'SELECT * FROM assets'
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    query += ' ORDER BY created_at DESC'

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count')
    const total = (db.prepare(countQuery).get(...params) as { count: number }).count

    query += ' LIMIT ? OFFSET ?'
    const limit = options.limit ?? 50
    const offset = options.offset ?? 0
    params.push(limit, offset)

    const rows = db.prepare(query).all(...params) as AssetRow[]
    const assets = rows.map(mapDbRowToAsset)

    return {
      assets,
      total,
      query: options
    }
  }
}