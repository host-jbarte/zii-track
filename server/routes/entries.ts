import { Hono } from 'hono'
import db from '../db.js'

const router = new Hono()

const withJoins = `
  SELECT e.*,
         p.name as project_name, p.color as project_color,
         cl.name as client_name, cl.color as client_color
  FROM time_entries e
  LEFT JOIN projects p ON e.project_id = p.id
  LEFT JOIN clients cl ON e.client_id = cl.id
`

router.get('/', (c) => {
  const { from, to, project_id, client_id } = c.req.query()
  let q = withJoins + ' WHERE 1=1'
  const p: any[] = []
  if (from) { q += ' AND e.started_at >= ?'; p.push(Number(from)) }
  if (to) { q += ' AND e.started_at <= ?'; p.push(Number(to)) }
  if (project_id) { q += ' AND e.project_id = ?'; p.push(Number(project_id)) }
  if (client_id) { q += ' AND e.client_id = ?'; p.push(Number(client_id)) }
  q += ' ORDER BY e.started_at DESC'
  return c.json(db.prepare(q).all(...p))
})

router.get('/running', (c) => {
  const entry = db.prepare(withJoins + ' WHERE e.stopped_at IS NULL ORDER BY e.started_at DESC LIMIT 1').get()
  return c.json(entry || null)
})

router.post('/start', async (c) => {
  const body = await c.req.json()
  // Stop any currently running entry
  db.prepare('UPDATE time_entries SET stopped_at = ? WHERE stopped_at IS NULL').run(Date.now())
  const result = db.prepare(
    'INSERT INTO time_entries (description, project_id, client_id, started_at) VALUES (?, ?, ?, ?)'
  ).run(body.description || '', body.project_id || null, body.client_id || null, Date.now())
  const entry = db.prepare(withJoins + ' WHERE e.id = ?').get(result.lastInsertRowid)
  return c.json(entry, 201)
})

router.post('/:id/stop', (c) => {
  const id = Number(c.req.param('id'))
  db.prepare('UPDATE time_entries SET stopped_at = ? WHERE id = ? AND stopped_at IS NULL').run(Date.now(), id)
  return c.json(db.prepare(withJoins + ' WHERE e.id = ?').get(id))
})

router.post('/', async (c) => {
  const body = await c.req.json()
  const result = db.prepare(
    'INSERT INTO time_entries (description, project_id, client_id, started_at, stopped_at) VALUES (?, ?, ?, ?, ?)'
  ).run(body.description || '', body.project_id || null, body.client_id || null, body.started_at, body.stopped_at)
  return c.json(db.prepare(withJoins + ' WHERE e.id = ?').get(result.lastInsertRowid), 201)
})

router.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  db.prepare(
    'UPDATE time_entries SET description=?, project_id=?, client_id=?, started_at=?, stopped_at=? WHERE id=?'
  ).run(body.description || '', body.project_id || null, body.client_id || null, body.started_at, body.stopped_at, id)
  return c.json(db.prepare(withJoins + ' WHERE e.id = ?').get(id))
})

router.delete('/:id', (c) => {
  db.prepare('DELETE FROM time_entries WHERE id = ?').run(Number(c.req.param('id')))
  return c.json({ ok: true })
})

export default router
