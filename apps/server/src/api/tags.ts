import express, { Router, Request, Response } from 'express'
import { getDb } from '../db/connection.js'
import crypto from 'crypto'

const router: express.IRouter = Router()

// List tags
router.get('/tags', (req: Request, res: Response) => {
  const db = getDb()
  const tags = db.prepare('SELECT * FROM tags ORDER BY name').all() as any[]
  res.json({ tags, total: tags.length })
})

// Create tag
router.post('/tags', (req: Request, res: Response) => {
  const { name, color } = req.body
  if (!name) {
    return res.status(400).json({ error: 'name is required' })
  }

  const id = crypto.randomUUID()
  const db = getDb()
  try {
    db.prepare('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)')
      .run(id, name, color || null)
    res.status(201).json({ id, name, color })
  } catch (err: any) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Tag name already exists' })
    }
    throw err
  }
})

// Update tag
router.put('/tags/:id', (req: Request, res: Response) => {
  const { name, color } = req.body
  if (!name) {
    return res.status(400).json({ error: 'name is required' })
  }

  const db = getDb()
  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id) as any
  if (!tag) {
    return res.status(404).json({ error: 'Tag not found' })
  }

  try {
    db.prepare('UPDATE tags SET name = ?, color = ? WHERE id = ?')
      .run(name, color || null, req.params.id)
    res.json({ id: req.params.id, name, color })
  } catch (err: any) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Tag name already exists' })
    }
    throw err
  }
})

// Delete tag
router.delete('/tags/:id', (req: Request, res: Response) => {
  const db = getDb()
  const result = db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id)
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Tag not found' })
  }
  res.status(204).send()
})

// Get tags for an asset
router.get('/assets/:assetId/tags', (req: Request, res: Response) => {
  const db = getDb()
  const tags = db.prepare(`
    SELECT t.* FROM tags t
    JOIN asset_tags at ON t.id = at.tag_id
    WHERE at.asset_id = ?
    ORDER BY t.name
  `).all(req.params.assetId) as any[]
  res.json({ tags, total: tags.length })
})

// Batch tag assets
router.post('/tags/batch', (req: Request, res: Response) => {
  const { assetIds, tagIds } = req.body
  if (!assetIds || !Array.isArray(assetIds) || !tagIds || !Array.isArray(tagIds)) {
    return res.status(400).json({ error: 'assetIds and tagIds arrays are required' })
  }

  const db = getDb()
  const stmt = db.prepare('INSERT OR IGNORE INTO asset_tags (asset_id, tag_id) VALUES (?, ?)')
  const tagged: { assetId: string; tagId: string }[] = []

  const insertMany = db.transaction((aids: string[], tids: string[]) => {
    for (const assetId of aids) {
      for (const tagId of tids) {
        const result = stmt.run(assetId, tagId)
        if (result.changes > 0) tagged.push({ assetId, tagId })
      }
    }
  })

  insertMany(assetIds, tagIds)
  res.json({ tagged, count: tagged.length })
})

// Remove tag from asset
router.delete('/assets/:assetId/tags/:tagId', (req: Request, res: Response) => {
  const db = getDb()
  const result = db.prepare('DELETE FROM asset_tags WHERE asset_id = ? AND tag_id = ?')
    .run(req.params.assetId, req.params.tagId)
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Tag not found on asset' })
  }
  res.status(204).send()
})

export default router
