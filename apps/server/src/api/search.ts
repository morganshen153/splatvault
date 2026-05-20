import express, { Router, Request, Response } from 'express'
import { SearchEngine } from '../core/SearchEngine.js'
import type { SearchQuery, SearchResult } from '@splatvault/shared-types'

const router: express.IRouter = Router()
const searchEngine = new SearchEngine()

router.get('/search', (req: Request, res: Response) => {
  const { q, type, path, dateFrom, dateTo, limit, offset } = req.query

  const query: SearchQuery = {
    keyword: q as string | undefined,
    type: type as 'image' | 'video' | 'text' | undefined,
    path: path as string | undefined,
    dateFrom: dateFrom ? parseInt(dateFrom as string) : undefined,
    dateTo: dateTo ? parseInt(dateTo as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined,
  }

  const result = searchEngine.search(query)

  res.json(result)
})

export default router