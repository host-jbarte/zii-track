import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { formatDateLabel, formatDurationShort, startOfDay } from '../../utils/time'
import EntryRow from './EntryRow'
import { Clock } from 'lucide-react'

export default function EntryList() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['entries'],
    queryFn: () => api.entries.list(),
    refetchInterval: 15000,
  })

  const grouped = useMemo(() => {
    const map: Record<number, { entries: any[]; totalMs: number }> = {}
    for (const e of entries) {
      const day = startOfDay(new Date(e.started_at))
      if (!map[day]) map[day] = { entries: [], totalMs: 0 }
      map[day].entries.push(e)
      if (e.stopped_at) map[day].totalMs += e.stopped_at - e.started_at
    }
    return Object.entries(map)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([day, val]) => ({ day: Number(day), ...val }))
  }, [entries])

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 rounded-xl glass animate-pulse" />
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center mb-4">
          <Clock size={24} className="text-white/20" />
        </div>
        <p className="text-white/40 text-sm font-medium">No time entries yet</p>
        <p className="text-white/20 text-xs mt-1">Start the timer or add a manual entry</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {grouped.map(({ day, entries: dayEntries, totalMs }) => (
        <div key={day}>
          {/* Day header */}
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              {formatDateLabel(day)}
            </span>
            <span className="text-xs font-medium text-white/30 tabular-nums">
              {formatDurationShort(totalMs)}
            </span>
          </div>

          {/* Entries */}
          <div className="space-y-1">
            {dayEntries.map((e: any) => (
              <EntryRow key={e.id} entry={e} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
