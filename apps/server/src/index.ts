import express from 'express'
import cors from 'cors'
import { join } from 'path'
import healthRouter from './api/health.js'
import assetsRouter from './api/assets.js'
import { getDb } from './db/connection.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Static files for thumbnails
app.use('/thumbnails', express.static(join(process.cwd(), '../../data/thumbnails')))

// API routes
app.use('/api', healthRouter)
app.use('/api', assetsRouter)

// Ensure DB is initialized
getDb()

app.listen(PORT, () => {
  console.log(`SplatVault API listening on http://localhost:${PORT}`)
})
