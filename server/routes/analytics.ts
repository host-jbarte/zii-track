import { Hono } from 'hono'
import db from '../db.js'
import { requireAuth } from '../middleware/auth.js'

type AuthUser = { id: number; email: string; role: string; name: string }
type Vars = { Variables: { user: AuthUser } }

const router = new Hono<Vars>()

// Returns daily work/break breakdown for the past N days
router.get('/daily', requireAuth, (c) => {
  const authUser = c.get('user')
  const days = Math.min(Number(c.req.query('days') || 30), 90)
  const userId = c.req.query('user_id') && authUser.role === 'manager'
    ? Number(c.req.query('user_id'))
    : authUser.id

  // Generate a series of dates (past N days including today)
  const now = Date.now()
  const msPerDay = 86400000

  const results = []
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(now - i * msPerDay)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setHours(23, 59, 59, 999)

    const entries = db.prepare(`
      SELECT stopped_at - started_at as duration, is_break
      FROM time_entries
      WHERE user_id = ?
        AND stopped_at IS NOT NULL
        AND started_at >= ? AND started_at <= ?
    `).all(userId, dayStart.getTime(), dayEnd.getTime()) as any[]

    const work_ms = entries.filter(e => !e.is_break).reduce((s, e) => s + e.duration, 0)
    const break_ms = entries.filter(e => e.is_break).reduce((s, e) => s + e.duration, 0)

    // Use local date string to avoid UTC offset shifting the date label
    const localDate = `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, '0')}-${String(dayStart.getDate()).padStart(2, '0')}`
    results.push({
      date: localDate,
      work_ms,
      break_ms,
      entry_count: entries.filter(e => !e.is_break).length,
    })
  }

  return c.json(results)
})

export default router
