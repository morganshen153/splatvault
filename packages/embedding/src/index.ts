export interface EmbeddingProvider {
  name: string
  dim: number
  isAvailable(): Promise<boolean>
  embedText(text: string): Promise<Float32Array>
  embedImage(imagePath: string): Promise<Float32Array>
}

export interface EmbeddingResult {
  provider: string
  model: string
  vector: Float32Array
  dim: number
  quality: number
}

export class LocalEmbeddingProvider implements EmbeddingProvider {
  name = 'local'
  dim = 512

  async isAvailable(): Promise<boolean> {
    return true
  }

  async embedText(text: string): Promise<Float32Array> {
    const vector = new Float32Array(this.dim)
    // 简化实现：基于文本哈希生成确定性向量
    // 后续替换为真实模型
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0
    }
    const seed = Math.abs(hash) + 1
    for (let i = 0; i < this.dim; i++) {
      const x = Math.sin(seed * i * 12.9898) * 43758.5453
      vector[i] = (x - Math.floor(x)) * 2 - 1
    }
    // 归一化
    const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0))
    if (norm > 0) {
      for (let i = 0; i < this.dim; i++) vector[i] /= norm
    }
    return vector
  }

  async embedImage(imagePath: string): Promise<Float32Array> {
    // 简化实现：基于路径哈希
    return this.embedText(imagePath)
  }
}

export class EmbeddingRouter {
  private providers: EmbeddingProvider[] = []
  private fallback: EmbeddingProvider

  constructor(fallback?: EmbeddingProvider) {
    this.fallback = fallback ?? new LocalEmbeddingProvider()
  }

  registerProvider(provider: EmbeddingProvider): void {
    this.providers.push(provider)
  }

  async embedText(text: string): Promise<EmbeddingResult> {
    for (const provider of this.providers) {
      if (await provider.isAvailable()) {
        try {
          const vector = await provider.embedText(text)
          return {
            provider: provider.name,
            model: 'default',
            vector,
            dim: vector.length,
            quality: 1.0
          }
        } catch {
          continue
        }
      }
    }
    const vector = await this.fallback.embedText(text)
    return {
      provider: this.fallback.name,
      model: 'fallback',
      vector,
      dim: vector.length,
      quality: 0.5
    }
  }

  async embedImage(imagePath: string): Promise<EmbeddingResult> {
    for (const provider of this.providers) {
      if (await provider.isAvailable()) {
        try {
          const vector = await provider.embedImage(imagePath)
          return {
            provider: provider.name,
            model: 'default',
            vector,
            dim: vector.length,
            quality: 1.0
          }
        } catch {
          continue
        }
      }
    }
    const vector = await this.fallback.embedImage(imagePath)
    return {
      provider: this.fallback.name,
      model: 'fallback',
      vector,
      dim: vector.length,
      quality: 0.5
    }
  }
}
