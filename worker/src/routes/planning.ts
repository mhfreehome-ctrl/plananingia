import { Hono } from 'hono'
import { requireAdmin, requireAuth } from '../middleware/auth'
import { generateId } from '../utils/crypto'
import { computeCPM, applyDatesToLots } from '../utils/cpm'
import {
  DEFAULT_LOTS, DEFAULT_DEPENDENCIES,
  FACADE_LOTS, FACADE_DEPENDENCIES, FACADE_MILESTONES, FACADE_LOT_TYPE_NAMES,
} from '../utils/defaults'
import type { Env, Lot, Dependency } from '../types'

const planning = new Hono<{ Bindings: Env }>()

// ─────────────────────────────────────────────────────────────
// Contextes IA par type de chantier
// ─────────────────────────────────────────────────────────────
const CHANTIER_TYPE_CONTEXT: Record<string, string> = {
  maison: `Type de chantier : MAISON INDIVIDUELLE (~150m², terrain plat, 1 à 2 niveaux, construction neuve en France). Caractéristiques : chantier compact, peu de corps d'état spécialisés en parallèle, délais maçonnerie et charpente déterminants. Durée typique : 8-14 mois.`,
  collectif: `Type de chantier : COLLECTIF RÉSIDENTIEL (immeuble 4-8 étages, 20-40 logements, béton armé ou ossature mixte). Caractéristiques : nombreux corps d'état simultanés par étage, gros œuvre long (3-6 mois), phases de second œuvre par niveaux décalés. Durée typique : 18-30 mois.`,
  tertiaire_depot: `Type de chantier : TERTIAIRE DÉPÔT / LOGISTIQUE (entrepôt, local d'activité, hangar industriel, surface >500m²). Caractéristiques : structure métallique ou béton, peu de cloisons intérieures, finitions limitées, dallage béton important. Durée typique : 6-12 mois.`,
  tertiaire_bureaux: `Type de chantier : TERTIAIRE BUREAUX (immeuble de bureaux, 2-6 niveaux, dalles béton, façade vitrée). Caractéristiques : nombreux équipements techniques (CVC, électricité forte/faible courant, faux-plafonds), aménagements intérieurs soignés, délais fluides critiques. Durée typique : 12-20 mois.`,
  entreprise: `Type de chantier : ENTREPRISE / RÉGIE INTERNE (travaux coordonnés par une entreprise générale avec ses propres équipes de salariés et des sous-traitants spécialisés). Caractéristiques : chaque lot peut être affecté à une équipe interne (plâtrerie, maçonnerie, peinture...) ou à un sous-traitant externe. L'optimisation porte sur la charge de travail des équipes pour éviter les chevauchements. L'entreprise gère plusieurs chantiers simultanément avec rotation des équipes. La planification doit permettre une coordination multi-chantiers. Durée par chantier : variable selon la taille du marché.`,
}

// ─────────────────────────────────────────────────────────────
// Utilitaire date (CF Workers : pas de Node — utilise native Date)
// ─────────────────────────────────────────────────────────────
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

// ─────────────────────────────────────────────────────────────
// POST /api/projects/:id/generate-ai — Claude génère le planning
// ─────────────────────────────────────────────────────────────
planning.post('/projects/:id/generate-ai', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json().catch(() => ({})) as any
  const chantierType: string = body?.chantier_type || ''

  const proj = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first<any>()
  if (!proj) return c.json({ error: 'Not found' }, 404)

  const existingLots = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM lots WHERE project_id = ?').bind(id).first<any>()

  // ── Détection mode FACADE ────────────────────────────────────
  const user = c.get('user')
  const projLotTypes: string[] = proj.lot_types ? JSON.parse(proj.lot_types) : []
  const isFacade = chantierType === 'facade'
    || projLotTypes.length > 0
    || (chantierType === '' && (user as any).company_type === 'entreprise_metier')

  if (isFacade) {
    return await generateFacadePlanning(c, id, proj, projLotTypes, existingLots?.cnt > 0)
  }

  // ── Mode BTP général ─────────────────────────────────────────
  const chantierContext = chantierType && CHANTIER_TYPE_CONTEXT[chantierType]
    ? `\n${CHANTIER_TYPE_CONTEXT[chantierType]}\n`
    : ''

  const hasExistingLotsBTP = (existingLots?.cnt || 0) > 0

  const prompt = `Tu es un expert en planification BTP (Bâtiment et Travaux Publics).

Projet : ${proj.name}
Description : ${proj.description || 'Construction standard'}
Durée imposée : ${proj.duration_weeks || 20} semaines — RESPECTE cette durée SANS la remettre en question
Date de début : ${proj.start_date || 'Non définie'}
${chantierContext}
${hasExistingLotsBTP
  ? `Lots déjà présents dans le projet (tu dois UNIQUEMENT ajuster leurs durées, ne pas en ajouter) :`
  : `Catalogue de lots disponibles (sélectionne les lots PERTINENTS pour ce type de chantier) :`
}
${DEFAULT_LOTS.map(l => `${l.code} - ${l.name} (durée std: ${l.duration_days}j)`).join('\n')}

${hasExistingLotsBTP
  ? `Propose des durées optimisées pour les lots existants en tenant compte du type de chantier et de la durée totale imposée.`
  : `Sélectionne les lots appropriés et propose des durées cohérentes avec la durée totale imposée. Inclure uniquement les lots vraiment nécessaires.`
}

RÈGLE ABSOLUE : Ne jamais ajouter de disclaimer, d'avertissement ou de jugement sur la faisabilité des délais.
L'utilisateur connaît son chantier. Adapte simplement les durées à la contrainte fournie.

Réponds UNIQUEMENT en JSON valide avec ce format exact :
{
  "lots": [
    {"code": "L01", "duration_days": 10, "notes": "explication courte"}
  ],
  "analysis": "Résumé factuel de l'organisation retenue (uniquement factuel, sans avertissement ni jugement)"
}`

  if (!c.env.CLAUDE_API_KEY) return c.json({ error: 'CLAUDE_API_KEY not configured' }, 500)

  const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': c.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!aiResp.ok) {
    const errText = await aiResp.text().catch(() => '')
    console.error(`[AI ERROR] status=${aiResp.status} detail=${errText}`)
    return c.json({ error: `AI API error ${aiResp.status}: ${errText}` }, 502)
  }
  const aiData = await aiResp.json() as any
  const text = aiData.content?.[0]?.text || ''

  let parsed: any = null
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
  } catch { return c.json({ error: 'AI response parse error', raw: text }, 502) }

  await c.env.DB.prepare('INSERT INTO ai_sessions (id, project_id, prompt, response) VALUES (?, ?, ?, ?)')
    .bind(generateId('ai'), id, prompt, text).run()

  if (parsed?.lots) {
    if (hasExistingLotsBTP) {
      // Mise à jour des durées uniquement
      const updateStmts = parsed.lots.map((l: any) =>
        c.env.DB.prepare('UPDATE lots SET duration_days=?, notes=?, updated_at=datetime(\'now\') WHERE project_id=? AND code=?')
          .bind(l.duration_days, l.notes || null, id, l.code)
      )
      if (updateStmts.length) await c.env.DB.batch(updateStmts)
    } else {
      // Création des lots depuis la sélection IA (lots BTP)
      const aiCodes = new Set(parsed.lots.map((l: any) => l.code))
      const selectedDefaultLots = DEFAULT_LOTS.filter(dl => aiCodes.has(dl.code))
      const lotIds: Record<string, string> = {}

      if (selectedDefaultLots.length) {
        const insertStmts = selectedDefaultLots.map(dl => {
          const aiLot = parsed.lots.find((l: any) => l.code === dl.code)
          const lid = generateId('lot')
          lotIds[dl.code] = lid
          return c.env.DB.prepare(
            'INSERT INTO lots (id, project_id, code, name, name_tr, duration_days, color, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(lid, id, dl.code, dl.name, (dl as any).name_tr || null,
            aiLot?.duration_days || dl.duration_days,
            dl.color, aiLot?.notes || null, dl.sort_order)
        })
        await c.env.DB.batch(insertStmts)

        // Insérer les dépendances pour les lots créés
        const { DEFAULT_DEPENDENCIES } = await import('../utils/defaults')
        const depStmts = DEFAULT_DEPENDENCIES
          .filter(d => lotIds[d.pred] && lotIds[d.succ])
          .map(d =>
            c.env.DB.prepare('INSERT OR IGNORE INTO dependencies (id, project_id, predecessor_id, successor_id, type, lag_days) VALUES (?, ?, ?, ?, ?, ?)')
              .bind(generateId('dep'), id, lotIds[d.pred], lotIds[d.succ], d.type, d.lag)
          )
        if (depStmts.length) await c.env.DB.batch(depStmts)
      }
    }
  }

  // ── Auto-CPM : calcule et sauvegarde les dates après la génération ───────
  const lotsRes = await c.env.DB.prepare('SELECT * FROM lots WHERE project_id = ? ORDER BY sort_order').bind(id).all()
  const depsRes = await c.env.DB.prepare('SELECT * FROM dependencies WHERE project_id = ?').bind(id).all()
  const lots = lotsRes.results as unknown as import('../types').Lot[]
  const deps = depsRes.results as unknown as import('../types').Dependency[]

  if (lots.length) {
    let computed = computeCPM(lots, deps)
    if (proj.start_date) computed = applyDatesToLots(computed, proj.start_date)
    const cpmStmts = computed.map(l =>
      c.env.DB.prepare(`UPDATE lots SET early_start=?, early_finish=?, late_start=?, late_finish=?,
        total_float=?, is_critical=?, start_date_planned=?, end_date_planned=?, updated_at=datetime('now')
        WHERE id=?`)
        .bind(l.early_start, l.early_finish, l.late_start, l.late_finish, l.total_float,
          l.is_critical, l.start_date_planned || null, l.end_date_planned || null, l.id)
    )
    if (cpmStmts.length) await c.env.DB.batch(cpmStmts)
    // Passer le projet en 'programme' si encore en 'devis'
    await c.env.DB.prepare(`UPDATE projects SET status='programme', updated_at=datetime('now') WHERE id=? AND status='devis'`).bind(id).run()
  }

  await c.env.DB.prepare('INSERT INTO notifications (id, user_id, project_id, type, title, title_tr, message, message_tr) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(generateId('notif'), user.sub, id, 'planning_generated',
      'Planning généré par IA', 'AI ile planlama oluşturuldu',
      `Planning du projet "${proj.name}" généré avec succès.`, `"${proj.name}" projesi planlaması başarıyla oluşturuldu.`).run()

  return c.json({ ok: true, analysis: parsed?.analysis || '', lots_updated: parsed?.lots?.length || 0, lots_created: hasExistingLotsBTP ? 0 : (parsed?.lots?.length || 0) })
})

// ─────────────────────────────────────────────────────────────
// Génération planning FACADE (DESIGN FACADES)
// ─────────────────────────────────────────────────────────────
async function generateFacadePlanning(
  c: any,
  projectId: string,
  proj: any,
  lotTypes: string[],
  hasExistingLots: boolean
) {
  // Lots actifs selon les types sélectionnés (lot_types:[] = toujours actif)
  const activeLots = FACADE_LOTS.filter(l =>
    l.lot_types.length === 0 || l.lot_types.some(t => lotTypes.includes(t))
  )
  const activeCodes = new Set(activeLots.map(l => l.code))

  // Dépendances filtrées sur lots actifs
  const activeDeps = FACADE_DEPENDENCIES.filter(d =>
    activeCodes.has(d.pred) && activeCodes.has(d.succ)
  )

  const lotTypeNames = lotTypes.length > 0
    ? lotTypes.map(t => FACADE_LOT_TYPE_NAMES[t] || t).join(', ')
    : 'Tous types de pose façade'

  const prompt = `Tu es un expert en planification de travaux de POSE DE FAÇADE en France.

Entreprise : DESIGN FACADES — spécialiste façades (grésée, enduit projeté, bardage)
Projet : ${proj.name}
Description : ${proj.description || 'Chantier façade standard'}
Durée imposée : ${proj.duration_weeks || 12} semaines — RESPECTE cette durée SANS la remettre en question
Date de début : ${proj.start_date || 'Non définie'}
Surface estimée : ~3 000 m² (chantier standard DESIGN FACADES, ajuste si description précise)
Lots activés : ${lotTypeNames}
Règle : Façade Grésée et Enduit Projeté ne peuvent pas être réalisés simultanément sur un même bâtiment.
Ressources : 2 équipes façade grésée, 1 équipe enduit, 1 équipe bardage, 1 équipe échafaudage.

Lots disponibles (principaux) :
${activeLots.filter(l => !l.parent_code).map(l => `${l.code} - ${l.name} (std: ${l.duration_days}j)`).join('\n')}

Sous-lots (subdivisions internes) :
${activeLots.filter(l => l.parent_code).map(l => `${l.code} - ${l.name} (sous-lot de ${l.parent_code}, std: ${l.duration_days}j)`).join('\n')}

Adapte les durées en tenant compte de la surface, des équipes et de la durée imposée.
RÈGLE ABSOLUE : Ne jamais ajouter de disclaimer, d'avertissement ou de jugement sur la faisabilité des délais.

Réponds UNIQUEMENT en JSON valide :
{
  "lots": [
    {"code": "F00", "duration_days": 5, "notes": "Installation 2 niveaux d'échafaudage"}
  ],
  "analysis": "Résumé factuel de l'organisation retenue (uniquement factuel, sans avertissement ni jugement)"
}`

  if (!c.env.CLAUDE_API_KEY) return c.json({ error: 'CLAUDE_API_KEY not configured' }, 500)

  const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': c.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!aiResp.ok) {
    const errText = await aiResp.text().catch(() => '')
    console.error(`[AI ERROR] status=${aiResp.status} detail=${errText}`)
    return c.json({ error: `AI API error ${aiResp.status}: ${errText}` }, 502)
  }
  const aiData = await aiResp.json() as any
  const text = aiData.content?.[0]?.text || ''

  let parsed: any = null
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
  } catch { return c.json({ error: 'AI response parse error', raw: text }, 502) }

  await c.env.DB.prepare('INSERT INTO ai_sessions (id, project_id, prompt, response) VALUES (?, ?, ?, ?)')
    .bind(generateId('ai'), projectId, prompt, text).run()

  if (parsed?.lots) {
    // Récupérer les codes lots existants dans ce projet
    const existingCodesRes = await c.env.DB.prepare('SELECT id, code FROM lots WHERE project_id = ? AND parent_lot_id IS NULL')
      .bind(projectId).all()
    const existingLotMap: Record<string, string> = {} // code → id
    for (const r of existingCodesRes.results as any[]) {
      existingLotMap[r.code] = r.id
    }
    const wasEmpty = Object.keys(existingLotMap).length === 0

    // 1. Mise à jour des lots déjà présents
    const updateStmts = parsed.lots
      .filter((l: any) => existingLotMap[l.code])
      .map((l: any) =>
        c.env.DB.prepare('UPDATE lots SET duration_days=?, notes=?, updated_at=datetime(\'now\') WHERE project_id=? AND code=?')
          .bind(l.duration_days, l.notes || null, projectId, l.code)
      )
    if (updateStmts.length) await c.env.DB.batch(updateStmts)

    // 2. Création des lots MANQUANTS (présents dans activeLots mais pas dans le projet)
    const missingParents = activeLots.filter(l => !l.parent_code && !existingLotMap[l.code])
    const newLotIds: Record<string, string> = { ...existingLotMap }

    if (missingParents.length) {
      const parentStmts = missingParents.map(fl => {
        const aiLot = parsed.lots.find((l: any) => l.code === fl.code)
        const lid = generateId('lot')
        newLotIds[fl.code] = lid
        return c.env.DB.prepare(
          'INSERT INTO lots (id, project_id, code, name, duration_days, color, notes, sort_order, parent_lot_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)'
        ).bind(lid, projectId, fl.code, fl.name,
          aiLot?.duration_days || fl.duration_days,
          fl.color, aiLot?.notes || null, fl.sort_order)
      })
      await c.env.DB.batch(parentStmts)
    }

    // Sous-lots manquants
    const missingSubs = activeLots.filter(l => l.parent_code && !existingLotMap[l.code])
    if (missingSubs.length) {
      const subStmts = missingSubs.map(fl => {
        const aiLot = parsed.lots.find((l: any) => l.code === fl.code)
        const lid = generateId('lot')
        newLotIds[fl.code] = lid
        const parentId = fl.parent_code ? (newLotIds[fl.parent_code] || null) : null
        return c.env.DB.prepare(
          'INSERT INTO lots (id, project_id, code, name, duration_days, color, notes, sort_order, parent_lot_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(lid, projectId, fl.code, fl.name,
          aiLot?.duration_days || fl.duration_days,
          fl.color, aiLot?.notes || null, fl.sort_order, parentId)
      })
      await c.env.DB.batch(subStmts)
    }

    // 3. Dépendances pour les lots nouvellement créés
    if (missingParents.length || missingSubs.length) {
      const depStmts = activeDeps
        .filter(d => newLotIds[d.pred] && newLotIds[d.succ])
        .map(d =>
          c.env.DB.prepare('INSERT OR IGNORE INTO dependencies (id, project_id, predecessor_id, successor_id, type, lag_days) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(generateId('dep'), projectId, newLotIds[d.pred], newLotIds[d.succ], d.type, d.lag)
        )
      if (depStmts.length) await c.env.DB.batch(depStmts)
    }

    // 4. Jalons — seulement si le projet était vide (première génération)
    if (wasEmpty) {
      const startDate = proj.start_date || new Date().toISOString().split('T')[0]
      const durationDays = (proj.duration_weeks || 12) * 7

      await c.env.DB.prepare(
        `DELETE FROM milestones WHERE project_id = ? AND name IN (?,?,?,?)`
      ).bind(projectId,
        'Signature du marché', 'Livraison échafaudage',
        'Enlèvement échafaudage', 'Réception chantier'
      ).run()

      const milestoneStmts = FACADE_MILESTONES.map(m => {
        let date: string
        if (m.offset_start !== undefined) {
          date = addDays(startDate, m.offset_start)
        } else if (m.offset_end !== undefined) {
          date = addDays(startDate, durationDays + (m.offset_end ?? 0))
        } else {
          date = startDate
        }
        return c.env.DB.prepare(
          'INSERT INTO milestones (id, project_id, name, date, color) VALUES (?, ?, ?, ?, ?)'
        ).bind(generateId('ms'), projectId, m.name, date, m.color)
      })
      await c.env.DB.batch(milestoneStmts)
    }
  }

  // ── Auto-CPM après génération façade ────────────────────────────────────
  const facadeLotsRes = await c.env.DB.prepare('SELECT * FROM lots WHERE project_id = ? ORDER BY sort_order').bind(projectId).all()
  const facadeDepsRes = await c.env.DB.prepare('SELECT * FROM dependencies WHERE project_id = ?').bind(projectId).all()
  const facadeLots = facadeLotsRes.results as unknown as import('../types').Lot[]
  const facadeDeps = facadeDepsRes.results as unknown as import('../types').Dependency[]

  if (facadeLots.length) {
    let computed = computeCPM(facadeLots, facadeDeps)
    if (proj.start_date) computed = applyDatesToLots(computed, proj.start_date)
    const cpmStmts = computed.map(l =>
      c.env.DB.prepare(`UPDATE lots SET early_start=?, early_finish=?, late_start=?, late_finish=?,
        total_float=?, is_critical=?, start_date_planned=?, end_date_planned=?, updated_at=datetime('now')
        WHERE id=?`)
        .bind(l.early_start, l.early_finish, l.late_start, l.late_finish, l.total_float,
          l.is_critical, l.start_date_planned || null, l.end_date_planned || null, l.id)
    )
    if (cpmStmts.length) await c.env.DB.batch(cpmStmts)
    await c.env.DB.prepare(`UPDATE projects SET status='programme', updated_at=datetime('now') WHERE id=? AND status='devis'`).bind(projectId).run()
  }

  const user = c.get('user')
  await c.env.DB.prepare('INSERT INTO notifications (id, user_id, project_id, type, title, title_tr, message, message_tr) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(generateId('notif'), user.sub, projectId, 'planning_generated',
      'Planning façade généré par IA', 'AI ile cephe planlaması oluşturuldu',
      `Planning façade "${proj.name}" généré (${lotTypes.join(', ') || 'tous lots'}).`,
      `"${proj.name}" projesi cephe planlaması başarıyla oluşturuldu.`).run()

  return c.json({
    ok: true,
    mode: 'facade',
    lot_types: lotTypes,
    analysis: parsed?.analysis || '',
    lots_updated: parsed?.lots?.length || 0,
    milestones_created: hasExistingLots ? 0 : FACADE_MILESTONES.length,
  })
}

// ─────────────────────────────────────────────────────────────
// POST /api/projects/:id/compute-cpm — calcule CPM et sauvegarde les dates
// ─────────────────────────────────────────────────────────────
planning.post('/projects/:id/compute-cpm', requireAdmin, async (c) => {
  const { id } = c.req.param()
  const proj = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first<any>()
  if (!proj) return c.json({ error: 'Not found' }, 404)

  const lotsRes = await c.env.DB.prepare('SELECT * FROM lots WHERE project_id = ? ORDER BY sort_order').bind(id).all()
  const depsRes = await c.env.DB.prepare('SELECT * FROM dependencies WHERE project_id = ?').bind(id).all()

  const lots = lotsRes.results as unknown as Lot[]
  const deps = depsRes.results as unknown as Dependency[]

  if (!lots.length) return c.json({ error: 'No lots found' }, 400)

  let computed = computeCPM(lots, deps)
  if (proj.start_date) {
    computed = applyDatesToLots(computed, proj.start_date)
  }

  const stmts = computed.map(l =>
    c.env.DB.prepare(`
      UPDATE lots SET early_start=?, early_finish=?, late_start=?, late_finish=?, total_float=?,
        is_critical=?, start_date_planned=?, end_date_planned=?, updated_at=datetime('now')
      WHERE id=?
    `).bind(l.early_start, l.early_finish, l.late_start, l.late_finish, l.total_float,
      l.is_critical, l.start_date_planned || null, l.end_date_planned || null, l.id)
  )
  await c.env.DB.batch(stmts)

  await c.env.DB.prepare('UPDATE projects SET status=\'programme\', updated_at=datetime(\'now\') WHERE id=? AND status=\'devis\'')
    .bind(id).run()

  const criticalCount = computed.filter(l => l.is_critical).length
  return c.json({ ok: true, critical_lots: criticalCount, total_days: Math.max(...computed.map(l => l.early_finish)) })
})

// ─────────────────────────────────────────────────────────────
// POST /api/planning/batch-compute-cpm
// Lance le CPM pour TOUS les projets de l'entreprise qui ont des lots
// ─────────────────────────────────────────────────────────────
planning.post('/planning/batch-compute-cpm', requireAdmin, async (c) => {
  const user = c.get('user')
  const cid = user.company_id

  // Tous les projets de l'entreprise ayant au moins 1 lot (super admin : tous)
  const projectsRes = await c.env.DB.prepare(`
    SELECT DISTINCT p.id, p.start_date, p.status
    FROM projects p
    INNER JOIN lots l ON l.project_id = p.id
    WHERE (p.company_id = ? OR ? IS NULL)
  `).bind(cid, cid).all()

  const projects = projectsRes.results as any[]
  if (!projects.length) return c.json({ ok: true, processed: 0, message: 'Aucun projet avec lots' })

  // Charger tous les lots via JOIN
  const lotsRes = await c.env.DB.prepare(`
    SELECT l.* FROM lots l
    INNER JOIN projects p ON p.id = l.project_id AND (p.company_id = ? OR ? IS NULL)
    ORDER BY l.project_id, l.sort_order
  `).bind(cid, cid).all()

  // Charger toutes les dépendances via JOIN
  const depsRes = await c.env.DB.prepare(`
    SELECT d.* FROM dependencies d
    INNER JOIN projects p ON p.id = d.project_id AND (p.company_id = ? OR ? IS NULL)
  `).bind(cid, cid).all()

  const allLots = lotsRes.results as unknown as (Lot & { project_id: string })[]
  const allDeps = depsRes.results as unknown as (Dependency & { project_id: string })[]

  // Grouper par project_id
  const lotsByProject = new Map<string, Lot[]>()
  const depsByProject = new Map<string, Dependency[]>()
  for (const lot of allLots) {
    const arr = lotsByProject.get(lot.project_id) || []
    arr.push(lot)
    lotsByProject.set(lot.project_id, arr)
  }
  for (const dep of allDeps) {
    const arr = depsByProject.get(dep.project_id) || []
    arr.push(dep)
    depsByProject.set(dep.project_id, arr)
  }

  const allUpdateStmts: any[] = []
  let processed = 0

  for (const proj of projects) {
    const lots = lotsByProject.get(proj.id) || []
    const deps = depsByProject.get(proj.id) || []
    if (!lots.length) continue

    let computed = computeCPM(lots, deps)
    if (proj.start_date) computed = applyDatesToLots(computed, proj.start_date)

    for (const l of computed) {
      const ll = l as any
      allUpdateStmts.push(
        c.env.DB.prepare(`
          UPDATE lots SET early_start=?, early_finish=?, late_start=?, late_finish=?,
            total_float=?, is_critical=?, start_date_planned=?, end_date_planned=?,
            updated_at=datetime('now')
          WHERE id=?
        `).bind(
          ll.early_start, ll.early_finish, ll.late_start, ll.late_finish,
          ll.total_float, ll.is_critical ? 1 : 0,
          ll.start_date_planned || null, ll.end_date_planned || null,
          ll.id
        )
      )
    }
    processed++
  }

  // Exécuter en chunks de 100 (limite D1)
  const CHUNK = 100
  for (let i = 0; i < allUpdateStmts.length; i += CHUNK) {
    await c.env.DB.batch(allUpdateStmts.slice(i, i + CHUNK))
  }

  // Passer les projets de 'devis' → 'programme'
  const statusStmts = projects.map(p =>
    c.env.DB.prepare(`UPDATE projects SET status='programme', updated_at=datetime('now') WHERE id=? AND status='devis'`)
      .bind(p.id)
  )
  for (let i = 0; i < statusStmts.length; i += 100) {
    await c.env.DB.batch(statusStmts.slice(i, i + 100))
  }

  return c.json({ ok: true, processed, lots_updated: allUpdateStmts.length })
})

// ─────────────────────────────────────────────────────────────
// GET /api/projects/:id/gantt — données pour le Gantt
// ─────────────────────────────────────────────────────────────
planning.get('/projects/:id/gantt', requireAuth, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')

  const proj = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first<any>()
  if (!proj) return c.json({ error: 'Not found' }, 404)

  let lotsQuery = `
    SELECT l.*,
      u.first_name || ' ' || COALESCE(u.last_name,'') as subcontractor_name,
      u.company_name as subcontractor_company,
      t.name as team_name, t.color as team_color
    FROM lots l
    LEFT JOIN users u ON u.id = l.subcontractor_id
    LEFT JOIN teams t ON t.id = l.team_id
    WHERE l.project_id = ?`

  const lotsRes = user.role === 'subcontractor'
    ? await c.env.DB.prepare(lotsQuery + ' AND l.subcontractor_id = ? ORDER BY l.sort_order').bind(id, user.sub).all()
    : await c.env.DB.prepare(lotsQuery + ' ORDER BY l.sort_order').bind(id).all()
  const depsRes = await c.env.DB.prepare('SELECT * FROM dependencies WHERE project_id = ?').bind(id).all()

  return c.json({
    project: proj,
    lots: lotsRes.results,
    dependencies: depsRes.results,
  })
})

// ─────────────────────────────────────────────────────────────
// GET /api/planning/unified — planning portfolio tous projets
// Retourne chaque projet avec sa durée globale (min/max dates lots)
// ─────────────────────────────────────────────────────────────
planning.get('/planning/unified', requireAuth, async (c) => {
  const user = c.get('user')

  let query: string
  let bindings: any[]

  if (user.company_id) {
    query = `
      SELECT
        p.id, p.name, p.reference, p.city, p.status, p.start_date, p.client_name,
        MIN(l.start_date_planned) AS gantt_start,
        MAX(l.end_date_planned)   AS gantt_end,
        COUNT(l.id)               AS lot_count,
        ROUND(AVG(l.progress_percent), 0) AS avg_progress
      FROM projects p
      LEFT JOIN lots l ON l.project_id = p.id
      WHERE p.company_id = ?
      GROUP BY p.id
      ORDER BY COALESCE(MIN(l.start_date_planned), p.start_date) ASC NULLS LAST, p.name ASC
    `
    bindings = [user.company_id]
  } else {
    // Admin sans company_id → tous les projets (compte démo)
    query = `
      SELECT
        p.id, p.name, p.reference, p.city, p.status, p.start_date, p.client_name,
        MIN(l.start_date_planned) AS gantt_start,
        MAX(l.end_date_planned)   AS gantt_end,
        COUNT(l.id)               AS lot_count,
        ROUND(AVG(l.progress_percent), 0) AS avg_progress
      FROM projects p
      LEFT JOIN lots l ON l.project_id = p.id
      GROUP BY p.id
      ORDER BY COALESCE(MIN(l.start_date_planned), p.start_date) ASC NULLS LAST, p.name ASC
    `
    bindings = []
  }

  const rows = await c.env.DB.prepare(query).bind(...bindings).all()
  return c.json(rows.results)
})

export default planning
