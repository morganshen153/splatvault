import { useState, useEffect } from 'react'
import type { Asset } from '@splatvault/shared-types'

interface AssetListProps {
  apiBase?: string
  refreshKey?: number
  onAssetClick?: (asset: Asset) => void
}

export function AssetList({ apiBase = '/api', refreshKey, onAssetClick }: AssetListProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
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
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
      gap: '1rem',
      padding: '1rem'
    }}>
      {assets.map(asset => (
        <div
          key={asset.id}
          onClick={() => onAssetClick?.(asset)}
          style={{
            border: '1px solid #e5e5e5',
            borderRadius: '8px',
            padding: '0.75rem',
            background: '#fff',
            cursor: onAssetClick ? 'pointer' : 'default',
            transition: 'box-shadow 0.15s ease',
          }}
          onMouseEnter={e => { if (onAssetClick) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)' }}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
        >
          {asset.thumbnailPath ? (
            <img
              src={asset.thumbnailPath}
              alt={asset.filename}
              style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '4px', background: '#f5f5f5' }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '140px',
              background: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              fontSize: '2rem',
              color: '#999'
            }}>
              {asset.type === 'image' ? '🖼️' : asset.type === 'video' ? '🎬' : '📄'}
            </div>
          )}
          <p style={{
            margin: '0.5rem 0 0',
            fontSize: '0.85rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: 400
          }}>
            {asset.filename}
          </p>
          <p style={{
            margin: '0.25rem 0 0',
            fontSize: '0.75rem',
            color: '#888'
          }}>
            {asset.type === 'image' ? '图片' : asset.type === 'video' ? '视频' : '文本'} · {(asset.size / 1024).toFixed(1)}KB
          </p>
        </div>
      ))}
    </div>
  )
}