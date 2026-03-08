import { Hono } from 'hono'
import { requireAdmin, requireAuth } from '../middleware/auth'
import { generateId } from '../utils/crypto'
import type { Env } from '../types'

const teams = new Hono<{ Bindings: Env }>()

// GET /api/teams — liste les équipes de la société connectée
teams.get('/teams', requireAuth, async (c) => {
  const user = c.get('user')
  if (!user.company_id) return c.json([])
  const rows = await c.env.DB.prepare(`
    SELECT t.*,
      u.first_name || ' ' || COALESCE(u.last_name,'') as leader_name
    FROM teams t
    LEFT JOIN users u ON u.id = t.leader_id
    WHERE t.company_id = ?
    ORDER BY t.name
  `).bind(user.company_id).all()
  return c.json(rows.results)
})

// GET /api/teams/:id — détail équipe + membres
teams.get('/teams/:id', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  const team = await c.env.DB.prepare('SELECT * FROM teams WHERE id = ? AND company_id = ?').bind(id, user.company_id).first()
  if (!team) return c.json({ error: 'Not found' }, 404)
  const members = await c.env.DB.prepare(`
    SELECT tm.*, u.first_name, u.last_name, u.email, u.company_name, u.user_type
    FROM team_members tm JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = ?
    ORDER BY u.first_name
  `).bind(id).all()
  return c.json({ ...team, members: members.results })
})

// POST /api/teams — créer une équipe
teams.post('/teams', requireAdmin, async (c) => {
  const user = c.get('user')
  if (!user.company_id) return c.json({ error: 'No company associated' }, 400)
  const body = await c.req.json()
  if (!body.name) return c.json({ error: 'Name required' }, 400)
  const id = generateId('team')
  await c.env.DB.prepare(
    'INSERT INTO teams (id, name, color, leader_id, description, company_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, body.name, body.color || '#6B7280', body.leader_id || null, body.description || null, user.company_id).run()
  const team = await c.env.DB.prepare('SELECT * FROM teams WHERE id = ?').bind(id).first()
  return c.json(team, 201)
})

// PUT /api/teams/:id — modifier une équipe
teams.put('/teams/:id', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  const team = await c.env.DB.prepare('SELECT id FROM teams WHERE id = ? AND company_id = ?').bind(id, user.company_id).first()
  if (!team) return c.json({ error: 'Forbidden' }, 403)
  const body = await c.req.json()
  await c.env.DB.prepare(
    `UPDATE teams SET name=?, color=?, leader_id=?, description=?, updated_at=datetime('now') WHERE id=?`
  ).bind(body.name, body.color || '#6B7280', body.leader_id || null, body.description || null, id).run()
  return c.json({ ok: true })
})

// DELETE /api/teams/:id
teams.delete('/teams/:id', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  // Vérifie que l'équipe appartient bien à la société de l'admin
  const team = await c.env.DB.prepare('SELECT id FROM teams WHERE id = ? AND company_id = ?').bind(id, user.company_id).first()
  if (!team) return c.json({ error: 'Not found' }, 404)
  await c.env.DB.prepare('DELETE FROM teams WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

// GET /api/teams/:id/members
teams.get('/teams/:id/members', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  const team = await c.env.DB.prepare('SELECT id FROM teams WHERE id = ? AND company_id = ?').bind(id, user.company_id).first()
  if (!team) return c.json({ error: 'Forbidden' }, 403)
  const rows = await c.env.DB.prepare(`
    SELECT tm.*, u.first_name, u.last_name, u.email, u.company_name, u.user_type
    FROM team_members tm JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = ?
    ORDER BY u.first_name
  `).bind(id).all()
  return c.json(rows.results)
})

// POST /api/teams/:id/members — ajouter un membre
teams.post('/teams/:id/members', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  const team = await c.env.DB.prepare('SELECT id FROM teams WHERE id = ? AND company_id = ?').bind(id, user.company_id).first()
  if (!team) return c.json({ error: 'Forbidden' }, 403)
  const body = await c.req.json()
  if (!body.user_id) return c.json({ error: 'user_id required' }, 400)
  const mid = generateId('tmb')
  try {
    await c.env.DB.prepare(
      'INSERT INTO team_members (id, team_id, user_id, role_in_team) VALUES (?, ?, ?, ?)'
    ).bind(mid, id, body.user_id, body.role_in_team || 'member').run()
    return c.json({ ok: true, id: mid }, 201)
  } catch {
    return c.json({ error: 'User already in team' }, 409)
  }
})

// GET /api/teams/:id/lots — tous les lots assignés à cette équipe
teams.get('/teams/:id/lots', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  const team = await c.env.DB.prepare('SELECT id FROM teams WHERE id = ? AND company_id = ?').bind(id, user.company_id).first()
  if (!team) return c.json({ error: 'Forbidden' }, 403)
  const rows = await c.env.DB.prepare(`
    SELECT l.*, p.name as project_name FROM lots l
    JOIN projects p ON p.id = l.project_id
    WHERE l.team_id = ?
    ORDER BY l.start_date_planned
  `).bind(id).all()
  return c.json(rows.results)
})

// DELETE /api/teams/:id/members/:userId — retirer un membre
teams.delete('/teams/:id/members/:userId', requireAdmin, async (c) => {
  const { id, userId } = c.req.param()
  const user = c.get('user')
  const team = await c.env.DB.prepare('SELECT id FROM teams WHERE id = ? AND company_id = ?').bind(id, user.company_id).first()
  if (!team) return c.json({ error: 'Forbidden' }, 403)
  await c.env.DB.prepare('DELETE FROM team_members WHERE team_id = ? AND user_id = ?').bind(id, userId).run()
  return c.json({ ok: true })
})

export default teams
