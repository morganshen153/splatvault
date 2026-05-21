import { readFileSync, existsSync } from 'fs'
import { extname } from 'path'

/**
 * LocalFeatureProvider: computes REAL image feature vectors using sharp.
 * Used as fallback when Python CLIP model is unavailable.
 *
 * Features for images (using sharp → pixel data):
 *   - Color histogram (8 bins × 3 channels = 24 dims, normalized)
 *   - Average color (R, G, B = 3 dims)
 *   - Color stddev (R, G, B = 3 dims)
 *   - Edge density estimate (1 dim)
 *   - Luminance histogram (8 bins = 8 dims)
 *   Total: ~39 dimensions
 *
 * Text features:
 *   - Character trigram frequency vectors (64-dim)
 *   - Normalized to unit length
 */

export class LocalFeatureProvider {
  async embedImage(imagePath: string): Promise<Float32Array> {
    if (!existsSync(imagePath)) throw new Error(`Image not found: ${imagePath}`)
    const ext = extname(imagePath).toLowerCase()
    if (!['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'].includes(ext)) {
      return this.embedText(imagePath)
    }

    try {
      const sharp = (await import('sharp')).default
      const { data, info } = await sharp(imagePath)
        .resize(64, 64, { fit: 'fill' })
        .raw()
        .toBuffer({ resolveWithObject: true })

      const pixels = new Uint8Array(data)
      const features = computeImageFeatures(pixels, info.width, info.height, info.channels)
      return normalizeFloat32(features)
    } catch (err) {
      // If sharp fails for any reason, fall back to text-based hash
      console.warn(`Sharp feature extraction failed for ${imagePath}, using text fallback:`, (err as Error).message)
      return this.embedText(imagePath)
    }
  }

  async embedText(text: string): Promise<Float32Array> {
    const features = computeTextFeatures(text)
    return normalizeFloat32(features)
  }
}

function computeImageFeatures(
  pixels: Uint8Array, width: number, height: number, channels: number
): Float32Array {
  const totalPixels = width * height
  const dims = 39
  const features = new Float32Array(dims)

  // Channel counts (index)
  const R = 0, G = 1, B = 2

  // 1. Color histogram per channel (8 bins each = 24 dims)
  const binCount = 8
  const histR = new Float32Array(binCount)
  const histG = new Float32Array(binCount)
  const histB = new Float32Array(binCount)

  // 2. Color moments
  let sumR = 0, sumG = 0, sumB = 0

  // 3. Luminance histogram (8 bins)
  const lumHist = new Float32Array(binCount)

  // 4. Edge detection via simple gradient
  let edgeSum = 0

  let idx = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++, idx += channels) {
      const r = pixels[idx]
      const g = pixels[idx + 1]
      const b = channels > 2 ? pixels[idx + 2] : 128
      // Use green as luminance proxy
      const lum = g

      sumR += r
      sumG += g
      sumB += b

      const binR = Math.min(binCount - 1, Math.floor((r / 256) * binCount))
      const binG = Math.min(binCount - 1, Math.floor((g / 256) * binCount))
      const binB = Math.min(binCount - 1, Math.floor((b / 256) * binCount))
      histR[binR]++
      histG[binG]++
      histB[binB]++

      const lumBin = Math.min(binCount - 1, Math.floor((lum / 256) * binCount))
      lumHist[lumBin]++

      // Simple edge: compare with right neighbor
      if (x < width - 1) {
        const nr = pixels[idx + channels]
        const ng = pixels[idx + channels + 1]
        const nb = channels > 2 ? pixels[idx + channels + 2] : 128
        edgeSum += Math.abs(r - nr) + Math.abs(g - ng) + Math.abs(b - nb)
      }
    }
  }

  const norm = totalPixels

  // Write color histograms (24 dims)
  let fi = 0
  for (let i = 0; i < binCount; i++) features[fi++] = histR[i] / norm
  for (let i = 0; i < binCount; i++) features[fi++] = histG[i] / norm
  for (let i = 0; i < binCount; i++) features[fi++] = histB[i] / norm

  // Write color moments (6 dims)
  const meanR = sumR / norm
  const meanG = sumG / norm
  const meanB = sumB / norm
  features[fi++] = meanR / 256
  features[fi++] = meanG / 256
  features[fi++] = meanB / 256

  // Compute stddev (pass 2 — reuse pixel data from first pass)
  let varR = 0, varG = 0, varB = 0
  idx = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++, idx += channels) {
      const dr = pixels[idx] - meanR
      const dg = pixels[idx + 1] - meanG
      const db = channels > 2 ? pixels[idx + 2] - meanB : 0
      varR += dr * dr
      varG += dg * dg
      varB += db * db
    }
  }
  features[fi++] = Math.sqrt(varR / norm) / 256
  features[fi++] = Math.sqrt(varG / norm) / 256
  features[fi++] = Math.sqrt(varB / norm) / 256

  // Edge density (1 dim)
  features[fi++] = Math.min(1, edgeSum / (totalPixels * 256 * 3))

  // Luminance histogram (8 dims)
  for (let i = 0; i < binCount; i++) features[fi++] = lumHist[i] / norm

  return features
}

function computeTextFeatures(text: string): Float32Array {
  const dims = 64
  const features = new Float32Array(dims)
  const lower = text.toLowerCase()

  // Character trigram features (32 dims from char-code based binning)
  for (let i = 0; i < lower.length - 2; i++) {
    const trigram = lower.slice(i, i + 3)
    let hash = 0
    for (let j = 0; j < trigram.length; j++) {
      hash = ((hash << 5) - hash + trigram.charCodeAt(j)) & 0x7fffffff
    }
    const bin1 = Math.abs(hash) % 16
    const bin2 = Math.abs(hash >> 8) % 16
    features[bin1] += 1
    features[16 + bin2] += 1
  }

  // Word-level features (16 dims)
  const words = lower.split(/[^a-z0-9一-鿿]+/).filter(w => w.length > 0)
  for (const word of words) {
    let hash = 0
    for (let j = 0; j < word.length; j++) {
      hash = ((hash << 5) - hash + word.charCodeAt(j)) & 0x7fffffff
    }
    const bin = Math.abs(hash) % 16
    features[32 + bin] += 1
  }

  // Length normalization features (8 dims)
  const lenBins = [0, 4, 8, 16, 32, 64, 128, 256]
  let len = lower.length
  for (let i = 0; i < lenBins.length && i < 8; i++) {
    if (len >= lenBins[i] && (i === lenBins.length - 1 || len < lenBins[i + 1])) {
      features[48 + i] = 1
      break
    }
  }

  // Word count feature
  features[56] = Math.min(1, words.length / 10)

  // Has Chinese feature
  features[57] = /[一-鿿]/.test(text) ? 1 : 0

  // Punctuation ratio
  const punctCount = (text.match(/[.,!?;:。，！？；：、]/g) || []).length
  features[58] = Math.min(1, punctCount / Math.max(1, text.length / 10))

  return features
}

function normalizeFloat32(v: Float32Array): Float32Array {
  let sumSq = 0
  for (let i = 0; i < v.length; i++) sumSq += v[i] * v[i]
  const norm = Math.sqrt(sumSq)
  if (norm > 0) {
    for (let i = 0; i < v.length; i++) v[i] /= norm
  }
  return v
}

export const localFeatureProvider = new LocalFeatureProvider()
