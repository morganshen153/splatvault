import { useState, useRef, useEffect } from 'react'

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.tiff']
const VIDEO_EXTS = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm']
const TEXT_EXTS = ['.txt', '.md', '.json', '.csv', '.xml', '.yaml', '.yml', '.log']

interface ImportStatus {
  taskId: string
  status: string
  progress: {
    found: number
    processed: number
    failed: number
    errors: string[]
  }
}

export function ImportPage({ apiBase = '/api' }: { apiBase?: string }) {
  const [rootPath, setRootPath] = useState('')
  const [selectedExts, setSelectedExts] = useState<string[]>(['.png', '.jpg', '.jpeg'])
  const [taskId, setTaskId] = useState<string | null>(null)
  const [status, setStatus] = useState<ImportStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const handleStart = async () => {
    if (!rootPath.trim()) {
      setError('请输入目录路径')
      return
    }
    setError(null)
    setLoading(true)
    setStatus(null)
    setTaskId(null)

    try {
      const res = await fetch(`${apiBase}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: rootPath.trim(), extensions: selectedExts.length > 0 ? selectedExts : undefined }),
      })
      if (!res.ok) {
        const msg = (await res.json()).error || '导入失败'
        throw new Error(msg)
      }
      const data = await res.json()
      setTaskId(data.taskId)
      setStatus({ taskId: data.taskId, status: 'scanning', progress: { found: 0, processed: 0, failed: 0, errors: [] } })

      // Start polling
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(async () => {
        const sr = await fetch(`${apiBase}/import/status/${data.taskId}`)
        const s = await sr.json()
        setStatus(s)
        if (s.status === 'completed' || s.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current)
          pollRef.current = null
        }
      }, 1000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleExt = (ext: string) => {
    setSelectedExts(prev =>
      prev.includes(ext) ? prev.filter(e => e !== ext) : [...prev, ext]
    )
  }

  const extGroups = [
    { label: '图片', exts: IMAGE_EXTS },
    { label: '视频', exts: VIDEO_EXTS },
    { label: '文本', exts: TEXT_EXTS },
  ]

  return (
    <div style={{ padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1.5rem', fontWeight: 500 }}>批量导入资产</h3>

      <div style={{ maxWidth: '600px' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>目录路径</label>
          <input
            type="text"
            value={rootPath}
            onChange={e => setRootPath(e.target.value)}
            placeholder="例如: E:/assets"
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.9rem' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>文件类型</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {extGroups.map(group => (
              <div key={group.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: '#666', minWidth: '40px' }}>{group.label}</span>
                {group.exts.map(ext => (
                  <label
                    key={ext}
                    onClick={() => toggleExt(ext)}
                    style={{
                      padding: '0.15rem 0.5rem',
                      border: '1px solid ' + (selectedExts.includes(ext) ? '#007acc' : '#ddd'),
                      borderRadius: '4px',
                      background: selectedExts.includes(ext) ? '#e3f2fd' : '#fff',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      color: selectedExts.includes(ext) ? '#007acc' : '#666',
                      userSelect: 'none'
                    }}
                  >
                    {ext}
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={loading || !rootPath.trim()}
          style={{
            padding: '0.6rem 1.5rem',
            background: loading || !rootPath.trim() ? '#ccc' : '#007acc',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: loading || !rootPath.trim() ? 'default' : 'pointer',
            fontSize: '0.95rem',
            marginBottom: '1rem'
          }}
        >
          {loading ? '扫描中...' : '开始导入'}
        </button>

        {error && (
          <p style={{ color: '#d32f2f', fontSize: '0.85rem', margin: '0 0 1rem' }}>{error}</p>
        )}

        {/* Progress */}
        {status && (
          <div style={{
            background: '#f5f5f5',
            borderRadius: '8px',
            padding: '1rem',
            border: '1px solid #e5e5e5'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 500 }}>导入进度</span>
              <span style={{ fontSize: '0.85rem', color: '#666' }}>
                {status.status === 'scanning' ? '扫描中...' :
                 status.status === 'importing' ? `导入中 (${status.progress.processed}/${status.progress.found})` :
                 status.status === 'completed' ? '已完成' : '失败'}
              </span>
            </div>
            {status.progress.found > 0 && (
              <div style={{ width: '100%', height: '8px', background: '#e0e0e0', borderRadius: '4px', marginBottom: '0.75rem', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, Math.round(status.progress.processed / status.progress.found * 100))}%`,
                  background: status.status === 'completed' ? '#4caf50' : '#007acc',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            )}
            <div style={{ fontSize: '0.8rem', color: '#666', lineHeight: 1.6 }}>
              <div>发现: {status.progress.found} 个文件</div>
              <div>已处理: {status.progress.processed}</div>
              <div>失败: {status.progress.failed}</div>
              {status.progress.errors.length > 0 && (
                <details>
                  <summary style={{ cursor: 'pointer', color: '#d32f2f' }}>查看错误 ({status.progress.errors.length})</summary>
                  <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1rem' }}>
                    {status.progress.errors.slice(0, 20).map((err, i) => (
                      <li key={i} style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{err}</li>
                    ))}
                    {status.progress.errors.length > 20 && (
                      <li style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem' }}>...还有 {status.progress.errors.length - 20} 个</li>
                    )}
                  </ul>
                </details>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
