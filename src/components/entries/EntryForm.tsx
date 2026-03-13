import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { toLocalDatetimeInput } from '../../utils/time'
import Modal from '../ui/Modal'

interface EntryFormProps {
  entry?: any
  onClose: () => void
}

export default function EntryForm({ entry, onClose }: EntryFormProps) {
  const qc = useQueryClient()
  const isEdit = !!entry

  const now = Date.now()
  const [desc, setDesc] = useState(entry?.description || '')
  const [projectId, setProjectId] = useState(entry?.project_id ? String(entry.project_id) : '')
  const [clientId, setClientId] = useState(entry?.client_id ? String(entry.client_id) : '')
  const [billable, setBillable] = useState(entry ? entry.is_billable !== 0 : true)
  const [startedAt, setStartedAt] = useState(toLocalDatetimeInput(entry?.started_at || now - 3600000))
  const [stoppedAt, setStoppedAt] = useState(toLocalDatetimeInput(entry?.stopped_at || now))

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list })
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: api.clients.list })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['entries'] })
    qc.invalidateQueries({ queryKey: ['running'] })
    onClose()
  }

  const createMutation = useMutation({
    mutationFn: (data: any) => api.entries.create(data),
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.entries.update(entry.id, data),
    onSuccess: invalidate,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      description: desc,
      project_id: projectId ? Number(projectId) : null,
      client_id: clientId ? Number(clientId) : null,
      is_billable: billable ? 1 : 0,
      started_at: new Date(startedAt).getTime(),
      stopped_at: new Date(stoppedAt).getTime(),
    }
    if (isEdit) updateMutation.mutate(data)
    else createMutation.mutate(data)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Modal title={isEdit ? 'Edit Entry' : 'Add Manual Entry'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-white/50 text-xs font-medium mb-1.5">Description</label>
          <input
            className="input-glass"
            placeholder="What did you work on?"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-white/50 text-xs font-medium mb-1.5">Project</label>
            <select className="select-glass w-full" value={projectId} onChange={e => setProjectId(e.target.value)}>
              <option value="">No Project</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-white/50 text-xs font-medium mb-1.5">Client</label>
            <select className="select-glass w-full" value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">No Client</option>
              {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-white/50 text-xs font-medium mb-1.5">Start</label>
            <input
              type="datetime-local"
              className="input-glass"
              value={startedAt}
              onChange={e => setStartedAt(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-white/50 text-xs font-medium mb-1.5">End</label>
            <input
              type="datetime-local"
              className="input-glass"
              value={stoppedAt}
              onChange={e => setStoppedAt(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setBillable(!billable)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              billable
                ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30'
                : 'text-white/40 border border-white/[0.08] hover:border-white/[0.15]'
            }`}
          >
            <span className="text-base leading-none">$</span>
            {billable ? 'Billable' : 'Non-billable'}
          </button>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.06] transition-all text-sm font-medium border border-white/[0.08]">
            Cancel
          </button>
          <button type="submit" disabled={isPending} className="flex-1 py-2.5 rounded-xl btn-primary text-sm font-medium disabled:opacity-50">
            {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Entry'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
