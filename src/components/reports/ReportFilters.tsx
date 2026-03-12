import { startOfDay, endOfDay } from '../../utils/time'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'

export interface ReportFilter {
  from: number
  to: number
  project_id: string
  client_id: string
}

interface ReportFiltersProps {
  filters: ReportFilter
  onChange: (f: ReportFilter) => void
}

const presets = [
  { label: 'This week', getValue: () => {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    return { from: startOfDay(monday), to: endOfDay(now) }
  }},
  { label: 'This month', getValue: () => {
    const now = new Date()
    return { from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: endOfDay(now) }
  }},
  { label: 'Last month', getValue: () => {
    const now = new Date()
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const last = new Date(now.getFullYear(), now.getMonth(), 0)
    return { from: startOfDay(first), to: endOfDay(last) }
  }},
  { label: 'Last 3 months', getValue: () => {
    const now = new Date()
    const from = new Date(now)
    from.setMonth(from.getMonth() - 3)
    return { from: startOfDay(from), to: endOfDay(now) }
  }},
]

function toInputDate(ts: number) {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function ReportFilters({ filters, onChange }: ReportFiltersProps) {
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list })
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: api.clients.list })

  const setPreset = (preset: typeof presets[0]) => {
    const { from, to } = preset.getValue()
    onChange({ ...filters, from, to })
  }

  return (
    <div className="glass rounded-2xl p-4 space-y-4">
      {/* Date presets */}
      <div className="flex flex-wrap gap-2">
        {presets.map(p => (
          <button
            key={p.label}
            onClick={() => setPreset(p)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] transition-all"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Date range + filters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="block text-white/40 text-[11px] font-medium mb-1">From</label>
          <input
            type="date"
            className="input-glass text-sm py-2"
            value={toInputDate(filters.from)}
            onChange={e => onChange({ ...filters, from: startOfDay(new Date(e.target.value + 'T00:00:00')) })}
          />
        </div>
        <div>
          <label className="block text-white/40 text-[11px] font-medium mb-1">To</label>
          <input
            type="date"
            className="input-glass text-sm py-2"
            value={toInputDate(filters.to)}
            onChange={e => onChange({ ...filters, to: endOfDay(new Date(e.target.value + 'T00:00:00')) })}
          />
        </div>
        <div>
          <label className="block text-white/40 text-[11px] font-medium mb-1">Project</label>
          <select
            className="select-glass w-full text-sm py-2"
            value={filters.project_id}
            onChange={e => onChange({ ...filters, project_id: e.target.value })}
          >
            <option value="">All Projects</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-white/40 text-[11px] font-medium mb-1">Client</label>
          <select
            className="select-glass w-full text-sm py-2"
            value={filters.client_id}
            onChange={e => onChange({ ...filters, client_id: e.target.value })}
          >
            <option value="">All Clients</option>
            {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}
