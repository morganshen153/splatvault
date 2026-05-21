import express, { Router, Request, Response } from 'express'
import { getDb } from '../db/connection.js'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import crypto from 'crypto'

const router: express.IRouter = Router()

const EXPORTS_DIR = process.env.EXPORTS_DIR || join(process.cwd(), '../../data/exports')

interface AssetExport {
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
}

// POST /api/export - Real backend export
router.post('/export', (req: Request, res: Response) => {
  const { assetIds, format = 'json' } = req.body

  if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
    return res.status(400).json({ error: 'assetIds array is required' })
  }

  const db = getDb()

  // Fetch assets
  const placeholders = assetIds.map(() => '?').join(',')
  const rows = db.prepare(`
    SELECT id, type, path, filename, size, created_at, modified_at,
           thumbnail_path, duration, frame_count
    FROM assets
    WHERE id IN (${placeholders})
  `).all(...assetIds) as any[]

  if (rows.length === 0) {
    return res.status(404).json({ error: 'No assets found' })
  }

  // Map to camelCase
  const assets: AssetExport[] = rows.map(row => ({
    id: row.id,
    type: row.type,
    path: row.path,
    filename: row.filename,
    size: row.size,
    createdAt: row.created_at,
    modifiedAt: row.modified_at,
    thumbnailPath: row.thumbnail_path ? `/thumbnails/${row.id}.webp` : undefined,
    duration: row.duration,
    frameCount: row.frame_count
  }))

  // Ensure exports directory exists
  if (!existsSync(EXPORTS_DIR)) {
    mkdirSync(EXPORTS_DIR, { recursive: true })
  }

  // Generate export file
  const timestamp = Date.now()
  const exportId = crypto.randomUUID()
  const filename = `splatvault-export-${timestamp}.json`
  const filepath = join(EXPORTS_DIR, filename)

  const exportData = {
    exportId,
    timestamp,
    totalAssets: assets.length,
    assets
  }

  // Write to disk
  writeFileSync(filepath, JSON.stringify(exportData, null, 2))

  // Return download URL
  res.json({
    success: true,
    exportId,
    filename,
    totalAssets: assets.length,
    downloadUrl: `/exports/${filename}`
  })
})

export default router
