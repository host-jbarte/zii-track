import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import db from '../db.js'
import { signToken, requireAuth } from '../middleware/auth.js'

type AuthUser = { id: number; email: string; role: string; name: string }
type Vars = { Variables: { user: AuthUser } }

const router = new Hono<Vars>()

// Register — first user ever becomes manager automatically
router.post('/register', async (c) => {
  const body = await c.req.json()
  const { name, email, password } = body

  if (!name || !email || !password) {
    return c.json({ error: 'name, email, and password are required' }, 400)
  }
  if (password.length < 6) {
    return c.json({ error: 'Password must be at least 6 characters' }, 400)
  }

  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count
  const role = userCount === 0 ? 'manager' : 'member'

  const password_hash = await bcrypt.hash(password, 10)
  try {
    const result = db.prepare(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(name, email.toLowerCase().trim(), password_hash, role)

    const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid) as any
    const token = await signToken({ id: user.id, email: user.email, role: user.role, name: user.name })
    return c.json({ user, token }, 201)
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return c.json({ error: 'Email already in use' }, 400)
    throw e
  }
})

// Login
router.post('/login', async (c) => {
  const body = await c.req.json()
  const { email, password } = body

  if (!email || !password) return c.json({ error: 'email and password are required' }, 400)

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as any
  if (!user) return c.json({ error: 'Invalid email or password' }, 401)

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return c.json({ error: 'Invalid email or password' }, 401)

  const token = await signToken({ id: user.id, email: user.email, role: user.role, name: user.name })
  const { password_hash: _, ...safeUser } = user
  return c.json({ user: safeUser, token })
})

// Get current user
router.get('/me', requireAuth, (c) => {
  const authUser = c.get('user') as any
  const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(authUser.id)
  if (!user) return c.json({ error: 'User not found' }, 404)
  return c.json(user)
})

// Update profile (name / email)
router.put('/profile', requireAuth, async (c) => {
  const authUser = c.get('user') as any
  const { name, email } = await c.req.json()
  if (!name || !email) return c.json({ error: 'name and email are required' }, 400)
  try {
    db.prepare('UPDATE users SET name=?, email=? WHERE id=?').run(name, email.toLowerCase().trim(), authUser.id)
    const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(authUser.id) as any
    const token = await signToken({ id: user.id, email: user.email, role: user.role, name: user.name })
    return c.json({ user, token })
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return c.json({ error: 'Email already in use' }, 400)
    throw e
  }
})

// Change password
router.put('/password', requireAuth, async (c) => {
  const authUser = c.get('user') as any
  const { current_password, new_password } = await c.req.json()
  if (!current_password || !new_password) return c.json({ error: 'current_password and new_password are required' }, 400)
  if (new_password.length < 6) return c.json({ error: 'New password must be at least 6 characters' }, 400)

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(authUser.id) as any
  const valid = await bcrypt.compare(current_password, user.password_hash)
  if (!valid) return c.json({ error: 'Current password is incorrect' }, 401)

  const password_hash = await bcrypt.hash(new_password, 10)
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(password_hash, authUser.id)
  return c.json({ ok: true })
})

export default router
