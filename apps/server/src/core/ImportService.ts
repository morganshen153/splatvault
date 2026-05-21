import { statSync, readdirSync } from 'fs'
import { join, extname, basename } from 'path'
import { getDb } from '../db/connection.js'
import crypto from 'crypto'

export interface ImportTask {
  taskId: string
  rootPath: string
  extensions: string[]
  status: 'pending' | 'scanning' | 'importing' | 'completed' | 'failed'
  progress: { found: number; processed: number; failed: number; errors: string[] }
}

const tasks = new Map<string, ImportTask>()

interface ScanOptions {
  rootPath: string
  extensions: string[]
}

function scanFiles(options: ScanOptions): string[] {
  const results: string[] = []

  function walk(dir: string) {
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      try {
        const stats = statSync(fullPath)
        if (stats.isDirectory()) {
          walk(fullPath)
        } else if (stats.isFile()) {
          const ext = extname(entry).toLowerCase()
          if (options.extensions.length === 0 || options.extensions.includes(ext)) {
            results.push(fullPath)
          }
        }
      } catch {
        continue
      }
    }
  }

  walk(options.rootPath)
  return results
}

function detectType(ext: string): 'image' | 'video' | 'text' {
  const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.tiff', '.svg']
  const videoExts = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm']
  if (imageExts.includes(ext)) return 'image'
  if (videoExts.includes(ext)) return 'video'
  return 'text'
}

function createAssetRecord(path: string, type: 'image' | 'video' | 'text') {
  const stats = statSync(path)
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    type,
    path,
    filename: basename(path),
    size: stats.size,
    createdAt: Math.round(stats.birthtimeMs),
    modifiedAt: Math.round(stats.mtimeMs),
  }
}

export function createImportTask(rootPath: string, extensions: string[]): ImportTask {
  const taskId = crypto.randomUUID()
  const task: ImportTask = {
    taskId,
    rootPath,
    extensions,
    status: 'pending',
    progress: { found: 0, processed: 0, failed: 0, errors: [] },
  }
  tasks.set(taskId, task)
  return task
}

export function getImportTask(taskId: string): ImportTask | undefined {
  return tasks.get(taskId)
}

export async function runImportTask(taskId: string): Promise<void> {
  const task = tasks.get(taskId)
  if (!task) return

  try {
    task.status = 'scanning'
    const files = scanFiles({ rootPath: task.rootPath, extensions: task.extensions })
    task.progress.found = files.length
    task.status = 'importing'

    const db = getDb()
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO assets (id, type, path, filename, size, created_at, modified_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const insertAll = db.transaction((items: ReturnType<typeof createAssetRecord>[]) => {
      for (const item of items) {
        stmt.run(item.id, item.type, item.path, item.filename, item.size, item.createdAt, item.modifiedAt)
      }
    })

    const batch: ReturnType<typeof createAssetRecord>[] = []
    for (const filePath of files) {
      try {
        const ext = extname(filePath).toLowerCase()
        const type = detectType(ext)
        const existing = db.prepare('SELECT id FROM assets WHERE path = ?').get(filePath)
        if (!existing) {
          const asset = createAssetRecord(filePath, type)
          batch.push(asset)
        }
        task.progress.processed++
      } catch (err) {
        task.progress.failed++
        task.progress.errors.push(`${filePath}: ${(err as Error).message}`)
      }
    }

    if (batch.length > 0) {
      // Insert in batches of 500
      for (let i = 0; i < batch.length; i += 500) {
        insertAll(batch.slice(i, i + 500))
      }
    }

    task.status = 'completed'
  } catch (err) {
    task.status = 'failed'
    task.progress.errors.push(`Fatal: ${(err as Error).message}`)
  }
}
