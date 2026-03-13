import { Hono } from 'hono'
import db from '../db.js'
import { requireAuth } from '../middleware/auth.js'

type AuthUser = { id: number; email: string; role: string; name: string }
type Vars = { Variables: { user: AuthUser } }

const router = new Hono<Vars>()

router.get('/', requireAuth, (c) => {
  const authUser = c.get('user')
  const { from, to, project_id, client_id, user_id } = c.req.query()
  let q = `
    SELECT e.*,
           p.name as project_name, p.color as project_color,
           cl.name as client_name, cl.color as client_color,
           u.name as user_name
    FROM time_entries e
    LEFT JOIN projects p ON e.project_id = p.id
    LEFT JOIN clients cl ON e.client_id = cl.id
    LEFT JOIN users u ON e.user_id = u.id
    WHERE e.stopped_at IS NOT NULL AND e.is_break = 0
  `
  const params: any[] = []

  // Members only see their own entries
  if (authUser.role !== 'manager') {
    q += ' AND e.user_id = ?'; params.push(authUser.id)
  } else if (user_id) {
    q += ' AND e.user_id = ?'; params.push(Number(user_id))
  }

  if (from) { q += ' AND e.started_at >= ?'; params.push(Number(from)) }
  if (to) { q += ' AND e.started_at <= ?'; params.push(Number(to)) }
  if (project_id) { q += ' AND e.project_id = ?'; params.push(Number(project_id)) }
  if (client_id) { q += ' AND e.client_id = ?'; params.push(Number(client_id)) }
  q += ' ORDER BY e.started_at DESC'

  const entries = db.prepare(q).all(...params) as any[]
  const totalDuration = entries.reduce((s, e) => s + (e.stopped_at - e.started_at), 0)
  const billableDuration = entries.filter(e => e.is_billable).reduce((s, e) => s + (e.stopped_at - e.started_at), 0)

  const byProject: Record<string, number> = {}
  const byClient: Record<string, number> = {}
  entries.forEach(e => {
    const pk = e.project_name || 'No Project'
    const ck = e.client_name || 'No Client'
    byProject[pk] = (byProject[pk] || 0) + (e.stopped_at - e.started_at)
    byClient[ck] = (byClient[ck] || 0) + (e.stopped_at - e.started_at)
  })

  return c.json({ entries, summary: { total_duration: totalDuration, billable_duration: billableDuration, entry_count: entries.length, by_project: byProject, by_client: byClient } })
})

export default router
