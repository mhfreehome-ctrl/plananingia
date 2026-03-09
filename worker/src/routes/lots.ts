import { Hono } from 'hono'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { generateId } from '../utils/crypto'
import { DEFAULT_LOTS, DEFAULT_DEPENDENCIES, FACADE_LOTS, FACADE_DEPENDENCIES, FACADE_MILESTONES } from '../utils/defaults'
import { sendEmail, htmlLotAssigned, htmlDatesUpdated, htmlProgressUpdate } from '../utils/email'
import type { Env } from '../types'

const lots = new Hono<{ Bindings: Env }>()

// ─────────────────────────────────────────────────────────────
// GET /api/lots/catalog — catalogue statique adapté au type d'entreprise
// ─────────────────────────────────────────────────────────────
lots.get('/lots/catalog', requireAuth, async (c) => {
  const user = c.get('user')
  const isFacade = user.company_type === 'entreprise_metier'

  if (isFacade) {
    return c.json(FACADE_LOTS.map(l => ({
      code: l.code,
      name: l.name,
      duration_days: l.duration_days,
      color: l.color,
      sort_order: l.sort_order,
      parent_code: l.parent_code,
      category: l.lot_types[0] || 'GENERAL',
    })))
  }

  return c.json(DEFAULT_LOTS.map(l => ({
    code: l.code,
    name: l.name,
    name_tr: l.name_tr,
    duration_days: l.duration_days,
    color: l.color,
    zone: l.zone,
    sort_order: l.sort_order,
    parent_code: null,
    category: l.zone || 'BTP',
  })))
})

// ─────────────────────────────────────────────────────────────
// POST /api/projects/:id/lots/from-catalog — ajoute des lots sélectionnés
// ─────────────────────────────────────────────────────────────
lots.post('/projects/:id/lots/from-catalog', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  if (user.company_id) {
    const proj = await c.env.DB.prepare('SELECT company_id FROM projects WHERE id = ?').bind(id).first<any>()
    if (!proj || proj.company_id !== user.company_id) return c.json({ error: 'Forbidden' }, 403)
  }
  const { codes } = await c.req.json() as { codes: string[] }
  if (!codes?.length) return c.json({ ok: true, added: 0 })

  const isFacade = user.company_type === 'entreprise_metier'
  const catalog = isFacade ? FACADE_LOTS : DEFAULT_LOTS

  // Lots déjà dans le projet
  const existing = await c.env.DB.prepare('SELECT id, code FROM lots WHERE project_id = ?').bind(id).all()
  const existingCodes = new Set(existing.results.map((l: any) => l.code))
  const codeToId: Record<string, string> = {}
  for (const l of existing.results as any[]) codeToId[l.code] = l.id

  const toAdd = catalog.filter(l => codes.includes(l.code) && !existingCodes.has(l.code))
  if (!toAdd.length) return c.json({ ok: true, added: 0 })

  const lotIds: Record<string, string> = { ...codeToId }

  if (isFacade) {
    // 1re passe : lots parents d'abord
    const parents = toAdd.filter((l: any) => !l.parent_code)
    if (parents.length) {
      const stmts = parents.map((l: any) => {
        const lid = generateId('lot')
        lotIds[l.code] = lid
        return c.env.DB.prepare(
          'INSERT INTO lots (id, project_id, code, name, duration_days, color, sort_order, parent_lot_id) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)'
        ).bind(lid, id, l.code, l.name, l.duration_days, l.color, l.sort_order)
      })
      await c.env.DB.batch(stmts)
    }

    // 2e passe : sous-lots (parent_code résolu)
    const subs = toAdd.filter((l: any) => l.parent_code)
    if (subs.length) {
      const subStmts = subs.map((l: any) => {
        const lid = generateId('lot')
        lotIds[l.code] = lid
        const parentId = l.parent_code ? (lotIds[l.parent_code] || null) : null
        return c.env.DB.prepare(
          'INSERT INTO lots (id, project_id, code, name, duration_days, color, sort_order, parent_lot_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(lid, id, l.code, l.name, l.duration_days, l.color, l.sort_order, parentId)
      })
      await c.env.DB.batch(subStmts)
    }
  } else {
    const stmts = toAdd.map((l: any) => {
      const lid = generateId('lot')
      lotIds[l.code] = lid
      return c.env.DB.prepare(
        'INSERT INTO lots (id, project_id, code, name, name_tr, duration_days, color, zone, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(lid, id, l.code, l.name, (l as any).name_tr || null, l.duration_days, l.color, (l as any).zone || null, l.sort_order)
    })
    await c.env.DB.batch(stmts)
  }

  // Dépendances par défaut pour les nouveaux lots (si les deux extrémités existent)
  const defaultDeps = isFacade ? FACADE_DEPENDENCIES : DEFAULT_DEPENDENCIES
  const addedCodes = new Set(toAdd.map(l => l.code))
  const newDeps = defaultDeps.filter(d =>
    (addedCodes.has(d.pred) || addedCodes.has(d.succ)) &&
    lotIds[d.pred] && lotIds[d.succ]
  )
  if (newDeps.length) {
    const depStmts = newDeps.map(d =>
      c.env.DB.prepare(
        'INSERT OR IGNORE INTO dependencies (id, project_id, predecessor_id, successor_id, type, lag_days) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(generateId('dep'), id, lotIds[d.pred], lotIds[d.succ], d.type, d.lag)
    )
    await c.env.DB.batch(depStmts)
  }

  return c.json({ ok: true, added: toAdd.length })
})

// GET /api/projects/:id/lots
lots.get('/projects/:id/lots', requireAuth, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  if (user.company_id) {
    const proj = await c.env.DB.prepare('SELECT company_id FROM projects WHERE id = ?').bind(id).first<any>()
    if (!proj || proj.company_id !== user.company_id) return c.json({ error: 'Forbidden' }, 403)
  }
  const rows = await c.env.DB.prepare(`
    SELECT l.*,
      u.first_name || ' ' || COALESCE(u.last_name,'') as subcontractor_name,
      u.company_name as subcontractor_company,
      t.name as team_name, t.color as team_color
    FROM lots l
    LEFT JOIN users u ON u.id = l.subcontractor_id
    LEFT JOIN teams t ON t.id = l.team_id
    WHERE l.project_id = ?
    ORDER BY l.sort_order, l.code
  `).bind(id).all()
  return c.json(rows.results)
})

// POST /api/projects/:id/lots/init  — init adaptatif : façade (entreprise_metier) ou BTP standard
lots.post('/projects/:id/lots/init', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')

  if (user.company_id) {
    const projCheck = await c.env.DB.prepare('SELECT company_id FROM projects WHERE id = ?').bind(id).first<any>()
    if (!projCheck || projCheck.company_id !== user.company_id) return c.json({ error: 'Forbidden' }, 403)
  }

  const existing = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM lots WHERE project_id = ?').bind(id).first<any>()
  if (existing?.cnt > 0) return c.json({ error: 'Lots already initialized' }, 409)

  const proj = await c.env.DB.prepare('SELECT lot_types, start_date, duration_weeks FROM projects WHERE id = ?').bind(id).first<any>()
  const projLotTypes: string[] = proj?.lot_types ? JSON.parse(proj.lot_types) : []

  // Mode façade si l'entreprise est de type métier OU si le projet a des lot_types façade configurés
  const isFacade = user.company_type === 'entreprise_metier' || projLotTypes.length > 0

  if (isFacade) {
    // ── Init lots FAÇADE ──────────────────────────────────────────────────
    // Filtrer les lots selon les lot_types du projet (si vide = prendre tous)
    const activeLots = FACADE_LOTS.filter(l =>
      l.lot_types.length === 0 ||
      l.lot_types.some(t => projLotTypes.length === 0 || projLotTypes.includes(t))
    )

    const lotIds: Record<string, string> = {}

    // 1re passe : insérer tous les lots (parent_lot_id = null)
    const stmts = activeLots.map(l => {
      const lid = generateId('lot')
      lotIds[l.code] = lid
      return c.env.DB.prepare(
        'INSERT INTO lots (id, project_id, code, name, duration_days, color, sort_order, parent_lot_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(lid, id, l.code, l.name, l.duration_days, l.color, l.sort_order, null)
    })
    await c.env.DB.batch(stmts)

    // 2e passe : lier parent_lot_id
    const parentStmts = activeLots
      .filter(l => l.parent_code && lotIds[l.parent_code])
      .map(l => c.env.DB.prepare('UPDATE lots SET parent_lot_id = ? WHERE id = ?')
        .bind(lotIds[l.parent_code!], lotIds[l.code]))
    if (parentStmts.length) await c.env.DB.batch(parentStmts)

    // Dépendances
    const depStmts = FACADE_DEPENDENCIES
      .filter(d => lotIds[d.pred] && lotIds[d.succ])
      .map(d => c.env.DB.prepare(
        'INSERT OR IGNORE INTO dependencies (id, project_id, predecessor_id, successor_id, type, lag_days) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(generateId('dep'), id, lotIds[d.pred], lotIds[d.succ], d.type, d.lag))
    if (depStmts.length) await c.env.DB.batch(depStmts)

    // Jalons façade (si start_date renseignée)
    if (proj?.start_date) {
      const startMs = new Date(proj.start_date).getTime()
      const totalDays = (proj.duration_weeks || 8) * 7
      const endMs = startMs + totalDays * 86400000
      const milestoneStmts = FACADE_MILESTONES.map(m => {
        const dateMs = m.offset_end !== undefined
          ? endMs + m.offset_end * 86400000
          : startMs + (m.offset_start || 0) * 86400000
        const date = new Date(dateMs).toISOString().slice(0, 10)
        return c.env.DB.prepare(
          'INSERT INTO milestones (id, project_id, name, date, color) VALUES (?, ?, ?, ?, ?)'
        ).bind(generateId('ms'), id, m.name, date, m.color)
      })
      await c.env.DB.batch(milestoneStmts)
    }

  } else {
    // ── Init lots BTP standard (15 lots) ─────────────────────────────────
    const lotIds: Record<string, string> = {}
    const stmts = DEFAULT_LOTS.map(l => {
      const lid = generateId('lot')
      lotIds[l.code] = lid
      return c.env.DB.prepare(
        'INSERT INTO lots (id, project_id, code, name, name_tr, duration_days, color, zone, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(lid, id, l.code, l.name, l.name_tr, l.duration_days, l.color, l.zone, l.sort_order)
    })
    await c.env.DB.batch(stmts)

    const depStmts = DEFAULT_DEPENDENCIES
      .filter(d => lotIds[d.pred] && lotIds[d.succ])
      .map(d => c.env.DB.prepare(
        'INSERT OR IGNORE INTO dependencies (id, project_id, predecessor_id, successor_id, type, lag_days) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(generateId('dep'), id, lotIds[d.pred], lotIds[d.succ], d.type, d.lag))
    if (depStmts.length) await c.env.DB.batch(depStmts)
  }

  const rows = await c.env.DB.prepare('SELECT * FROM lots WHERE project_id = ? ORDER BY sort_order').bind(id).all()
  return c.json(rows.results, 201)
})

// ─────────────────────────────────────────────────────────────
// POST /api/projects/:id/lots/train — Train de travaux
// Découpe plusieurs lots en sous-lots séquentiels par zone/niveau
// ─────────────────────────────────────────────────────────────
lots.post('/projects/:id/lots/train', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  const body = await c.req.json() as {
    lot_ids: string[]
    zones: string[]
    lag_days: number
    dep_type: 'FS' | 'SS'
  }
  const { lot_ids, zones, lag_days = 0, dep_type = 'FS' } = body
  if (!lot_ids?.length || !zones?.length || zones.length < 2) {
    return c.json({ error: 'lot_ids et zones (min 2) requis' }, 400)
  }

  // Vérification que le projet appartient à la company de l'user
  if (user.company_id) {
    const proj = await c.env.DB.prepare('SELECT company_id FROM projects WHERE id = ?').bind(id).first<any>()
    if (!proj || proj.company_id !== user.company_id) return c.json({ error: 'Forbidden' }, 403)
  }

  let totalCreated = 0
  const allStmts: any[] = []
  const allDepStmts: any[] = []

  for (const lotId of lot_ids) {
    // Récupérer le lot parent
    const parent = await c.env.DB.prepare('SELECT * FROM lots WHERE id = ? AND project_id = ?').bind(lotId, id).first<any>()
    if (!parent) continue

    // Compter les sous-lots existants pour le sort_order
    const existingCount = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM lots WHERE parent_lot_id = ?').bind(lotId).first<any>()
    const baseSort = (parent.sort_order || 0) * 100 + (existingCount?.cnt || 0)

    // Prédécesseurs du lot parent (pour le 1er sous-lot)
    const parentPreds = await c.env.DB.prepare('SELECT * FROM dependencies WHERE successor_id = ? AND project_id = ?').bind(lotId, id).all()
    // Successeurs du lot parent (pour le dernier sous-lot)
    const parentSuccs = await c.env.DB.prepare('SELECT * FROM dependencies WHERE predecessor_id = ? AND project_id = ?').bind(lotId, id).all()

    // Créer les N sous-lots
    const newLotIds: string[] = []
    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i]
      const lid = generateId('lot')
      newLotIds.push(lid)
      allStmts.push(c.env.DB.prepare(
        `INSERT INTO lots (id, project_id, code, name, name_tr, duration_days, color, zone, notes,
          subcontractor_id, team_id, sort_order, is_provisional, parent_lot_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        lid, id,
        `${parent.code}-${zone}`,
        `${parent.name} — ${zone}`,
        parent.name_tr ? `${parent.name_tr} — ${zone}` : null,
        parent.duration_days,
        parent.color,
        zone,
        parent.notes || null,
        parent.subcontractor_id || null,
        parent.team_id || null,
        baseSort + i + 1,
        parent.is_provisional || 0,
        lotId
      ))
      totalCreated++
    }

    // 1. Premier sous-lot hérite des prédécesseurs du parent
    for (const pred of (parentPreds.results as any[])) {
      allDepStmts.push(c.env.DB.prepare(
        'INSERT OR IGNORE INTO dependencies (id, project_id, predecessor_id, successor_id, type, lag_days) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(generateId('dep'), id, pred.predecessor_id, newLotIds[0], pred.type, pred.lag_days))
    }

    // 2. Chaînage des sous-lots (dep_type + lag_days configurés)
    for (let i = 1; i < newLotIds.length; i++) {
      allDepStmts.push(c.env.DB.prepare(
        'INSERT OR IGNORE INTO dependencies (id, project_id, predecessor_id, successor_id, type, lag_days) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(generateId('dep'), id, newLotIds[i - 1], newLotIds[i], dep_type, lag_days))
    }

    // 3. Dernier sous-lot hérite des successeurs du parent (reroutage)
    const lastId = newLotIds[newLotIds.length - 1]
    for (const succ of (parentSuccs.results as any[])) {
      // Éviter de rerouter vers un lot qui fait partie du même train
      if (!lot_ids.includes(succ.successor_id)) {
        allDepStmts.push(c.env.DB.prepare(
          'INSERT OR IGNORE INTO dependencies (id, project_id, predecessor_id, successor_id, type, lag_days) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(generateId('dep'), id, lastId, succ.successor_id, succ.type, succ.lag_days))
      }
    }
  }

  if (allStmts.length) await c.env.DB.batch(allStmts)
  if (allDepStmts.length) await c.env.DB.batch(allDepStmts)

  return c.json({ ok: true, created: totalCreated })
})

// POST /api/projects/:id/lots  — create single lot
lots.post('/projects/:id/lots', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  if (user.company_id) {
    const proj = await c.env.DB.prepare('SELECT company_id FROM projects WHERE id = ?').bind(id).first<any>()
    if (!proj || proj.company_id !== user.company_id) return c.json({ error: 'Forbidden' }, 403)
  }
  const body = await c.req.json()
  const lid = generateId('lot')
  await c.env.DB.prepare(
    'INSERT INTO lots (id, project_id, code, name, name_tr, duration_days, color, zone, notes, subcontractor_id, team_id, sort_order, market_deadline, is_provisional, parent_lot_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(lid, id, body.code, body.name, body.name_tr || null, body.duration_days || 10,
    body.color || '#6B7280', body.zone || null, body.notes || null,
    body.subcontractor_id || null, body.team_id || null,
    body.sort_order || 99,
    body.market_deadline || null, body.is_provisional ? 1 : 0, body.parent_lot_id || null).run()

  // ── Auto-câblage des dépendances lors d'un découpage (sous-lot) ─────────────
  if (body.parent_lot_id) {
    const parentId = body.parent_lot_id
    // Frères déjà existants (sous-lots du même parent), ordonnés par sort_order
    const siblings = await c.env.DB.prepare(
      'SELECT id, sort_order FROM lots WHERE parent_lot_id = ? AND id != ? ORDER BY sort_order ASC'
    ).bind(parentId, lid).all()

    if ((siblings.results?.length ?? 0) === 0) {
      // 1er sous-lot : hérite des prédécesseurs du lot parent
      const parentPreds = await c.env.DB.prepare(
        'SELECT * FROM dependencies WHERE successor_id = ? AND project_id = ?'
      ).bind(parentId, id).all()
      if ((parentPreds.results?.length ?? 0) > 0) {
        const depStmts = (parentPreds.results as any[]).map(d =>
          c.env.DB.prepare(
            'INSERT OR IGNORE INTO dependencies (id, project_id, predecessor_id, successor_id, type, lag_days) VALUES (?, ?, ?, ?, ?, ?)'
          ).bind(generateId('dep'), id, d.predecessor_id, lid, d.type, d.lag_days)
        )
        await c.env.DB.batch(depStmts)
      }
    } else {
      // Nième sous-lot : chaîne FS depuis le dernier sous-lot existant
      const lastSibling = (siblings.results as any[])[(siblings.results?.length ?? 1) - 1]
      await c.env.DB.prepare(
        'INSERT OR IGNORE INTO dependencies (id, project_id, predecessor_id, successor_id, type, lag_days) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(generateId('dep'), id, lastSibling.id, lid, 'FS', 0).run()
    }
  }

  const lot = await c.env.DB.prepare('SELECT * FROM lots WHERE id = ?').bind(lid).first()
  return c.json(lot, 201)
})

// PUT /api/lots/:id
lots.put('/lots/:id', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  const body = await c.req.json()

  // Read previous state to detect subcontractor assignment change + vérif company
  const prev = await c.env.DB.prepare(
    'SELECT l.subcontractor_id, l.code, l.name, l.name_tr, l.project_id, p.company_id FROM lots l JOIN projects p ON p.id = l.project_id WHERE l.id = ?'
  ).bind(id).first<any>()
  if (!prev || (user.company_id && prev.company_id !== user.company_id)) return c.json({ error: 'Forbidden' }, 403)

  await c.env.DB.prepare(`
    UPDATE lots SET code=?, name=?, name_tr=?, duration_days=?, color=?, zone=?, notes=?,
      subcontractor_id=?, team_id=?, sort_order=?, market_deadline=?, is_provisional=?, parent_lot_id=?,
      start_date_planned=?, end_date_planned=?,
      updated_at=datetime('now')
    WHERE id=?
  `).bind(body.code, body.name, body.name_tr || null, body.duration_days, body.color,
    body.zone || null, body.notes || null,
    body.subcontractor_id || null, body.team_id || null,
    body.sort_order || 0,
    body.market_deadline || null, body.is_provisional ? 1 : 0, body.parent_lot_id || null,
    body.start_date_planned || null, body.end_date_planned || null,
    id).run()

  // Notify subcontractor if newly assigned (or reassigned to someone else)
  const newSubId = body.subcontractor_id || null
  if (newSubId && newSubId !== prev?.subcontractor_id) {
    const adminUser = c.get('user')
    const [proj, subUser, adminInfo] = await Promise.all([
      c.env.DB.prepare('SELECT name FROM projects WHERE id = ?').bind(prev.project_id).first<any>(),
      c.env.DB.prepare('SELECT email, first_name FROM users WHERE id = ?').bind(newSubId).first<any>(),
      c.env.DB.prepare('SELECT company_name, first_name, last_name FROM users WHERE id = ?').bind(adminUser.sub).first<any>(),
    ])
    const lot = await c.env.DB.prepare('SELECT start_date_planned, end_date_planned FROM lots WHERE id = ?').bind(id).first<any>()
    const companyName = adminInfo?.company_name || `${adminInfo?.first_name || ''} ${adminInfo?.last_name || ''}`.trim() || adminUser.email
    await c.env.DB.prepare(
      'INSERT INTO notifications (id, user_id, project_id, lot_id, type, title, title_tr, message, message_tr) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      generateId('notif'), newSubId, prev.project_id, id, 'lot_assigned',
      `Lot assigné — ${prev.code}`,
      `Lot atandı — ${prev.code}`,
      `Le lot ${prev.code} "${prev.name}" du projet "${proj?.name || ''}" vous a été assigné.`,
      `"${proj?.name || ''}" projesindeki ${prev.code} "${prev.name_tr || prev.name}" lotu size atandı.`
    ).run()
    await sendEmail(
      c.env.RESEND_API_KEY, c.env.RESEND_FROM,
      subUser?.email,
      `Lot assigné — ${prev.code} | PlanningIA`,
      htmlLotAssigned({
        firstName: subUser?.first_name || '',
        lotCode: prev.code,
        lotName: prev.name,
        projectName: proj?.name || '',
        companyName,
        startDate: lot?.start_date_planned,
        endDate: lot?.end_date_planned,
      })
    )
  }

  return c.json({ ok: true })
})

// DELETE /api/lots/:id
lots.delete('/lots/:id', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  const lot = await c.env.DB.prepare(
    'SELECT p.company_id FROM lots l JOIN projects p ON p.id = l.project_id WHERE l.id = ?'
  ).bind(id).first<any>()
  if (!lot || (user.company_id && lot.company_id !== user.company_id)) return c.json({ error: 'Forbidden' }, 403)
  await c.env.DB.prepare('DELETE FROM lots WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

// PATCH /api/lots/:id/dates — update dates after drag/resize (admin only)
lots.patch('/lots/:id/dates', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  const { early_start, early_finish, start_date_planned, end_date_planned, duration_days } = await c.req.json()

  const lot = await c.env.DB.prepare(
    'SELECT l.subcontractor_id, l.code, l.name, l.name_tr, l.project_id, p.company_id FROM lots l JOIN projects p ON p.id = l.project_id WHERE l.id = ?'
  ).bind(id).first<any>()
  if (!lot || (user.company_id && lot.company_id !== user.company_id)) return c.json({ error: 'Forbidden' }, 403)

  await c.env.DB.prepare(
    `UPDATE lots SET early_start=?, early_finish=?, start_date_planned=?, end_date_planned=?,
     duration_days=COALESCE(?, duration_days), updated_at=datetime('now') WHERE id=?`
  ).bind(early_start ?? 0, early_finish ?? 0, start_date_planned || null, end_date_planned || null,
    duration_days ?? null, id).run()

  // Notify subcontractor if this lot has one and dates are meaningful
  if (lot?.subcontractor_id && start_date_planned) {
    const adminUser = c.get('user')
    const [proj, subUser, adminInfo] = await Promise.all([
      c.env.DB.prepare('SELECT name FROM projects WHERE id = ?').bind(lot.project_id).first<any>(),
      c.env.DB.prepare('SELECT email, first_name FROM users WHERE id = ?').bind(lot.subcontractor_id).first<any>(),
      c.env.DB.prepare('SELECT company_name, first_name, last_name FROM users WHERE id = ?').bind(adminUser.sub).first<any>(),
    ])
    const companyName = adminInfo?.company_name || `${adminInfo?.first_name || ''} ${adminInfo?.last_name || ''}`.trim() || adminUser.email
    const dateRange = end_date_planned ? `${start_date_planned} → ${end_date_planned}` : start_date_planned
    await c.env.DB.prepare(
      'INSERT INTO notifications (id, user_id, project_id, lot_id, type, title, title_tr, message, message_tr) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      generateId('notif'), lot.subcontractor_id, lot.project_id, id, 'dates_updated',
      `Planning modifié — ${lot.code}`,
      `Planlama güncellendi — ${lot.code}`,
      `Les dates du lot ${lot.code} "${lot.name}" ont été modifiées : ${dateRange}`,
      `${lot.code} "${lot.name_tr || lot.name}" lotunun tarihleri güncellendi: ${dateRange}`
    ).run()
    await sendEmail(
      c.env.RESEND_API_KEY, c.env.RESEND_FROM,
      subUser?.email,
      `Planning modifié — ${lot.code} | PlanningIA`,
      htmlDatesUpdated({
        firstName: subUser?.first_name || '',
        lotCode: lot.code,
        lotName: lot.name,
        projectName: proj?.name || '',
        companyName,
        startDate: start_date_planned,
        endDate: end_date_planned,
      })
    )
  }

  return c.json({ ok: true })
})

// PATCH /api/lots/:id/progress
lots.patch('/lots/:id/progress', requireAuth, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  const { progress_percent, comment, status } = await c.req.json()

  const lot = await c.env.DB.prepare('SELECT * FROM lots WHERE id = ?').bind(id).first<any>()
  if (!lot) return c.json({ error: 'Not found' }, 404)
  if (user.role === 'subcontractor' && lot.subcontractor_id !== user.sub)
    return c.json({ error: 'Forbidden' }, 403)
  if (user.role === 'admin' && user.company_id) {
    const lotOwner = await c.env.DB.prepare(
      'SELECT p.company_id FROM lots l JOIN projects p ON p.id = l.project_id WHERE l.id = ?'
    ).bind(id).first<any>()
    if (!lotOwner || lotOwner.company_id !== user.company_id) return c.json({ error: 'Forbidden' }, 403)
  }

  const pct = Math.min(100, Math.max(0, progress_percent))
  const newStatus = status || (pct >= 100 ? 'done' : pct > 0 ? 'active' : lot.status)

  await c.env.DB.prepare(`UPDATE lots SET progress_percent=?, status=?, updated_at=datetime('now') WHERE id=?`)
    .bind(pct, newStatus, id).run()

  await c.env.DB.prepare('INSERT INTO progress_updates (id, lot_id, user_id, progress_percent, comment) VALUES (?, ?, ?, ?, ?)')
    .bind(generateId('upd'), id, user.sub, pct, comment || null).run()

  // Notify admins of progress update (in-app + email)
  const admins = await c.env.DB.prepare('SELECT id, email, first_name FROM users WHERE role = ?').bind('admin').all()
  const proj = await c.env.DB.prepare('SELECT name FROM projects WHERE id = ?').bind(lot.project_id).first<any>()
  const subUser = await c.env.DB.prepare('SELECT first_name, last_name, company_name FROM users WHERE id = ?').bind(user.sub).first<any>()
  const subName = subUser?.company_name || `${subUser?.first_name || ''} ${subUser?.last_name || ''}`.trim() || user.email
  const notifStmts = (admins.results as any[]).map(a =>
    c.env.DB.prepare('INSERT INTO notifications (id, user_id, project_id, lot_id, type, title, title_tr, message, message_tr) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(generateId('notif'), a.id, lot.project_id, id, 'progress_update',
        `Avancement mis à jour — ${lot.code}`,
        `İlerleme güncellendi — ${lot.code}`,
        `${lot.code} ${lot.name} : ${pct}% sur ${proj?.name || ''}`,
        `${lot.code} ${lot.name_tr || lot.name} : ${pct}% - ${proj?.name || ''}`)
  )
  if (notifStmts.length) await c.env.DB.batch(notifStmts)
  for (const a of admins.results as any[]) {
    await sendEmail(
      c.env.RESEND_API_KEY, c.env.RESEND_FROM,
      a.email,
      `Avancement ${lot.code} — ${pct}% | PlanningIA`,
      htmlProgressUpdate({
        adminFirstName: a.first_name || '',
        subName,
        lotCode: lot.code,
        lotName: lot.name,
        projectName: proj?.name || '',
        percent: pct,
        comment: comment || null,
      })
    )
  }

  return c.json({ ok: true })
})

// GET /api/projects/:id/dependencies
lots.get('/projects/:id/dependencies', requireAuth, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  if (user.company_id) {
    const proj = await c.env.DB.prepare('SELECT company_id FROM projects WHERE id = ?').bind(id).first<any>()
    if (!proj || proj.company_id !== user.company_id) return c.json({ error: 'Forbidden' }, 403)
  }
  const rows = await c.env.DB.prepare('SELECT * FROM dependencies WHERE project_id = ?').bind(id).all()
  return c.json(rows.results)
})

// POST /api/projects/:id/dependencies
lots.post('/projects/:id/dependencies', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  if (user.company_id) {
    const proj = await c.env.DB.prepare('SELECT company_id FROM projects WHERE id = ?').bind(id).first<any>()
    if (!proj || proj.company_id !== user.company_id) return c.json({ error: 'Forbidden' }, 403)
  }
  const body = await c.req.json()
  const did = generateId('dep')
  try {
    await c.env.DB.prepare(
      'INSERT INTO dependencies (id, project_id, predecessor_id, successor_id, type, lag_days) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(did, id, body.predecessor_id, body.successor_id, body.type || 'FS', body.lag_days || 0).run()
    return c.json({ ok: true, id: did }, 201)
  } catch (e: any) {
    return c.json({ error: 'Dependency already exists' }, 409)
  }
})

// DELETE /api/dependencies/:id
lots.delete('/dependencies/:id', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  const dep = await c.env.DB.prepare(
    'SELECT p.company_id FROM dependencies d JOIN projects p ON p.id = d.project_id WHERE d.id = ?'
  ).bind(id).first<any>()
  if (!dep || (user.company_id && dep.company_id !== user.company_id)) return c.json({ error: 'Forbidden' }, 403)
  await c.env.DB.prepare('DELETE FROM dependencies WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

// GET /api/lots/:id/history
lots.get('/lots/:id/history', requireAuth, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  // Vérif que le lot appartient à la company
  const lotOwner = await c.env.DB.prepare(
    'SELECT p.company_id FROM lots l JOIN projects p ON p.id = l.project_id WHERE l.id = ?'
  ).bind(id).first<any>()
  if (!lotOwner || (user.company_id && lotOwner.company_id !== user.company_id && user.role !== 'subcontractor')) return c.json({ error: 'Forbidden' }, 403)
  const rows = await c.env.DB.prepare(`
    SELECT pu.*, u.first_name || ' ' || COALESCE(u.last_name,'') as user_name
    FROM progress_updates pu JOIN users u ON u.id = pu.user_id
    WHERE pu.lot_id = ? ORDER BY pu.created_at DESC LIMIT 20
  `).bind(id).all()
  return c.json(rows.results)
})

export default lots
