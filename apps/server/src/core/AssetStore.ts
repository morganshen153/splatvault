import { getDb } from '../db/connection.js'
import type { Asset, AssetType } from '@splatvault/shared-types'
import crypto from 'crypto'
import { statSync, existsSync, unlinkSync } from 'fs'
import { basename, join } from 'path'
import { ThumbnailService } from './ThumbnailService.js'

const thumbnailService = new ThumbnailService()

// Helper to map DB row to Asset type
function mapDbRowToAsset(row: any): Asset {
  return {
    id: row.id,
    type: row.type,
    path: row.path,
    filename: row.filename,
    size: row.size,
    createdAt: row.created_at,
    modifiedAt: row.modified_at,
    thumbnailPath: row.thumbnail_path,
    duration: row.duration,
    frameCount: row.frame_count,
    indexedAt: row.indexed_at
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

    return asset
  }

  getAsset(id: string): Asset | undefined {
    const db = getDb()
    const row = db.prepare('SELECT * FROM assets WHERE id = ?').get(id)
    return row ? mapDbRowToAsset(row) : undefined
  }

  getByPath(path: string): Asset | undefined {
    const db = getDb()
    const row = db.prepare('SELECT * FROM assets WHERE path = ?').get(path)
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

    const rows = db.prepare(query).all(...params) as any[]
    return rows.map(mapDbRowToAsset)
  }

  deleteAsset(id: string): boolean {
    const db = getDb()
    const asset = this.getAsset(id)
    if (!asset) return false

    // 删除缩略图文件
    if (asset.thumbnailPath && existsSync(asset.thumbnailPath)) {
      try { unlinkSync(asset.thumbnailPath) } catch {}
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
}
