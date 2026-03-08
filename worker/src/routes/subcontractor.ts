import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import type { Env } from '../types'

const sub = new Hono<{ Bindings: Env }>()

// GET /api/my/lots — lots assignés au connecté (direct subcontractor_id ou via équipe)
sub.get('/lots', requireAuth, async (c) => {
  const user = c.get('user')
  const rows = await c.env.DB.prepare(`
    SELECT l.*, p.name as project_name, p.address as project_address, p.city as project_city, p.status as project_status
    FROM lots l JOIN projects p ON p.id = l.project_id
    WHERE l.subcontractor_id = ?
    UNION
    SELECT l.*, p.name as project_name, p.address as project_address, p.city as project_city, p.status as project_status
    FROM lots l JOIN projects p ON p.id = l.project_id
    JOIN team_members tm ON tm.team_id = l.team_id
    WHERE tm.user_id = ? AND l.team_id IS NOT NULL
    ORDER BY start_date_planned ASC, code
  `).bind(user.sub, user.sub).all()
  return c.json(rows.results)
})

// GET /api/my/projects — projets du connecté (via subcontractor_id ou équipe)
sub.get('/projects', requireAuth, async (c) => {
  const user = c.get('user')
  const rows = await c.env.DB.prepare(`
    SELECT DISTINCT p.*,
      (SELECT COUNT(*) FROM lots l2
       LEFT JOIN team_members tm2 ON tm2.team_id = l2.team_id
       WHERE l2.project_id = p.id AND (l2.subcontractor_id = ? OR (tm2.user_id = ? AND l2.team_id IS NOT NULL))
      ) as my_lots_count
    FROM projects p
    JOIN lots l ON l.project_id = p.id
    LEFT JOIN team_members tm ON tm.team_id = l.team_id
    WHERE l.subcontractor_id = ? OR (tm.user_id = ? AND l.team_id IS NOT NULL)
    ORDER BY p.start_date DESC
  `).bind(user.sub, user.sub, user.sub, user.sub).all()
  return c.json(rows.results)
})

// GET /api/my/notifications — notifications du sous-traitant
sub.get('/notifications', requireAuth, async (c) => {
  const user = c.get('user')
  const rows = await c.env.DB.prepare(`
    SELECT n.*, p.name as project_name FROM notifications n
    LEFT JOIN projects p ON p.id = n.project_id
    WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 50
  `).bind(user.sub).all()
  return c.json(rows.results)
})

export default sub
