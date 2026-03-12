import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import ProjectList from '../components/projects/ProjectList'
import ProjectForm from '../components/projects/ProjectForm'

export default function ProjectsPage() {
  const [creating, setCreating] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: api.projects.list,
  })

  const active = projects.filter((p: any) => !p.archived)
  const archived = projects.filter((p: any) => p.archived)
  const shown = showArchived ? [...active, ...archived] : active

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Projects</h1>
          <p className="text-white/30 text-sm mt-0.5">{active.length} active{archived.length > 0 ? `, ${archived.length} archived` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {archived.length > 0 && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="px-3 py-2 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.06] border border-white/[0.08] transition-all"
            >
              {showArchived ? 'Hide archived' : 'Show archived'}
            </button>
          )}
          <button
            onClick={() => setCreating(true)}
            className="px-4 py-2 rounded-xl btn-primary text-sm font-medium"
          >
            + New Project
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-xl glass animate-pulse" />)}
        </div>
      ) : (
        <ProjectList projects={shown} />
      )}

      {creating && <ProjectForm onClose={() => setCreating(false)} />}
    </div>
  )
}
