import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import entriesRouter from './routes/entries.js'
import projectsRouter from './routes/projects.js'
import clientsRouter from './routes/clients.js'
import reportsRouter from './routes/reports.js'

const app = new Hono()

app.use('*', cors())

app.route('/api/entries', entriesRouter)
app.route('/api/projects', projectsRouter)
app.route('/api/clients', clientsRouter)
app.route('/api/reports', reportsRouter)

app.get('/api/health', (c) => c.json({ status: 'ok', app: 'Zii Track' }))

serve({ fetch: app.fetch, port: 3001 }, (info) => {
  console.log(`\n  ▲ Zii Track API  →  http://localhost:${info.port}\n`)
})
