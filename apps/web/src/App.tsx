import { useState, useEffect } from 'react'
import { HealthResponse, Asset } from '@splatvault/shared-types'
import { AssetList } from './components/AssetList.js'
import { ImportForm } from './components/ImportForm.js'
import { SearchPage } from './pages/SearchPage.js'
import { AssetDetail } from './components/AssetDetail.js'

const API_BASE = '/api'

type Tab = 'home' | 'search' | 'assets' | 'import'

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(() => setHealth({ status: 'error', version: 'unknown', uptime: 0, dbConnected: false }))
      .finally(() => setLoading(false))
  }, [])

  const handleImportSuccess = () => {
    setRefreshKey(k => k + 1)
    setActiveTab('assets')
  }

  const handleDelete = (id: string) => {
    setRefreshKey(k => k + 1)
  }

  const navItems: { id: Tab; label: string; icon: string }[] = [
    { id: 'home', label: '首页', icon: '🏠' },
    { id: 'search', label: '搜索', icon: '🔍' },
    { id: 'assets', label: '资产', icon: '📁' },
    { id: 'import', label: '导入', icon: '📤' },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #ddd',
        padding: '0.75rem 2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '2rem'
      }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>SplatVault</h2>
        <nav style={{ display: 'flex', gap: '0.25rem' }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                padding: '0.5rem 1rem',
                background: activeTab === item.id ? '#007acc' : 'transparent',
                color: activeTab === item.id ? '#fff' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, padding: '1rem 2rem' }}>
        {activeTab === 'home' && loading && <p>加载中...</p>}
        {activeTab === 'home' && !loading && health && (
          <div>
            <h3>欢迎使用 SplatVault</h3>
            <p>local-first multimodal asset search for 3D, video, and scan teams</p>

            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: '8px',
              background: health.status === 'ok' ? '#e8f5e9' : '#ffebee'
            }}>
              <h4 style={{ margin: '0 0 0.5rem' }}>服务状态</h4>
              <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
                状态: {health.status === 'ok' ? '正常' : '异常'}
              </p>
              <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
                数据库: {health.dbConnected ? '已连接' : '未连接'}
              </p>
              <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
                运行时间: {health.uptime}秒
              </p>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button onClick={() => setActiveTab('search')} style={{
                padding: '0.75rem 1.5rem',
                background: '#007acc',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}>
                🔍 搜索资产
              </button>
              <button onClick={() => setActiveTab('assets')} style={{
                padding: '0.75rem 1.5rem',
                background: '#f0f0f0',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}>
                📁 浏览资产
              </button>
              <button onClick={() => setActiveTab('import')} style={{
                padding: '0.75rem 1.5rem',
                background: '#f0f0f0',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}>
                📤 导入资产
              </button>
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <SearchPage
            apiBase={API_BASE}
            onAssetClick={asset => setSelectedAsset(asset)}
          />
        )}

        {activeTab === 'assets' && (
          <AssetList
            apiBase={API_BASE}
            key={refreshKey}
            onAssetClick={asset => setSelectedAsset(asset)}
          />
        )}

        {activeTab === 'import' && <ImportForm onSuccess={handleImportSuccess} />}
      </main>

      {/* Asset detail modal */}
      {selectedAsset && (
        <AssetDetail
          asset={selectedAsset}
          apiBase={API_BASE}
          onClose={() => setSelectedAsset(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

export default App
