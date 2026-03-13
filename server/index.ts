import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import entriesRouter from './routes/entries.js'
import projectsRouter from './routes/projects.js'
import clientsRouter from './routes/clients.js'
import reportsRouter from './routes/reports.js'
import authRouter from './routes/auth.js'
import usersRouter from './routes/users.js'
import analyticsRouter from './routes/analytics.js'

const app = new Hono()

app.use('*', cors())

app.route('/api/auth', authRouter)
app.route('/api/users', usersRouter)
app.route('/api/analytics', analyticsRouter)
app.route('/api/entries', entriesRouter)
app.route('/api/projects', projectsRouter)
app.route('/api/clients', clientsRouter)
app.route('/api/reports', reportsRouter)

app.get('/api/health', (c) => c.json({ status: 'ok', app: 'Tempo Ticker' }))

serve({ fetch: app.fetch, port: 3001 }, (info) => {
  console.log(`\n  ▲ Tempo Ticker API  →  http://localhost:${info.port}\n`)
})
