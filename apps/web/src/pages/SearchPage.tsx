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
  const [hasSearched, setHasSearched] = useState(false)

  const doSearch = async (searchQuery: string, type: string) => {
    setLoading(true)
    setHasSearched(true)
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    doSearch(query, typeFilter)
  }

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value
    setTypeFilter(newType as 'all' | Asset['type'])
    // 自动搜索
    doSearch(query, newType)
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h3 style={{ margin: '0 0 1rem' }}>搜索资产</h3>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="输入文件名关键词..."
          style={{
            flex: 1,
            padding: '0.6rem 0.8rem',
            border: '1px solid #ccc',
            borderRadius: '6px',
            fontSize: '0.95rem',
            outline: 'none'
          }}
        />

        <select
          value={typeFilter}
          onChange={handleTypeChange}
          style={{
            padding: '0.5rem 0.8rem',
            border: '1px solid #ccc',
            borderRadius: '6px',
            fontSize: '0.9rem',
            background: '#fff',
            cursor: 'pointer'
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
            padding: '0.5rem 1.5rem',
            background: query || typeFilter !== 'all' ? '#007acc' : '#666',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          {loading ? '搜索中...' : '搜索'}
        </button>
      </form>

      {/* 空状态 */}
      {!hasSearched && (
        <div style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          color: '#888'
        }}>
          <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>🔍</p>
          <p style={{ margin: 0 }}>输入关键词搜索文件名，或按类型筛选</p>
        </div>
      )}

      {/* 搜索中 */}
      {loading && (
        <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>搜索中...</p>
      )}

      {/* 无结果 */}
      {!loading && hasSearched && results.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          color: '#888'
        }}>
          <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>😕</p>
          <p style={{ margin: 0 }}>未找到匹配结果</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>试试其他关键词或类型</p>
        </div>
      )}

      {/* 搜索结果 */}
      {!loading && results.length > 0 && (
        <>
          <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1rem' }}>
            找到 {results.length} 个结果
          </p>
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
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
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
        </>
      )}
    </div>
  )
}
