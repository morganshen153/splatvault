import express, { Router, Request, Response } from 'express'
import { getDb } from '../db/connection.js'
import crypto from 'crypto'

const router: express.IRouter = Router()

// List projects
router.get('/projects', (req: Request, res: Response) => {
  const db = getDb()
  const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as any[]
  res.json({ projects, total: projects.length })
})

// Create project
router.post('/projects', (req: Request, res: Response) => {
  const { name, description, rootPath } = req.body
  if (!name) {
    return res.status(400).json({ error: 'name is required' })
  }

  const id = crypto.randomUUID()
  const db = getDb()
  db.prepare('INSERT INTO projects (id, name, description, root_path, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, name, description || null, rootPath || null, Date.now())

  res.status(201).json({ id, name, description, rootPath, createdAt: Date.now() })
})

// Get project
router.get('/projects/:id', (req: Request, res: Response) => {
  const db = getDb()
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any
  if (!project) {
    return res.status(404).json({ error: 'Project not found' })
  }
  res.json(project)
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