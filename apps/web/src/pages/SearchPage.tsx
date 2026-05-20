import { useState, useEffect } from 'react'
import type { Asset } from '@splatvault/shared-types'

interface SearchPageProps {
  apiBase?: string
  onAssetClick?: (asset: Asset) => void
}

export function SearchPage({ apiBase = '/api', onAssetClick }: SearchPageProps) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | Asset['type']>('all')
  const [results, setResults] = useState<Asset[]>([])
  const [loading, setLoading] = useState(false)

  const doSearch = async (searchQuery: string, type: string) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (type !== 'all') params.set('type', type)

    try {
      const res = await fetch(`${apiBase}/assets?${params}`)
      const data = await res.json()
      setResults(data.assets || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    doSearch(query, typeFilter)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    doSearch(query, typeFilter)
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h3 style={{ margin: '0 0 1rem' }}>搜索资产</h3>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="输入文件名关键词..."
          style={{
            flex: 1,
            padding: '0.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}
        />

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as 'all' | Asset['type'])}
          style={{
            padding: '0.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}
        >
          <option value="all">全部类型</option>
          <option value="image">图片</option>
          <option value="video">视频</option>
          <option value="text">文本</option>
        </select>

        <button
          type="submit"
          style={{
            padding: '0.5rem 1rem',
            background: '#007acc',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          搜索
        </button>
      </form>

      {loading && <p>搜索中...</p>}
      {!loading && results.length === 0 && query && <p>未找到匹配结果</p>}
      {!loading && !query && <p style={{ color: '#666' }}>输入关键词搜索文件名，或按类型筛选</p>}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        {results.map(asset => (
          <div
            key={asset.id}
            onClick={() => onAssetClick?.(asset)}
            style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '0.75rem',
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            {asset.thumbnailPath ? (
              <img src={asset.thumbnailPath} alt={asset.filename} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px' }} />
            ) : (
              <div style={{ width: '100%', height: '150px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                {asset.type === 'image' ? '🖼️' : asset.type === 'video' ? '🎬' : '📄'}
              </div>
            )}
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {asset.filename}
            </p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#666' }}>
              {asset.type} · {(asset.size / 1024).toFixed(1)}KB
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
