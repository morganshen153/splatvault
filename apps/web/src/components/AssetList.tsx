import { useState, useEffect } from 'react'
import type { Asset } from '@splatvault/shared-types'
import { BatchActions } from './BatchActions.js'

interface AssetListProps {
  apiBase?: string
  refreshKey?: number
  onAssetClick?: (asset: Asset) => void
}

export function AssetList({ apiBase = '/api', refreshKey, onAssetClick }: AssetListProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectAll, setSelectAll] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    setLoading(true)
    setError(null)
    setSelected(new Set())
    setSelectAll(false)
    fetch(`${apiBase}/assets`)
      .then(res => res.json())
      .then(data => {
        setAssets(data.assets || [])
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [apiBase, refreshKey])

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
      setSelected(new Set(assets.map(a => a.id)))
      setSelectAll(true)
    }
  }

  const clearSelection = () => {
    setSelected(new Set())
    setSelectAll(false)
  }

  if (loading) return <p style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>加载中...</p>
  if (error) return <p style={{ padding: '2rem', textAlign: 'center', color: '#d32f2f' }}>加载失败: {error}</p>
  if (assets.length === 0) return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#888' }}>
      <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>📁</p>
      <p style={{ margin: 0 }}>暂无资产</p>
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>点击"导入"添加资产</p>
    </div>
  )

  return (
    <div style={{ padding: '0 1rem 1rem' }}>
      {/* Selection header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.5rem 0.75rem', marginBottom: '0.75rem',
        background: selected.size > 0 ? '#e3f2fd' : '#f5f5f5',
        borderRadius: '6px', fontSize: '0.85rem'
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={assets.length > 0 && selected.size === assets.length} onChange={toggleSelectAll} />
          全选
        </label>
      </div>

      <BatchActions apiBase={apiBase} selected={selected} onClearSelection={clearSelection} />

      {/* Asset grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
        {assets.map(asset => (
          <div
            key={asset.id}
            onClick={() => onAssetClick?.(asset)}
            style={{
              border: selected.has(asset.id) ? '2px solid #007acc' : '1px solid #e5e5e5',
              borderRadius: '8px', padding: '0.75rem', background: '#fff',
              cursor: onAssetClick ? 'pointer' : 'default',
              transition: 'box-shadow 0.15s ease', position: 'relative'
            }}
            onMouseEnter={e => { if (onAssetClick) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)' }}
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
              <img
                src={asset.thumbnailPath}
                alt={asset.filename}
                style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '4px', background: '#f5f5f5' }}
              />
            ) : (
              <div style={{ width: '100%', height: '140px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', fontSize: '2rem', color: '#999' }}>
                {asset.type === 'image' ? '🖼️' : asset.type === 'video' ? '🎬' : '📄'}
              </div>
            )}
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 400 }}>{asset.filename}</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#888' }}>
              {asset.type === 'image' ? '图片' : asset.type === 'video' ? '视频' : '文本'} · {(asset.size / 1024).toFixed(1)}KB
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
