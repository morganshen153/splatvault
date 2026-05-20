import { useState } from 'react'

interface ImportFormProps {
  apiBase?: string
  onSuccess?: () => void
}

export function ImportForm({ apiBase = '/api', onSuccess }: ImportFormProps) {
  const [path, setPath] = useState('')
  const [type, setType] = useState<'image' | 'video' | 'text'>('image')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!path.trim()) {
      setError('请输入文件路径')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`${apiBase}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: path.trim(), type })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '导入失败')
      }

      setSuccess(`导入成功: ${data.filename}`)
      setPath('')
      onSuccess?.()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{
      padding: '1rem',
      border: '1px solid #ddd',
      borderRadius: '8px',
      background: '#fafafa'
    }}>
      <h3 style={{ margin: '0 0 1rem' }}>导入资产</h3>

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
          文件路径
        </label>
        <input
          type="text"
          value={path}
          onChange={e => setPath(e.target.value)}
          placeholder="例如: E:/path/to/image.png"
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}
        />
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
          资产类型
        </label>
        <select
          value={type}
          onChange={e => setType(e.target.value as 'image' | 'video' | 'text')}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}
        >
          <option value="image">图片</option>
          <option value="video">视频</option>
          <option value="text">文本</option>
        </select>
      </div>

      {error && (
        <p style={{ color: '#d32f2f', margin: '0.5rem 0', fontSize: '0.85rem' }}>
          {error}
        </p>
      )}

      {success && (
        <p style={{ color: '#388e3c', margin: '0.5rem 0', fontSize: '0.85rem' }}>
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '0.5rem 1rem',
          background: loading ? '#ccc' : '#007acc',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'default' : 'pointer',
          fontSize: '0.9rem'
        }}
      >
        {loading ? '导入中...' : '导入'}
      </button>
    </form>
  )
}