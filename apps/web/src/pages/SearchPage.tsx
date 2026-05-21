import { useState, useEffect } from 'react'
import type { Asset } from '@splatvault/shared-types'
import { BatchActions } from '../components/BatchActions.js'

interface SearchPageProps {
  apiBase?: string
  onAssetClick?: (asset: Asset) => void
}

export function SearchPage({ apiBase = '/api', onAssetClick }: SearchPageProps) {
  const [keyword, setKeyword] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | Asset['type']>('all')
  const [pathFilter, setPathFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [results, setResults] = useState<Asset[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [selectAll, setSelectAll] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const doSearch = async () => {
    setLoading(true)
    setHasSearched(true)
    setSelected(new Set())
    setSelectAll(false)

    const params = new URLSearchParams()
    if (keyword) params.set('q', keyword)
    if (typeFilter !== 'all') params.set('type', typeFilter)
    if (pathFilter) params.set('path', pathFilter)
    if (dateFrom) params.set('dateFrom', new Date(dateFrom).getTime().toString())
    if (dateTo) params.set('dateTo', (new Date(dateTo).getTime() + 86400000 - 1).toString())

    try {
      const res = await fetch(`${apiBase}/search?${params}`)
      const data = await res.json()
      setResults(data.assets || [])
      setTotal(data.total || 0)
    } catch {
      setResults([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    doSearch()
  }

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value as 'all' | Asset['type'])
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    if (selectAll) setSelectAll(false)
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelected(new Set())
      setSelectAll(false)
    } else {
      setSelected(new Set(results.map(a => a.id)))
      setSelectAll(true)
    }
  }

  const clearSelection = () => {
    setSelected(new Set())
    setSelectAll(false)
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1.5rem', fontWeight: 500 }}>搜索资产</h3>

      <form onSubmit={handleSearch}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="关键词..."
            style={{ flex: 2, padding: '0.6rem 0.8rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.95rem' }}
          />
          <select
            value={typeFilter}
            onChange={handleTypeChange}
            style={{ padding: '0.5rem 0.8rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem', background: '#fff' }}
          >
            <option value="all">全部类型</option>
            <option value="image">图片</option>
            <option value="video">视频</option>
            <option value="text">文本</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '0.5rem 1.5rem', background: '#007acc', color: '#fff', border: 'none', borderRadius: '6px', cursor: loading ? 'default' : 'pointer', fontWeight: 500 }}
          >
            {loading ? '搜索中...' : '搜索'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', color: '#666' }}>路径筛选</label>
            <input type="text" value={pathFilter} onChange={e => setPathFilter(e.target.value)} placeholder="例如: /data 或 E:/" style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', color: '#666' }}>开始日期</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', color: '#666' }}>结束日期</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }} />
          </div>
        </div>
      </form>

      {/* Batch actions toolbar */}
      {hasSearched && results.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: selected.size > 0 ? '#e3f2fd' : '#f5f5f5', borderRadius: '6px', fontSize: '0.85rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={results.length > 0 && selected.size === results.length} onChange={toggleSelectAll} />
              全选
            </label>
          </div>
        </div>
      )}

      <BatchActions apiBase={apiBase} selected={selected} onClearSelection={clearSelection} />

      {!hasSearched && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#888' }}>
          <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>🔍</p>
          <p style={{ margin: 0 }}>输入关键词或使用筛选条件搜索资产</p>
        </div>
      )}

      {loading && <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>搜索中...</p>}

      {!loading && hasSearched && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#888' }}>
          <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>😕</p>
          <p style={{ margin: 0 }}>未找到匹配结果</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>试试其他关键词或筛选条件</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1rem' }}>找到 {total} 个结果</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
            {results.map(asset => (
              <div
                key={asset.id}
                onClick={() => onAssetClick?.(asset)}
                style={{
                  border: selected.has(asset.id) ? '2px solid #007acc' : '1px solid #e5e5e5',
                  borderRadius: '8px', padding: '0.75rem', background: '#fff',
                  cursor: 'pointer', transition: 'box-shadow 0.15s ease', position: 'relative'
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <input
                  type="checkbox"
                  checked={selected.has(asset.id)}
                  onChange={e => { e.stopPropagation(); toggleSelect(asset.id) }}
                  onClick={e => e.stopPropagation()}
                  style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', zIndex: 1 }}
                />
                {asset.thumbnailPath ? (
                  <img src={asset.thumbnailPath} alt={asset.filename} style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '4px' }} />
                ) : (
                  <div style={{ width: '100%', height: '140px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', fontSize: '2rem', color: '#999' }}>
                    {asset.type === 'image' ? '🖼️' : asset.type === 'video' ? '🎬' : '📄'}
                  </div>
                )}
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.filename}</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#888' }}>
                  {asset.type === 'image' ? '图片' : asset.type === 'video' ? '视频' : '文本'} · {(asset.size / 1024).toFixed(1)}KB
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
