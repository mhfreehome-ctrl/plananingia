import { Hono } from 'hono'
import { requireAdmin } from '../middleware/auth'
import { generateId } from '../utils/crypto'
import type { Env } from '../types'

const companies = new Hono<{ Bindings: Env }>()

// GET /api/companies/me — profil de l'entreprise de l'admin connecté
companies.get('/me', requireAdmin, async (c) => {
  const user = c.get('user')
  if (!user.company_id) return c.json({ error: 'No company associated' }, 404)

  const company = await c.env.DB.prepare(
    'SELECT * FROM companies WHERE id = ?'
  ).bind(user.company_id).first()
  if (!company) return c.json({ error: 'Company not found' }, 404)
  return c.json(company)
})

// PUT /api/companies/me — mettre à jour le profil de l'entreprise
companies.put('/me', requireAdmin, async (c) => {
  const user = c.get('user')
  if (!user.company_id) return c.json({ error: 'No company associated' }, 404)

  const body = await c.req.json()
  const lotTypesValue = body.lot_types
    ? (Array.isArray(body.lot_types) ? JSON.stringify(body.lot_types) : body.lot_types)
    : null

  await c.env.DB.prepare(`
    UPDATE companies SET
      name = ?, type = ?, activity = ?, lot_types = ?,
      address = ?, city = ?, postal_code = ?,
      phone = ?, email = ?, siret = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.name,
    body.type || 'entreprise_generale',
    body.activity || null,
    lotTypesValue,
    body.address || null,
    body.city || null,
    body.postal_code || null,
    body.phone || null,
    body.email || null,
    body.siret || null,
    user.company_id
  ).run()

  const updated = await c.env.DB.prepare('SELECT * FROM companies WHERE id = ?').bind(user.company_id).first()
  return c.json(updated)
})

// POST /api/companies — créer une nouvelle entreprise (onboarding admin sans company_id)
companies.post('/', requireAdmin, async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  if (!body.name) return c.json({ error: 'Company name required' }, 400)

  const id = generateId('comp')
  const lotTypesValue = body.lot_types
    ? (Array.isArray(body.lot_types) ? JSON.stringify(body.lot_types) : body.lot_types)
    : null

  await c.env.DB.prepare(`
    INSERT INTO companies (id, name, type, activity, lot_types, address, city, postal_code, phone, email, siret)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.name,
    body.type || 'entreprise_generale',
    body.activity || null,
    lotTypesValue,
    body.address || null,
    body.city || null,
    body.postal_code || null,
    body.phone || null,
    body.email || null,
    body.siret || null
  ).run()

  // Lier l'admin créateur à sa nouvelle entreprise
  await c.env.DB.prepare(
    `UPDATE users SET company_id = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(id, user.sub).run()

  const company = await c.env.DB.prepare('SELECT * FROM companies WHERE id = ?').bind(id).first()
  return c.json(company, 201)
})

export default companies
