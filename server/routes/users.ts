import { Hono } from 'hono'
import db from '../db.js'
import { requireAuth, requireManager } from '../middleware/auth.js'

type AuthUser = { id: number; email: string; role: string; name: string }
type Vars = { Variables: { user: AuthUser } }

const router = new Hono<Vars>()

// List all users — manager only
router.get('/', requireAuth, requireManager, (c) => {
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.created_at,
           COUNT(e.id) as entry_count,
           COALESCE(SUM(CASE WHEN e.stopped_at IS NOT NULL THEN e.stopped_at - e.started_at ELSE 0 END), 0) as total_duration
    FROM users u
    LEFT JOIN time_entries e ON u.id = e.user_id
    GROUP BY u.id
    ORDER BY u.name ASC
  `).all()
  return c.json(users)
})

// Update user role — manager only
router.put('/:id/role', requireAuth, requireManager, async (c) => {
  const id = Number(c.req.param('id'))
  const authUser = c.get('user') as any
  if (id === authUser.id) return c.json({ error: 'Cannot change your own role' }, 400)

  const { role } = await c.req.json()
  if (role !== 'manager' && role !== 'member') return c.json({ error: 'Role must be manager or member' }, 400)

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id)
  return c.json(db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(id))
})

// Delete user — manager only
router.delete('/:id', requireAuth, requireManager, (c) => {
  const id = Number(c.req.param('id'))
  const authUser = c.get('user') as any
  if (id === authUser.id) return c.json({ error: 'Cannot delete yourself' }, 400)

  db.prepare('DELETE FROM users WHERE id = ?').run(id)
  return c.json({ ok: true })
})

export default router
