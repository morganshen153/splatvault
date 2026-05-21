import express, { Router, Request, Response } from 'express'
import { existsSync } from 'fs'
import { createImportTask, getImportTask, runImportTask } from '../core/ImportService.js'

const router: express.IRouter = Router()

// POST /api/import - start batch import
router.post('/import', (req: Request, res: Response) => {
  const { path: rootPath, extensions } = req.body

  if (!rootPath) {
    return res.status(400).json({ error: 'path is required' })
  }

  if (!existsSync(rootPath)) {
    return res.status(400).json({ error: `Directory not found: ${rootPath}` })
  }

  const extList = Array.isArray(extensions) ? extensions : []

  const task = createImportTask(rootPath, extList)

  // Run in background
  runImportTask(task.taskId).catch(err => {
    console.error('Import task failed:', err)
  })

  res.status(202).json({
    taskId: task.taskId,
    status: 'scanning',
    rootPath,
  })
})

// GET /api/import/status/:taskId
router.get('/import/status/:taskId', (req: Request, res: Response) => {
  const task = getImportTask(req.params.taskId)
  if (!task) {
    return res.status(404).json({ error: 'Task not found' })
  }

  res.json({
    taskId: task.taskId,
    status: task.status,
    progress: task.progress,
  })
})

export default router
