import { Hono } from 'hono'
import db from '../db.js'
import { requireAuth } from '../middleware/auth.js'

type AuthUser = { id: number; email: string; role: string; name: string }
type Vars = { Variables: { user: AuthUser } }

const router = new Hono<Vars>()

const withJoins = `
  SELECT e.*,
         p.name as project_name, p.color as project_color,
         cl.name as client_name, cl.color as client_color,
         u.name as user_name
  FROM time_entries e
  LEFT JOIN projects p ON e.project_id = p.id
  LEFT JOIN clients cl ON e.client_id = cl.id
  LEFT JOIN users u ON e.user_id = u.id
`

router.get('/', requireAuth, (c) => {
  const authUser = c.get('user') as any
  const { from, to, project_id, client_id, user_id } = c.req.query()
  let q = withJoins + ' WHERE e.is_break = 0'
  const p: any[] = []

  // Members only see their own entries
  if (authUser.role !== 'manager') {
    q += ' AND e.user_id = ?'; p.push(authUser.id)
  } else if (user_id) {
    q += ' AND e.user_id = ?'; p.push(Number(user_id))
  }

  if (from) { q += ' AND e.started_at >= ?'; p.push(Number(from)) }
  if (to) { q += ' AND e.started_at <= ?'; p.push(Number(to)) }
  if (project_id) { q += ' AND e.project_id = ?'; p.push(Number(project_id)) }
  if (client_id) { q += ' AND e.client_id = ?'; p.push(Number(client_id)) }
  q += ' ORDER BY e.started_at DESC'
  return c.json(db.prepare(q).all(...p))
})

router.get('/running', requireAuth, (c) => {
  const authUser = c.get('user') as any
  const entry = db.prepare(
    withJoins + ' WHERE e.stopped_at IS NULL AND e.user_id = ? ORDER BY e.started_at DESC LIMIT 1'
  ).get(authUser.id)
  return c.json(entry || null)
})

router.post('/break', requireAuth, (c) => {
  const authUser = c.get('user')
  db.prepare('UPDATE time_entries SET stopped_at = ? WHERE stopped_at IS NULL AND user_id = ?').run(Date.now(), authUser.id)
  const result = db.prepare(
    'INSERT INTO time_entries (user_id, description, is_break, started_at) VALUES (?, ?, 1, ?)'
  ).run(authUser.id, 'Break', Date.now())
  return c.json(db.prepare(withJoins + ' WHERE e.id = ?').get(result.lastInsertRowid), 201)
})

router.post('/start', requireAuth, async (c) => {
  const authUser = c.get('user') as any
  const body = await c.req.json()
  // Stop any running entry for this user
  db.prepare('UPDATE time_entries SET stopped_at = ? WHERE stopped_at IS NULL AND user_id = ?').run(Date.now(), authUser.id)
  const result = db.prepare(
    'INSERT INTO time_entries (user_id, description, project_id, client_id, is_billable, started_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(authUser.id, body.description || '', body.project_id || null, body.client_id || null, body.is_billable ?? 1, Date.now())
  return c.json(db.prepare(withJoins + ' WHERE e.id = ?').get(result.lastInsertRowid), 201)
})

router.post('/:id/stop', requireAuth, (c) => {
  const id = Number(c.req.param('id'))
  db.prepare('UPDATE time_entries SET stopped_at = ? WHERE id = ? AND stopped_at IS NULL').run(Date.now(), id)
  return c.json(db.prepare(withJoins + ' WHERE e.id = ?').get(id))
})

router.post('/', requireAuth, async (c) => {
  const authUser = c.get('user') as any
  const body = await c.req.json()
  const result = db.prepare(
    'INSERT INTO time_entries (user_id, description, project_id, client_id, is_billable, started_at, stopped_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(authUser.id, body.description || '', body.project_id || null, body.client_id || null, body.is_billable ?? 1, body.started_at, body.stopped_at)
  return c.json(db.prepare(withJoins + ' WHERE e.id = ?').get(result.lastInsertRowid), 201)
})

router.put('/:id', requireAuth, async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  db.prepare(
    'UPDATE time_entries SET description=?, project_id=?, client_id=?, is_billable=?, started_at=?, stopped_at=? WHERE id=?'
  ).run(body.description || '', body.project_id || null, body.client_id || null, body.is_billable ?? 1, body.started_at, body.stopped_at, id)
  return c.json(db.prepare(withJoins + ' WHERE e.id = ?').get(id))
})

router.delete('/:id', requireAuth, (c) => {
  db.prepare('DELETE FROM time_entries WHERE id = ?').run(Number(c.req.param('id')))
  return c.json({ ok: true })
})

export default router
