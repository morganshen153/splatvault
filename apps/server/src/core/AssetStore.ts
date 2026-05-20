import { getDb } from '../db/connection.js'
import type { Asset, AssetType } from '@splatvault/shared-types'
import crypto from 'crypto'
import { statSync, existsSync, unlinkSync } from 'fs'
import { basename } from 'path'
import { ThumbnailService } from './ThumbnailService.js'

const thumbnailService = new ThumbnailService()

interface AssetRow {
  id: string
  type: AssetType
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

// Helper to map DB row to Asset type
function mapDbRowToAsset(row: AssetRow): Asset {
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

export class AssetStore {
  createAsset(path: string, type: AssetType): Asset {
    const db = getDb()
    const stats = statSync(path)
    const now = Date.now()

    const asset: Asset = {
      id: crypto.randomUUID(),
      type,
      path,
      filename: basename(path),
      size: stats.size,
      createdAt: Math.round(stats.birthtimeMs),
      modifiedAt: Math.round(stats.mtimeMs),
    }

    db.prepare(`
      INSERT INTO assets (id, type, path, filename, size, created_at, modified_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(asset.id, asset.type, asset.path, asset.filename, asset.size, asset.createdAt, asset.modifiedAt)

    return asset
  }

  async createAssetWithThumbnail(path: string, type: AssetType): Promise<Asset> {
    const asset = this.createAsset(path, type)

    if (type === 'image' && existsSync(path)) {
      try {
        const thumbnailPath = await thumbnailService.generateThumbnail(path, asset.id)
        this.updateThumbnail(asset.id, thumbnailPath)
      } catch (err) {
        console.warn(`Failed to generate thumbnail for ${path}:`, (err as Error).message)
      }
    }

    return this.getAsset(asset.id) ?? asset
  }

  getAsset(id: string): Asset | undefined {
    const row = this.getAssetRow(id)
    return row ? mapDbRowToAsset(row) : undefined
  }

  getByPath(path: string): Asset | undefined {
    const db = getDb()
    const row = db.prepare('SELECT * FROM assets WHERE path = ?').get(path) as AssetRow | undefined
    return row ? mapDbRowToAsset(row) : undefined
  }

  listAssets(options?: { type?: AssetType; limit?: number; offset?: number }): Asset[] {
    const db = getDb()
    let query = 'SELECT * FROM assets ORDER BY created_at DESC'
    const params: any[] = []

    if (options?.type) {
      query = 'SELECT * FROM assets WHERE type = ? ORDER BY created_at DESC'
      params.push(options.type)
    }

    const limit = options?.limit ?? 50
    const offset = options?.offset ?? 0
    query += ' LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const rows = db.prepare(query).all(...params) as AssetRow[]
    return rows.map(mapDbRowToAsset)
  }

  deleteAsset(id: string): boolean {
    const db = getDb()
    const row = this.getAssetRow(id)
    if (!row) return false

    // 删除缩略图文件
    if (row.thumbnail_path && existsSync(row.thumbnail_path)) {
      try { unlinkSync(row.thumbnail_path) } catch {}
    }

    db.prepare('DELETE FROM assets WHERE id = ?').run(id)
    return true
  }

  updateThumbnail(assetId: string, thumbnailPath: string): void {
    const db = getDb()
    db.prepare('UPDATE assets SET thumbnail_path = ? WHERE id = ?').run(thumbnailPath, assetId)
  }

  markIndexed(assetId: string): void {
    const db = getDb()
    db.prepare('UPDATE assets SET indexed_at = ? WHERE id = ?').run(Date.now(), assetId)
  }

  count(): number {
    const db = getDb()
    return (db.prepare('SELECT COUNT(*) as count FROM assets').get() as { count: number }).count
  }

  searchAssets(options?: { keyword?: string; type?: AssetType; limit?: number; offset?: number }): Asset[] {
    const db = getDb()
    const params: any[] = []
    let conditions: string[] = []

    if (options?.keyword) {
      conditions.push('filename LIKE ?')
      params.push(`%${options.keyword}%`)
    }

    if (options?.type) {
      conditions.push('type = ?')
      params.push(options.type)
    }

    let query = 'SELECT * FROM assets'
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(options?.limit ?? 50, options?.offset ?? 0)

    const rows = db.prepare(query).all(...params) as AssetRow[]
    return rows.map(mapDbRowToAsset)
  }

  private getAssetRow(id: string): AssetRow | undefined {
    const db = getDb()
    return db.prepare('SELECT * FROM assets WHERE id = ?').get(id) as AssetRow | undefined
  }
}
