import { formatDurationShort, formatTime } from '../../utils/time'
import { format } from 'date-fns'

interface ReportTableProps {
  entries: any[]
}

export default function ReportTable({ entries }: ReportTableProps) {
  if (entries.length === 0) {
    return (
      <div className="py-12 text-center text-white/30 text-sm">
        No entries for the selected period.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.07]">
            {['Date', 'Description', 'Client', 'Project', 'Time', 'Duration'].map(h => (
              <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wider pb-3 pr-4 last:pr-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {entries.map(e => (
            <tr key={e.id} className="group hover:bg-white/[0.02] transition-colors">
              <td className="py-3 pr-4 text-white/40 text-xs tabular-nums whitespace-nowrap">
                {format(new Date(e.started_at), 'MMM d, yyyy')}
              </td>
              <td className="py-3 pr-4 text-white/80 max-w-xs truncate">
                {e.description || <span className="text-white/25 italic">No description</span>}
              </td>
              <td className="py-3 pr-4 min-w-[120px]">
                {e.client_name ? (
                  <span className="tag text-[11px] text-white/50 border-white/10 bg-white/[0.05] whitespace-nowrap">
                    {e.client_name}
                  </span>
                ) : <span className="text-white/20">—</span>}
              </td>
              <td className="py-3 pr-4 min-w-[120px]">
                {e.project_name ? (
                  <span
                    className="tag text-[11px] whitespace-nowrap"
                    style={{
                      color: e.project_color,
                      borderColor: e.project_color + '40',
                      backgroundColor: e.project_color + '15',
                    }}
                  >
                    {e.project_name}
                  </span>
                ) : <span className="text-white/20">—</span>}
              </td>
              <td className="py-3 pr-4 text-xs text-white/30 tabular-nums whitespace-nowrap">
                {formatTime(e.started_at)} – {formatTime(e.stopped_at)}
              </td>
              <td className="py-3 text-sm font-medium text-white/60 tabular-nums text-right">
                {formatDurationShort(e.stopped_at - e.started_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
