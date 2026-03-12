import { Hono } from 'hono'
import db from '../db.js'

const router = new Hono()

router.get('/', (c) => {
  const rows = db.prepare(`
    SELECT c.*,
           COUNT(DISTINCT p.id) as project_count,
           COALESCE(SUM(CASE WHEN e.stopped_at IS NOT NULL THEN e.stopped_at - e.started_at ELSE 0 END), 0) as total_duration
    FROM clients c
    LEFT JOIN projects p ON c.id = p.client_id
    LEFT JOIN time_entries e ON c.id = e.client_id
    GROUP BY c.id ORDER BY c.name ASC
  `).all()
  return c.json(rows)
})

router.post('/', async (c) => {
  const body = await c.req.json()
  try {
    const result = db.prepare('INSERT INTO clients (name, color) VALUES (?, ?)').run(
      body.name, body.color || '#7c3aed'
    )
    return c.json(db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid), 201)
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return c.json({ error: 'Client name already exists' }, 400)
    throw e
  }
})

router.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  db.prepare('UPDATE clients SET name=?, color=? WHERE id=?').run(body.name, body.color, id)
  return c.json(db.prepare('SELECT * FROM clients WHERE id = ?').get(id))
})

router.delete('/:id', (c) => {
  db.prepare('DELETE FROM clients WHERE id = ?').run(Number(c.req.param('id')))
  return c.json({ ok: true })
})

export default router
