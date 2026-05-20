import type { Asset } from '@splatvault/shared-types'
import { formatDateTime } from '../utils/time.js'

interface AssetDetailProps {
  asset: Asset
  onClose: () => void
  onDelete?: (id: string) => void
  apiBase?: string
}

export function AssetDetail({ asset, onClose, onDelete, apiBase = '/api' }: AssetDetailProps) {
  const handleDelete = async () => {
    if (!onDelete) return
    if (!window.confirm(`确认删除 "${asset.filename}"？`)) return

    try {
      const res = await fetch(`${apiBase}/assets/${asset.id}`, { method: 'DELETE' })
      if (res.ok) {
        onDelete(asset.id)
        onClose()
      }
    } catch (err) {
      console.error('删除失败:', err)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '1.5rem',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>资产详情</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

        {asset.thumbnailPath ? (
          <img
            src={asset.thumbnailPath}
            alt={asset.filename}
            style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px', background: '#f0f0f0' }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '200px',
            background: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            fontSize: '3rem'
          }}>
            {asset.type === 'image' ? '🖼️' : asset.type === 'video' ? '🎬' : '📄'}
          </div>
        )}

        <div style={{ marginTop: '1rem' }}>
          <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
            <strong>文件名：</strong>{asset.filename}
          </p>
          <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
            <strong>类型：</strong>{asset.type}
          </p>
          <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
            <strong>大小：</strong>{(asset.size / 1024).toFixed(1)} KB
          </p>
          <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
            <strong>路径：</strong>{asset.path}
          </p>
          <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
            <strong>创建时间：</strong>{formatDateTime(asset.createdAt)}
          </p>
          <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
            <strong>修改时间：</strong>{formatDateTime(asset.modifiedAt)}
          </p>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          {onDelete && (
            <button onClick={handleDelete} style={{
              padding: '0.5rem 1rem',
              background: '#d32f2f',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              删除
            </button>
          )}
          <button onClick={onClose} style={{
            padding: '0.5rem 1rem',
            background: '#f0f0f0',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}