import express from 'express'
import cors from 'cors'
import { join } from 'path'
import healthRouter from './api/health.js'
import assetsRouter from './api/assets.js'
import searchRouter from './api/search.js'
import collectionsRouter from './api/collections.js'
import tagsRouter from './api/tags.js'
import projectsRouter from './api/projects.js'
import exportRouter from './api/export.js'
import { getDb } from './db/connection.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Static files for thumbnails
app.use('/thumbnails', express.static(join(process.cwd(), '../../data/thumbnails')))

// Static files for exports
app.use('/exports', express.static(join(process.cwd(), '../../data/exports')))

// API routes
app.use('/api', healthRouter)
app.use('/api', assetsRouter)
app.use('/api', searchRouter)
app.use('/api', collectionsRouter)
app.use('/api', tagsRouter)
app.use('/api', projectsRouter)
app.use('/api', exportRouter)

// Ensure DB is initialized
getDb()

app.listen(PORT, () => {
  console.log(`SplatVault API listening on http://localhost:${PORT}`)
})
