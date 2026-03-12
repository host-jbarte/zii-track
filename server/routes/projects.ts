import { Hono } from 'hono'
import db from '../db.js'

const router = new Hono()

router.get('/', (c) => {
  const rows = db.prepare(`
    SELECT p.*, c.name as client_name, c.color as client_color,
           COUNT(e.id) as entry_count,
           COALESCE(SUM(CASE WHEN e.stopped_at IS NOT NULL THEN e.stopped_at - e.started_at ELSE 0 END), 0) as total_duration
    FROM projects p
    LEFT JOIN clients c ON p.client_id = c.id
    LEFT JOIN time_entries e ON p.id = e.project_id
    GROUP BY p.id ORDER BY p.name ASC
  `).all()
  return c.json(rows)
})

router.post('/', async (c) => {
  const body = await c.req.json()
  const result = db.prepare('INSERT INTO projects (name, client_id, color) VALUES (?, ?, ?)').run(
    body.name, body.client_id || null, body.color || '#7c3aed'
  )
  return c.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid), 201)
})

router.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  db.prepare('UPDATE projects SET name=?, client_id=?, color=?, archived=? WHERE id=?').run(
    body.name, body.client_id || null, body.color, body.archived ? 1 : 0, id
  )
  return c.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(id))
})

router.delete('/:id', (c) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(Number(c.req.param('id')))
  return c.json({ ok: true })
})

export default router
