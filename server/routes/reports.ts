import { Hono } from 'hono'
import db from '../db.js'

const router = new Hono()

router.get('/', (c) => {
  const { from, to, project_id, client_id } = c.req.query()
  let q = `
    SELECT e.*,
           p.name as project_name, p.color as project_color,
           cl.name as client_name, cl.color as client_color
    FROM time_entries e
    LEFT JOIN projects p ON e.project_id = p.id
    LEFT JOIN clients cl ON e.client_id = cl.id
    WHERE e.stopped_at IS NOT NULL
  `
  const params: any[] = []
  if (from) { q += ' AND e.started_at >= ?'; params.push(Number(from)) }
  if (to) { q += ' AND e.started_at <= ?'; params.push(Number(to)) }
  if (project_id) { q += ' AND e.project_id = ?'; params.push(Number(project_id)) }
  if (client_id) { q += ' AND e.client_id = ?'; params.push(Number(client_id)) }
  q += ' ORDER BY e.started_at DESC'

  const entries = db.prepare(q).all(...params) as any[]
  const totalDuration = entries.reduce((s, e) => s + (e.stopped_at - e.started_at), 0)

  const byProject: Record<string, number> = {}
  const byClient: Record<string, number> = {}
  entries.forEach(e => {
    const pk = e.project_name || 'No Project'
    const ck = e.client_name || 'No Client'
    byProject[pk] = (byProject[pk] || 0) + (e.stopped_at - e.started_at)
    byClient[ck] = (byClient[ck] || 0) + (e.stopped_at - e.started_at)
  })

  return c.json({ entries, summary: { total_duration: totalDuration, entry_count: entries.length, by_project: byProject, by_client: byClient } })
})

export default router
