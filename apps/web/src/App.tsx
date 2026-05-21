import { useState, useEffect } from 'react'
import { HealthResponse, Asset } from '@splatvault/shared-types'
import { AssetList } from './components/AssetList.js'
import { ImportForm } from './components/ImportForm.js'
import { SearchPage } from './pages/SearchPage.js'
import { ImportPage } from './pages/ImportPage.js'
import { AssetDetail } from './components/AssetDetail.js'

const API_BASE = '/api'

type Tab = 'home' | 'search' | 'assets' | 'import' | 'batch-import'

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [totalAssets, setTotalAssets] = useState(0)

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(() => setHealth({ status: 'error', version: 'unknown', uptime: 0, dbConnected: false }))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/assets`)
      .then(res => res.json())
      .then(data => setTotalAssets(data.total ?? 0))
      .catch(() => {})
  }, [refreshKey])

  const handleImportSuccess = () => {
    setRefreshKey(k => k + 1)
    setActiveTab('assets')
  }

  const handleDelete = () => {
    setRefreshKey(k => k + 1)
    setSelectedAsset(null)
  }

  const navItems: { id: Tab; label: string }[] = [
    { id: 'home', label: '首页' },
    { id: 'search', label: '搜索' },
    { id: 'assets', label: '资产' },
    { id: 'import', label: '导入' },
    { id: 'batch-import', label: '批量导入' },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#333' }}>
      {/* Top bar */}
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #e5e5e5',
        padding: '0 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '56px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>SplatVault</h1>
          <nav style={{ display: 'flex', gap: '0.5rem' }}>
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  padding: '0.4rem 0.8rem',
                  background: activeTab === item.id ? '#f0f0f0' : 'transparent',
                  color: activeTab === item.id ? '#007acc' : '#666',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: activeTab === item.id ? 500 : 400,
                  transition: 'all 0.15s ease'
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        {health && (
          <span style={{ fontSize: '0.8rem', color: health.status === 'ok' ? '#4caf50' : '#d32f2f' }}>
            {health.dbConnected ? '● 已连接' : '● 未连接'}
          </span>
        )}
      </header>

      {/* Main content */}
      <main style={{ flex: 1, padding: '1.5rem 2rem', background: '#fafafa' }}>
        {activeTab === 'home' && loading && <p>加载中...</p>}
        {activeTab === 'home' && !loading && health && (
          <div>
            <h2 style={{ margin: '0 0 0.5rem', fontWeight: 500 }}>欢迎使用 SplatVault</h2>
            <p style={{ color: '#666', margin: '0 0 2rem' }}>
              local-first multimodal asset search for 3D, video, and scan teams
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{
                background: '#fff',
                borderRadius: '8px',
                padding: '1.25rem',
                border: '1px solid #e5e5e5'
              }}>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 300 }}>{totalAssets}</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#666' }}>资产总数</p>
              </div>
              <div style={{
                background: '#fff',
                borderRadius: '8px',
                padding: '1.25rem',
                border: '1px solid #e5e5e5'
              }}>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 300 }}>{health.uptime}s</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#666' }}>运行时间</p>
              </div>
              <div style={{
                background: '#fff',
                borderRadius: '8px',
                padding: '1.25rem',
                border: '1px solid #e5e5e5'
              }}>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 300 }}>{health.status === 'ok' ? '✓' : '✗'}</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#666' }}>服务状态</p>
              </div>
            </div>

            <h3 style={{ margin: '0 0 1rem', fontWeight: 400, fontSize: '1rem' }}>快速开始</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setActiveTab('search')} style={{
                padding: '0.75rem 1.5rem',
                background: '#007acc',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.95rem'
              }}>
                搜索资产
              </button>
              <button onClick={() => setActiveTab('assets')} style={{
                padding: '0.75rem 1.5rem',
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.95rem'
              }}>
                浏览资产
              </button>
              <button onClick={() => setActiveTab('import')} style={{
                padding: '0.75rem 1.5rem',
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.95rem'
              }}>
                导入资产
              </button>
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
            <SearchPage apiBase={API_BASE} onAssetClick={asset => setSelectedAsset(asset)} />
          </div>
        )}

        {activeTab === 'assets' && (
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e5e5', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontWeight: 400 }}>全部资产</h3>
              <span style={{ fontSize: '0.85rem', color: '#666' }}>共 {totalAssets} 个</span>
            </div>
            <AssetList apiBase={API_BASE} key={refreshKey} onAssetClick={asset => setSelectedAsset(asset)} />
          </div>
        )}

        {activeTab === 'import' && (
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e5e5', padding: '1.5rem' }}>
            <ImportForm onSuccess={handleImportSuccess} />
          </div>
        )}

        {activeTab === 'batch-import' && (
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
            <ImportPage apiBase={API_BASE} />
          </div>
        )}
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
