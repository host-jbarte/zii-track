import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { api } from '../../api/client'
import { formatDurationShort } from '../../utils/time'
import ClientForm from './ClientForm'

interface ClientListProps {
  clients: any[]
}

export default function ClientList({ clients }: ClientListProps) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<any>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.clients.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })

  if (clients.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-white/30 text-sm">No clients yet. Create one to get started.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {clients.map((c: any) => (
          <div key={c.id} className="group flex items-center gap-4 px-4 py-3.5 rounded-xl glass glass-hover transition-all">
            {/* Color dot */}
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: c.color, boxShadow: `0 0 8px ${c.color}60` }}
            />

            {/* Name */}
            <span className="flex-1 text-sm font-medium text-white/80">{c.name}</span>

            {/* Stats */}
            <div className="flex items-center gap-5 flex-shrink-0">
              <span className="text-xs text-white/30">{c.project_count} projects</span>
              <span className="text-xs text-white/30 tabular-nums">{c.entry_count} entries</span>
              <span className="text-sm font-medium text-white/50 tabular-nums min-w-[52px] text-right">
                {formatDurationShort(c.total_duration)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setEditing(c)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-all"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete client "${c.name}"?`)) deleteMutation.mutate(c.id)
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && <ClientForm client={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
