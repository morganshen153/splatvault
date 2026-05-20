import express, { Router, Request, Response } from 'express'
import { getDb } from '../db/connection.js'
import type { HealthResponse } from '@splatvault/shared-types'

const router: express.IRouter = Router()

router.get('/health', (_req: Request, res: Response) => {
  try {
    const db = getDb()
    db.prepare('SELECT 1').get()

    const response: HealthResponse = {
      status: 'ok',
      version: '0.1.0',
      uptime: Math.round(process.uptime()),
      dbConnected: true
    }

    res.json(response)
  } catch {
    const response: HealthResponse = {
      status: 'error',
      version: '0.1.0',
      uptime: Math.round(process.uptime()),
      dbConnected: false
    }

    res.status(500).json(response)
  }
})

export default router
