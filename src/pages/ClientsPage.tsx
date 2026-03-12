import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import ClientList from '../components/clients/ClientList'
import ClientForm from '../components/clients/ClientForm'

export default function ClientsPage() {
  const [creating, setCreating] = useState(false)

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: api.clients.list,
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Clients</h1>
          <p className="text-white/30 text-sm mt-0.5">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 rounded-xl btn-primary text-sm font-medium"
        >
          + New Client
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-xl glass animate-pulse" />)}
        </div>
      ) : (
        <ClientList clients={clients} />
      )}

      {creating && <ClientForm onClose={() => setCreating(false)} />}
    </div>
  )
}
