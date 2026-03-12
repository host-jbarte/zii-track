import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, Archive } from 'lucide-react'
import { api } from '../../api/client'
import { formatDurationShort } from '../../utils/time'
import ProjectForm from './ProjectForm'

interface ProjectListProps {
  projects: any[]
}

export default function ProjectList({ projects }: ProjectListProps) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<any>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.projects.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })

  const archiveMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.projects.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })

  if (projects.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-white/30 text-sm">No projects yet. Create one to get started.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {projects.map((p: any) => (
          <div
            key={p.id}
            className={`group flex items-center gap-4 px-4 py-3.5 rounded-xl glass glass-hover transition-all ${
              p.archived ? 'opacity-40' : ''
            }`}
          >
            {/* Color dot */}
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{
                backgroundColor: p.color,
                boxShadow: `0 0 8px ${p.color}60`,
              }}
            />

            {/* Name & client */}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-white/80">{p.name}</span>
              {p.client_name && (
                <span className="ml-2 text-xs text-white/30">{p.client_name}</span>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <span className="text-xs text-white/30 tabular-nums">{p.entry_count} entries</span>
              <span className="text-sm font-medium text-white/50 tabular-nums min-w-[52px] text-right">
                {formatDurationShort(p.total_duration)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => archiveMutation.mutate({ id: p.id, data: { ...p, archived: !p.archived } })}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-all"
                title={p.archived ? 'Unarchive' : 'Archive'}
              >
                <Archive size={13} />
              </button>
              <button
                onClick={() => setEditing(p)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-all"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete project "${p.name}"? This won't delete its time entries.`))
                    deleteMutation.mutate(p.id)
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && <ProjectForm project={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
