import { Hono } from 'hono'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { generateId } from '../utils/crypto'
import type { Env } from '../types'

const lotTasks = new Hono<{ Bindings: Env }>()

// Helper : vérifie que le lot appartient à la company de l'utilisateur
async function assertLotOwnership(db: any, lotId: string, companyId: string | null): Promise<boolean> {
  if (!companyId) return true
  const owner = await db.prepare(
    'SELECT p.company_id FROM lots l JOIN projects p ON p.id = l.project_id WHERE l.id = ?'
  ).bind(lotId).first<any>()
  return !!(owner && owner.company_id === companyId)
}

// Helper : vérifie que la tâche appartient à la company de l'utilisateur
async function assertTaskOwnership(db: any, taskId: string, companyId: string | null): Promise<boolean> {
  if (!companyId) return true
  const owner = await db.prepare(
    'SELECT p.company_id FROM lot_tasks lt JOIN lots l ON l.id = lt.lot_id JOIN projects p ON p.id = l.project_id WHERE lt.id = ?'
  ).bind(taskId).first<any>()
  return !!(owner && owner.company_id === companyId)
}

// GET /api/lots/:id/tasks
lotTasks.get('/lots/:id/tasks', requireAuth, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  if (!await assertLotOwnership(c.env.DB, id, user.company_id)) return c.json({ error: 'Forbidden' }, 403)
  const rows = await c.env.DB.prepare(`
    SELECT lt.*, u.first_name || ' ' || COALESCE(u.last_name,'') as subcontractor_name
    FROM lot_tasks lt
    LEFT JOIN users u ON u.id = lt.subcontractor_id
    WHERE lt.lot_id = ?
    ORDER BY lt.sort_order, lt.created_at
  `).bind(id).all()
  return c.json(rows.results)
})

// GET /api/projects/:id/lot-tasks — all tasks for all lots of a project
lotTasks.get('/projects/:id/lot-tasks', requireAuth, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  if (user.company_id) {
    const proj = await c.env.DB.prepare('SELECT company_id FROM projects WHERE id = ?').bind(id).first<any>()
    if (!proj || proj.company_id !== user.company_id) return c.json({ error: 'Forbidden' }, 403)
  }
  const rows = await c.env.DB.prepare(`
    SELECT lt.*, u.first_name || ' ' || COALESCE(u.last_name,'') as subcontractor_name
    FROM lot_tasks lt
    JOIN lots l ON l.id = lt.lot_id
    LEFT JOIN users u ON u.id = lt.subcontractor_id
    WHERE l.project_id = ?
    ORDER BY lt.sort_order, lt.created_at
  `).bind(id).all()
  return c.json(rows.results)
})

// POST /api/lots/:id/tasks
lotTasks.post('/lots/:id/tasks', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  if (!await assertLotOwnership(c.env.DB, id, user.company_id)) return c.json({ error: 'Forbidden' }, 403)
  const body = await c.req.json()
  if (!body.name) return c.json({ error: 'name is required' }, 400)
  const tid = generateId('task')
  const notes = body.notes ? String(body.notes).slice(0, 1500) : null
  await c.env.DB.prepare(
    'INSERT INTO lot_tasks (id, lot_id, name, type, start_date, end_date, progress, subcontractor_id, sort_order, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    tid, id,
    body.name,
    body.type || 'custom',
    body.start_date || null,
    body.end_date || null,
    body.progress || 0,
    body.subcontractor_id || null,
    body.sort_order || 0,
    notes
  ).run()
  const row = await c.env.DB.prepare('SELECT * FROM lot_tasks WHERE id = ?').bind(tid).first()
  return c.json(row, 201)
})

// PUT /api/lot-tasks/:id
lotTasks.put('/lot-tasks/:id', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  if (!await assertTaskOwnership(c.env.DB, id, user.company_id)) return c.json({ error: 'Forbidden' }, 403)
  const body = await c.req.json()
  const notes = body.notes !== undefined ? (body.notes ? String(body.notes).slice(0, 1500) : null) : undefined
  await c.env.DB.prepare(
    'UPDATE lot_tasks SET name=?, type=?, start_date=?, end_date=?, progress=?, subcontractor_id=?, sort_order=?, notes=? WHERE id=?'
  ).bind(
    body.name,
    body.type || 'custom',
    body.start_date || null,
    body.end_date || null,
    body.progress ?? 0,
    body.subcontractor_id || null,
    body.sort_order || 0,
    notes ?? null,
    id
  ).run()
  const row = await c.env.DB.prepare('SELECT * FROM lot_tasks WHERE id = ?').bind(id).first()
  return c.json(row)
})

// DELETE /api/lot-tasks/:id
lotTasks.delete('/lot-tasks/:id', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  if (!await assertTaskOwnership(c.env.DB, id, user.company_id)) return c.json({ error: 'Forbidden' }, 403)
  await c.env.DB.prepare('DELETE FROM lot_tasks WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

export default lotTasks
