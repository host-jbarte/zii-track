import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import Modal from '../ui/Modal'
import ColorPicker from '../ui/ColorPicker'

interface ClientFormProps {
  client?: any
  onClose: () => void
}

export default function ClientForm({ client, onClose }: ClientFormProps) {
  const qc = useQueryClient()
  const [name, setName] = useState(client?.name || '')
  const [color, setColor] = useState(client?.color || '#06b6d4')
  const [error, setError] = useState('')

  const onSuccess = () => {
    qc.invalidateQueries({ queryKey: ['clients'] })
    onClose()
  }

  const createMutation = useMutation({
    mutationFn: (d: any) => api.clients.create(d),
    onSuccess,
    onError: (e: any) => setError(e.message),
  })
  const updateMutation = useMutation({
    mutationFn: (d: any) => api.clients.update(client.id, d),
    onSuccess,
    onError: (e: any) => setError(e.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const data = { name, color }
    if (client) updateMutation.mutate(data)
    else createMutation.mutate(data)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Modal title={client ? 'Edit Client' : 'New Client'} onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-white/50 text-xs font-medium mb-1.5">Client Name</label>
          <input
            className="input-glass"
            placeholder="e.g. Acme Corp"
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            required
            autoFocus
          />
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
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
            {isPending ? 'Saving…' : client ? 'Save Changes' : 'Create Client'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
