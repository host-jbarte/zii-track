import { useState } from 'react'
import { Pencil, Trash2, Play } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { formatDurationShort, formatTime } from '../../utils/time'
import EntryForm from './EntryForm'

interface EntryRowProps {
  entry: any
}

export default function EntryRow({ entry }: EntryRowProps) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: () => api.entries.delete(entry.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] })
    },
  })

  const continueMutation = useMutation({
    mutationFn: () => api.entries.start({
      description: entry.description,
      project_id: entry.project_id ?? null,
      client_id: entry.client_id ?? null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['running'] })
      qc.invalidateQueries({ queryKey: ['entries'] })
    },
  })

  const duration = entry.stopped_at
    ? entry.stopped_at - entry.started_at
    : Date.now() - entry.started_at

  return (
    <>
      <div
        onClick={() => setEditing(true)}
        className="group flex items-center gap-4 px-4 py-3 rounded-xl glass-hover glass transition-all duration-150 cursor-pointer"
      >
        {/* Color dot */}
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: entry.project_color || 'rgba(255,255,255,0.2)' }}
        />

        {/* Description */}
        <span className="flex-1 text-sm text-white/80 truncate min-w-0">
          {entry.description || <span className="text-white/30 italic">No description</span>}
        </span>

        {/* Tags */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {entry.project_name && (
            <span
              className="tag text-[11px]"
              style={{
                color: entry.project_color,
                borderColor: entry.project_color + '40',
                backgroundColor: entry.project_color + '15',
              }}
            >
              {entry.project_name}
            </span>
          )}
          {entry.client_name && (
            <span className="tag text-[11px] text-white/50 border-white/10 bg-white/[0.05]">
              {entry.client_name}
            </span>
          )}
        </div>

        {/* Time range */}
        <span className="text-xs text-white/30 flex-shrink-0 tabular-nums">
          {formatTime(entry.started_at)}
          {entry.stopped_at && ` – ${formatTime(entry.stopped_at)}`}
        </span>

        {/* Duration */}
        <span className="text-sm font-medium text-white/60 flex-shrink-0 min-w-[52px] text-right tabular-nums">
          {formatDurationShort(duration)}
        </span>

        {/* Actions (shown on hover) */}
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => continueMutation.mutate()}
            disabled={continueMutation.isPending}
            title="Continue this entry"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
          >
            <Play size={13} fill="currentColor" />
          </button>
          <button
            onClick={() => setEditing(true)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-all"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => {
              if (confirm('Delete this entry?')) deleteMutation.mutate()
            }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {editing && <EntryForm entry={entry} onClose={() => setEditing(false)} />}
    </>
  )
}
