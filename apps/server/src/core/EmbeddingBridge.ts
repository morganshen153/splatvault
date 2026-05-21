import { spawn, execSync } from 'child_process'
import { existsSync, unlinkSync, mkdirSync, rmdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { localFeatureProvider } from './LocalFeatureProvider.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Script lives in apps/server/src/scripts/embed.py
// Dev:   __dirname = apps/server/src/core
// Dist:  __dirname = apps/server/dist/apps/server/src/core (rootDir=../.. keeps tree)
const SCRIPT_CANDIDATES = [
  join(__dirname, '..', 'scripts', 'embed.py'),                          // dev:  src/core/../scripts
  join(__dirname, '..', '..', '..', '..', '..', '..', '..', 'apps', 'server', 'src', 'scripts', 'embed.py'), // dist: dist/apps/server/src/core → project root → apps/server/src/scripts
  join(process.cwd(), 'apps', 'server', 'src', 'scripts', 'embed.py'),  // cwd fallback
]
const SCRIPT_PATH = SCRIPT_CANDIDATES.find(s => existsSync(s)) || SCRIPT_CANDIDATES[0]

interface EmbeddingFrame {
  time: number
  vector?: number[]
  dim?: number
  frame_index?: number
  frame_path?: string
}

interface EmbeddingResponse {
  vector?: number[]
  dim?: number
  frames?: EmbeddingFrame[]
  total_frames?: number
  error?: string
  results?: { path: string; vector?: number[]; error?: string }[]
  count?: number
  tmp_dir?: string
  fps_target?: number
  fps_source?: number
}

export class EmbeddingBridge {
  private pythonPath: string = 'python'
  private pythonChecked: boolean = false
  private pythonAvailable: boolean = false
  private clipAvailable: boolean = false

  private async checkPython(): Promise<void> {
    if (this.pythonChecked) return
    this.pythonChecked = true

    const candidates = ['python3', 'python']
    for (const cmd of candidates) {
      try {
        execSync(`${cmd} --version`, { encoding: 'utf8', timeout: 5000, stdio: 'pipe' })
        this.pythonPath = cmd
        this.pythonAvailable = true
        break
      } catch {
        continue
      }
    }

    if (this.pythonAvailable && existsSync(SCRIPT_PATH)) {
      try {
        const result = await this.callPython({ action: 'ping' })
        if (result && !result.error) {
          this.clipAvailable = true
        }
      } catch {
        // CLIP not available, will use local fallback
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    await this.checkPython()
    return this.clipAvailable || this.pythonAvailable
  }

  private lastModel: string = 'clip-vit-base-patch32'

  /** Returns the model name used by the last successful embedding call */
  getModel(): string { return this.lastModel }

  async embedText(text: string): Promise<Float32Array> {
    await this.checkPython()
    if (this.clipAvailable) {
      try {
        const result = await this.callPython({ action: 'embed_text', input: text })
        if (!result.error && result.vector) {
          this.lastModel = 'clip-vit-base-patch32'
          return new Float32Array(result.vector)
        }
      } catch {
        // Fall through to local
      }
    }
    this.lastModel = 'local-text-v1'
    return localFeatureProvider.embedText(text)
  }

  async embedImage(imagePath: string): Promise<Float32Array> {
    await this.checkPython()
    if (!existsSync(imagePath)) {
      const absPath = join(process.cwd(), imagePath)
      if (!existsSync(absPath)) throw new Error(`Image not found: ${imagePath}`)
      imagePath = absPath
    }

    if (this.clipAvailable) {
      try {
        const result = await this.callPython({ action: 'embed_image', input: imagePath })
        if (!result.error && result.vector) {
          this.lastModel = 'clip-vit-base-patch32'
          return new Float32Array(result.vector)
        }
      } catch {
        // Fall through to local
      }
    }
    this.lastModel = 'local-image-v1'
    return localFeatureProvider.embedImage(imagePath)
  }

  async embedVideoFrames(videoPath: string, fps: number = 1.0): Promise<{ time: number; vector: Float32Array }[]> {
    await this.checkPython()
    if (!existsSync(videoPath)) {
      const absPath = join(process.cwd(), videoPath)
      if (!existsSync(absPath)) throw new Error(`Video not found: ${videoPath}`)
      videoPath = absPath
    }

    // Path 1: CLIP full pipeline (Python + CLIP model + PyAV)
    if (this.clipAvailable) {
      try {
        const result = await this.callPython({ action: 'embed_video_frames', input: videoPath, fps })
        if (!result.error && result.frames) {
          this.lastModel = 'clip-vit-base-patch32'
          const clipFrames = result.frames.filter(f => f.vector)
          if (clipFrames.length > 0) {
            return clipFrames.map(f => ({ time: f.time, vector: new Float32Array(f.vector!) }))
          }
        }
      } catch {
        // Fall through
      }
    }

    // Path 2: Extract frames via Python+PyAV, embed locally with sharp
    if (this.pythonAvailable) {
      try {
        const result = await this.callPython({ action: 'extract_frames_only', input: videoPath, fps })
        if (!result.error && result.frames && result.frames.length > 0) {
          const sharp = (await import('sharp')).default
          const frames: { time: number; vector: Float32Array }[] = []
          for (const frame of result.frames) {
            const fp = frame.frame_path as string
            if (!existsSync(fp)) continue
            try {
              const vector = await localFeatureProvider.embedImage(fp)
              frames.push({ time: frame.time as number, vector })
            } finally {
              try { unlinkSync(fp) } catch {}
            }
          }
          const tmpDir = result.tmp_dir as string
          if (tmpDir) try { rmdirSync(tmpDir, { recursive: true } as any) } catch {}
          if (frames.length > 0) {
            this.lastModel = 'local-image-v1'
            return frames
          }
        }
      } catch {
        // Fall through
      }
    }

    // Path 3: single frame via ffmpeg subprocess + sharp
    try {
      const sharp = (await import('sharp')).default
      const framePath = join(process.cwd(), 'data', 'tmp', `vf_${Date.now()}.jpg`)
      const dir = join(process.cwd(), 'data', 'tmp')
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      try {
        execSync(`ffmpeg -i "${videoPath}" -vframes 1 "${framePath}" -y`, { timeout: 30000, stdio: 'pipe' })
        if (existsSync(framePath)) {
          const vector = await localFeatureProvider.embedImage(framePath)
          this.lastModel = 'local-image-v1'
          return [{ time: 0, vector }]
        }
      } catch {} finally {
        try { unlinkSync(framePath) } catch {}
      }
    } catch {}

    // Path 4: Absolutely nothing worked — treat as text
    throw new Error('Video embedding not available: neither PyAV, ffmpeg, nor local frame extraction works')
  }

  async batchEmbedImages(paths: string[]): Promise<Map<string, Float32Array>> {
    await this.checkPython()
    const absPaths = paths.map(p => existsSync(p) ? p : join(process.cwd(), p))
    const validPaths = absPaths.filter(p => existsSync(p))
    if (validPaths.length === 0) return new Map()

    const map = new Map<string, Float32Array>()

    if (this.clipAvailable) {
      try {
        const result = await this.callPython({ action: 'batch_embed_images', inputs: validPaths })
        if (!result.error && result.results) {
          for (const r of result.results) {
            if (r.vector) map.set(r.path, new Float32Array(r.vector))
          }
        }
        this.lastModel = 'clip-vit-base-patch32'
        return map
      } catch {
        // Fall through
      }
    }

    // Local fallback: one by one
    this.lastModel = 'local-image-v1'
    for (const p of validPaths) {
      try {
        const v = await localFeatureProvider.embedImage(p)
        map.set(p, v)
      } catch {}
    }
    return map
  }

  getProviderInfo(): string {
    // CheckPython may not have been called yet if no embedding was attempted
    this.checkPython().catch(() => {})
    if (this.clipAvailable) return 'CLIP (Python)'
    if (this.pythonAvailable) return 'Python (no CLIP model, using local sharp)'
    return 'Local sharp (no Python)'
  }

  private callPython(data: Record<string, unknown>): Promise<EmbeddingResponse> {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.pythonPath, [SCRIPT_PATH], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
      })

      const timeout = setTimeout(() => {
        proc.kill()
        reject(new Error('Python embedding timed out'))
      }, 120000)

      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
      proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

      proc.on('close', (code) => {
        clearTimeout(timeout)
        if (code !== 0 && !stdout) {
          reject(new Error(`Python process exited code ${code}: ${stderr.slice(0, 200)}`))
          return
        }
        try {
          const result = JSON.parse(stdout) as EmbeddingResponse
          resolve(result)
        } catch {
          reject(new Error(`Invalid JSON from Python: ${stdout.slice(0, 200)}`))
        }
      })

      proc.on('error', (err) => {
        clearTimeout(timeout)
        reject(new Error(`Python spawn failed: ${err.message}`))
      })

      proc.stdin.write(JSON.stringify(data) + '\n')
      proc.stdin.end()
    })
  }
}

export const embeddingBridge = new EmbeddingBridge()
