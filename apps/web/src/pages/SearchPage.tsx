import { useState, useEffect } from 'react'
import type { Asset } from '@splatvault/shared-types'
import { formatDateTime } from '../utils/time.js'

interface SearchPageProps {
  apiBase?: string
  onAssetClick?: (asset: Asset) => void
  selectedAssets?: Set<string>
  onSelectedChange?: (ids: string[]) => void
}

interface Collection {
  id: string
  projectId: string
  name: string
  description?: string
  assetCount?: number
}

interface Tag {
  id: string
  name: string
  color?: string
}

export function SearchPage({ apiBase = '/api', onAssetClick, selectedAssets, onSelectedChange }: SearchPageProps) {
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

  // Batch operation state
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showCollectionDialog, setShowCollectionDialog] = useState(false)
  const [showTagDialog, setShowTagDialog] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [collections, setCollections] = useState<Collection[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())
  const [newTagName, setNewTagName] = useState('')

  // Sync selected to parent
  useEffect(() => {
    onSelectedChange?.(Array.from(selected))
  }, [selected])

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
    const newType = e.target.value as 'all' | Asset['type']
    setTypeFilter(newType)
  }

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setSelectAll(false)
      } else {
        next.add(id)
      }
      return next
    })
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

  // Batch: add to collection
  const handleAddToCollection = async () => {
    // Fetch collections list first
    const res = await fetch(`${apiBase}/collections`)
    const data = await res.json()
    setCollections(data.collections || [])
    setShowCollectionDialog(true)
  }

  const handleCreateAndAddCollection = async (collectionId: string) => {
    if (!selected.size || !collectionId) return
    await fetch(`${apiBase}/collections/${collectionId}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetIds: Array.from(selected) })
    })
    setShowCollectionDialog(false)
    clearSelection()
  }

  const handleNewCollection = async () => {
    if (!newCollectionName.trim()) return
    // Need a default project - create one if none exists
    const projectsRes = await fetch(`${apiBase}/projects`)
    let projects = (await projectsRes.json()).projects || []
    let projectId = projects[0]?.id

    if (!projectId) {
      // Create default project
      const createRes = await fetch(`${apiBase}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '默认项目' })
      })
      const created = await createRes.json()
      projectId = created.id
    }

    const res = await fetch(`${apiBase}/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, name: newCollectionName })
    })
    const collection = await res.json()

    // Add assets
    await fetch(`${apiBase}/collections/${collection.id}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetIds: Array.from(selected) })
    })

    setNewCollectionName('')
    setShowCollectionDialog(false)
    clearSelection()
  }

  // Batch: tag assets
  const handleAddTags = async () => {
    const res = await fetch(`${apiBase}/tags`)
    const data = await res.json()
    setTags(data.tags || [])
    setSelectedTagIds(new Set())
    setShowTagDialog(true)
  }

  const handleConfirmTags = async () => {
    if (!selected.size || !selectedTagIds.size) return
    await fetch(`${apiBase}/tags/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetIds: Array.from(selected), tagIds: Array.from(selectedTagIds) })
    })
    setShowTagDialog(false)
    clearSelection()
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return
    const res = await fetch(`${apiBase}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTagName })
    })
    if (res.ok) {
      setNewTagName('')
      // Refresh tags list
      const tagsRes = await fetch(`${apiBase}/tags`)
      const data = await tagsRes.json()
      setTags(data.tags || [])
    }
  }

  // Batch: export
  const handleExport = () => {
    const selectedResults = results.filter(a => selected.has(a.id))
    const exportData = selectedResults.map(a => ({
      id: a.id,
      filename: a.filename,
      path: a.path,
      type: a.type,
      size: a.size,
      createdAt: a.createdAt,
      modifiedAt: a.modifiedAt,
    }))
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `splatvault-export-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    clearSelection()
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1.5rem', fontWeight: 500 }}>搜索资产</h3>

      <form onSubmit={handleSearch}>
        {/* 主搜索行 */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="关键词..."
            style={{
              flex: 2,
              padding: '0.6rem 0.8rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '0.95rem'
            }}
          />
          <select
            value={typeFilter}
            onChange={handleTypeChange}
            style={{
              padding: '0.5rem 0.8rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '0.9rem',
              background: '#fff'
            }}
          >
            <option value="all">全部类型</option>
            <option value="image">图片</option>
            <option value="video">视频</option>
            <option value="text">文本</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.5rem 1.5rem',
              background: '#007acc',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'default' : 'pointer',
              fontWeight: 500
            }}
          >
            {loading ? '搜索中...' : '搜索'}
          </button>
        </div>

        {/* 高级筛选 */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', color: '#666' }}>路径筛选</label>
            <input
              type="text"
              value={pathFilter}
              onChange={e => setPathFilter(e.target.value)}
              placeholder="例如: /data 或 E:/"
              style={{
                width: '100%',
                padding: '0.4rem 0.6rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.85rem'
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', color: '#666' }}>开始日期</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              style={{
                width: '100%',
                padding: '0.4rem 0.6rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.85rem'
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', color: '#666' }}>结束日期</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              style={{
                width: '100%',
                padding: '0.4rem 0.6rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.85rem'
              }}
            />
          </div>
        </div>
      </form>

      {/* 批量操作工具栏 */}
      {hasSearched && results.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.5rem 0.75rem',
          marginBottom: '1rem',
          background: selected.size > 0 ? '#e3f2fd' : '#f5f5f5',
          borderRadius: '6px',
          fontSize: '0.85rem'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={selectAll && results.length > 0 && selected.size === results.length}
              onChange={toggleSelectAll}
            />
            全选
          </label>
          {selected.size > 0 && (
            <>
              <span style={{ color: '#666' }}>已选 {selected.size} 项</span>
              <button onClick={handleAddToCollection} style={batchButtonStyle}>
                加入集合
              </button>
              <button onClick={handleAddTags} style={batchButtonStyle}>
                添加标签
              </button>
              <button onClick={handleExport} style={batchButtonStyle}>
                导出
              </button>
              <button onClick={clearSelection} style={{ ...batchButtonStyle, color: '#888' }}>
                取消选择
              </button>
            </>
          )}
        </div>
      )}

      {/* 空状态 */}
      {!hasSearched && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#888' }}>
          <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>🔍</p>
          <p style={{ margin: 0 }}>输入关键词或使用筛选条件搜索资产</p>
        </div>
      )}

      {/* 搜索中 */}
      {loading && (
        <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>搜索中...</p>
      )}

      {/* 无结果 */}
      {!loading && hasSearched && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#888' }}>
          <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>😕</p>
          <p style={{ margin: 0 }}>未找到匹配结果</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>试试其他关键词或筛选条件</p>
        </div>
      )}

      {/* 搜索结果 */}
      {!loading && results.length > 0 && (
        <>
          <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1rem' }}>
            找到 {total} 个结果
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '1rem'
          }}>
            {results.map(asset => (
              <div
                key={asset.id}
                onClick={() => onAssetClick?.(asset)}
                style={{
                  border: selected.has(asset.id) ? '2px solid #007acc' : '1px solid #e5e5e5',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  background: '#fff',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s ease',
                  position: 'relative'
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
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {asset.filename}
                </p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#888' }}>
                  {asset.type === 'image' ? '图片' : asset.type === 'video' ? '视频' : '文本'} · {(asset.size / 1024).toFixed(1)}KB
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Collection dialog */}
      {showCollectionDialog && (
        <Dialog title="加入集合" onClose={() => setShowCollectionDialog(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {collections.map(c => (
              <button
                key={c.id}
                onClick={() => handleCreateAndAddCollection(c.id)}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                {c.name} {c.assetCount ? `(${c.assetCount}个资产)` : '(空)'}
              </button>
            ))}
            <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #eee', margin: '0.5rem 0' }} />
            <input
              type="text"
              value={newCollectionName}
              onChange={e => setNewCollectionName(e.target.value)}
              placeholder="新建集合名称..."
              onKeyDown={e => { if (e.key === 'Enter' && newCollectionName.trim()) handleNewCollection() }}
              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
            />
            <button
              onClick={handleNewCollection}
              style={{
                padding: '0.5rem',
                background: '#007acc',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              创建并加入
            </button>
          </div>
        </Dialog>
      )}

      {/* Tag dialog */}
      {showTagDialog && (
        <Dialog title="添加标签" onClose={() => setShowTagDialog(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {tags.map(t => (
              <label key={t.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.25rem 0',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={selectedTagIds.has(t.id)}
                  onChange={() => {
                    setSelectedTagIds(prev => {
                      const next = new Set(prev)
                      if (next.has(t.id)) next.delete(t.id)
                      else next.add(t.id)
                      return next
                    })
                  }}
                />
                <span style={{ color: t.color || '#333' }}>{t.name}</span>
              </label>
            ))}
            <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #eee', margin: '0.5rem 0' }} />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                placeholder="新建标签..."
                onKeyDown={e => { if (e.key === 'Enter' && newTagName.trim()) handleCreateTag() }}
                style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
              />
              <button onClick={handleCreateTag} style={smallButtonStyle}>
                新建
              </button>
            </div>
            <button
              onClick={handleConfirmTags}
              disabled={selectedTagIds.size === 0}
              style={{
                padding: '0.5rem',
                background: selectedTagIds.size > 0 ? '#007acc' : '#ccc',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedTagIds.size > 0 ? 'pointer' : 'default'
              }}
            >
              确认添加
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}

// Dialog component
function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }} onClick={onClose}>
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        padding: '1.5rem',
        minWidth: '300px',
        maxWidth: '400px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ margin: 0 }}>{title}</h4>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const batchButtonStyle: React.CSSProperties = {
  padding: '0.25rem 0.5rem',
  background: '#fff',
  border: '1px solid #007acc',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.8rem',
  color: '#007acc',
}

const smallButtonStyle: React.CSSProperties = {
  padding: '0.25rem 0.5rem',
  background: '#007acc',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.8rem'
}
