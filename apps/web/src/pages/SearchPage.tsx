import { useState, useEffect, useRef } from 'react'
import type { Asset } from '@splatvault/shared-types'
import { BatchActions } from '../components/BatchActions.js'

interface SearchResultItem {
  asset: Asset
  score?: number
  matchFrameTime?: number
  matchType?: 'keyword' | 'vector'
}

interface SearchPageProps {
  apiBase?: string
  onAssetClick?: (asset: Asset) => void
}

type SearchMode = 'text' | 'image'

export function SearchPage({ apiBase = '/api', onAssetClick }: SearchPageProps) {
  const [keyword, setKeyword] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | Asset['type']>('all')
  const [pathFilter, setPathFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [selectAll, setSelectAll] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [searchMode, setSearchMode] = useState<SearchMode>('text')
  const [imageQueryPath, setImageQueryPath] = useState('')
  const [useVectorSearch, setUseVectorSearch] = useState(false)
  const [indexingStatus, setIndexingStatus] = useState<string>('')
  const [providerInfo, setProviderInfo] = useState<{ provider: string; model: string; clipAvailable: boolean } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch provider info on mount
  useEffect(() => {
    fetch(`${apiBase}/search/provider`)
      .then(r => r.json())
      .then(d => setProviderInfo(d))
      .catch(() => setProviderInfo({ provider: '未知', model: 'unknown', clipAvailable: false }))
  }, [apiBase])

  // Update: when switching to image mode, select 'image' type
  useEffect(() => {
    if (searchMode === 'image') {
      setTypeFilter('image')
    }
  }, [searchMode])

  const doTextSearch = async () => {
    setLoading(true)
    setHasSearched(true)
    setSelected(new Set())
    setSelectAll(false)
    setIndexingStatus('')

    const params = new URLSearchParams()
    if (keyword) params.set('q', keyword)
    if (typeFilter !== 'all') params.set('type', typeFilter)
    if (pathFilter) params.set('path', pathFilter)
    if (dateFrom) params.set('dateFrom', new Date(dateFrom).getTime().toString())
    if (dateTo) params.set('dateTo', (new Date(dateTo).getTime() + 86400000 - 1).toString())
    if (useVectorSearch) params.set('vector', 'true')

    try {
      const res = await fetch(`${apiBase}/search?${params}`)
      const data = await res.json()
      normalizeResults(data)
    } catch {
      setResults([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const doImageSearch = async () => {
    if (!imageQueryPath.trim()) return
    setLoading(true)
    setHasSearched(true)
    setSelected(new Set())
    setSelectAll(false)
    setIndexingStatus('')

    try {
      const res = await fetch(`${apiBase}/search/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagePath: imageQueryPath.trim(), topK: 50 }),
      })
      const data = await res.json()
      if (data.error) {
        setIndexingStatus(data.error)
        setResults([])
        setTotal(0)
      } else {
        setResults((data.assets || []).map((r: any) => ({
          asset: r.asset || r,
          score: r.score,
          matchFrameTime: r.matchFrameTime,
          matchType: r.matchType || 'vector',
        })))
        setTotal(data.total || 0)
      }
    } catch (err) {
      setIndexingStatus(`搜索失败: ${(err as Error).message}`)
      setResults([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setHasSearched(true)
    setSelected(new Set())
    setSelectAll(false)
    setIndexingStatus('')

    try {
      const base64 = await fileToBase64(file)
      const res = await fetch(`${apiBase}/search/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, topK: 50 }),
      })
      const data = await res.json()
      if (data.error) {
        setIndexingStatus(data.error)
        setResults([])
        setTotal(0)
      } else {
        setResults((data.assets || []).map((r: any) => ({
          asset: r.asset || r,
          score: r.score,
          matchFrameTime: r.matchFrameTime,
          matchType: r.matchType || 'vector',
        })))
        setTotal(data.total || 0)
      }
    } catch (err) {
      setIndexingStatus(`搜索失败: ${(err as Error).message}`)
      setResults([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const normalizeResults = (data: any) => {
    if (!data.assets) {
      setResults([])
      setTotal(0)
      return
    }

    // Handle SearchResult[] format (vector search) or Asset[] format (keyword search)
    const items: SearchResultItem[] = data.assets.map((r: any) => {
      // Check if it's already in SearchResult format (has `asset` wrapper) or raw Asset
      if (r.asset) {
        return {
          asset: r.asset,
          score: r.score,
          matchFrameTime: r.matchFrameTime,
          matchType: r.matchType || 'vector',
        }
      }
      return { asset: r, matchType: 'keyword' as const }
    })

    setResults(items)
    setTotal(data.total || items.length)
  }

  const triggerIndexing = async () => {
    setIndexingStatus('正在建立索引...')
    try {
      const res = await fetch(`${apiBase}/search/reindex`, { method: 'POST' })
      const data = await res.json()
      setIndexingStatus(data.status === 'started' ? '索引构建已启动（后台运行）' : data.status)
      // Poll for status
      const check = setInterval(async () => {
        const statusRes = await fetch(`${apiBase}/search/index-status`)
        const statusData = await statusRes.json()
        if (!statusData.indexing) {
          setIndexingStatus(`索引完成: ${statusData.progress?.processed ?? 0} 项处理`)
          clearInterval(check)
        } else {
          setIndexingStatus(`索引中: ${statusData.progress?.processed ?? 0}/${statusData.progress?.total ?? '?'}`)
        }
      }, 2000)
      // Stop polling after 5 minutes
      setTimeout(() => clearInterval(check), 300000)
    } catch (err) {
      setIndexingStatus(`索引启动失败: ${(err as Error).message}`)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchMode === 'text') doTextSearch()
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
      setSelected(new Set(results.map(r => r.asset.id)))
      setSelectAll(true)
    }
  }

  const clearSelection = () => {
    setSelected(new Set())
    setSelectAll(false)
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontWeight: 500 }}>搜索资产</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setSearchMode('text')} style={{
            padding: '0.25rem 0.6rem', fontSize: '0.8rem', borderRadius: '4px',
            border: searchMode === 'text' ? '2px solid #007acc' : '1px solid #ddd',
            background: searchMode === 'text' ? '#e3f2fd' : '#fff',
            color: searchMode === 'text' ? '#007acc' : '#666', cursor: 'pointer'
          }}>文本搜索</button>
          <button onClick={() => setSearchMode('image')} style={{
            padding: '0.25rem 0.6rem', fontSize: '0.8rem', borderRadius: '4px',
            border: searchMode === 'image' ? '2px solid #007acc' : '1px solid #ddd',
            background: searchMode === 'image' ? '#e3f2fd' : '#fff',
            color: searchMode === 'image' ? '#007acc' : '#666', cursor: 'pointer'
          }}>以图搜图</button>
        </div>
      </div>

      {/* Indexing status bar */}
      {indexingStatus && (
        <div style={{
          padding: '0.4rem 0.75rem', background: '#fff8e1', border: '1px solid #ffc107',
          borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem', color: '#795548'
        }}>
          {indexingStatus}
        </div>
      )}

      {searchMode === 'text' ? (
        <form onSubmit={handleSearch}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
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

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.9rem', alignItems: 'center' }}>
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

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={useVectorSearch} onChange={e => setUseVectorSearch(e.target.checked)} />
              向量语义搜索{providerInfo ? ` (${providerInfo.clipAvailable ? 'CLIP' : '本地特征'})` : ''}
            </label>
            <button type="button" onClick={triggerIndexing} style={{
              padding: '0.25rem 0.6rem', fontSize: '0.8rem', background: '#fff',
              border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', color: '#666'
            }}>
              建立/刷新索引
            </button>
            {providerInfo && (
              <span style={{ fontSize: '0.75rem', color: '#999' }}>
                {providerInfo.clipAvailable ? 'CLIP 512维语义模型' : providerInfo.provider}
              </span>
            )}
          </div>
        </form>
      ) : (
        /* Image search mode */
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', color: '#666', fontSize: '0.85rem' }}>
                输入本地图片路径
              </label>
              <input
                type="text"
                value={imageQueryPath}
                onChange={e => setImageQueryPath(e.target.value)}
                placeholder="local image path"
                style={{ width: '100%', padding: '0.5rem 0.8rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem' }}
                onKeyDown={e => { if (e.key === 'Enter') doImageSearch() }}
              />
            </div>
            <button onClick={doImageSearch} disabled={loading || !imageQueryPath.trim()} style={{
              padding: '0.5rem 1.5rem', background: imageQueryPath.trim() ? '#007acc' : '#ccc',
              color: '#fff', border: 'none', borderRadius: '6px', cursor: imageQueryPath.trim() ? 'pointer' : 'default'
            }}>搜索</button>
          </div>
          <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#999' }}>或</span>
            <button onClick={() => fileInputRef.current?.click()} style={{
              marginLeft: '0.5rem', padding: '0.3rem 0.8rem', background: '#fff',
              border: '1px solid #007acc', borderRadius: '4px', color: '#007acc',
              cursor: 'pointer', fontSize: '0.85rem'
            }}>
              上传图片
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageFileUpload}
            />
          </div>
        </div>
      )}

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
          {searchMode === 'text' ? (
            <>
              <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>🔍</p>
              <p style={{ margin: 0 }}>输入关键词搜索资产</p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
                勾选"向量语义搜索"后可进行语义级检索（需先建立索引）
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>🖼️</p>
              <p style={{ margin: 0 }}>上传图片或输入路径，查找相似图片</p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
                {providerInfo?.clipAvailable
                  ? '基于 CLIP 向量相似度检索（512维语义空间）'
                  : providerInfo
                    ? '基于本地特征相似度检索（39维颜色直方图+边缘特征）'
                    : '基于向量相似度检索'}
              </p>
            </>
          )}
        </div>
      )}

      {loading && <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>搜索中...</p>}

      {!loading && hasSearched && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#888' }}>
          <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>😕</p>
          <p style={{ margin: 0 }}>未找到匹配结果</p>
          {searchMode === 'text' && useVectorSearch && (
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
              提示：如果索引尚未建立，请先点击"建立/刷新索引"
            </p>
          )}
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1rem' }}>
            找到 {total} 个结果
            {results[0]?.matchType === 'vector' && (
              <span style={{ marginLeft: '0.5rem', color: '#4caf50' }}>
                ● {providerInfo?.clipAvailable ? 'CLIP语义' : '本地特征'}检索
              </span>
            )}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {results.map(item => (
              <div
                key={item.asset.id + (item.matchFrameTime ?? '')}
                onClick={() => onAssetClick?.(item.asset)}
                style={{
                  border: selected.has(item.asset.id) ? '2px solid #007acc' : '1px solid #e5e5e5',
                  borderRadius: '8px', padding: '0.75rem', background: '#fff',
                  cursor: 'pointer', transition: 'box-shadow 0.15s ease', position: 'relative'
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <input
                  type="checkbox"
                  checked={selected.has(item.asset.id)}
                  onChange={e => { e.stopPropagation(); toggleSelect(item.asset.id) }}
                  onClick={e => e.stopPropagation()}
                  style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', zIndex: 1 }}
                />
                {item.asset.thumbnailPath ? (
                  <img src={item.asset.thumbnailPath} alt={item.asset.filename}
                    style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '4px' }} />
                ) : (
                  <div style={{ width: '100%', height: '140px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', fontSize: '2rem', color: '#999' }}>
                    {item.asset.type === 'image' ? '🖼️' : item.asset.type === 'video' ? '🎬' : '📄'}
                  </div>
                )}
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.asset.filename}</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#888' }}>
                  {item.asset.type === 'image' ? '图片' : item.asset.type === 'video' ? '视频' : '文本'} · {(item.asset.size / 1024).toFixed(1)}KB
                </p>
                {/* Score badge for vector search */}
                {item.score !== undefined && (
                  <div style={{
                    position: 'absolute', top: '0.5rem', left: '0.5rem',
                    background: item.score > 0.25 ? 'rgba(76,175,80,0.9)' : 'rgba(158,158,158,0.9)',
                    color: '#fff', borderRadius: '4px', padding: '0.1rem 0.35rem',
                    fontSize: '0.7rem', fontWeight: 500
                  }}>
                    {(item.score * 100).toFixed(0)}%
                  </div>
                )}
                {/* Video frame timestamp */}
                {item.matchFrameTime !== undefined && (
                  <div style={{
                    position: 'absolute', bottom: '0.5rem', left: '0.5rem',
                    background: 'rgba(0,0,0,0.7)', color: '#fff', borderRadius: '4px',
                    padding: '0.1rem 0.35rem', fontSize: '0.7rem'
                  }}>
                    {formatTime(item.matchFrameTime)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data:image/...;base64, prefix
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
