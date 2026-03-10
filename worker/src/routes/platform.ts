import { Hono } from 'hono'
import { requireSuperAdmin, requireAdmin } from '../middleware/auth'
import { generateId } from '../utils/crypto'
import { sendEmail, htmlInvite } from '../utils/email'
import type { Env } from '../types'

const platform = new Hono<{ Bindings: Env }>()

// ═══════════════════════════════════════════════════════════
// LOT TEMPLATES
// ═══════════════════════════════════════════════════════════

// GET /api/platform/lot-templates?catalog=btp|facade
// Accessible aux admins authentifiés (lecture publique pour génération IA)
platform.get('/lot-templates', requireAdmin, async (c) => {
  const catalog = c.req.query('catalog') || 'btp'
  const [lotsRes, depsRes] = await Promise.all([
    c.env.DB.prepare(
      'SELECT * FROM lot_templates WHERE catalog_type = ? ORDER BY sort_order ASC'
    ).bind(catalog).all(),
    c.env.DB.prepare(
      'SELECT * FROM lot_template_deps WHERE catalog_type = ? ORDER BY pred_code ASC'
    ).bind(catalog).all(),
  ])
  return c.json({ lots: lotsRes.results, deps: depsRes.results })
})

// POST /api/platform/lot-templates
platform.post('/lot-templates', requireSuperAdmin, async (c) => {
  const body = await c.req.json() as any
  if (!body.code || !body.name) return c.json({ error: 'code et name requis' }, 400)
  const id = generateId('lt')
  await c.env.DB.prepare(`
    INSERT INTO lot_templates (id, catalog_type, code, name, name_tr, duration_days, color, zone, sort_order, lot_types, parent_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.catalog_type || 'btp',
    body.code.toUpperCase(),
    body.name,
    body.name_tr || null,
    body.duration_days || 10,
    body.color || '#6B7280',
    body.zone || null,
    body.sort_order ?? 0,
    body.lot_types ? JSON.stringify(body.lot_types) : null,
    body.parent_code || null
  ).run()
  const row = await c.env.DB.prepare('SELECT * FROM lot_templates WHERE id = ?').bind(id).first()
  return c.json(row, 201)
})

// PUT /api/platform/lot-templates/:id
platform.put('/lot-templates/:id', requireSuperAdmin, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json() as any
  await c.env.DB.prepare(`
    UPDATE lot_templates SET
      code = ?, name = ?, name_tr = ?, duration_days = ?, color = ?,
      zone = ?, sort_order = ?, lot_types = ?, parent_code = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.code,
    body.name,
    body.name_tr || null,
    body.duration_days,
    body.color,
    body.zone || null,
    body.sort_order ?? 0,
    body.lot_types ? JSON.stringify(body.lot_types) : null,
    body.parent_code || null,
    id
  ).run()
  const row = await c.env.DB.prepare('SELECT * FROM lot_templates WHERE id = ?').bind(id).first()
  return c.json(row)
})

// DELETE /api/platform/lot-templates/:id
platform.delete('/lot-templates/:id', requireSuperAdmin, async (c) => {
  const id = c.req.param('id')
  const lot = await c.env.DB.prepare('SELECT * FROM lot_templates WHERE id = ?').bind(id).first() as any
  if (!lot) return c.json({ error: 'Not found' }, 404)
  // Supprimer dépendances liées
  await c.env.DB.prepare(
    'DELETE FROM lot_template_deps WHERE catalog_type = ? AND (pred_code = ? OR succ_code = ?)'
  ).bind(lot.catalog_type, lot.code, lot.code).run()
  await c.env.DB.prepare('DELETE FROM lot_templates WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

// ═══════════════════════════════════════════════════════════
// LOT TEMPLATE DEPS
// ═══════════════════════════════════════════════════════════

// POST /api/platform/lot-template-deps
platform.post('/lot-template-deps', requireSuperAdmin, async (c) => {
  const body = await c.req.json() as any
  if (!body.pred_code || !body.succ_code) return c.json({ error: 'pred_code et succ_code requis' }, 400)
  const id = generateId('ltd')
  await c.env.DB.prepare(`
    INSERT INTO lot_template_deps (id, catalog_type, pred_code, succ_code, dep_type, lag_days)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.catalog_type || 'btp',
    body.pred_code,
    body.succ_code,
    body.dep_type || 'FS',
    body.lag_days ?? 0
  ).run()
  const row = await c.env.DB.prepare('SELECT * FROM lot_template_deps WHERE id = ?').bind(id).first()
  return c.json(row, 201)
})

// PUT /api/platform/lot-template-deps/:id
platform.put('/lot-template-deps/:id', requireSuperAdmin, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json() as any
  await c.env.DB.prepare(`
    UPDATE lot_template_deps SET pred_code = ?, succ_code = ?, dep_type = ?, lag_days = ?
    WHERE id = ?
  `).bind(body.pred_code, body.succ_code, body.dep_type || 'FS', body.lag_days ?? 0, id).run()
  const row = await c.env.DB.prepare('SELECT * FROM lot_template_deps WHERE id = ?').bind(id).first()
  return c.json(row)
})

// DELETE /api/platform/lot-template-deps/:id
platform.delete('/lot-template-deps/:id', requireSuperAdmin, async (c) => {
  await c.env.DB.prepare('DELETE FROM lot_template_deps WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

// ═══════════════════════════════════════════════════════════
// LOT TEMPLATE TASKS (sous-tâches pour catalogues métier)
// ═══════════════════════════════════════════════════════════

// GET /api/platform/lot-template-tasks?catalog=...
platform.get('/lot-template-tasks', requireAdmin, async (c) => {
  const catalog = c.req.query('catalog') || ''
  if (!catalog) return c.json({ error: 'catalog requis' }, 400)
  const rows = await c.env.DB.prepare(`
    SELECT ltt.*, lt.code as lot_code, lt.name as lot_name
    FROM lot_template_tasks ltt
    JOIN lot_templates lt ON lt.id = ltt.lot_template_id
    WHERE lt.catalog_type = ?
    ORDER BY lt.sort_order ASC, ltt.sort_order ASC
  `).bind(catalog).all()
  return c.json(rows.results)
})

// POST /api/platform/lot-template-tasks
platform.post('/lot-template-tasks', requireSuperAdmin, async (c) => {
  const body = await c.req.json() as any
  if (!body.lot_template_id || !body.name) return c.json({ error: 'lot_template_id et name requis' }, 400)
  const id = generateId('ltt')
  await c.env.DB.prepare(`
    INSERT INTO lot_template_tasks (id, lot_template_id, name, duration_days, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, body.lot_template_id, body.name, body.duration_days || 1, body.sort_order ?? 0).run()
  const row = await c.env.DB.prepare('SELECT * FROM lot_template_tasks WHERE id = ?').bind(id).first()
  return c.json(row, 201)
})

// DELETE /api/platform/lot-template-tasks/:id
platform.delete('/lot-template-tasks/:id', requireSuperAdmin, async (c) => {
  await c.env.DB.prepare('DELETE FROM lot_template_tasks WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

// ═══════════════════════════════════════════════════════════
// TRADE CATALOGS (catalogues par corps de métier)
// ═══════════════════════════════════════════════════════════

// GET /api/platform/trade-catalogs — liste tous les catalogues métier (hors btp/facade)
platform.get('/trade-catalogs', requireAdmin, async (c) => {
  const rows = await c.env.DB.prepare(`
    SELECT catalog_type, COUNT(*) as lot_count, MIN(created_at) as created_at
    FROM lot_templates
    WHERE catalog_type NOT IN ('btp', 'facade')
    GROUP BY catalog_type
    ORDER BY catalog_type ASC
  `).all()
  return c.json(rows.results)
})

// DELETE /api/platform/trade-catalogs/:trade_code — supprimer tout un catalogue métier
platform.delete('/trade-catalogs/:trade_code', requireSuperAdmin, async (c) => {
  const tradeCode = c.req.param('trade_code') as string
  if (['btp', 'facade'].includes(tradeCode)) return c.json({ error: 'Impossible de supprimer les catalogues systèmes' }, 400)
  // Supprimer dépendances, puis lots (les tasks CASCADE via FK)
  await c.env.DB.prepare('DELETE FROM lot_template_deps WHERE catalog_type = ?').bind(tradeCode).run()
  await c.env.DB.prepare('DELETE FROM lot_templates WHERE catalog_type = ?').bind(tradeCode).run()
  return c.json({ ok: true })
})

// POST /api/platform/generate-trade-catalog — génération IA d'un catalogue métier
platform.post('/generate-trade-catalog', requireSuperAdmin, async (c) => {
  const body = await c.req.json() as any
  const { trade_code, trade_name, description, overwrite } = body

  if (!trade_code || !trade_name) return c.json({ error: 'trade_code et trade_name requis' }, 400)
  if (['btp', 'facade'].includes(trade_code)) return c.json({ error: 'Code réservé' }, 400)

  // Vérifier si catalog existe déjà
  const existing = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM lot_templates WHERE catalog_type = ?'
  ).bind(trade_code).first<any>()
  if (existing?.cnt > 0 && !overwrite) {
    return c.json({ error: 'Ce catalogue existe déjà. Utilisez overwrite: true pour le régénérer.' }, 409)
  }

  const prefix = trade_code.substring(0, 2).toUpperCase()
  const prompt = `Tu es un expert BTP français, chef de projet et planificateur chantier expérimenté.
Génère un catalogue de lots pour le corps de métier suivant :

Corps de métier : ${trade_name}
Code préfixe : ${prefix} (ex: EL01, EL02…)
${description ? `Description : ${description}` : ''}

══ RÈGLES IMPÉRATIVES ══

1. STRUCTURE DES PHASES (dans cet ordre logique) :
   a) Études / conception si nécessaire (BET, ALDES, plans, DOE) — toujours en PREMIER, avant ou pendant la prépa
   b) Préparation de chantier — installation, repérage, traçage — DURÉE MAX 1 jour (mobilisation)
   c) Approvisionnement matériel — UN SEUL lot qui regroupe TOUTES les fournitures — démarre en SS avec la prépa
   d) Exécution — cœur des travaux, peut être découpé en 2-4 lots séquentiels selon les phases techniques
   e) Tests / essais / contrôles — selon le corps de métier
   f) Réception / levée de réserves — 1 à 2 jours max

2. RÈGLE APPROVISIONNEMENT STRICTE :
   - Créer UN SEUL lot "Approvisionnement matériel" avec TOUTES les fournitures en sous-tâches
   - INTERDIT de créer "Appro courant fort" + "Appro courant faible" séparément
   - L'appro est en SS (Début→Début) avec la préparation, lag_days: 0
   - L'appro se termine AVANT la fin de l'exécution principale

3. DURÉES RÉALISTES :
   - Études / conception : 3 à 7 jours
   - Préparation chantier : 1 jour (pas plus sauf gros œuvre)
   - Approvisionnement : 5 à 15 jours (délais fournisseurs)
   - Exécution : 10 à 45 jours selon complexité
   - Tests / essais : 2 à 5 jours
   - Réception : 1 à 2 jours

4. DÉPENDANCES SANS CROISEMENT :
   - Chaîne principale linéaire : Études→Prépa→Exécution→Tests→Réception
   - L'appro est en SS avec la prépa (démarre en même temps)
   - Chaque lot n'a qu'un seul prédécesseur sauf l'exécution (peut dépendre de l'appro ET de la prépa)
   - PAS de cycles, PAS de dépendances croisées

5. NOMBRE DE LOTS : 5 à 9 lots maximum (lisibilité Gantt)

Réponds UNIQUEMENT en JSON valide, sans commentaires, sans markdown :
{
  "lots": [
    { "code": "${prefix}01", "name": "...", "duration_days": 5, "color": "#hex", "sort_order": 1 }
  ],
  "deps": [
    { "pred_code": "${prefix}01", "succ_code": "${prefix}02", "dep_type": "FS", "lag_days": 0 }
  ],
  "tasks": {
    "${prefix}01": ["Sous-tâche 1", "Sous-tâche 2"],
    "${prefix}02": ["Sous-tâche A", "Sous-tâche B"]
  }
}`

  const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': c.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!aiResp.ok) {
    const err = await aiResp.text()
    return c.json({ error: `Erreur IA: ${err}` }, 502)
  }

  const aiData = await aiResp.json() as any
  const rawContent = aiData.content?.[0]?.text || ''

  let catalog: { lots: any[]; deps: any[]; tasks: Record<string, string[]> }
  try {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Pas de JSON trouvé')
    catalog = JSON.parse(jsonMatch[0])
  } catch {
    return c.json({ error: 'Réponse IA invalide', raw: rawContent }, 502)
  }

  // Si overwrite, supprimer l'existant
  if (overwrite && existing?.cnt > 0) {
    await c.env.DB.prepare('DELETE FROM lot_template_deps WHERE catalog_type = ?').bind(trade_code).run()
    await c.env.DB.prepare('DELETE FROM lot_templates WHERE catalog_type = ?').bind(trade_code).run()
  }

  // Insérer les lots
  const lotIdByCode: Record<string, string> = {}
  for (const lot of catalog.lots || []) {
    const id = generateId('lt')
    lotIdByCode[lot.code] = id
    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO lot_templates (id, catalog_type, code, name, duration_days, color, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, trade_code, lot.code, lot.name, lot.duration_days || 5, lot.color || '#6B7280', lot.sort_order || 0).run()
  }

  // Insérer les dépendances
  for (const dep of catalog.deps || []) {
    const id = generateId('ltd')
    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO lot_template_deps (id, catalog_type, pred_code, succ_code, dep_type, lag_days)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, trade_code, dep.pred_code, dep.succ_code, dep.dep_type || 'FS', dep.lag_days || 0).run()
  }

  // Insérer les tâches
  for (const [lotCode, tasks] of Object.entries(catalog.tasks || {})) {
    const lotId = lotIdByCode[lotCode]
    if (!lotId) continue
    for (let i = 0; i < (tasks as string[]).length; i++) {
      const id = generateId('ltt')
      await c.env.DB.prepare(`
        INSERT INTO lot_template_tasks (id, lot_template_id, name, duration_days, sort_order)
        VALUES (?, ?, ?, 1, ?)
      `).bind(id, lotId, (tasks as string[])[i], i).run()
    }
  }

  // Retourner le catalogue créé
  const [lotsRes, depsRes, tasksRes] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM lot_templates WHERE catalog_type = ? ORDER BY sort_order ASC').bind(trade_code).all(),
    c.env.DB.prepare('SELECT * FROM lot_template_deps WHERE catalog_type = ? ORDER BY pred_code ASC').bind(trade_code).all(),
    c.env.DB.prepare(`
      SELECT ltt.*, lt.code as lot_code
      FROM lot_template_tasks ltt JOIN lot_templates lt ON lt.id = ltt.lot_template_id
      WHERE lt.catalog_type = ? ORDER BY lt.sort_order ASC, ltt.sort_order ASC
    `).bind(trade_code).all(),
  ])

  return c.json({
    ok: true,
    trade_code,
    trade_name,
    lots: lotsRes.results,
    deps: depsRes.results,
    tasks: tasksRes.results,
  }, 201)
})

// ═══════════════════════════════════════════════════════════
// MENU CONFIG
// ═══════════════════════════════════════════════════════════

// GET /api/platform/menu-config — lecture config menu (tous les admins)
platform.get('/menu-config', requireAdmin, async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT * FROM platform_menu_config ORDER BY sort_order ASC'
  ).all()
  return c.json(rows.results)
})

// PUT /api/platform/menu-config — sauvegarder config complète (super-admin seulement)
platform.put('/menu-config', requireSuperAdmin, async (c) => {
  const items = await c.req.json() as any[]
  for (const item of items) {
    await c.env.DB.prepare(`
      UPDATE platform_menu_config
      SET label_fr = ?, label_tr = ?, sort_order = ?, is_visible = ?, updated_at = datetime('now')
      WHERE key = ?
    `).bind(
      item.label_fr,
      item.label_tr || null,
      item.sort_order,
      item.is_visible ? 1 : 0,
      item.key
    ).run()
  }
  const rows = await c.env.DB.prepare('SELECT * FROM platform_menu_config ORDER BY sort_order ASC').all()
  return c.json(rows.results)
})

// ═══════════════════════════════════════════════════════════
// COMPANIES (super-admin)
// ═══════════════════════════════════════════════════════════

// POST /api/platform/companies — créer une nouvelle entreprise (super-admin)
platform.post('/companies', requireSuperAdmin, async (c) => {
  const body = await c.req.json() as any
  if (!body.name) return c.json({ error: 'Le nom de l\'entreprise est requis' }, 400)

  const id = generateId('comp')
  await c.env.DB.prepare(`
    INSERT INTO companies (id, name, type, activity, lot_types, address, city, postal_code, phone, email, siret)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.name,
    body.type || 'entreprise_generale',
    body.activity || null,
    body.lot_types ? JSON.stringify(body.lot_types) : null,
    body.address || null,
    body.city || null,
    body.postal_code || null,
    body.phone || null,
    body.email || null,
    body.siret || null
  ).run()

  // Optionnel : créer un utilisateur admin et envoyer une invitation
  if (body.admin_email) {
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(body.admin_email).first()
    if (existing) return c.json({ error: 'Cet email est déjà utilisé par un compte existant' }, 409)

    const userId = generateId('u')
    const inviteToken = generateId('inv')
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await c.env.DB.prepare(`
      INSERT INTO users (id, email, role, company_id, access_level, is_active, invite_token, invite_expires_at, created_at, updated_at)
      VALUES (?, ?, 'admin', ?, 'admin', 0, ?, ?, datetime('now'), datetime('now'))
    `).bind(userId, body.admin_email, id, inviteToken, tokenExpiry).run()

    const inviteUrl = `https://planningia.com/invite?token=${inviteToken}`
    await sendEmail(
      c.env.RESEND_API_KEY,
      c.env.RESEND_FROM,
      body.admin_email,
      `Invitation à rejoindre PlanningIA — ${body.name}`,
      htmlInvite({ companyName: body.name, accessLabel: 'Administrateur', inviteUrl })
    )
  }

  const company = await c.env.DB.prepare(`
    SELECT c.*, 0 as user_count, 0 as project_count FROM companies c WHERE c.id = ?
  `).bind(id).first()
  return c.json(company, 201)
})

// GET /api/platform/companies — liste toutes les entreprises avec stats
platform.get('/companies', requireSuperAdmin, async (c) => {
  const rows = await c.env.DB.prepare(`
    SELECT c.*,
      COUNT(DISTINCT u.id) as user_count,
      COUNT(DISTINCT p.id) as project_count
    FROM companies c
    LEFT JOIN users u ON u.company_id = c.id AND u.role = 'admin'
    LEFT JOIN projects p ON p.company_id = c.id
    GROUP BY c.id
    ORDER BY c.name ASC
  `).all()
  return c.json(rows.results)
})

// PUT /api/platform/companies/:id — modifier le profil d'une entreprise (super-admin)
platform.put('/companies/:id', requireSuperAdmin, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json() as any
  if (!body.name) return c.json({ error: 'Le nom est requis' }, 400)

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
    body.lot_types ? JSON.stringify(body.lot_types) : null,
    body.address || null,
    body.city || null,
    body.postal_code || null,
    body.phone || null,
    body.email || null,
    body.siret || null,
    id
  ).run()

  const updated = await c.env.DB.prepare('SELECT * FROM companies WHERE id = ?').bind(id).first()
  return c.json(updated)
})

// POST /api/platform/companies/:id/invite — inviter un utilisateur dans une entreprise (super-admin)
platform.post('/companies/:id/invite', requireSuperAdmin, async (c) => {
  const companyId = c.req.param('id')
  const body = await c.req.json() as any
  if (!body.email) return c.json({ error: 'Email requis' }, 400)

  // Vérifier que la company existe
  const company = await c.env.DB.prepare('SELECT * FROM companies WHERE id = ?').bind(companyId).first() as any
  if (!company) return c.json({ error: 'Entreprise introuvable' }, 404)

  // Vérifier que l'email n'existe pas déjà
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(body.email).first()
  if (existing) return c.json({ error: 'Cet email est déjà utilisé' }, 409)

  const userId = generateId('u')
  const inviteToken = generateId('inv')
  const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const accessLevel = body.access_level || 'editeur'
  const userType = body.user_type || 'employee'
  const role = userType === 'subcontractor' ? 'subcontractor' : 'admin'

  await c.env.DB.prepare(`
    INSERT INTO users (id, email, password_hash, role, user_type, company_id, access_level, first_name, last_name,
      is_active, invite_token, invite_expires_at, created_at, updated_at)
    VALUES (?, ?, 'INVITE_PENDING', ?, ?, ?, ?, ?, ?, 0, ?, ?, datetime('now'), datetime('now'))
  `).bind(
    userId, body.email, role, userType, companyId, accessLevel,
    body.first_name || null, body.last_name || null,
    inviteToken, tokenExpiry
  ).run()

  const accessLabels: Record<string, string> = {
    admin: 'Administrateur', editeur: 'Éditeur',
    conducteur: 'Conducteur de travaux', salarie: 'Salarié (lecture seule)',
  }
  const inviteUrl = `https://planningia.com/invite?token=${inviteToken}`
  await sendEmail(
    c.env.RESEND_API_KEY,
    c.env.RESEND_FROM,
    body.email,
    `Invitation à rejoindre PlanningIA — ${company.name}`,
    htmlInvite({
      firstName: body.first_name,
      companyName: company.name,
      accessLabel: accessLabels[accessLevel] || accessLevel,
      inviteUrl,
    })
  )

  return c.json({ ok: true, user_id: userId })
})

// PUT /api/platform/companies/:id/block — bloquer/débloquer tous les users d'une société
platform.put('/companies/:id/block', requireSuperAdmin, async (c) => {
  const companyId = c.req.param('id')
  const { blocked } = await c.req.json() as any
  await c.env.DB.prepare(
    `UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE company_id = ?`
  ).bind(blocked ? 0 : 1, companyId).run()
  return c.json({ ok: true, blocked })
})

// ═══════════════════════════════════════════════════════════
// STATS GLOBALES
// ═══════════════════════════════════════════════════════════

platform.get('/stats', requireSuperAdmin, async (c) => {
  const [companies, users, projects, lots, activeLots] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) as count FROM companies").first<any>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").first<any>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM projects").first<any>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM lots").first<any>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM lots WHERE status = 'active'").first<any>(),
  ])
  // Répartition par statut projet
  const statusRows = await c.env.DB.prepare(
    "SELECT status, COUNT(*) as count FROM projects GROUP BY status"
  ).all()
  return c.json({
    companies: companies?.count || 0,
    users: users?.count || 0,
    projects: projects?.count || 0,
    lots: lots?.count || 0,
    lots_active: activeLots?.count || 0,
    projects_by_status: statusRows.results,
  })
})

export default platform
