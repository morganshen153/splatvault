import { useState, useEffect } from 'react'
import { HealthResponse } from '@splatvault/shared-types'
import { AssetList } from './components/AssetList.js'

const API_BASE = '/api'

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'status' | 'assets'>('status')

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
      <p>local-first multimodal asset search for 3D, video, and scan teams</p>

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

      <nav style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <button onClick={() => setActiveTab('status')} style={{
          padding: '0.5rem 1rem',
          background: activeTab === 'status' ? '#007acc' : '#f0f0f0',
          color: activeTab === 'status' ? '#fff' : '#333',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          状态
        </button>
        <button onClick={() => setActiveTab('assets')} style={{
          padding: '0.5rem 1rem',
          background: activeTab === 'assets' ? '#007acc' : '#f0f0f0',
          color: activeTab === 'assets' ? '#fff' : '#333',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          资产列表
        </button>
      </nav>

      <div style={{ marginTop: '1rem' }}>
        {activeTab === 'assets' && <AssetList />}
      </div>
    </div>
  )
}

export default App
