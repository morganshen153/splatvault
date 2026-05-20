import sharp from 'sharp'
import { existsSync } from 'fs'
import { join } from 'path'

const THUMBNAIL_SIZE = 256

export class ThumbnailService {
  private thumbnailsDir: string

  constructor(baseDir?: string) {
    this.thumbnailsDir = baseDir || join(process.cwd(), '../../data/thumbnails')
  }

  async generateThumbnail(imagePath: string, assetId: string): Promise<string> {
    if (!existsSync(imagePath)) {
      throw new Error(`Source file not found: ${imagePath}`)
    }

    const thumbnailPath = join(this.thumbnailsDir, `${assetId}.webp`)

    await sharp(imagePath)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'cover',
        position: 'centre'
      })
      .webp({ quality: 80 })
      .toFile(thumbnailPath)

    return thumbnailPath
  }

  getThumbnailUrl(assetId: string): string {
    return `/thumbnails/${assetId}.webp`
  }
}
