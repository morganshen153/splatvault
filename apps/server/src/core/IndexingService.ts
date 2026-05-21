import { getDb } from '../db/connection.js'
import { AssetStore } from './AssetStore.js'
import { embeddingBridge } from './EmbeddingBridge.js'
import { existsSync, readFileSync } from 'fs'
import { extname } from 'path'

const assetStore = new AssetStore()

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.tiff', '.svg'])
const VIDEO_EXTS = new Set(['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm'])
const TEXT_EXTS = new Set(['.txt', '.md', '.js', '.ts', '.json', '.css', '.html', '.xml', '.yaml', '.yml', '.ini', '.cfg', '.log', '.csv', '.py', '.java', '.go', '.rs', '.sh', '.bat'])

export interface IndexingProgress {
  total: number
  processed: number
  failed: number
  errors: string[]
}

export class IndexingService {
  private indexing = false
  private progress: IndexingProgress = { total: 0, processed: 0, failed: 0, errors: [] }

  getProgress(): IndexingProgress | null {
    return this.indexing ? this.progress : null
  }

  isIndexing(): boolean {
    return this.indexing
  }

  async indexAllAssets(onProgress?: (p: IndexingProgress) => void): Promise<IndexingProgress> {
    if (this.indexing) return this.progress

    this.indexing = true
    this.progress = { total: 0, processed: 0, failed: 0, errors: [] }

    try {
      const db = getDb()
      const allAssets = db.prepare('SELECT id, type, path FROM assets ORDER BY created_at DESC').all() as {
        id: string; type: string; path: string
      }[]

      // Filter to assets without embeddings and that exist on disk
      const toIndex = allAssets.filter(a => {
        if (!existsSync(a.path)) return false
        const ext = extname(a.path).toLowerCase()
        if (IMAGE_EXTS.has(ext)) return true
        if (VIDEO_EXTS.has(ext)) return true
        if (TEXT_EXTS.has(ext)) return true
        return false
      })

      this.progress.total = toIndex.length

      for (const asset of toIndex) {
        try {
          const ext = extname(asset.path).toLowerCase()
          if (IMAGE_EXTS.has(ext)) {
            await this.indexImage(asset.id, asset.path)
          } else if (VIDEO_EXTS.has(ext)) {
            await this.indexVideo(asset.id, asset.path)
          } else if (TEXT_EXTS.has(ext)) {
            await this.indexText(asset.id, asset.path)
          }
          this.progress.processed++
        } catch (err) {
          this.progress.failed++
          this.progress.errors.push(`${asset.path}: ${(err as Error).message}`)
        }

        if (onProgress) onProgress({ ...this.progress })
      }

      return this.progress
    } finally {
      this.indexing = false
    }
  }

  async indexImage(assetId: string, imagePath: string): Promise<void> {
    if (!existsSync(imagePath)) return

    const db = getDb()
    // Check if already indexed
    const existing = db.prepare(
      'SELECT 1 FROM asset_embeddings WHERE asset_id = ? AND model = ? AND source = ?'
    ).get(assetId, 'clip-vit-base-patch32', 'image') as { '1': number } | undefined
    if (existing) return

    const vector = await embeddingBridge.embedImage(imagePath)
    const model = embeddingBridge.getModel()

    const stmt = db.prepare(
      'INSERT OR REPLACE INTO asset_embeddings (asset_id, model, vector, source) VALUES (?, ?, ?, ?)'
    )
    stmt.run(assetId, model, Buffer.from(vector.buffer), 'image')

    // Mark asset as indexed
    assetStore.markIndexed(assetId)
  }

  async indexText(assetId: string, textPath: string): Promise<void> {
    if (!existsSync(textPath)) return

    const db = getDb()
    const existing = db.prepare(
      'SELECT 1 FROM asset_embeddings WHERE asset_id = ? AND model = ? AND source = ? AND frame_time IS NULL'
    ).get(assetId, 'local-text-v1', 'text') as { '1': number } | undefined
    if (existing) return

    // Read first 10KB of text content for embedding
    let content: string
    try {
      content = readFileSync(textPath, 'utf-8').slice(0, 10000)
    } catch {
      content = textPath // fallback to path
    }

    const vector = await embeddingBridge.embedText(content)
    const model = embeddingBridge.getModel()

    const stmt = db.prepare(
      'INSERT OR REPLACE INTO asset_embeddings (asset_id, model, vector, source) VALUES (?, ?, ?, ?)'
    )
    stmt.run(assetId, model, Buffer.from(vector.buffer), 'text')

    assetStore.markIndexed(assetId)
  }

  async indexVideo(assetId: string, videoPath: string): Promise<void> {
    const db = getDb()

    const frames = await embeddingBridge.embedVideoFrames(videoPath, 1.0)
    if (frames.length === 0) {
      // At minimum, try to index as a still (a single frame as thumbnail embedding)
      try {
        await this.indexImage(assetId, videoPath)
      } catch {}
      return
    }

    const model = embeddingBridge.getModel()

    // Delete any stale video frame embeddings for this asset+model
    db.prepare(
      "DELETE FROM asset_embeddings WHERE asset_id = ? AND model = ? AND source = 'video_frame'"
    ).run(assetId, model)

    const stmt = db.prepare(
      'INSERT INTO asset_embeddings (asset_id, model, vector, source, frame_time) VALUES (?, ?, ?, ?, ?)'
    )
    // Replace all video_frames for this asset (not just append)
    db.prepare('DELETE FROM video_frames WHERE asset_id = ?').run(assetId)

    const stmtMeta = db.prepare(
      'INSERT INTO video_frames (asset_id, frame_index, time_seconds) VALUES (?, ?, ?)'
    )

    const insertAll = db.transaction(() => {
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i]
        stmt.run(assetId, model, Buffer.from(frame.vector.buffer), 'video_frame', frame.time)
        stmtMeta.run(assetId, i, frame.time)
      }
    })
    insertAll()

    // Update asset with video metadata
    db.prepare('UPDATE assets SET frame_count = ?, duration = ? WHERE id = ?')
      .run(frames.length, frames[frames.length - 1]?.time ?? null, assetId)

    assetStore.markIndexed(assetId)
  }

  async indexAsset(assetId: string): Promise<void> {
    const db = getDb()
    const asset = db.prepare('SELECT id, type, path FROM assets WHERE id = ?').get(assetId) as
      { id: string; type: string; path: string } | undefined
    if (!asset || !existsSync(asset.path)) return

    const ext = extname(asset.path).toLowerCase()
    if (IMAGE_EXTS.has(ext)) {
      await this.indexImage(asset.id, asset.path)
    } else if (VIDEO_EXTS.has(ext)) {
      await this.indexVideo(asset.id, asset.path)
    } else if (TEXT_EXTS.has(ext)) {
      await this.indexText(asset.id, asset.path)
    }
  }
}

export const indexingService = new IndexingService()
