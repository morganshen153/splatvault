import { useState, useEffect, useCallback } from 'react'

interface Collection {
  id: string
  projectId: string
  name: string
  description?: string
  assetCount?: number
}

interface Tag {
  id: string
  name: string
  color?: string
}

interface BatchActionsProps {
  apiBase: string
  selected: Set<string>
  onClearSelection: () => void
}

export function BatchActions({ apiBase, selected, onClearSelection }: BatchActionsProps) {
  const [showCollectionDialog, setShowCollectionDialog] = useState(false)
  const [showTagDialog, setShowTagDialog] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [collections, setCollections] = useState<Collection[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())
  const [newTagName, setNewTagName] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    setMessage('')
  }, [selected])

  const fetchCollections = async () => {
    const res = await fetch(`${apiBase}/collections`)
    const data = await res.json()
    setCollections(data.collections || [])
  }

  const fetchTags = async () => {
    const res = await fetch(`${apiBase}/tags`)
    const data = await res.json()
    setTags(data.tags || [])
  }

  const handleAddToCollection = async () => {
    await fetchCollections()
    setShowCollectionDialog(true)
  }

  const handleAddToExistingCollection = async (collectionId: string) => {
    if (!selected.size || !collectionId) return
    await fetch(`${apiBase}/collections/${collectionId}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetIds: Array.from(selected) })
    })
    setMessage(`已加入集合 (${selected.size} 项)`)
    setShowCollectionDialog(false)
    onClearSelection()
  }

  const handleNewCollection = async () => {
    if (!newCollectionName.trim() || !selected.size) return

    const projectsRes = await fetch(`${apiBase}/projects`)
    let projects = (await projectsRes.json()).projects || []
    let projectId = projects[0]?.id

    if (!projectId) {
      const createRes = await fetch(`${apiBase}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '默认项目' })
      })
      const created = await createRes.json()
      projectId = created.id
    }

    const res = await fetch(`${apiBase}/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, name: newCollectionName })
    })
    const collection = await res.json()

    await fetch(`${apiBase}/collections/${collection.id}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetIds: Array.from(selected) })
    })

    setMessage(`已创建集合并加入 ${selected.size} 项`)
    setNewCollectionName('')
    setShowCollectionDialog(false)
    onClearSelection()
  }

  const handleAddTags = async () => {
    await fetchTags()
    setSelectedTagIds(new Set())
    setShowTagDialog(true)
  }

  const handleConfirmTags = async () => {
    if (!selected.size || !selectedTagIds.size) return
    await fetch(`${apiBase}/tags/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetIds: Array.from(selected), tagIds: Array.from(selectedTagIds) })
    })
    setMessage(`已添加标签 (${selected.size} 项)`)
    setShowTagDialog(false)
    onClearSelection()
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return
    const res = await fetch(`${apiBase}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTagName })
    })
    if (res.ok) {
      setNewTagName('')
      fetchTags()
    }
  }

  const handleExport = async () => {
    if (!selected.size) return
    const res = await fetch(`${apiBase}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetIds: Array.from(selected), format: 'json' })
    })
    const data = await res.json()
    if (data.downloadUrl) {
      window.open(`${apiBase}${data.downloadUrl}`, '_blank')
      setMessage(`已导出 ${data.totalAssets} 项`)
    }
    onClearSelection()
  }

  if (selected.size === 0) return null

  return (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.5rem 0.75rem',
        marginBottom: '1rem',
        background: '#e3f2fd',
        borderRadius: '6px',
        fontSize: '0.85rem'
      }}>
        <span style={{ color: '#007acc', fontWeight: 500 }}>已选 {selected.size} 项</span>
        <button onClick={handleAddToCollection} style={batchButtonStyle}>加入集合</button>
        <button onClick={handleAddTags} style={batchButtonStyle}>添加标签</button>
        <button onClick={handleExport} style={batchButtonStyle}>导出</button>
        <button onClick={onClearSelection} style={{ ...batchButtonStyle, color: '#888' }}>取消选择</button>
        {message && <span style={{ color: '#4caf50', marginLeft: 'auto' }}>{message}</span>}
      </div>

      {/* Collection dialog */}
      {showCollectionDialog && (
        <Dialog title="加入集合" onClose={() => setShowCollectionDialog(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {collections.map(c => (
              <button
                key={c.id}
                onClick={() => handleAddToExistingCollection(c.id)}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                {c.name} {c.assetCount ? `(${c.assetCount} 个资产)` : '(空)'}
              </button>
            ))}
            <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #eee', margin: '0.5rem 0' }} />
            <input
              type="text"
              value={newCollectionName}
              onChange={e => setNewCollectionName(e.target.value)}
              placeholder="新建集合名称..."
              onKeyDown={e => { if (e.key === 'Enter' && newCollectionName.trim()) handleNewCollection() }}
              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
            />
            <button
              onClick={handleNewCollection}
              style={{
                padding: '0.5rem',
                background: '#007acc',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              创建并加入
            </button>
          </div>
        </Dialog>
      )}

      {/* Tag dialog */}
      {showTagDialog && (
        <Dialog title="添加标签" onClose={() => setShowTagDialog(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {tags.map(t => (
              <label key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.25rem 0', cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={selectedTagIds.has(t.id)}
                  onChange={() => {
                    setSelectedTagIds(prev => {
                      const next = new Set(prev)
                      if (next.has(t.id)) next.delete(t.id)
                      else next.add(t.id)
                      return next
                    })
                  }}
                />
                <span style={{ color: t.color || '#333' }}>{t.name}</span>
              </label>
            ))}
            <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #eee', margin: '0.5rem 0' }} />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                placeholder="新建标签..."
                onKeyDown={e => { if (e.key === 'Enter' && newTagName.trim()) handleCreateTag() }}
                style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
              />
              <button onClick={handleCreateTag} style={smallButtonStyle}>新建</button>
            </div>
            <button
              onClick={handleConfirmTags}
              disabled={selectedTagIds.size === 0}
              style={{
                padding: '0.5rem',
                background: selectedTagIds.size > 0 ? '#007acc' : '#ccc',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedTagIds.size > 0 ? 'pointer' : 'default'
              }}
            >
              确认添加
            </button>
          </div>
        </Dialog>
      )}
    </>
  )
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 2000
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '8px', padding: '1.5rem',
        minWidth: '300px', maxWidth: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ margin: 0 }}>{title}</h4>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const batchButtonStyle: React.CSSProperties = {
  padding: '0.25rem 0.5rem', background: '#fff', border: '1px solid #007acc',
  borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', color: '#007acc',
}

const smallButtonStyle: React.CSSProperties = {
  padding: '0.25rem 0.5rem', background: '#007acc', color: '#fff',
  border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem'
}
