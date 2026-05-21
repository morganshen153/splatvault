import { useState, useEffect, useCallback } from 'react'
import type { Asset } from '@splatvault/shared-types'

interface Project {
  id: string
  name: string
  description?: string
  rootPath?: string
  createdAt: number
}

interface Collection {
  id: string
  projectId: string
  name: string
  description?: string
  assetCount?: number
}

interface WorkspacePageProps {
  apiBase?: string
  onAssetClick?: (asset: Asset) => void
}

export function WorkspacePage({ apiBase = '/api', onAssetClick }: WorkspacePageProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [activeCollection, setActiveCollection] = useState<Collection | null>(null)
  const [collectionAssets, setCollectionAssets] = useState<Asset[]>([])
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [newName, setNewName] = useState('')
  const [showNewProject, setShowNewProject] = useState(false)
  const [showNewCollection, setShowNewCollection] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/projects`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setProjects(data.projects || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载项目列表失败')
    }
  }, [apiBase])

  const loadCollections = useCallback(async (projectId?: string) => {
    try {
      const url = projectId ? `${apiBase}/collections?projectId=${projectId}` : `${apiBase}/collections`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setCollections(data.collections || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载集合列表失败')
    }
  }, [apiBase])

  useEffect(() => { loadProjects(); loadCollections() }, [loadProjects, loadCollections])

  const loadCollectionAssets = useCallback(async (collectionId: string) => {
    try {
      const res = await fetch(`${apiBase}/collections/${collectionId}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setCollectionAssets(data.assets || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载集合资产失败')
    }
  }, [apiBase])

  useEffect(() => {
    if (activeCollection) loadCollectionAssets(activeCollection.id)
    else setCollectionAssets([])
  }, [activeCollection, loadCollectionAssets])

  // Project CRUD
  const createProject = async () => {
    if (!newName.trim()) return
    setError(null)
    try {
      const res = await fetch(`${apiBase}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setNewName('')
      setShowNewProject(false)
      loadProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建项目失败')
    }
  }

  const updateProject = async () => {
    if (!editingProject || !newName.trim()) return
    setError(null)
    try {
      const res = await fetch(`${apiBase}/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setEditingProject(null)
      setNewName('')
      loadProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : '重命名项目失败')
    }
  }

  const deleteProject = async (id: string) => {
    if (!confirm('确认删除此项目？项目、以及项目下的所有集合都将被永久删除（集合中的资产关联记录也会被移除），但资产本身不会被删除。')) return
    setError(null)
    try {
      const res = await fetch(`${apiBase}/projects/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (activeProject?.id === id) { setActiveProject(null); setActiveCollection(null) }
      loadProjects()
      loadCollections()
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除项目失败')
    }
  }

  // Collection CRUD
  const createCollection = async () => {
    if (!newName.trim() || !activeProject) return
    setError(null)
    try {
      const res = await fetch(`${apiBase}/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: activeProject.id, name: newName.trim() })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setNewName('')
      setShowNewCollection(false)
      loadCollections(activeProject.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建集合失败')
    }
  }

  const updateCollection = async () => {
    if (!editingCollection || !newName.trim()) return
    setError(null)
    try {
      const res = await fetch(`${apiBase}/collections/${editingCollection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setEditingCollection(null)
      setNewName('')
      loadCollections(activeProject?.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : '重命名集合失败')
    }
  }

  const deleteCollection = async (id: string) => {
    if (!confirm('确认删除此集合？集合中的资产不会被删除。')) return
    setError(null)
    try {
      const res = await fetch(`${apiBase}/collections/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (activeCollection?.id === id) setActiveCollection(null)
      loadCollections(activeProject?.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除集合失败')
    }
  }

  const removeAsset = async (assetId: string) => {
    if (!activeCollection) return
    setError(null)
    try {
      const res = await fetch(`${apiBase}/collections/${activeCollection.id}/assets/${assetId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      loadCollectionAssets(activeCollection.id)
      loadCollections(activeProject?.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : '移除资产失败')
    }
  }

  const selectProject = (p: Project | null) => {
    setActiveProject(p)
    setActiveCollection(null)
    loadCollections(p?.id)
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1.5rem', fontWeight: 500 }}>工作台</h3>
      {error && (
        <div style={{ padding: '0.5rem 0.75rem', background: '#fff0f0', border: '1px solid #d32f2f', borderRadius: '6px', color: '#d32f2f', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#d32f2f', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>×</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1.5rem' }}>
        {/* Left: Projects + Collections */}
        <div style={{ width: '280px', flexShrink: 0 }}>
          {/* Projects section */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#333' }}>项目</h4>
              <button onClick={() => { setShowNewProject(true); setNewName('') }} style={iconButtonStyle}>+</button>
            </div>

            {showNewProject && (
              <form onSubmit={e => { e.preventDefault(); createProject() }} style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem' }}>
                <input
                  type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="项目名称" autoFocus
                  style={{ flex: 1, padding: '0.3rem 0.5rem', border: '1px solid #007acc', borderRadius: '4px', fontSize: '0.8rem' }}
                />
                <button type="submit" style={primaryButtonStyle}>创建</button>
                <button onClick={() => setShowNewProject(false)} style={iconButtonStyle}>×</button>
              </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {projects.map(p => (
                <div key={p.id}>
                  <div
                    onClick={() => selectProject(p)}
                    style={{
                      padding: '0.4rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem',
                      background: activeProject?.id === p.id ? '#e3f2fd' : 'transparent',
                      color: activeProject?.id === p.id ? '#007acc' : '#333',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <span style={{ display: 'flex', gap: '2px' }}>
                      <button onClick={e => { e.stopPropagation(); setEditingProject(p); setNewName(p.name) }} style={iconButtonStyle}>✎</button>
                      <button onClick={e => { e.stopPropagation(); deleteProject(p.id) }} style={{ ...iconButtonStyle, color: '#d32f2f' }}>×</button>
                    </span>
                  </div>
                  {editingProject?.id === p.id && (
                    <form onSubmit={e => { e.preventDefault(); updateProject() }} style={{ padding: '0.25rem 0.5rem', display: 'flex', gap: '0.25rem' }}>
                      <input type="text" value={newName} onChange={e => setNewName(e.target.value)} autoFocus style={{ flex: 1, padding: '0.2rem 0.4rem', border: '1px solid #007acc', borderRadius: '4px', fontSize: '0.8rem' }} />
                      <button type="submit" style={primaryButtonStyle}>保存</button>
                      <button onClick={() => setEditingProject(null)} style={iconButtonStyle}>×</button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Collections section */}
          {activeProject && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#333' }}>集合 - {activeProject.name}</h4>
                <button onClick={() => { setShowNewCollection(true); setNewName('') }} style={iconButtonStyle}>+</button>
              </div>

              {showNewCollection && (
                <form onSubmit={e => { e.preventDefault(); createCollection() }} style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem' }}>
                  <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="集合名称" autoFocus style={{ flex: 1, padding: '0.3rem 0.5rem', border: '1px solid #007acc', borderRadius: '4px', fontSize: '0.8rem' }} />
                  <button type="submit" style={primaryButtonStyle}>创建</button>
                  <button onClick={() => setShowNewCollection(false)} style={iconButtonStyle}>×</button>
                </form>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {collections.map(c => (
                  <div key={c.id}>
                    <div
                      onClick={() => setActiveCollection(c)}
                      style={{
                        padding: '0.4rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem',
                        background: activeCollection?.id === c.id ? '#e3f2fd' : 'transparent',
                        color: activeCollection?.id === c.id ? '#007acc' : '#333',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.name} <span style={{ color: '#999', fontSize: '0.75rem' }}>({c.assetCount ?? 0})</span>
                      </span>
                      <span style={{ display: 'flex', gap: '2px' }}>
                        <button onClick={e => { e.stopPropagation(); setEditingCollection(c); setNewName(c.name) }} style={iconButtonStyle}>✎</button>
                        <button onClick={e => { e.stopPropagation(); deleteCollection(c.id) }} style={{ ...iconButtonStyle, color: '#d32f2f' }}>×</button>
                      </span>
                    </div>
                    {editingCollection?.id === c.id && (
                      <form onSubmit={e => { e.preventDefault(); updateCollection() }} style={{ padding: '0.25rem 0.5rem', display: 'flex', gap: '0.25rem' }}>
                        <input type="text" value={newName} onChange={e => setNewName(e.target.value)} autoFocus style={{ flex: 1, padding: '0.2rem 0.4rem', border: '1px solid #007acc', borderRadius: '4px', fontSize: '0.8rem' }} />
                        <button type="submit" style={primaryButtonStyle}>保存</button>
                        <button onClick={() => setEditingCollection(null)} style={iconButtonStyle}>×</button>
                      </form>
                    )}
                  </div>
                ))}
                {collections.length === 0 && <p style={{ fontSize: '0.8rem', color: '#999', padding: '0.5rem' }}>暂无集合</p>}
              </div>
            </div>
          )}
        </div>

        {/* Right: Collection asset list */}
        <div style={{ flex: 1 }}>
          {activeCollection ? (
            <div>
              <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 500 }}>
                {activeCollection.name} - 资产列表
              </h4>
              {collectionAssets.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#999', padding: '2rem', textAlign: 'center' }}>该集合中暂无资产</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                  {collectionAssets.map((asset: Asset) => (
                    <div key={asset.id} style={{
                      border: '1px solid #e5e5e5', borderRadius: '8px', padding: '0.75rem',
                      background: '#fff', cursor: 'pointer', position: 'relative'
                    }} onClick={() => onAssetClick?.(asset)}>
                      {asset.thumbnailPath ? (
                        <img src={asset.thumbnailPath} alt={asset.filename} style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '4px' }} />
                      ) : (
                        <div style={{ width: '100%', height: '140px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', fontSize: '2rem', color: '#999' }}>
                          {asset.type === 'image' ? '🖼️' : asset.type === 'video' ? '🎬' : '📄'}
                        </div>
                      )}
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.filename}</p>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#888' }}>
                        {asset.type === 'image' ? '图片' : asset.type === 'video' ? '视频' : '文本'} · {(asset.size / 1024).toFixed(1)}KB
                      </p>
                      <button
                        onClick={e => { e.stopPropagation(); removeAsset(asset.id) }}
                        style={{
                          position: 'absolute', top: '0.5rem', right: '0.5rem', zIndex: 1,
                          background: 'rgba(211,47,47,0.9)', color: '#fff', border: 'none',
                          borderRadius: '4px', padding: '0.15rem 0.25rem', fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        移除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#999' }}>
              <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>📋</p>
              <p style={{ margin: 0 }}>选择一个项目和集合查看资产</p>
              <p style={{ fontSize: '0.85rem', margin: '0.5rem 0 0' }}>或从搜索/资产页选中资产后加入集合</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const iconButtonStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem',
  padding: '0 0.25rem', color: '#666', lineHeight: 1
}

const primaryButtonStyle: React.CSSProperties = {
  padding: '0.2rem 0.4rem', background: '#007acc', color: '#fff',
  border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', lineHeight: 1
}
