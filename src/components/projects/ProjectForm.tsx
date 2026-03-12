import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import Modal from '../ui/Modal'
import ColorPicker from '../ui/ColorPicker'

interface ProjectFormProps {
  project?: any
  onClose: () => void
}

export default function ProjectForm({ project, onClose }: ProjectFormProps) {
  const qc = useQueryClient()
  const [name, setName] = useState(project?.name || '')
  const [clientId, setClientId] = useState(project?.client_id ? String(project.client_id) : '')
  const [color, setColor] = useState(project?.color || '#06b6d4')

  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: api.clients.list })

  const onSuccess = () => {
    qc.invalidateQueries({ queryKey: ['projects'] })
    onClose()
  }

  const createMutation = useMutation({ mutationFn: (d: any) => api.projects.create(d), onSuccess })
  const updateMutation = useMutation({ mutationFn: (d: any) => api.projects.update(project.id, d), onSuccess })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = { name, client_id: clientId ? Number(clientId) : null, color }
    if (project) updateMutation.mutate(data)
    else createMutation.mutate(data)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Modal title={project ? 'Edit Project' : 'New Project'} onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-white/50 text-xs font-medium mb-1.5">Project Name</label>
          <input
            className="input-glass"
            placeholder="e.g. Website Redesign"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block text-white/50 text-xs font-medium mb-1.5">Client (optional)</label>
          <select className="select-glass w-full" value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">No Client</option>
            {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-white/50 text-xs font-medium mb-2">Color</label>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.06] transition-all text-sm font-medium border border-white/[0.08]">
            Cancel
          </button>
          <button type="submit" disabled={isPending || !name.trim()} className="flex-1 py-2.5 rounded-xl btn-primary text-sm font-medium disabled:opacity-50">
            {isPending ? 'Saving…' : project ? 'Save Changes' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
