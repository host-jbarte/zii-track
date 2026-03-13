import { useState, useEffect, useRef } from 'react'
import { Play, Square, Plus, Coffee, DollarSign } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { useRunningTimer } from '../../hooks/useRunningTimer'
import { formatDuration } from '../../utils/time'

export default function TimerBar() {
  const qc = useQueryClient()
  const { runningEntry, elapsed } = useRunningTimer()
  const isRunning = !!runningEntry
  const isBreak = runningEntry?.is_break === 1

  const [desc, setDesc] = useState('')
  const [projectId, setProjectId] = useState('')
  const [clientId, setClientId] = useState('')
  const [billable, setBillable] = useState(true)

  // Store last work entry details to resume after break
  const lastWorkRef = useRef<{ desc: string; projectId: string; clientId: string; billable: boolean } | null>(null)

  // Refs always hold the latest values — used by auto-save to avoid stale closures
  const descRef = useRef(desc)
  const projectIdRef = useRef(projectId)
  const clientIdRef = useRef(clientId)
  const billableRef = useRef(billable)
  descRef.current = desc
  projectIdRef.current = projectId
  clientIdRef.current = clientId
  billableRef.current = billable

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list })
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: api.clients.list })

  // Sync form when a running entry is loaded / switched
  useEffect(() => {
    if (runningEntry) {
      if (!runningEntry.is_break) {
        setDesc(runningEntry.description || '')
        setProjectId(runningEntry.project_id ? String(runningEntry.project_id) : '')
        setClientId(runningEntry.client_id ? String(runningEntry.client_id) : '')
        setBillable(runningEntry.is_billable !== 0)
      }
      // If it's a break, keep the last work info in the form (greyed out)
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
        is_billable: billableRef.current ? 1 : 0,
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
      is_billable: billable ? 1 : 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['running'] })
      qc.invalidateQueries({ queryKey: ['entries'] })
    },
  })

  const stopMutation = useMutation({
    mutationFn: async () => {
      await api.entries.update(runningEntry!.id, {
        description: descRef.current,
        project_id: projectIdRef.current ? Number(projectIdRef.current) : null,
        client_id: clientIdRef.current ? Number(clientIdRef.current) : null,
        is_billable: billableRef.current ? 1 : 0,
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
      setBillable(true)
      lastWorkRef.current = null
    },
  })

  // Break: stop current work entry, start a break entry
  const breakMutation = useMutation({
    mutationFn: async () => {
      // Save current work details for resume
      lastWorkRef.current = {
        desc: descRef.current,
        projectId: projectIdRef.current,
        clientId: clientIdRef.current,
        billable: billableRef.current,
      }
      // Flush work entry then stop it
      await api.entries.update(runningEntry!.id, {
        description: descRef.current,
        project_id: projectIdRef.current ? Number(projectIdRef.current) : null,
        client_id: clientIdRef.current ? Number(clientIdRef.current) : null,
        is_billable: billableRef.current ? 1 : 0,
        started_at: runningEntry!.started_at,
        stopped_at: null,
      })
      await api.entries.stop(runningEntry!.id)
      // Start a break entry (is_break flag set server-side via query param)
      return api.entries.startBreak()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['running'] })
      qc.invalidateQueries({ queryKey: ['entries'] })
    },
  })

  // Resume: stop the break entry, start a new work entry with saved details
  const resumeMutation = useMutation({
    mutationFn: async () => {
      await api.entries.stop(runningEntry!.id)
      const work = lastWorkRef.current
      return api.entries.start({
        description: work?.desc || '',
        project_id: work?.projectId ? Number(work.projectId) : null,
        client_id: work?.clientId ? Number(work.clientId) : null,
        is_billable: work?.billable ? 1 : 0,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['running'] })
      qc.invalidateQueries({ queryKey: ['entries'] })
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
        isBreak
          ? 'bg-[rgba(251,146,60,0.05)]'
          : isRunning
          ? 'bg-[rgba(16,185,129,0.04)]'
          : 'bg-[rgba(255,255,255,0.02)]'
      } backdrop-blur-xl`}
    >
      {/* Status dot */}
      <div
        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all duration-500 ${
          isBreak
            ? 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.8)] animate-pulse'
            : isRunning
            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse'
            : 'bg-white/15'
        }`}
      />

      {/* Break label or description input */}
      {isBreak ? (
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <Coffee size={14} className="text-orange-400 flex-shrink-0" />
          <span className="text-orange-300/70 text-sm">On break…</span>
        </div>
      ) : (
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
          disabled={isBreak}
        />
      )}

      {/* Project selector — hidden during break */}
      {!isBreak && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {selectedProject && (
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: selectedProject.color }} />
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
      )}

      {/* Billable toggle — hidden during break */}
      {!isBreak && (
        <button
          onClick={() => {
            setBillable(!billable)
            if (runningEntry) scheduleSave(runningEntry.id, runningEntry.started_at)
          }}
          title={billable ? 'Billable (click to toggle)' : 'Non-billable (click to toggle)'}
          className={`w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 transition-all duration-200 ${
            billable
              ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30'
              : 'text-white/25 hover:text-white/50 border border-white/[0.08] hover:border-white/[0.15]'
          }`}
        >
          <DollarSign size={14} />
        </button>
      )}

      {/* Client selector — hidden during break */}
      {!isBreak && (
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
      )}

      {/* Elapsed time */}
      <span
        className={`font-mono text-sm tabular-nums min-w-[80px] text-right flex-shrink-0 transition-all duration-300 ${
          isBreak ? 'text-orange-400' : isRunning ? 'text-emerald-400' : 'text-white/25'
        }`}
      >
        {formatDuration(isRunning ? elapsed : 0)}
      </span>

      {/* Break button — only when working (not on break) */}
      {isRunning && !isBreak && (
        <button
          onClick={() => breakMutation.mutate()}
          disabled={breakMutation.isPending}
          title="Take a break"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium flex-shrink-0 transition-all duration-200 bg-orange-500/10 border border-orange-500/20 text-orange-300 hover:bg-orange-500/20"
        >
          <Coffee size={13} />
          <span>Break</span>
        </button>
      )}

      {/* Resume button — only when on break */}
      {isBreak && (
        <button
          onClick={() => resumeMutation.mutate()}
          disabled={resumeMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium flex-shrink-0 transition-all duration-200 btn-primary"
        >
          <Play size={13} fill="currentColor" />
          <span>Resume</span>
        </button>
      )}

      {/* Start / Stop */}
      <button
        onClick={handleToggle}
        disabled={startMutation.isPending || stopMutation.isPending}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium flex-shrink-0 transition-all duration-200 ${
          isRunning ? 'btn-danger' : 'btn-primary'
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
        onClick={() => window.dispatchEvent(new CustomEvent('open-manual-entry'))}
        title="Add manual entry"
        className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-white/70 hover:bg-white/[0.07] transition-all flex-shrink-0"
      >
        <Plus size={16} />
      </button>
    </div>
  )
}
