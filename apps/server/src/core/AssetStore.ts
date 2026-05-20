import { getDb } from '../db/connection.js'
import type { Asset, AssetType } from '@splatvault/shared-types'
import crypto from 'crypto'
import { statSync, existsSync } from 'fs'
import { basename } from 'path'

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

  getAsset(id: string): Asset | undefined {
    const db = getDb()
    return db.prepare('SELECT * FROM assets WHERE id = ?').get(id) as Asset | undefined
  }

  getByPath(path: string): Asset | undefined {
    const db = getDb()
    return db.prepare('SELECT * FROM assets WHERE path = ?').get(path) as Asset | undefined
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

    return db.prepare(query).all(...params) as Asset[]
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
