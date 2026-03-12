import { useState, useEffect, useRef } from 'react'
import { Play, Square, Plus } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { useRunningTimer } from '../../hooks/useRunningTimer'
import { formatDuration } from '../../utils/time'

export default function TimerBar() {
  const qc = useQueryClient()
  const { runningEntry, elapsed } = useRunningTimer()
  const isRunning = !!runningEntry

  const [desc, setDesc] = useState('')
  const [projectId, setProjectId] = useState('')
  const [clientId, setClientId] = useState('')

  // Refs always hold the latest values — used by auto-save to avoid stale closures
  const descRef = useRef(desc)
  const projectIdRef = useRef(projectId)
  const clientIdRef = useRef(clientId)
  descRef.current = desc
  projectIdRef.current = projectId
  clientIdRef.current = clientId

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list })
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: api.clients.list })

  // Sync form when a running entry is loaded / switched
  useEffect(() => {
    if (runningEntry) {
      setDesc(runningEntry.description || '')
      setProjectId(runningEntry.project_id ? String(runningEntry.project_id) : '')
      setClientId(runningEntry.client_id ? String(runningEntry.client_id) : '')
    }
  }, [runningEntry?.id])

  // Debounced auto-save while timer is running — reads from refs so values are always fresh
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scheduleSave = (runningId: number, startedAt: number) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      api.entries.update(runningId, {
        description: descRef.current,
        project_id: projectIdRef.current ? Number(projectIdRef.current) : null,
        client_id: clientIdRef.current ? Number(clientIdRef.current) : null,
        started_at: startedAt,
        stopped_at: null,
      })
    }, 600)
  }

  const startMutation = useMutation({
    mutationFn: () => api.entries.start({
      description: desc,
      project_id: projectId ? Number(projectId) : null,
      client_id: clientId ? Number(clientId) : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['running'] })
      qc.invalidateQueries({ queryKey: ['entries'] })
    },
  })

  const stopMutation = useMutation({
    mutationFn: async () => {
      // Always flush the latest form values before stopping — this is the core fix
      await api.entries.update(runningEntry!.id, {
        description: descRef.current,
        project_id: projectIdRef.current ? Number(projectIdRef.current) : null,
        client_id: clientIdRef.current ? Number(clientIdRef.current) : null,
        started_at: runningEntry!.started_at,
        stopped_at: null,
      })
      return api.entries.stop(runningEntry!.id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['running'] })
      qc.invalidateQueries({ queryKey: ['entries'] })
      setDesc('')
      setProjectId('')
      setClientId('')
    },
  })

  const handleToggle = () => {
    if (isRunning) stopMutation.mutate()
    else startMutation.mutate()
  }

  const selectedProject = projects.find((p: any) => String(p.id) === projectId)

  return (
    <div
      className={`flex items-center gap-3 px-6 py-3.5 border-b border-white/[0.06] transition-all duration-500 ${
        isRunning
          ? 'bg-[rgba(16,185,129,0.04)]'
          : 'bg-[rgba(255,255,255,0.02)]'
      } backdrop-blur-xl`}
    >
      {/* Running dot */}
      <div
        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all duration-500 ${
          isRunning
            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse'
            : 'bg-white/15'
        }`}
      />

      {/* Description */}
      <input
        type="text"
        value={desc}
        onChange={e => {
          setDesc(e.target.value)
          if (runningEntry) scheduleSave(runningEntry.id, runningEntry.started_at)
        }}
        onKeyDown={e => e.key === 'Enter' && handleToggle()}
        placeholder="What are you working on?"
        className="flex-1 bg-transparent text-white text-sm placeholder-white/25 focus:outline-none min-w-0"
      />

      {/* Project selector */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {selectedProject && (
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: selectedProject.color }}
          />
        )}
        <select
          value={projectId}
          onChange={e => {
            setProjectId(e.target.value)
            if (runningEntry) scheduleSave(runningEntry.id, runningEntry.started_at)
          }}
          className="select-glass text-xs py-2 px-3 min-w-[120px]"
        >
          <option value="">No Project</option>
          {projects.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Client selector */}
      <select
        value={clientId}
        onChange={e => {
          setClientId(e.target.value)
          if (runningEntry) scheduleSave(runningEntry.id, runningEntry.started_at)
        }}
        className="select-glass text-xs py-2 px-3 min-w-[110px] flex-shrink-0"
      >
        <option value="">No Client</option>
        {clients.map((c: any) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {/* Elapsed time */}
      <span
        className={`font-mono text-sm tabular-nums min-w-[80px] text-right flex-shrink-0 transition-all duration-300 ${
          isRunning ? 'text-emerald-400' : 'text-white/25'
        }`}
      >
        {formatDuration(isRunning ? elapsed : 0)}
      </span>

      {/* Start / Stop */}
      <button
        onClick={handleToggle}
        disabled={startMutation.isPending || stopMutation.isPending}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium flex-shrink-0 transition-all duration-200 ${
          isRunning
            ? 'btn-danger'
            : 'btn-primary'
        }`}
      >
        {isRunning ? (
          <><Square size={13} fill="currentColor" /><span>Stop</span></>
        ) : (
          <><Play size={13} fill="currentColor" /><span>Start</span></>
        )}
      </button>

      {/* Manual entry */}
      <button
        onClick={() => {
          window.dispatchEvent(new CustomEvent('open-manual-entry'))
        }}
        title="Add manual entry"
        className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-white/70 hover:bg-white/[0.07] transition-all flex-shrink-0"
      >
        <Plus size={16} />
      </button>
    </div>
  )
}
