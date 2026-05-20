import express, { Router, Request, Response } from 'express'
import { AssetStore } from '../core/AssetStore.js'
import type { ListAssetsResponse, Asset } from '@splatvault/shared-types'

const router: express.IRouter = Router()
const assetStore = new AssetStore()

router.get('/assets', (req: Request, res: Response) => {
  const { type, limit, offset } = req.query
  const assets = assetStore.listAssets({
    type: type as 'image' | 'video' | 'text' | undefined,
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined
  })

  const response: ListAssetsResponse = {
    assets,
    total: assetStore.count()
  }

  res.json(response)
})

router.get('/assets/:id', (req: Request, res: Response) => {
  const asset = assetStore.getAsset(req.params.id)
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' })
  }
  res.json(asset)
})

router.post('/assets', async (req: Request, res: Response) => {
  const { path, type } = req.body
  if (!path || !type) {
    return res.status(400).json({ error: 'path and type are required' })
  }
  try {
    const asset = await assetStore.createAssetWithThumbnail(path, type)
    res.status(201).json(asset)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

router.delete('/assets/:id', (req: Request, res: Response) => {
  const deleted = assetStore.deleteAsset(req.params.id)
  if (!deleted) {
    return res.status(404).json({ error: 'Asset not found' })
  }
  res.status(204).send()
})

export default router
