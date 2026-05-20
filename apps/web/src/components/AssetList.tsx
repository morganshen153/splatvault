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

  if (loading) return <div>加载中...</div>
  if (error) return <div>错误: {error}</div>
  if (assets.length === 0) return <div>暂无资产</div>

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: '1rem',
      padding: '1rem'
    }}>
      {assets.map(asset => (
        <div
          key={asset.id}
          onClick={() => onAssetClick?.(asset)}
          style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '0.75rem',
            background: '#fff',
            cursor: onAssetClick ? 'pointer' : 'default'
          }}
        >
          {asset.thumbnailPath ? (
            <img
              src={asset.thumbnailPath}
              alt={asset.filename}
              style={{
                width: '100%',
                height: '150px',
                objectFit: 'cover',
                borderRadius: '4px'
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '150px',
              background: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px'
            }}>
              {asset.type === 'image' ? '🖼️' : asset.type === 'video' ? '🎬' : '📄'}
            </div>
          )}
          <p style={{
            margin: '0.5rem 0 0',
            fontSize: '0.875rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {asset.filename}
          </p>
          <p style={{
            margin: '0.25rem 0 0',
            fontSize: '0.75rem',
            color: '#666'
          }}>
            {asset.type} · {(asset.size / 1024).toFixed(1)}KB
          </p>
        </div>
      ))}
    </div>
  )
}
