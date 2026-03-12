import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useRunningTimer() {
  const { data: runningEntry, isLoading } = useQuery({
    queryKey: ['running'],
    queryFn: () => api.entries.running(),
    refetchInterval: 10000,
  })

  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!runningEntry) { setElapsed(0); return }
    const tick = () => setElapsed(Date.now() - runningEntry.started_at)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [runningEntry?.id, runningEntry?.started_at])

  return { runningEntry: runningEntry ?? null, elapsed, isLoading }
}
