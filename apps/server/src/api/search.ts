import express, { Router, Request, Response } from 'express'
import { SearchEngine } from '../core/SearchEngine.js'
import { IndexingService, indexingService } from '../core/IndexingService.js'
import { embeddingBridge } from '../core/EmbeddingBridge.js'
import type { SearchQuery, SearchResult } from '@splatvault/shared-types'

const router: express.IRouter = Router()
const searchEngine = new SearchEngine()

// GET /api/search — keyword search (filename LIKE or vector semantic search)
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, type, path, dateFrom, dateTo, limit, offset, vector, topK } = req.query

    const query: SearchQuery = {
      keyword: q as string | undefined,
      type: type as 'image' | 'video' | 'text' | undefined,
      path: path as string | undefined,
      dateFrom: dateFrom ? parseInt(dateFrom as string) : undefined,
      dateTo: dateTo ? parseInt(dateTo as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      vector: vector === 'true' || vector === '1',
      topK: topK ? parseInt(topK as string) : undefined,
    }

    if (query.vector && query.keyword) {
      // Vector semantic search
      const result = await searchEngine.vectorSearch(query)
      res.json(result)
    } else {
      // Traditional keyword search
      const result = searchEngine.keywordSearch(query)
      res.json(result)
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// POST /api/search/image — search by image (image-to-image)
router.post('/search/image', async (req: Request, res: Response) => {
  try {
    const { imagePath, imageBase64, topK } = req.body

    if (!imagePath && !imageBase64) {
      return res.status(400).json({ error: 'imagePath or imageBase64 is required' })
    }

    let results: SearchResult[]
    if (imagePath) {
      results = await searchEngine.searchImageByImage(imagePath, topK ?? 50)
    } else {
      results = await searchEngine.searchImageByBase64(imageBase64, topK ?? 50)
    }

    res.json({ assets: results, total: results.length })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// POST /api/search/reindex — trigger re-indexing of all assets
router.post('/search/reindex', async (req: Request, res: Response) => {
  try {
    if (indexingService.isIndexing()) {
      return res.json({ status: 'already indexing', progress: indexingService.getProgress() })
    }

    // Start indexing in background
    indexingService.indexAllAssets().then(progress => {
      console.log(`Indexing complete: ${progress.processed}/${progress.total} processed, ${progress.failed} failed`)
    }).catch(err => {
      console.error('Indexing failed:', err)
    })

    res.json({ status: 'started' })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// GET /api/search/index-status — check indexing progress
router.get('/search/index-status', (req: Request, res: Response) => {
  const progress = indexingService.getProgress()
  res.json({
    indexing: indexingService.isIndexing(),
    progress,
    provider: embeddingBridge.getProviderInfo(),
    model: embeddingBridge.getModel(),
    clipAvailable: embeddingBridge['clipAvailable'] ?? false,
  })
})

// GET /api/search/provider — get current provider info
router.get('/search/provider', (req: Request, res: Response) => {
  res.json({
    provider: embeddingBridge.getProviderInfo(),
    model: embeddingBridge.getModel(),
    clipAvailable: embeddingBridge['clipAvailable'] ?? false,
  })
})

export default router
