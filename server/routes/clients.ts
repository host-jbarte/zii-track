import { Hono } from 'hono'
import db from '../db.js'

const router = new Hono()

router.get('/', (c) => {
  const rows = db.prepare(`
    SELECT c.*,
           (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id) as project_count,
           (SELECT COALESCE(SUM(e.stopped_at - e.started_at), 0) FROM time_entries e WHERE e.client_id = c.id AND e.stopped_at IS NOT NULL) as total_duration
    FROM clients c
    ORDER BY c.name ASC
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
