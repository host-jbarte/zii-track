import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { formatDuration } from '../utils/time'
import { Trash2, Crown, User } from 'lucide-react'

export default function UsersPage() {
  const { user: me } = useAuth()
  const qc = useQueryClient()

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: api.users.list,
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => api.users.updateRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.users.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Team</h1>
          <p className="text-white/40 text-sm mt-1">{users.length} member{users.length !== 1 ? 's' : ''}</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass rounded-xl h-16 animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="text-white/30">No team members yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(users as any[]).map(u => (
              <div key={u.id} className="glass rounded-xl px-5 py-4 flex items-center gap-4">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-cyan-300 text-sm font-medium">
                    {u.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium truncate">{u.name}</span>
                    {u.id === me?.id && (
                      <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-full">you</span>
                    )}
                  </div>
                  <p className="text-white/30 text-xs truncate">{u.email}</p>
                </div>

                {/* Stats */}
                <div className="text-right hidden sm:block">
                  <p className="text-white/60 text-xs">{formatDuration(u.total_duration)}</p>
                  <p className="text-white/30 text-[11px]">{u.entry_count} entries</p>
                </div>

                {/* Role badge + toggle */}
                {u.id !== me?.id ? (
                  <button
                    onClick={() => roleMutation.mutate({ id: u.id, role: u.role === 'manager' ? 'member' : 'manager' })}
                    title={`Switch to ${u.role === 'manager' ? 'member' : 'manager'}`}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      u.role === 'manager'
                        ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25'
                        : 'bg-white/[0.04] border-white/[0.08] text-white/40 hover:text-white/70'
                    }`}
                  >
                    {u.role === 'manager' ? <Crown size={12} /> : <User size={12} />}
                    {u.role}
                  </button>
                ) : (
                  <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${
                    u.role === 'manager'
                      ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                      : 'bg-white/[0.04] border-white/[0.08] text-white/40'
                  }`}>
                    {u.role === 'manager' ? <Crown size={12} /> : <User size={12} />}
                    {u.role}
                  </div>
                )}

                {/* Delete */}
                {u.id !== me?.id && (
                  <button
                    onClick={() => { if (confirm(`Remove ${u.name} from the team?`)) deleteMutation.mutate(u.id) }}
                    className="text-white/20 hover:text-red-400 transition-colors ml-1"
                    title="Remove user"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-white/20 text-xs text-center mt-6">
          New members join by registering at the login page. Share the app URL with your team.
        </p>
      </div>
    </div>
  )
}
