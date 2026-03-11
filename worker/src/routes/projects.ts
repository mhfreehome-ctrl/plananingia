import { Hono } from 'hono'
import { requireAuth, requireAdmin, requireWrite, requireEditeur } from '../middleware/auth'
import { generateId } from '../utils/crypto'
import type { Env } from '../types'

const projects = new Hono<{ Bindings: Env }>()

projects.get('/', requireAuth, async (c) => {
  const user = c.get('user')
  let rows
  if (user.role === 'admin') {
    if (user.company_id) {
      if (user.access_level === 'conducteur' || user.access_level === 'salarie') {
        // Conducteur / Salarié : uniquement les projets de leur entreprise où ils sont impliqués
        rows = await c.env.DB.prepare(`
          SELECT DISTINCT p.*, u.first_name || ' ' || u.last_name as creator_name,
            (SELECT COUNT(*) FROM lots l WHERE l.project_id = p.id) as lot_count,
            (SELECT COALESCE(ROUND(AVG(NULLIF(l.progress_percent, 0))), 0) FROM lots l WHERE l.project_id = p.id) as avg_progress,
          (SELECT COUNT(*) FROM projects sp WHERE sp.parent_project_id = p.id) as sub_projects_count
          FROM projects p LEFT JOIN users u ON u.id = p.created_by
          WHERE p.company_id = ?
          AND (
            p.created_by = ?
            OR EXISTS (SELECT 1 FROM lots l WHERE l.project_id = p.id AND l.subcontractor_id = ?)
            OR EXISTS (
              SELECT 1 FROM lots l JOIN team_members tm ON tm.team_id = l.team_id
              WHERE l.project_id = p.id AND tm.user_id = ?
            )
          )
          ORDER BY p.updated_at DESC
        `).bind(user.company_id, user.sub, user.sub, user.sub).all()
      } else {
      // Admin / Editeur avec company_id : voir UNIQUEMENT ses propres projets (isolation stricte)
      rows = await c.env.DB.prepare(`
        SELECT p.*, u.first_name || ' ' || u.last_name as creator_name,
          (SELECT COUNT(*) FROM lots l WHERE l.project_id = p.id) as lot_count,
          (SELECT COALESCE(ROUND(AVG(NULLIF(l.progress_percent, 0))), 0) FROM lots l WHERE l.project_id = p.id) as avg_progress,
          (SELECT COUNT(*) FROM projects sp WHERE sp.parent_project_id = p.id) as sub_projects_count
        FROM projects p LEFT JOIN users u ON u.id = p.created_by
        WHERE p.company_id = ?
        ORDER BY p.updated_at DESC
      `).bind(user.company_id).all()
      }
    } else {
      // Admin sans company_id (comptes démo) : voir tous
      rows = await c.env.DB.prepare(`
        SELECT p.*, u.first_name || ' ' || u.last_name as creator_name,
          (SELECT COUNT(*) FROM lots l WHERE l.project_id = p.id) as lot_count,
          (SELECT COALESCE(ROUND(AVG(NULLIF(l.progress_percent, 0))), 0) FROM lots l WHERE l.project_id = p.id) as avg_progress,
          (SELECT COUNT(*) FROM projects sp WHERE sp.parent_project_id = p.id) as sub_projects_count
        FROM projects p LEFT JOIN users u ON u.id = p.created_by
        ORDER BY p.updated_at DESC
      `).all()
    }
  } else {
    rows = await c.env.DB.prepare(`
      SELECT DISTINCT p.*,
        (SELECT COALESCE(ROUND(AVG(NULLIF(l.progress_percent, 0))), 0) FROM lots l WHERE l.project_id = p.id) as avg_progress,
        (SELECT COUNT(*) FROM projects sp WHERE sp.parent_project_id = p.id) as sub_projects_count
      FROM projects p
      JOIN lots l ON l.project_id = p.id AND l.subcontractor_id = ?
      ORDER BY p.updated_at DESC
    `).bind(user.sub).all()
  }
  return c.json(rows.results)
})

projects.post('/', requireWrite, async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const id = generateId('proj')
  const lotTypesValue = body.lot_types
    ? (Array.isArray(body.lot_types) ? JSON.stringify(body.lot_types) : body.lot_types)
    : null
  // Si sous-projet → le parent devient automatiquement 'program'
  const parentId = body.parent_project_id || null
  const projectType = parentId ? 'sub_project' : (body.project_type || 'standalone')
  if (parentId) {
    await c.env.DB.prepare(`UPDATE projects SET project_type='program', updated_at=datetime('now') WHERE id=?`).bind(parentId).run()
  }
  await c.env.DB.prepare(`
    INSERT INTO projects (id, name, reference, address, city, postal_code, client_name, client_email, client_phone, client_id, description, start_date, duration_weeks, budget_ht, status, lot_types, meeting_time, created_by, company_id, parent_project_id, project_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.name, body.reference || null, body.address || null, body.city || null, body.postal_code || null,
    body.client_name || null, body.client_email || null, body.client_phone || null,
    body.client_id || null,
    body.description || null, body.start_date || null, body.duration_weeks || null,
    body.budget_ht || null, body.status || 'draft', lotTypesValue,
    body.meeting_time || null, user.sub, user.company_id || null,
    parentId, projectType).run()

  const proj = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first()
  return c.json(proj, 201)
})

projects.get('/:id', requireAuth, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  const proj = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first<any>()
  if (!proj) return c.json({ error: 'Not found' }, 404)
  // Vérif isolation company pour admin — exclure les projets MODELE globaux (company_id IS NULL)
  if (user.role === 'admin' && user.company_id && proj.company_id && proj.company_id !== user.company_id) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  if (user.role === 'subcontractor') {
    const lot = await c.env.DB.prepare('SELECT id FROM lots WHERE project_id = ? AND subcontractor_id = ?').bind(id, user.sub).first()
    if (!lot) return c.json({ error: 'Forbidden' }, 403)
  }
  // Sous-projets : si ce projet est un programme, récupérer ses enfants avec stats
  const subProjectsRes = await c.env.DB.prepare(`
    SELECT sp.*,
      (SELECT COUNT(*) FROM lots l WHERE l.project_id = sp.id) as lot_count,
      (SELECT COALESCE(ROUND(AVG(NULLIF(l.progress_percent,0))),0) FROM lots l WHERE l.project_id = sp.id) as avg_progress
    FROM projects sp
    WHERE sp.parent_project_id = ?
    ORDER BY sp.name ASC
  `).bind(id).all()
  const subProjects = subProjectsRes.results || []
  // Si sous-projet, récupérer le parent
  let parentProject = null
  if (proj.parent_project_id) {
    parentProject = await c.env.DB.prepare('SELECT id, name, reference FROM projects WHERE id = ?').bind(proj.parent_project_id).first<any>()
  }
  return c.json({ ...proj, sub_projects: subProjects, parent_project: parentProject })
})

projects.put('/:id', requireWrite, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  const body = await c.req.json()
  const proj = await c.env.DB.prepare('SELECT id, company_id FROM projects WHERE id = ?').bind(id).first<any>()
  if (!proj) return c.json({ error: 'Not found' }, 404)
  // Vérif isolation company
  if (user.company_id && proj.company_id !== user.company_id) return c.json({ error: 'Forbidden' }, 403)

  const lotTypesValue = body.lot_types
    ? (Array.isArray(body.lot_types) ? JSON.stringify(body.lot_types) : body.lot_types)
    : null

  // Seul un superadmin (sans company_id) peut changer l'entreprise propriétaire d'un projet
  const newCompanyId = (!user.company_id && body.company_id !== undefined)
    ? (body.company_id || null)
    : proj.company_id

  await c.env.DB.prepare(`
    UPDATE projects SET name=?, reference=?, address=?, city=?, postal_code=?, client_name=?,
      client_email=?, client_phone=?, client_id=?, description=?, start_date=?, duration_weeks=?, budget_ht=?,
      status=?, lot_types=?, meeting_time=?, project_type=?, company_id=?, updated_at=datetime('now')
    WHERE id=?
  `).bind(body.name, body.reference || null, body.address || null, body.city || null, body.postal_code || null,
    body.client_name || null, body.client_email || null, body.client_phone || null,
    body.client_id || null,
    body.description || null, body.start_date || null, body.duration_weeks || null,
    body.budget_ht || null, body.status || 'draft', lotTypesValue,
    body.meeting_time || null, body.project_type || 'standalone', newCompanyId, id).run()

  return c.json({ ok: true })
})

projects.delete('/:id', requireEditeur, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  if (user.company_id) {
    const proj = await c.env.DB.prepare('SELECT company_id FROM projects WHERE id = ?').bind(id).first<any>()
    if (!proj || proj.company_id !== user.company_id) return c.json({ error: 'Forbidden' }, 403)
  }
  // Suppression en cascade des tables enfants
  await c.env.DB.prepare('DELETE FROM ai_sessions WHERE project_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM notifications WHERE project_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM milestones WHERE project_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM dependencies WHERE project_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM lots WHERE project_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

// POST /api/projects/:id/duplicate — clone projet + lots + sous-tâches
projects.post('/:id/duplicate', requireWrite, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  if (user.company_id) {
    const proj = await c.env.DB.prepare('SELECT company_id FROM projects WHERE id = ?').bind(id).first<any>()
    // company_id NULL = projet modèle global → duplicable par tous les admins
    if (!proj || (proj.company_id !== null && proj.company_id !== user.company_id)) return c.json({ error: 'Forbidden' }, 403)
  }
  const src = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first<any>()
  if (!src) return c.json({ error: 'Not found' }, 404)
  const body = await c.req.json().catch(() => ({})) as any
  const newId = generateId('proj')
  const newName = body.name || `${src.name} (copie)`
  await c.env.DB.prepare(`
    INSERT INTO projects (id, name, reference, address, city, postal_code, client_name, client_email, client_phone,
      client_id, description, start_date, duration_weeks, budget_ht, status, lot_types, meeting_time,
      created_by, company_id, project_type)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'draft',?,?,?,?,?)
  `).bind(newId, newName, src.reference || null, src.address || null, src.city || null,
    src.postal_code || null, src.client_name || null, src.client_email || null, src.client_phone || null,
    src.client_id || null, src.description || null, src.start_date || null, src.duration_weeks || null,
    src.budget_ht || null, src.lot_types || null, src.meeting_time || null,
    user.sub, user.company_id || null, src.project_type || 'standalone').run()
  // Cloner les lots (map id source → id clone pour recâbler)
  const lots = await c.env.DB.prepare('SELECT * FROM lots WHERE project_id = ? ORDER BY sort_order').bind(id).all()
  const lotIdMap: Record<string, string> = {}
  for (const lot of lots.results as any[]) {
    const newLotId = generateId('lot')
    lotIdMap[lot.id] = newLotId
    await c.env.DB.prepare(`
      INSERT INTO lots (id, project_id, code, name, name_tr, duration_days, color, zone, notes,
        subcontractor_id, team_id, sort_order, market_deadline, is_provisional,
        early_start, early_finish, late_start, late_finish, total_float)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(newLotId, newId, lot.code, lot.name, lot.name_tr || null, lot.duration_days,
      lot.color || '#6B7280', lot.zone || null, lot.notes || null,
      null, null, lot.sort_order, lot.market_deadline || null, lot.is_provisional || 0,
      lot.early_start || 0, lot.early_finish || 0, lot.late_start || 0, lot.late_finish || 0, lot.total_float || 0).run()
    // Cloner les sous-tâches
    const tasks = await c.env.DB.prepare('SELECT * FROM lot_tasks WHERE lot_id = ? ORDER BY sort_order').bind(lot.id).all()
    for (const task of tasks.results as any[]) {
      await c.env.DB.prepare(`
        INSERT INTO lot_tasks (id, lot_id, name, type, start_date, end_date, progress, sort_order, notes)
        VALUES (?,?,?,?,?,?,0,?,?)
      `).bind(generateId('task'), newLotId, task.name, task.type || 'custom',
        task.start_date || null, task.end_date || null, task.sort_order || 0, task.notes || null).run()
    }
  }
  // Recâbler parent_lot_id pour les sous-lots
  for (const lot of lots.results as any[]) {
    if (lot.parent_lot_id && lotIdMap[lot.parent_lot_id]) {
      await c.env.DB.prepare('UPDATE lots SET parent_lot_id=? WHERE id=?')
        .bind(lotIdMap[lot.parent_lot_id], lotIdMap[lot.id]).run()
    }
  }
  // Cloner les dépendances
  const deps = await c.env.DB.prepare('SELECT * FROM dependencies WHERE project_id = ?').bind(id).all()
  for (const dep of deps.results as any[]) {
    if (lotIdMap[(dep as any).from_lot_id] && lotIdMap[(dep as any).to_lot_id]) {
      await c.env.DB.prepare(`INSERT INTO dependencies (id, project_id, from_lot_id, to_lot_id, type, lag_days) VALUES (?,?,?,?,?,?)`)
        .bind(generateId('dep'), newId, lotIdMap[(dep as any).from_lot_id], lotIdMap[(dep as any).to_lot_id],
          (dep as any).type || 'FS', (dep as any).lag_days || 0).run()
    }
  }
  const newProj = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(newId).first()
  return c.json(newProj, 201)
})

projects.get('/:id/stats', requireAuth, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  // Vérif isolation company
  if (user.company_id) {
    const proj = await c.env.DB.prepare('SELECT company_id FROM projects WHERE id = ?').bind(id).first<any>()
    // company_id NULL = projet modèle global → stats accessibles à tous les admins
    if (!proj || (proj.company_id !== null && proj.company_id !== user.company_id)) return c.json({ error: 'Forbidden' }, 403)
  }
  const lots = await c.env.DB.prepare('SELECT status, progress_percent, is_critical FROM lots WHERE project_id = ?').bind(id).all()
  const rows = lots.results as any[]
  const total = rows.length
  const done = rows.filter(r => r.status === 'done').length
  const active = rows.filter(r => r.status === 'active').length
  const pending = rows.filter(r => r.status === 'pending').length
  const critical = rows.filter(r => r.is_critical).length
  const lotsWithProgress = rows.filter(r => (r.progress_percent || 0) > 0)
  const avgProgress = lotsWithProgress.length
    ? Math.round(lotsWithProgress.reduce((s, r) => s + r.progress_percent, 0) / lotsWithProgress.length)
    : 0
  return c.json({ total, done, active, pending, critical, avgProgress })
})

export default projects
