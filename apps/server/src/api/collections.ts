import express, { Router, Request, Response } from 'express'
import { getDb } from '../db/connection.js'
import crypto from 'crypto'

const router: express.IRouter = Router()

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
  added_at?: number
  note?: string | null
}

interface AssetResponse {
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
  addedAt?: number
  note?: string
}

function mapAssetRow(row: AssetRow): AssetResponse {
  return {
    id: row.id,
    type: row.type,
    path: row.path,
    filename: row.filename,
    size: row.size,
    createdAt: row.created_at,
    modifiedAt: row.modified_at,
    thumbnailPath: row.thumbnail_path ? `/thumbnails/${row.id}.webp` : undefined,
    duration: row.duration ?? undefined,
    frameCount: row.frame_count ?? undefined,
    indexedAt: row.indexed_at ?? undefined,
    addedAt: row.added_at,
    note: row.note ?? undefined,
  }
}

interface CollectionRow {
  id: string
  project_id: string
  name: string
  description?: string | null
  asset_count?: number
  created_at?: number | null
}

interface CollectionResponse {
  id: string
  projectId: string
  name: string
  description?: string
  assetCount?: number
}

function mapCollectionRow(row: CollectionRow): CollectionResponse {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description ?? undefined,
    assetCount: row.asset_count,
  }
}

// List collections
router.get('/collections', (req: Request, res: Response) => {
  const { projectId } = req.query
  const db = getDb()

  let query = `
    SELECT c.id, c.project_id, c.name, c.description,
           COUNT(ca.asset_id) as asset_count
    FROM collections c
    LEFT JOIN collection_assets ca ON c.id = ca.collection_id
  `
  const params: any[] = []
  if (projectId) {
    query += ' WHERE c.project_id = ?'
    params.push(projectId)
  }
  query += ' GROUP BY c.id ORDER BY c.id DESC'

  const rows = db.prepare(query).all(...params) as CollectionRow[]
  const collections = rows.map(mapCollectionRow)
  res.json({ collections, total: collections.length })
})

// Create collection
router.post('/collections', (req: Request, res: Response) => {
  const { projectId, name, description } = req.body
  if (!projectId || !name) {
    return res.status(400).json({ error: 'projectId and name are required' })
  }

  const id = crypto.randomUUID()
  const db = getDb()
  db.prepare('INSERT INTO collections (id, project_id, name, description) VALUES (?, ?, ?, ?)')
    .run(id, projectId, name, description || null)

  res.status(201).json({ id, projectId, name, description })
})

// Update collection
router.put('/collections/:id', (req: Request, res: Response) => {
  const { name, description } = req.body
  if (!name) {
    return res.status(400).json({ error: 'name is required' })
  }

  const db = getDb()
  const row = db.prepare('SELECT * FROM collections WHERE id = ?').get(req.params.id) as CollectionRow | undefined
  if (!row) {
    return res.status(404).json({ error: 'Collection not found' })
  }

  db.prepare('UPDATE collections SET name = ?, description = ? WHERE id = ?')
    .run(name, description || null, req.params.id)

  res.json({ id: req.params.id, projectId: row.project_id, name, description })
})

// Delete collection
router.delete('/collections/:id', (req: Request, res: Response) => {
  const db = getDb()
  const result = db.prepare('DELETE FROM collections WHERE id = ?').run(req.params.id)
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Collection not found' })
  }
  res.status(204).send()
})

// Get collection with assets
router.get('/collections/:id', (req: Request, res: Response) => {
  const db = getDb()
  const collectionRow = db.prepare('SELECT * FROM collections WHERE id = ?').get(req.params.id) as CollectionRow | undefined
  if (!collectionRow) {
    return res.status(404).json({ error: 'Collection not found' })
  }

  const assetRows = db.prepare(`
    SELECT a.*, ca.added_at, ca.note
    FROM collection_assets ca
    JOIN assets a ON ca.asset_id = a.id
    WHERE ca.collection_id = ?
    ORDER BY ca.added_at DESC
  `).all(req.params.id) as AssetRow[]

  const assets = assetRows.map(mapAssetRow)
  const collection = mapCollectionRow(collectionRow)

  res.json({ ...collection, assets })
})

// Batch add assets to collection
router.post('/collections/:id/assets', (req: Request, res: Response) => {
  const { assetIds, note } = req.body
  if (!assetIds || !Array.isArray(assetIds)) {
    return res.status(400).json({ error: 'assetIds array is required' })
  }

  const db = getDb()
  const row = db.prepare('SELECT * FROM collections WHERE id = ?').get(req.params.id) as CollectionRow | undefined
  if (!row) {
    return res.status(404).json({ error: 'Collection not found' })
  }

  const stmt = db.prepare('INSERT OR IGNORE INTO collection_assets (collection_id, asset_id, added_at, note) VALUES (?, ?, ?, ?)')
  const added: string[] = []

  const insertMany = db.transaction((collectionId: string, ids: string[], noteText: string | null) => {
    for (const id of ids) {
      const result = stmt.run(collectionId, id, Date.now(), noteText || null)
      if (result.changes > 0) added.push(id)
    }
  })

  insertMany(req.params.id, assetIds, note || null)
  res.json({ added, count: added.length })
})

// Remove asset from collection
router.delete('/collections/:collectionId/assets/:assetId', (req: Request, res: Response) => {
  const db = getDb()
  const result = db.prepare('DELETE FROM collection_assets WHERE collection_id = ? AND asset_id = ?')
    .run(req.params.collectionId, req.params.assetId)
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Asset not found in collection' })
  }
  res.status(204).send()
})

export default router
