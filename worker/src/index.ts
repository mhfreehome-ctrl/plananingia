import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types'
import authRoutes from './routes/auth'
import projectRoutes from './routes/projects'
import lotRoutes from './routes/lots'
import planningRoutes from './routes/planning'
import subRoutes from './routes/subcontractor'
import notifRoutes from './routes/notifications'
import userRoutes from './routes/users'
import milestoneRoutes from './routes/milestones'
import lotTaskRoutes from './routes/lot-tasks'
import lotAssignmentRoutes from './routes/lot-assignments'
import teamRoutes from './routes/teams'
import clientRoutes from './routes/clients'
import companyRoutes from './routes/companies'
import platformRoutes from './routes/platform'

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors({
  origin: ['https://planningia.pages.dev', 'https://planningia.com', 'https://www.planningia.com', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))


app.get('/health', (c) => c.json({ status: 'ok', version: '1.0.0' }))

app.route('/api/auth', authRoutes)
app.route('/api/projects', projectRoutes)
app.route('/api', lotRoutes)
app.route('/api', planningRoutes)
app.route('/api/my', subRoutes)
app.route('/api/notifications', notifRoutes)
app.route('/api/users', userRoutes)
app.route('/api', milestoneRoutes)
app.route('/api', lotTaskRoutes)
app.route('/api', lotAssignmentRoutes)
app.route('/api', teamRoutes)
app.route('/api/clients', clientRoutes)
app.route('/api/companies', companyRoutes)
app.route('/api/platform', platformRoutes)

app.notFound((c) => c.json({ error: 'Not found' }, 404))
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app
