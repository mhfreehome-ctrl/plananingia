import { Hono } from 'hono'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { generateId } from '../utils/crypto'
import type { Env } from '../types'

const milestones = new Hono<{ Bindings: Env }>()

// GET /api/projects/:id/milestones
milestones.get('/projects/:id/milestones', requireAuth, async (c) => {
  const { id } = c.req.param()
  const rows = await c.env.DB.prepare(
    'SELECT * FROM milestones WHERE project_id = ? ORDER BY date ASC'
  ).bind(id).all()
  return c.json(rows.results)
})

// POST /api/projects/:id/milestones
milestones.post('/projects/:id/milestones', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json()
  if (!body.name || !body.date) return c.json({ error: 'name and date are required' }, 400)
  const mid = generateId('ms')
  await c.env.DB.prepare(
    'INSERT INTO milestones (id, project_id, name, date, color) VALUES (?, ?, ?, ?, ?)'
  ).bind(mid, id, body.name, body.date, body.color || '#ef4444').run()
  const row = await c.env.DB.prepare('SELECT * FROM milestones WHERE id = ?').bind(mid).first()
  return c.json(row, 201)
})

// PUT /api/milestones/:id
milestones.put('/milestones/:id', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  const ms = await c.env.DB.prepare(
    'SELECT m.id, p.company_id FROM milestones m JOIN projects p ON p.id = m.project_id WHERE m.id = ?'
  ).bind(id).first<any>()
  if (!ms || (user.company_id && ms.company_id !== user.company_id)) return c.json({ error: 'Forbidden' }, 403)
  const body = await c.req.json()
  await c.env.DB.prepare(
    'UPDATE milestones SET name=?, date=?, color=? WHERE id=?'
  ).bind(body.name, body.date, body.color || '#ef4444', id).run()
  const row = await c.env.DB.prepare('SELECT * FROM milestones WHERE id = ?').bind(id).first()
  return c.json(row)
})

// DELETE /api/milestones/:id
milestones.delete('/milestones/:id', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  const ms = await c.env.DB.prepare(
    'SELECT m.id, p.company_id FROM milestones m JOIN projects p ON p.id = m.project_id WHERE m.id = ?'
  ).bind(id).first<any>()
  if (!ms || (user.company_id && ms.company_id !== user.company_id)) return c.json({ error: 'Forbidden' }, 403)
  await c.env.DB.prepare('DELETE FROM milestones WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

export default milestones
