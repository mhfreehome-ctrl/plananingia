import { Hono } from 'hono'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { generateId } from '../utils/crypto'
import type { Env } from '../types'

const clients = new Hono<{ Bindings: Env }>()

// GET /api/clients — liste tous les clients avec compteur projets
clients.get('/', requireAuth, async (c) => {
  const user = c.get('user')
  let rows
  if (user.company_id) {
    rows = await c.env.DB.prepare(`
      SELECT c.*, COUNT(p.id) as project_count
      FROM clients c
      LEFT JOIN projects p ON p.client_id = c.id AND p.company_id = ?
      WHERE c.company_id = ?
      GROUP BY c.id
      ORDER BY c.name ASC
    `).bind(user.company_id, user.company_id).all()
  } else {
    rows = await c.env.DB.prepare(`
      SELECT c.*, COUNT(p.id) as project_count
      FROM clients c
      LEFT JOIN projects p ON p.client_id = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all()
  }
  return c.json(rows.results)
})

// GET /api/clients/:id — détail d'un client avec ses projets liés
clients.get('/:id', requireAuth, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  const client = await c.env.DB.prepare(
    'SELECT * FROM clients WHERE id = ?'
  ).bind(id).first<any>()
  if (!client) return c.json({ error: 'Not found' }, 404)
  if (user.company_id && client.company_id !== user.company_id) return c.json({ error: 'Forbidden' }, 403)
  const projectsRows = await c.env.DB.prepare(
    `SELECT id, name, status, start_date, city,
      (SELECT ROUND(AVG(l.progress_percent)) FROM lots l WHERE l.project_id = p.id) as avg_progress
     FROM projects p WHERE client_id = ? ORDER BY start_date DESC`
  ).bind(id).all()
  return c.json({ ...client, projects: projectsRows.results })
})

// POST /api/clients — créer un client (editeur+)
clients.post('/', requireAdmin, async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  if (!body.name?.trim()) return c.json({ error: 'name requis' }, 400)

  const id = generateId('cli')
  await c.env.DB.prepare(`
    INSERT INTO clients (id, name, email, phone, address, city, postal_code, notes, company_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.name.trim(),
    body.email || null,
    body.phone || null,
    body.address || null,
    body.city || null,
    body.postal_code || null,
    body.notes || null,
    user.company_id || null
  ).run()

  const created = await c.env.DB.prepare(
    'SELECT * FROM clients WHERE id = ?'
  ).bind(id).first()
  return c.json(created, 201)
})

// PUT /api/clients/:id — mettre à jour un client (admin uniquement)
clients.put('/:id', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  const body = await c.req.json()

  const existing = await c.env.DB.prepare(
    'SELECT id, company_id FROM clients WHERE id = ?'
  ).bind(id).first<any>()
  if (!existing) return c.json({ error: 'Not found' }, 404)
  if (user.company_id && existing.company_id !== user.company_id) return c.json({ error: 'Forbidden' }, 403)

  if (!body.name?.trim()) return c.json({ error: 'name requis' }, 400)

  await c.env.DB.prepare(`
    UPDATE clients SET
      name = ?, email = ?, phone = ?, address = ?,
      city = ?, postal_code = ?, notes = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.name.trim(),
    body.email || null,
    body.phone || null,
    body.address || null,
    body.city || null,
    body.postal_code || null,
    body.notes || null,
    id
  ).run()

  const updated = await c.env.DB.prepare(
    'SELECT * FROM clients WHERE id = ?'
  ).bind(id).first()
  return c.json(updated)
})

// DELETE /api/clients/:id — supprimer un client (admin uniquement)
clients.delete('/:id', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  const existing = await c.env.DB.prepare('SELECT company_id FROM clients WHERE id = ?').bind(id).first<any>()
  if (!existing) return c.json({ error: 'Not found' }, 404)
  if (user.company_id && existing.company_id !== user.company_id) return c.json({ error: 'Forbidden' }, 403)
  // On ne supprime pas si des projets y sont attachés
  const linked = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM projects WHERE client_id = ?'
  ).bind(id).first<{ cnt: number }>()
  if (linked && linked.cnt > 0) {
    return c.json({ error: `Ce client est utilisé par ${linked.cnt} projet(s)` }, 409)
  }
  await c.env.DB.prepare('DELETE FROM clients WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

export default clients
