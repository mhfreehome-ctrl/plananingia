import { Hono } from 'hono'
import { requireAdmin, requireFullAdmin } from '../middleware/auth'
import { hashPassword } from '../utils/crypto'
import type { Env } from '../types'

const users = new Hono<{ Bindings: Env }>()

users.get('/', requireAdmin, async (c) => {
  const user = c.get('user')
  let rows
  if (user.company_id) {
    // Filtrer par company_id : l'admin ne voit que son entreprise
    rows = await c.env.DB.prepare(
      'SELECT id, email, role, user_type, access_level, first_name, last_name, company_name, phone, lang, is_active, created_at FROM users WHERE company_id = ? ORDER BY role, user_type, created_at DESC'
    ).bind(user.company_id).all()
  } else {
    // Admin sans company_id (comptes démo) : voir tous
    rows = await c.env.DB.prepare(
      'SELECT id, email, role, user_type, access_level, first_name, last_name, company_name, phone, lang, is_active, created_at FROM users ORDER BY role, user_type, created_at DESC'
    ).all()
  }
  return c.json(rows.results)
})

users.get('/:id', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  const u = await c.env.DB.prepare(
    'SELECT id, email, role, user_type, access_level, first_name, last_name, company_name, phone, lang, is_active, created_at, company_id FROM users WHERE id = ?'
  ).bind(id).first<any>()
  if (!u) return c.json({ error: 'Not found' }, 404)
  // Vérif isolation company
  if (user.company_id && u.company_id !== user.company_id) return c.json({ error: 'Forbidden' }, 403)
  return c.json(u)
})

// PUT /api/users/:id — update user info (full admin only)
users.put('/:id', requireFullAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  // Vérif company_id avant update
  if (user.company_id) {
    const existing = await c.env.DB.prepare('SELECT company_id FROM users WHERE id = ?').bind(id).first<any>()
    if (!existing || existing.company_id !== user.company_id) return c.json({ error: 'Forbidden' }, 403)
  }
  const body = await c.req.json()
  await c.env.DB.prepare(
    `UPDATE users SET first_name=?, last_name=?, email=?, company_name=?, phone=?, lang=?, user_type=?, access_level=?, updated_at=datetime('now') WHERE id=?`
  ).bind(
    body.first_name || null,
    body.last_name || null,
    body.email ? body.email.toLowerCase().trim() : null,
    body.company_name || null,
    body.phone || null,
    body.lang || 'fr',
    body.user_type || 'subcontractor',
    body.access_level || 'editeur',
    id
  ).run()
  const u = await c.env.DB.prepare(
    'SELECT id, email, role, user_type, access_level, first_name, last_name, company_name, phone, lang, is_active, created_at FROM users WHERE id = ?'
  ).bind(id).first()
  return c.json(u)
})

users.delete('/:id', requireFullAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  if (user.company_id) {
    const existing = await c.env.DB.prepare('SELECT company_id, role FROM users WHERE id = ?').bind(id).first<any>()
    if (!existing || existing.company_id !== user.company_id) return c.json({ error: 'Forbidden' }, 403)
  }
  await c.env.DB.prepare('DELETE FROM users WHERE id = ? AND role != \'admin\'').bind(id).run()
  return c.json({ ok: true })
})

// POST /api/users/:id/reset-password — full admin seulement — génère un mot de passe temporaire
users.post('/:id/reset-password', requireFullAdmin, async (c) => {
  const { id } = c.req.param()
  const admin = c.get('user')
  // Isolation company
  if (admin.company_id) {
    const target = await c.env.DB.prepare('SELECT company_id, role FROM users WHERE id = ?').bind(id).first<any>()
    if (!target) return c.json({ error: 'Not found' }, 404)
    if (target.company_id !== admin.company_id) return c.json({ error: 'Forbidden' }, 403)
  }
  // Générer mot de passe temporaire : Motdepasse + 4 chiffres aléatoires
  const digits = Math.floor(1000 + Math.random() * 9000)
  const tempPassword = `Temp${digits}!`
  const hash = await hashPassword(tempPassword)
  await c.env.DB.prepare(
    `UPDATE users SET password_hash=?, updated_at=datetime('now') WHERE id=?`
  ).bind(hash, id).run()
  return c.json({ ok: true, temp_password: tempPassword })
})

// GET /api/users/:id/lots — lots assignés à un utilisateur (via subcontractor_id ou via équipe)
users.get('/:id/lots', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const admin = c.get('user')
  const companyFilter = admin.company_id ? 'AND p.company_id = ?' : ''
  const binds1 = admin.company_id ? [id, admin.company_id] : [id]
  const binds2 = admin.company_id ? [id, admin.company_id] : [id]
  const rows = await c.env.DB.prepare(`
    SELECT DISTINCT l.*, p.name as project_name FROM lots l
    JOIN projects p ON p.id = l.project_id
    WHERE l.subcontractor_id = ? ${companyFilter}
    UNION
    SELECT DISTINCT l.*, p.name as project_name FROM lots l
    JOIN projects p ON p.id = l.project_id
    JOIN team_members tm ON tm.team_id = l.team_id
    WHERE tm.user_id = ? AND l.team_id IS NOT NULL ${companyFilter}
    ORDER BY start_date_planned
  `).bind(...binds1, ...binds2).all()
  return c.json(rows.results)
})

export default users
