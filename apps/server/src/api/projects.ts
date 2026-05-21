import express, { Router, Request, Response } from 'express'
import { getDb } from '../db/connection.js'
import crypto from 'crypto'

const router: express.IRouter = Router()

interface ProjectRow {
  id: string
  name: string
  description: string | null
  root_path: string | null
  created_at: number
}

function mapProject(row: ProjectRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    rootPath: row.root_path ?? undefined,
    createdAt: row.created_at,
  }
}

// List projects
router.get('/projects', (req: Request, res: Response) => {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as ProjectRow[]
  const projects = rows.map(mapProject)
  res.json({ projects, total: projects.length })
})

// Create project
router.post('/projects', (req: Request, res: Response) => {
  const { name, description, rootPath } = req.body
  if (!name) {
    return res.status(400).json({ error: 'name is required' })
  }

  const id = crypto.randomUUID()
  const now = Date.now()
  const db = getDb()
  db.prepare('INSERT INTO projects (id, name, description, root_path, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, name, description || null, rootPath || null, now)

  res.status(201).json({ id, name, description, rootPath, createdAt: now })
})

// Get project
router.get('/projects/:id', (req: Request, res: Response) => {
  const db = getDb()
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as ProjectRow | undefined
  if (!project) {
    return res.status(404).json({ error: 'Project not found' })
  }
  res.json(mapProject(project))
})

// Update project
router.put('/projects/:id', (req: Request, res: Response) => {
  const { name, description, rootPath } = req.body
  if (!name) {
    return res.status(400).json({ error: 'name is required' })
  }

  const db = getDb()
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as ProjectRow | undefined
  if (!row) {
    return res.status(404).json({ error: 'Project not found' })
  }

  db.prepare('UPDATE projects SET name = ?, description = ?, root_path = ? WHERE id = ?')
    .run(name, description ?? row.description, rootPath ?? row.root_path, req.params.id)

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as ProjectRow
  res.json(mapProject(updated))
})

// Delete project
router.delete('/projects/:id', (req: Request, res: Response) => {
  const db = getDb()
  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id)
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Project not found' })
  }
  res.status(204).send()
})

export default router
