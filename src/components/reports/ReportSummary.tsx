import { Clock, Hash, FolderOpen, Users } from 'lucide-react'
import { formatDurationShort } from '../../utils/time'

interface ReportSummaryProps {
  summary: {
    total_duration: number
    entry_count: number
    by_project: Record<string, number>
    by_client: Record<string, number>
  }
}

export default function ReportSummary({ summary }: ReportSummaryProps) {
  const topProject = Object.entries(summary.by_project).sort(([, a], [, b]) => b - a)[0]
  const topClient = Object.entries(summary.by_client).sort(([, a], [, b]) => b - a)[0]

  const cards = [
    {
      icon: Clock,
      label: 'Total Time',
      value: formatDurationShort(summary.total_duration),
      color: 'text-cyan-400',
      glow: 'rgba(6,182,212,0.2)',
    },
    {
      icon: Hash,
      label: 'Entries',
      value: String(summary.entry_count),
      color: 'text-blue-400',
      glow: 'rgba(59,130,246,0.2)',
    },
    {
      icon: FolderOpen,
      label: 'Top Project',
      value: topProject ? topProject[0] : '—',
      sub: topProject ? formatDurationShort(topProject[1]) : '',
      color: 'text-emerald-400',
      glow: 'rgba(16,185,129,0.2)',
    },
    {
      icon: Users,
      label: 'Top Client',
      value: topClient ? topClient[0] : '—',
      sub: topClient ? formatDurationShort(topClient[1]) : '',
      color: 'text-amber-400',
      glow: 'rgba(245,158,11,0.2)',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map(({ icon: Icon, label, value, sub, color, glow }) => (
        <div
          key={label}
          className="glass rounded-2xl p-4"
          style={{ boxShadow: `inset 0 0 40px ${glow}` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Icon size={14} className={color} />
            <span className="text-white/40 text-[11px] font-medium uppercase tracking-wider">{label}</span>
          </div>
          <div className={`text-xl font-semibold ${color} truncate`}>{value}</div>
          {sub && <div className="text-white/30 text-xs mt-0.5">{sub}</div>}
        </div>
      ))}
    </div>
  )
}
