import { Hono } from 'hono'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { generateId } from '../utils/crypto'
import type { Env } from '../types'

const lotAssignments = new Hono<{ Bindings: Env }>()

// Helper : vérifie que le lot appartient à la company de l'utilisateur
async function assertLotOwnership(db: any, lotId: string, companyId: string | null): Promise<boolean> {
  if (!companyId) return true // super-admin (pas de company_id)
  const owner = await db.prepare(
    'SELECT p.company_id FROM lots l JOIN projects p ON p.id = l.project_id WHERE l.id = ?'
  ).bind(lotId).first<any>()
  return !!(owner && owner.company_id === companyId)
}

// Helper : vérifie que l'assignment appartient à la company de l'utilisateur
async function assertAssignmentOwnership(db: any, assignmentId: string, companyId: string | null): Promise<boolean> {
  if (!companyId) return true
  const owner = await db.prepare(
    'SELECT p.company_id FROM lot_assignments la JOIN lots l ON l.id = la.lot_id JOIN projects p ON p.id = l.project_id WHERE la.id = ?'
  ).bind(assignmentId).first<any>()
  return !!(owner && owner.company_id === companyId)
}

// GET /api/lots/:id/assignments
lotAssignments.get('/lots/:id/assignments', requireAuth, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  if (!await assertLotOwnership(c.env.DB, id, user.company_id)) return c.json({ error: 'Forbidden' }, 403)
  const rows = await c.env.DB.prepare(`
    SELECT la.*, u.first_name || ' ' || COALESCE(u.last_name,'') as subcontractor_name,
           u.company_name
    FROM lot_assignments la
    JOIN users u ON u.id = la.subcontractor_id
    WHERE la.lot_id = ?
    ORDER BY la.created_at
  `).bind(id).all()
  return c.json(rows.results)
})

// GET /api/projects/:id/lot-assignments — all assignments for all lots of a project
lotAssignments.get('/projects/:id/lot-assignments', requireAuth, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  if (user.company_id) {
    const proj = await c.env.DB.prepare('SELECT company_id FROM projects WHERE id = ?').bind(id).first<any>()
    if (!proj || proj.company_id !== user.company_id) return c.json({ error: 'Forbidden' }, 403)
  }
  const rows = await c.env.DB.prepare(`
    SELECT la.*, u.first_name || ' ' || COALESCE(u.last_name,'') as subcontractor_name,
           u.company_name
    FROM lot_assignments la
    JOIN lots l ON l.id = la.lot_id
    JOIN users u ON u.id = la.subcontractor_id
    WHERE l.project_id = ?
    ORDER BY la.created_at
  `).bind(id).all()
  return c.json(rows.results)
})

// POST /api/lots/:id/assignments
lotAssignments.post('/lots/:id/assignments', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  if (!await assertLotOwnership(c.env.DB, id, user.company_id)) return c.json({ error: 'Forbidden' }, 403)
  const body = await c.req.json()
  if (!body.subcontractor_id) return c.json({ error: 'subcontractor_id is required' }, 400)
  const aid = generateId('asgn')
  await c.env.DB.prepare(
    'INSERT INTO lot_assignments (id, lot_id, subcontractor_id, start_date, end_date, progress, comment) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    aid, id,
    body.subcontractor_id,
    body.start_date || null,
    body.end_date || null,
    body.progress || 0,
    body.comment || null
  ).run()
  const row = await c.env.DB.prepare(`
    SELECT la.*, u.first_name || ' ' || COALESCE(u.last_name,'') as subcontractor_name,
           u.company_name
    FROM lot_assignments la
    JOIN users u ON u.id = la.subcontractor_id
    WHERE la.id = ?
  `).bind(aid).first()
  return c.json(row, 201)
})

// PUT /api/lot-assignments/:id
lotAssignments.put('/lot-assignments/:id', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  if (!await assertAssignmentOwnership(c.env.DB, id, user.company_id)) return c.json({ error: 'Forbidden' }, 403)
  const body = await c.req.json()
  await c.env.DB.prepare(
    'UPDATE lot_assignments SET start_date=?, end_date=?, progress=?, comment=? WHERE id=?'
  ).bind(
    body.start_date || null,
    body.end_date || null,
    body.progress ?? 0,
    body.comment || null,
    id
  ).run()
  const row = await c.env.DB.prepare(`
    SELECT la.*, u.first_name || ' ' || COALESCE(u.last_name,'') as subcontractor_name,
           u.company_name
    FROM lot_assignments la
    JOIN users u ON u.id = la.subcontractor_id
    WHERE la.id = ?
  `).bind(id).first()
  return c.json(row)
})

// DELETE /api/lot-assignments/:id
lotAssignments.delete('/lot-assignments/:id', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  if (!await assertAssignmentOwnership(c.env.DB, id, user.company_id)) return c.json({ error: 'Forbidden' }, 403)
  await c.env.DB.prepare('DELETE FROM lot_assignments WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

export default lotAssignments
