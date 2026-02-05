import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  useEdgesState,
  useNodesState
} from 'reactflow'
import 'reactflow/dist/style.css'

const defaultViewport = { x: 0, y: 0, zoom: 1 }

const KIND_CONFIG = {
  rack: { label: 'Rack', color: '#0ea5e9' },
  switch: { label: 'Switch', color: '#f59e0b' },
  server: { label: 'Server', color: '#10b981' },
  asic: { label: 'ASIC', color: '#7c3aed' },
  patch: { label: 'Patch Panel', color: '#0f766e' }
}

const DEFAULT_TIER = {
  switch: 3,
  rack: 2,
  server: 1,
  asic: 1,
  patch: 2
}

const RackIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <line x1="8" y1="8" x2="16" y2="8" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="8" y1="16" x2="16" y2="16" />
  </svg>
)

const SwitchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="8" width="18" height="8" rx="2" />
    <circle cx="8" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="16" cy="12" r="1.5" />
  </svg>
)

const AsicIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="7" y="7" width="10" height="10" rx="2" />
    <line x1="3" y1="9" x2="7" y2="9" />
    <line x1="3" y1="12" x2="7" y2="12" />
    <line x1="3" y1="15" x2="7" y2="15" />
    <line x1="17" y1="9" x2="21" y2="9" />
    <line x1="17" y1="12" x2="21" y2="12" />
    <line x1="17" y1="15" x2="21" y2="15" />
  </svg>
)

const PatchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <circle cx="7" cy="10" r="1.2" />
    <circle cx="11" cy="10" r="1.2" />
    <circle cx="15" cy="10" r="1.2" />
    <circle cx="7" cy="14" r="1.2" />
    <circle cx="11" cy="14" r="1.2" />
    <circle cx="15" cy="14" r="1.2" />
  </svg>
)

const ServerIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="4" width="16" height="6" rx="2" />
    <rect x="4" y="14" width="16" height="6" rx="2" />
    <circle cx="8" cy="7" r="1.2" />
    <circle cx="8" cy="17" r="1.2" />
  </svg>
)

const ICONS = {
  rack: RackIcon,
  switch: SwitchIcon,
  server: ServerIcon,
  asic: AsicIcon,
  patch: PatchIcon
}

const CustomNode = memo(({ data }) => {
  const config = KIND_CONFIG[data.kind] || KIND_CONFIG.rack
  const Icon = ICONS[data.kind] || RackIcon
  const split = data.kind === 'patch' ? data.splitCount || 2 : null

  return (
    <div className="custom-node" style={{ borderColor: config.color }}>
      <Handle id="left" type="target" position={Position.Left} />
      <Handle id="right" type="source" position={Position.Right} />
      <Handle id="top" type="source" position={Position.Top} />
      <Handle id="bottom" type="target" position={Position.Bottom} />
      <div className="node-icon" style={{ color: config.color }}>
        <Icon />
      </div>
      <div className="node-body">
        <div className="node-title">{data.label}</div>
        <div className="node-kind">{config.label}</div>
      </div>
      {split && <div className="node-badge">1→{split}</div>}
    </div>
  )
})

export default function App() {
  const [topologies, setTopologies] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [name, setName] = useState('Default')
  const [topoType, setTopoType] = useState('custom')
  const [topoParams, setTopoParams] = useState({})
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('idle')
  const [lastSaved, setLastSaved] = useState(null)
  const [activeTab, setActiveTab] = useState('topology')
  const statusTimerRef = useRef(null)
  const historyRef = useRef({ past: [], future: [] })
  const suppressHistoryRef = useRef(false)

  const selectedType = selected?.type
  const selectedId = selected?.id

  const hasSelection = Boolean(selectedType && selectedId)
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), [])

  const handleSelectionChange = useCallback((items) => {
    let nextSelection = null
    if (items.nodes?.length) {
      nextSelection = { type: 'node', id: items.nodes[0].id }
    } else if (items.edges?.length) {
      nextSelection = { type: 'edge', id: items.edges[0].id }
    }
    setSelected((prev) => {
      if (prev?.type === nextSelection?.type && prev?.id === nextSelection?.id) {
        return prev
      }
      return nextSelection
    })
  }, [])


  const computeLayoutNodes = useCallback((inputNodes, inputEdges, typeValue, paramsValue) => {
    const topoTypeValue = typeValue || topoType
    const topoParamsValue = paramsValue || topoParams
    if (topoTypeValue === 'torus-2d' || topoTypeValue === 'mesh') {
      const rows = topoParamsValue.rows || 3
      const cols = topoParamsValue.cols || 3
      const spacingX = topoParamsValue.nodeSpacingX || 180
      const spacingY = topoParamsValue.layerGap || 140
      return inputNodes.map((node) => {
        const match = node.id.match(/^n-(\d+)-(\d+)$/)
        const r = match ? Number(match[1]) : 0
        const c = match ? Number(match[2]) : 0
        return {
          ...node,
          position: { x: 140 + c * spacingX, y: 120 + r * spacingY }
        }
      })
    }
    if (topoTypeValue === 'torus-3d') {
      const xCount = topoParamsValue.x || 3
      const yCount = topoParamsValue.y || 3
      const zCount = topoParamsValue.z || 3
      const spacingX = topoParamsValue.nodeSpacingX || 160
      const spacingY = topoParamsValue.layerGap || 120
      const layerGap = topoParamsValue.layerGap3d || 260
      return inputNodes.map((node) => {
        const match = node.id.match(/^n-(\d+)-(\d+)-(\d+)$/)
        const i = match ? Number(match[1]) : 0
        const j = match ? Number(match[2]) : 0
        const k = match ? Number(match[3]) : 0
        const layerX = (k % zCount) * layerGap
        return {
          ...node,
          position: { x: 140 + layerX + i * spacingX, y: 120 + j * spacingY }
        }
      })
    }
    if (topoTypeValue === 'dragonfly') {
      const groups = topoParamsValue.groups || 3
      const routersPerGroup = topoParamsValue.routers_per_group || 4
      const groupCols = Math.ceil(Math.sqrt(groups))
      const groupSpacingX = topoParamsValue.groupGapX || 320
      const groupSpacingY = topoParamsValue.layerGap || 260
      const nodeSpacingX = topoParamsValue.nodeSpacingX || 120
      const nodeSpacingY = topoParamsValue.nodeSpacingY || 90
      return inputNodes.map((node) => {
        const match = node.id.match(/^g(\d+)-r(\d+)$/)
        const g = match ? Number(match[1]) - 1 : 0
        const r = match ? Number(match[2]) - 1 : 0
        const groupRow = Math.floor(g / groupCols)
        const groupCol = g % groupCols
        const localCol = r % Math.ceil(Math.sqrt(routersPerGroup))
        const localRow = Math.floor(r / Math.ceil(Math.sqrt(routersPerGroup)))
        return {
          ...node,
          position: {
            x: 140 + groupCol * groupSpacingX + localCol * nodeSpacingX,
            y: 120 + groupRow * groupSpacingY + localRow * nodeSpacingY
          }
        }
      })
    }

    const tierOf = (node) =>
      node.data?.tier ?? DEFAULT_TIER[node.data?.kind] ?? DEFAULT_TIER.server
    const edgesBySource = inputEdges.reduce((acc, edge) => {
      if (!acc[edge.source]) acc[edge.source] = []
      acc[edge.source].push(edge.target)
      return acc
    }, {})
    const edgesByTarget = inputEdges.reduce((acc, edge) => {
      if (!acc[edge.target]) acc[edge.target] = []
      acc[edge.target].push(edge.source)
      return acc
    }, {})

    const scoreNode = (node) => {
      const tier = tierOf(node)
      if (tier >= 3) return 1000
      if (tier === 2) {
        const targets = edgesBySource[node.id] || []
        return targets.length * 10
      }
      const sources = edgesByTarget[node.id] || []
      return sources.length
    }

    const tiers = Array.from(new Set(inputNodes.map((node) => tierOf(node)))).sort(
      (a, b) => b - a
    )
    const maxInTier = Math.max(
      1,
      ...tiers.map((tier) => inputNodes.filter((n) => tierOf(n) === tier).length)
    )
    const layerGap = topoParamsValue.layerGap || 220
    const nodeSpacingX = topoParamsValue.nodeSpacingX || 220
    return inputNodes.map((node) => {
      const tier = tierOf(node)
      const tierIndex = tiers.indexOf(tier)
      const group = inputNodes.filter((n) => tierOf(n) === tier)
      const ordered = [...group].sort((a, b) => {
        const scoreDiff = scoreNode(b) - scoreNode(a)
        if (scoreDiff !== 0) return scoreDiff
        return String(a.data?.label || a.id).localeCompare(String(b.data?.label || b.id))
      })
      const rowIndex = ordered.findIndex((n) => n.id === node.id)
      const offset = (maxInTier - group.length) / 2
      const x = 140 + Math.max(0, rowIndex + offset) * nodeSpacingX
      const y = 120 + tierIndex * layerGap
      return {
        ...node,
        position: { x, y }
      }
    })
  }, [])

  const autoLayout = useCallback(() => {
    setNodes(computeLayoutNodes(nodes, edges, topoType, topoParams))
  }, [computeLayoutNodes, edges, nodes, setNodes, topoParams, topoType])

  const normalizeEdges = useCallback((inputEdges, topoTypeValue) => {
    if (topoTypeValue && topoTypeValue !== 'custom') {
      return inputEdges.map((edge) => ({
        ...edge,
        sourceHandle: edge.sourceHandle || 'top',
        targetHandle: edge.targetHandle || 'bottom'
      }))
    }
    return inputEdges
  }, [])

  const loadTopology = useCallback(
    async (id) => {
      if (!id) return
      setStatus('loading')
      try {
        const res = await fetch(`/api/topologies/${id}`)
        const data = await res.json()
        setName(data.name || 'Default')
        setTopoType(data.topo_type || 'custom')
        setTopoParams(data.topo_params || {})
        const nextNodes = data.nodes || []
        const nextEdges = normalizeEdges(data.edges || [], data.topo_type)
        if (data.topo_type && data.topo_type !== 'custom') {
          setNodes(computeLayoutNodes(nextNodes, nextEdges, data.topo_type, data.topo_params))
        } else {
          setNodes(nextNodes)
        }
        setEdges(nextEdges)
        setSelected(null)
        setStatus('ready')
        setLastSaved(new Date())
        historyRef.current = { past: [], future: [] }
      } catch (err) {
        console.error(err)
        setStatus('error')
      }
    },
    [computeLayoutNodes, normalizeEdges, setEdges, setNodes]
  )

  const loadTopologies = useCallback(async () => {
    setStatus('loading')
    try {
      const res = await fetch('/api/topologies')
      if (!res.ok) {
        throw new Error(`Failed to load topologies: ${res.status}`)
      }
      const data = await res.json()
      if (!Array.isArray(data)) {
        throw new Error('Invalid topology list payload')
      }
      setTopologies(data)
      const nextId = data?.[0]?.id
      if (nextId) {
        setActiveId(nextId)
        await loadTopology(nextId)
      } else {
        setStatus('ready')
      }
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }, [loadTopology])

  useEffect(() => {
    loadTopologies()
  }, [loadTopologies])

  const saveTopology = useCallback(async () => {
    if (!activeId) return
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current)
      statusTimerRef.current = null
    }
    setStatus('saving')
    try {
      const res = await fetch(`/api/topologies/${activeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          topo_type: topoType,
          topo_params: topoParams,
          nodes,
          edges
        })
      })
      if (!res.ok) throw new Error('Save failed')
      const savedAt = new Date()
      statusTimerRef.current = setTimeout(() => {
        setStatus('ready')
        setLastSaved(savedAt)
        statusTimerRef.current = null
      }, 1200)
      setTopologies((items) =>
        items.map((item) => (item.id === activeId ? { ...item, name } : item))
      )
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }, [activeId, name, topoParams, topoType, nodes, edges])

  useEffect(() => {
    if (status === 'loading') return
    const handle = setTimeout(() => {
      saveTopology()
    }, 800)
    return () => clearTimeout(handle)
  }, [name, nodes, edges, saveTopology, status])

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, label: 'link' }, eds)),
    [setEdges]
  )

  const addNode = (kind = 'rack') => {
    const id = `node-${Date.now()}`
    const config = KIND_CONFIG[kind] || KIND_CONFIG.rack
    const next = {
      id,
      type: 'custom',
      position: { x: 100 + nodes.length * 40, y: 100 + nodes.length * 30 },
      data: {
        label: `${config.label} ${nodes.length + 1}`,
        kind,
        splitCount: kind === 'patch' ? 8 : undefined
      }
    }
    setNodes((nds) => nds.concat(next))
  }

  const refreshTopologies = useCallback(async () => {
    try {
      const res = await fetch('/api/topologies')
      const data = await res.json()
      setTopologies(data)
    } catch (err) {
      console.error(err)
    }
  }, [])

  const createTopology = async () => {
    const nextName = window.prompt('Topology name', 'Untitled')
    if (!nextName) return
    setStatus('loading')
    try {
      const res = await fetch('/api/topologies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nextName,
          topo_type: 'custom',
          topo_params: {},
          nodes: [],
          edges: []
        })
      })
      if (!res.ok) throw new Error('Create failed')
      const data = await res.json()
      await refreshTopologies()
      setActiveId(data.id)
      await loadTopology(data.id)
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  const deleteTopology = async () => {
    if (!activeId) return
    const ok = window.confirm('Delete this topology?')
    if (!ok) return
    setStatus('loading')
    try {
      const res = await fetch(`/api/topologies/${activeId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      const resList = await fetch('/api/topologies')
      const data = await resList.json()
      setTopologies(data)
      const nextId = data?.[0]?.id
      setActiveId(nextId || null)
      if (nextId) {
        await loadTopology(nextId)
      } else {
        setName('Untitled')
        setNodes([])
        setEdges([])
        setSelected(null)
        setStatus('ready')
      }
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  const selectTopology = async (id) => {
    if (!id || id === activeId) return
    setActiveId(id)
    await loadTopology(id)
  }

  const loadFromJson = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.nodes || !data.edges) {
        throw new Error('Invalid JSON: missing nodes/edges')
      }
      const nextType = data.topo_type || 'custom'
      const nextParams = data.topo_params || {}
      setTopoType(nextType)
      setTopoParams(nextParams)
      setName(data.name || name)
      const nextEdges = normalizeEdges(data.edges, nextType)
      setNodes(
        nextType !== 'custom'
          ? computeLayoutNodes(data.nodes, nextEdges, nextType, nextParams)
          : data.nodes
      )
      setEdges(nextEdges)
      setStatus('ready')
      setLastSaved(new Date())
    } catch (err) {
      console.error(err)
      setStatus('error')
      window.alert('Failed to load JSON. Check console for details.')
    } finally {
      event.target.value = ''
    }
  }

  const generateTopology = async () => {
    if (!activeId) return
    setStatus('loading')
    try {
      const res = await fetch(`/api/topologies/${activeId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topo_type: topoType, params: topoParams, name })
      })
      if (!res.ok) throw new Error('Generate failed')
      const data = await res.json()
      setName(data.name || 'Default')
      setTopoType(data.topo_type || 'custom')
      setTopoParams(data.topo_params || {})
      const nextNodes = data.nodes || []
      const nextEdges = normalizeEdges(data.edges || [], data.topo_type)
      setNodes(computeLayoutNodes(nextNodes, nextEdges, data.topo_type, data.topo_params))
      setEdges(nextEdges)
      setStatus('ready')
      setLastSaved(new Date())
      historyRef.current = { past: [], future: [] }
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  const updateParam = (key, value) => {
    setTopoParams((prev) => ({ ...prev, [key]: value }))
  }

  const makeSnapshot = useCallback(() => {
    return {
      name,
      topoType,
      topoParams,
      nodes,
      edges
    }
  }, [edges, name, nodes, topoParams, topoType])

  const applySnapshot = useCallback((snapshot) => {
    suppressHistoryRef.current = true
    setName(snapshot.name)
    setTopoType(snapshot.topoType)
    setTopoParams(snapshot.topoParams)
    setNodes(snapshot.nodes)
    setEdges(snapshot.edges)
    setTimeout(() => {
      suppressHistoryRef.current = false
    }, 0)
  }, [setEdges, setNodes])

  const pushHistory = useCallback(() => {
    if (suppressHistoryRef.current) return
    const snapshot = makeSnapshot()
    const past = historyRef.current.past
    const last = past[past.length - 1]
    const same =
      last &&
      JSON.stringify(last.nodes) === JSON.stringify(snapshot.nodes) &&
      JSON.stringify(last.edges) === JSON.stringify(snapshot.edges) &&
      last.name === snapshot.name &&
      last.topoType === snapshot.topoType &&
      JSON.stringify(last.topoParams) === JSON.stringify(snapshot.topoParams)
    if (same) return
    past.push(snapshot)
    if (past.length > 50) past.shift()
    historyRef.current.future = []
  }, [makeSnapshot])

  const undo = useCallback(() => {
    const past = historyRef.current.past
    if (past.length < 2) return
    const current = past.pop()
    if (current) historyRef.current.future.push(current)
    const prev = past[past.length - 1]
    if (prev) applySnapshot(prev)
  }, [applySnapshot])

  const redo = useCallback(() => {
    const future = historyRef.current.future
    if (future.length === 0) return
    const next = future.pop()
    if (!next) return
    historyRef.current.past.push(next)
    applySnapshot(next)
  }, [applySnapshot])

  const renderKindSelect = (value, onChange) => (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="switch">Switch</option>
      <option value="rack">Rack</option>
      <option value="server">Server</option>
      <option value="asic">ASIC</option>
      <option value="patch">Patch Panel</option>
    </select>
  )

  const removeSelection = () => {
    if (!hasSelection) return
    if (selectedType === 'node') {
      setNodes((nds) => nds.filter((n) => n.id !== selectedId))
      setEdges((eds) => eds.filter((e) => e.source !== selectedId && e.target !== selectedId))
    }
    if (selectedType === 'edge') {
      setEdges((eds) => eds.filter((e) => e.id !== selectedId))
    }
    setSelected(null)
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      pushHistory()
    }, 250)
    return () => clearTimeout(handle)
  }, [edges, name, nodes, topoParams, topoType, pushHistory])

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target
      const isInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      if (isInput) return

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        undo()
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        removeSelection()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [redo, removeSelection, undo])

  const updateLabel = (value) => {
    if (!hasSelection) return
    if (selectedType === 'node') {
      setNodes((nds) =>
        nds.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, label: value } } : n))
      )
    }
    if (selectedType === 'edge') {
      setEdges((eds) => eds.map((e) => (e.id === selectedId ? { ...e, label: value } : e)))
    }
  }

  const selectionLabel = useMemo(() => {
    if (!hasSelection) return ''
    if (selectedType === 'node') {
      const node = nodes.find((n) => n.id === selectedId)
      return node?.data?.label || ''
    }
    if (selectedType === 'edge') {
      const edge = edges.find((e) => e.id === selectedId)
      return edge?.label || ''
    }
    return ''
  }, [edges, nodes, selectedId, selectedType, hasSelection])

  const selectionKind = useMemo(() => {
    if (!hasSelection || selectedType !== 'node') return ''
    const node = nodes.find((n) => n.id === selectedId)
    return node?.data?.kind || 'rack'
  }, [hasSelection, nodes, selectedId, selectedType])

  const updateKind = (value) => {
    if (!hasSelection || selectedType !== 'node') return
    setNodes((nds) =>
      nds.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, kind: value } } : n))
    )
  }

  const selectionSplit = useMemo(() => {
    if (!hasSelection || selectedType !== 'node') return 2
    const node = nodes.find((n) => n.id === selectedId)
    return node?.data?.splitCount ?? 2
  }, [hasSelection, nodes, selectedId, selectedType])

  const updateSplit = (value) => {
    if (!hasSelection || selectedType !== 'node') return
    const next = Math.max(2, Math.min(64, Number(value) || 2))
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedId ? { ...n, data: { ...n.data, splitCount: next } } : n
      )
    )
  }

  const selectionTier = useMemo(() => {
    if (!hasSelection || selectedType !== 'node') return DEFAULT_TIER.server
    const node = nodes.find((n) => n.id === selectedId)
    return node?.data?.tier ?? DEFAULT_TIER[node?.data?.kind] ?? DEFAULT_TIER.server
  }, [hasSelection, nodes, selectedId, selectedType])

  const updateTier = (value) => {
    if (!hasSelection || selectedType !== 'node') return
    const nextTier = Number(value)
    if (Number.isNaN(nextTier)) return
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedId ? { ...n, data: { ...n.data, tier: nextTier } } : n
      )
    )
  }


  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-dot" />
          <div>
            <div className="brand-title">Data Center Topology</div>
            <div className="brand-sub">Editable graph with autosave</div>
          </div>
        </div>
        <div className="tabs">
          {['topology', 'nodes'].map((tab) => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div className="header-actions">
          <div className="action-group">
            <div className="group-title">Workspace</div>
            <div className="group-body">
              <div className="topology-select">
                <span>Topology</span>
                <select
                  value={activeId || ''}
                  onChange={(e) => selectTopology(Number(e.target.value))}
                >
                  {topologies.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn ghost" onClick={createTopology}>
                New
              </button>
              <button className="btn ghost" onClick={saveTopology}>
                Save
              </button>
            </div>
          </div>
          <div className="action-group">
            <div className="group-title">Add Components</div>
            <div className="group-body">
            <div className="node-palette">
              <button className="btn" onClick={() => addNode('rack')}>
                + Rack
              </button>
              <button className="btn ghost" onClick={() => addNode('switch')}>
                + Switch
              </button>
              <button className="btn ghost" onClick={() => addNode('server')}>
                + Server
              </button>
              <button className="btn ghost" onClick={() => addNode('asic')}>
                + ASIC
              </button>
              <button className="btn ghost" onClick={() => addNode('patch')}>
                + Patch
              </button>
            </div>
          </div>
          </div>
          <div className="action-group">
            <div className="group-title">Layout</div>
            <div className="group-body">
              <div className="toolbar">
                <button className="btn ghost" onClick={undo}>
                  Undo
                </button>
                <button className="btn ghost" onClick={redo}>
                  Redo
                </button>
                <button className="btn ghost" onClick={autoLayout}>
                  Auto Layout
                </button>
              </div>
            </div>
          </div>
          <div className="action-group">
            <div className="group-title">Export</div>
            <div className="group-body">
              <label className="btn ghost file-btn">
                Load JSON
                <input type="file" accept="application/json" onChange={loadFromJson} />
              </label>
              <button
                className="btn ghost"
                onClick={() => {
                  const payload = { name, topo_type: topoType, topo_params: topoParams, nodes, edges }
                  const blob = new Blob([JSON.stringify(payload, null, 2)], {
                    type: 'application/json'
                  })
                  const url = URL.createObjectURL(blob)
                  const link = document.createElement('a')
                  link.href = url
                  link.download = `${name || 'topology'}.json`
                  link.click()
                  URL.revokeObjectURL(url)
                }}
              >
                Export JSON
              </button>
            </div>
          </div>
        </div>
        <div className={`status ${status}`}>
          <div className="status-dot" />
          <div className="status-text">
            {status === 'loading' && 'Loading...'}
            {status === 'saving' && 'Saving...'}
            {status === 'ready' && 'Up to date'}
            {status === 'error' && 'Error'}
          </div>
          {lastSaved && status !== 'loading' && (
            <div className="status-time">Saved {lastSaved.toLocaleTimeString()}</div>
          )}
        </div>
      </header>

      <div className="content">
        <aside className="panel">
          <div className="panel-title">Topology</div>
          <div className="panel-actions">
            <input
              className="name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Topology name"
            />
            <button className="btn ghost" onClick={createTopology}>
              New
            </button>
            <button className="btn danger" onClick={deleteTopology}>
              Delete
            </button>
          </div>
          <div className="panel-divider" />
          <div className="panel-title">Inspector</div>
          {!hasSelection && <div className="panel-empty">Select a node or edge.</div>}
          {hasSelection && (
            <div className="panel-form">
              <label className="field">
                <span>Type</span>
                <input value={selectedType} disabled />
              </label>
              {selectedType === 'node' && (
                <label className="field">
                  <span>Kind</span>
                  <select value={selectionKind} onChange={(e) => updateKind(e.target.value)}>
                    <option value="rack">Rack</option>
                    <option value="switch">Switch</option>
                    <option value="server">Server</option>
                    <option value="asic">ASIC</option>
                    <option value="patch">Patch Panel</option>
                  </select>
                </label>
              )}
              {selectedType === 'node' && selectionKind === 'patch' && (
                <label className="field">
                  <span>Split</span>
                  <input
                    type="number"
                    min="2"
                    max="64"
                    value={selectionSplit}
                    onChange={(e) => updateSplit(e.target.value)}
                  />
                </label>
              )}
              {selectedType === 'node' && (
                <label className="field">
                  <span>Tier</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={selectionTier}
                    onChange={(e) => updateTier(e.target.value)}
                  />
                </label>
              )}
              <label className="field">
                <span>Label</span>
                <input
                  value={selectionLabel}
                  onChange={(e) => updateLabel(e.target.value)}
                  placeholder="Label"
                />
              </label>
              <button className="btn danger" onClick={removeSelection}>
                Delete
              </button>
            </div>
          )}
          <div className="panel-divider" />
          <div className="panel-hint">
            Drag nodes, click to select, drag from handles to connect.
          </div>
        </aside>

        <main className="canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={handleSelectionChange}
            nodeTypes={nodeTypes}
            fitView
            defaultViewport={defaultViewport}
          >
            <MiniMap />
            <Controls />
            <Background gap={18} size={1} />
          </ReactFlow>
        </main>
        <aside className="panel side">
          {activeTab === 'nodes' && (
            <>
              <div className="panel-title">Nodes</div>
              <div className="panel-list">
                {nodes.map((node) => (
                  <button
                    key={node.id}
                    className="panel-item"
                    onClick={() => setSelected({ type: 'node', id: node.id })}
                  >
                    <span>{node.data?.label || node.id}</span>
                    <span className="muted">{node.data?.kind || node.type}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {activeTab === 'topology' && (
            <>
              <div className="panel-title">Topology</div>
              <div className="panel-empty">
                Build the virtual data center, model cabling, and validate full paths.
              </div>
              <div className="panel-form">
                <button className="btn" onClick={autoLayout}>
                  Auto Layout (High → Low)
                </button>
                <div className="panel-divider" />
                <div className="panel-title">Topology Generator</div>
                <label className="field">
                  <span>Type</span>
                  <select value={topoType} onChange={(e) => setTopoType(e.target.value)}>
                    <option value="custom">Custom</option>
                    <option value="leaf-spine">Leaf-Spine</option>
                    <option value="fat-tree">Fat-Tree</option>
                    <option value="three-tier">3-Tier</option>
                    <option value="expanded-clos">Expanded Clos</option>
                    <option value="core-and-pod">Core-and-Pod</option>
                    <option value="torus-2d">2D Torus</option>
                    <option value="torus-3d">3D Torus</option>
                    <option value="dragonfly">Dragonfly</option>
                    <option value="butterfly">Butterfly</option>
                    <option value="mesh">Mesh</option>
                    <option value="ring">Ring</option>
                    <option value="star">Star</option>
                  </select>
                </label>
                {topoType === 'leaf-spine' && (
                  <>
                    <label className="field">
                      <span>Layer Gap</span>
                      <input
                        type="number"
                        min="60"
                        value={topoParams.layerGap ?? 220}
                        onChange={(e) => updateParam('layerGap', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Spines</span>
                      <input
                        type="number"
                        min="1"
                        value={topoParams.spines ?? 2}
                        onChange={(e) => updateParam('spines', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Spine Kind</span>
                      {renderKindSelect(
                        topoParams.spine_kind ?? 'switch',
                        (value) => updateParam('spine_kind', value)
                      )}
                    </label>
                    <label className="field">
                      <span>Leaves</span>
                      <input
                        type="number"
                        min="1"
                        value={topoParams.leaves ?? 4}
                        onChange={(e) => updateParam('leaves', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Leaf Kind</span>
                      {renderKindSelect(
                        topoParams.leaf_kind ?? 'switch',
                        (value) => updateParam('leaf_kind', value)
                      )}
                    </label>
                  </>
                )}
                {topoType === 'fat-tree' && (
                  <>
                    <label className="field">
                      <span>Layer Gap</span>
                      <input
                        type="number"
                        min="60"
                        value={topoParams.layerGap ?? 220}
                        onChange={(e) => updateParam('layerGap', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>k (even)</span>
                      <input
                        type="number"
                        min="2"
                        step="2"
                        value={topoParams.k ?? 4}
                        onChange={(e) => updateParam('k', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Core Kind</span>
                      {renderKindSelect(
                        topoParams.core_kind ?? 'switch',
                        (value) => updateParam('core_kind', value)
                      )}
                    </label>
                    <label className="field">
                      <span>Agg Kind</span>
                      {renderKindSelect(
                        topoParams.agg_kind ?? 'switch',
                        (value) => updateParam('agg_kind', value)
                      )}
                    </label>
                    <label className="field">
                      <span>Edge Kind</span>
                      {renderKindSelect(
                        topoParams.edge_kind ?? 'switch',
                        (value) => updateParam('edge_kind', value)
                      )}
                    </label>
                  </>
                )}
                {topoType === 'three-tier' && (
                  <>
                    <label className="field">
                      <span>Layer Gap</span>
                      <input
                        type="number"
                        min="60"
                        value={topoParams.layerGap ?? 220}
                        onChange={(e) => updateParam('layerGap', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Core</span>
                      <input
                        type="number"
                        min="1"
                        value={topoParams.core ?? 2}
                        onChange={(e) => updateParam('core', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Core Kind</span>
                      {renderKindSelect(
                        topoParams.core_kind ?? 'switch',
                        (value) => updateParam('core_kind', value)
                      )}
                    </label>
                    <label className="field">
                      <span>Aggregation</span>
                      <input
                        type="number"
                        min="1"
                        value={topoParams.aggregation ?? 4}
                        onChange={(e) => updateParam('aggregation', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Aggregation Kind</span>
                      {renderKindSelect(
                        topoParams.agg_kind ?? 'switch',
                        (value) => updateParam('agg_kind', value)
                      )}
                    </label>
                    <label className="field">
                      <span>Access</span>
                      <input
                        type="number"
                        min="1"
                        value={topoParams.access ?? 6}
                        onChange={(e) => updateParam('access', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Access Kind</span>
                      {renderKindSelect(
                        topoParams.access_kind ?? 'switch',
                        (value) => updateParam('access_kind', value)
                      )}
                    </label>
                  </>
                )}
                {topoType === 'expanded-clos' && (
                  <>
                    <label className="field">
                      <span>Layer Gap</span>
                      <input
                        type="number"
                        min="60"
                        value={topoParams.layerGap ?? 220}
                        onChange={(e) => updateParam('layerGap', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Tiers</span>
                      <input
                        type="number"
                        min="2"
                        value={topoParams.tiers ?? 4}
                        onChange={(e) => updateParam('tiers', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Nodes / Tier</span>
                      <input
                        type="number"
                        min="1"
                        value={topoParams.nodes_per_tier ?? 4}
                        onChange={(e) => updateParam('nodes_per_tier', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Kind</span>
                      {renderKindSelect(
                        topoParams.kind ?? 'switch',
                        (value) => updateParam('kind', value)
                      )}
                    </label>
                  </>
                )}
                {topoType === 'core-and-pod' && (
                  <>
                    <label className="field">
                      <span>Layer Gap</span>
                      <input
                        type="number"
                        min="60"
                        value={topoParams.layerGap ?? 220}
                        onChange={(e) => updateParam('layerGap', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Cores</span>
                      <input
                        type="number"
                        min="1"
                        value={topoParams.cores ?? 2}
                        onChange={(e) => updateParam('cores', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Core Kind</span>
                      {renderKindSelect(
                        topoParams.core_kind ?? 'switch',
                        (value) => updateParam('core_kind', value)
                      )}
                    </label>
                    <label className="field">
                      <span>Pods</span>
                      <input
                        type="number"
                        min="1"
                        value={topoParams.pods ?? 2}
                        onChange={(e) => updateParam('pods', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Pod Leaves</span>
                      <input
                        type="number"
                        min="1"
                        value={topoParams.pod_leaves ?? 4}
                        onChange={(e) => updateParam('pod_leaves', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Pod Leaf Kind</span>
                      {renderKindSelect(
                        topoParams.leaf_kind ?? 'switch',
                        (value) => updateParam('leaf_kind', value)
                      )}
                    </label>
                    <label className="field">
                      <span>Pod Aggs</span>
                      <input
                        type="number"
                        min="1"
                        value={topoParams.pod_aggs ?? 2}
                        onChange={(e) => updateParam('pod_aggs', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Pod Agg Kind</span>
                      {renderKindSelect(
                        topoParams.agg_kind ?? 'switch',
                        (value) => updateParam('agg_kind', value)
                      )}
                    </label>
                  </>
                )}
                {topoType === 'torus-2d' && (
                  <>
                    <label className="field">
                      <span>Layer Gap</span>
                      <input
                        type="number"
                        min="60"
                        value={topoParams.layerGap ?? 140}
                        onChange={(e) => updateParam('layerGap', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Rows</span>
                      <input
                        type="number"
                        min="2"
                        value={topoParams.rows ?? 3}
                        onChange={(e) => updateParam('rows', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Cols</span>
                      <input
                        type="number"
                        min="2"
                        value={topoParams.cols ?? 3}
                        onChange={(e) => updateParam('cols', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Kind</span>
                      {renderKindSelect(
                        topoParams.kind ?? 'switch',
                        (value) => updateParam('kind', value)
                      )}
                    </label>
                  </>
                )}
                {topoType === 'torus-3d' && (
                  <>
                    <label className="field">
                      <span>Layer Gap</span>
                      <input
                        type="number"
                        min="60"
                        value={topoParams.layerGap ?? 120}
                        onChange={(e) => updateParam('layerGap', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>X</span>
                      <input
                        type="number"
                        min="2"
                        value={topoParams.x ?? 3}
                        onChange={(e) => updateParam('x', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Y</span>
                      <input
                        type="number"
                        min="2"
                        value={topoParams.y ?? 3}
                        onChange={(e) => updateParam('y', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Z</span>
                      <input
                        type="number"
                        min="2"
                        value={topoParams.z ?? 3}
                        onChange={(e) => updateParam('z', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Kind</span>
                      {renderKindSelect(
                        topoParams.kind ?? 'switch',
                        (value) => updateParam('kind', value)
                      )}
                    </label>
                  </>
                )}
                {topoType === 'dragonfly' && (
                  <>
                    <label className="field">
                      <span>Layer Gap</span>
                      <input
                        type="number"
                        min="60"
                        value={topoParams.layerGap ?? 260}
                        onChange={(e) => updateParam('layerGap', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Groups</span>
                      <input
                        type="number"
                        min="2"
                        value={topoParams.groups ?? 3}
                        onChange={(e) => updateParam('groups', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Routers / Group</span>
                      <input
                        type="number"
                        min="2"
                        value={topoParams.routers_per_group ?? 4}
                        onChange={(e) => updateParam('routers_per_group', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Kind</span>
                      {renderKindSelect(
                        topoParams.kind ?? 'switch',
                        (value) => updateParam('kind', value)
                      )}
                    </label>
                  </>
                )}
                {topoType === 'butterfly' && (
                  <>
                    <label className="field">
                      <span>Layer Gap</span>
                      <input
                        type="number"
                        min="60"
                        value={topoParams.layerGap ?? 220}
                        onChange={(e) => updateParam('layerGap', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Stages</span>
                      <input
                        type="number"
                        min="2"
                        value={topoParams.stages ?? 4}
                        onChange={(e) => updateParam('stages', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Width</span>
                      <input
                        type="number"
                        min="2"
                        value={topoParams.width ?? 4}
                        onChange={(e) => updateParam('width', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Kind</span>
                      {renderKindSelect(
                        topoParams.kind ?? 'switch',
                        (value) => updateParam('kind', value)
                      )}
                    </label>
                  </>
                )}
                {topoType === 'mesh' && (
                  <>
                    <label className="field">
                      <span>Layer Gap</span>
                      <input
                        type="number"
                        min="60"
                        value={topoParams.layerGap ?? 140}
                        onChange={(e) => updateParam('layerGap', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Rows</span>
                      <input
                        type="number"
                        min="2"
                        value={topoParams.rows ?? 3}
                        onChange={(e) => updateParam('rows', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Cols</span>
                      <input
                        type="number"
                        min="2"
                        value={topoParams.cols ?? 3}
                        onChange={(e) => updateParam('cols', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Kind</span>
                      {renderKindSelect(
                        topoParams.kind ?? 'switch',
                        (value) => updateParam('kind', value)
                      )}
                    </label>
                  </>
                )}
                {topoType === 'ring' && (
                  <>
                    <label className="field">
                      <span>Layer Gap</span>
                      <input
                        type="number"
                        min="60"
                        value={topoParams.layerGap ?? 220}
                        onChange={(e) => updateParam('layerGap', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Count</span>
                      <input
                        type="number"
                        min="3"
                        value={topoParams.count ?? 6}
                        onChange={(e) => updateParam('count', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Kind</span>
                      {renderKindSelect(
                        topoParams.kind ?? 'switch',
                        (value) => updateParam('kind', value)
                      )}
                    </label>
                  </>
                )}
                {topoType === 'star' && (
                  <>
                    <label className="field">
                      <span>Layer Gap</span>
                      <input
                        type="number"
                        min="60"
                        value={topoParams.layerGap ?? 220}
                        onChange={(e) => updateParam('layerGap', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Count</span>
                      <input
                        type="number"
                        min="3"
                        value={topoParams.count ?? 6}
                        onChange={(e) => updateParam('count', Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Kind</span>
                      {renderKindSelect(
                        topoParams.kind ?? 'switch',
                        (value) => updateParam('kind', value)
                      )}
                    </label>
                  </>
                )}
                <button className="btn" onClick={generateTopology} disabled={topoType === 'custom'}>
                  Generate
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
