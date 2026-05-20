import { useState, useEffect } from 'react'
import { HealthResponse } from '@splatvault/shared-types'

const API_BASE = '/api'

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(() => setHealth({ status: 'error', version: 'unknown', uptime: 0, dbConnected: false }))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>SplatVault</h1>
      <p>多模态资产检索与工作流平台</p>

      {loading && <p>检查服务状态...</p>}

      {!loading && health && (
        <div style={{
          padding: '1rem',
          borderRadius: '8px',
          background: health.status === 'ok' ? '#e8f5e9' : '#ffebee'
        }}>
          <h3>服务状态</h3>
          <p>状态: {health.status === 'ok' ? '正常' : '异常'}</p>
          <p>版本: {health.version}</p>
          <p>运行时间: {health.uptime}秒</p>
          <p>数据库: {health.dbConnected ? '已连接' : '未连接'}</p>
        </div>
      )}

      <nav style={{ marginTop: '2rem' }}>
        <a href="/search" style={{ marginRight: '1rem' }}>搜索</a>
        <a href="/import" style={{ marginRight: '1rem' }}>导入</a>
        <a href="/projects">项目</a>
      </nav>
    </div>
  )
}

export default App
