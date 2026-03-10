import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import { generateId } from '../utils/crypto'
import type { Env } from '../types'

const documentImport = new Hono<{ Bindings: Env }>()

// ═══════════════════════════════════════════════════════════
// Helper : construire le prompt et appeler Claude
// ═══════════════════════════════════════════════════════════

async function analyzeWithClaude(
  env: Env,
  fileType: 'pdf' | 'excel',
  fileData: string | undefined,
  fileContent: string | undefined,
  catalogContext: string
): Promise<any> {
  const systemPrompt = `Tu es un expert BTP français, planificateur chantier expérimenté (chef de projet TCE, ordonnanceur).
Tu analyses des documents de chantier (devis, DQE, CCTP, marchés) et génères des plannings réalistes.
Réponds UNIQUEMENT avec du JSON valide, sans markdown ni texte autour.`

  const userPrompt = `Analyse ce document BTP et génère un planning de chantier structuré et réaliste.
${catalogContext}

══ RÈGLES DE PLANIFICATION BTP OBLIGATOIRES ══

STRUCTURE DES PHASES (respecter cet ordre pour chaque corps de métier) :
1. Études / conception (si applicable) : toujours EN PREMIER — études ALDES, BET fluides, plans, etc. — 3 à 7j
2. Préparation de chantier : mobilisation, repérage, traçage — MAX 1 jour
3. Approvisionnement : UN SEUL lot pour toutes les fournitures — démarre SS avec la prépa — 5 à 15j
4. Exécution : cœur des travaux — peut être découpé en phases logiques (ex: gros œuvre → second œuvre)
5. Tests / essais / contrôles (si applicable) — 2 à 5j
6. Réception / levée de réserves — 1 à 2j

RÈGLES STRICTES :
- Approvisionnement = UN SEUL lot regroupant toutes les fournitures (pas de split par type de matériel)
- Les études (ALDES, BET, conception) se font AVANT le démarrage des travaux (phase préparatoire)
- La préparation chantier = 1 jour maximum (mobilisation équipe + outillage)
- Dépendances LINÉAIRES sans croisement : chaque lot n'a qu'un prédécesseur direct sauf exceptions documentées
- L'appro est en SS (Début→Début) avec la prépa, lag_days: 0
- L'exécution ne démarre qu'APRÈS la fin de la prépa (FS)
- Durées basées sur la complexité réelle du document, pas sur des moyennes génériques

INSTRUCTIONS D'ANALYSE :
1. Extraire les infos projet : nom du projet, référence/numéro de devis, adresse du chantier, ville, code postal, date début, durée estimée
2. Extraire le nom du client / maître d'ouvrage (MOA) — chercher dans l'en-tête du document, "Client :", "Maître d'ouvrage :", "Pour le compte de :", etc.
3. Identifier tous les corps de métier / lots présents dans le document
4. Pour chaque corps de métier avec catalogue disponible → utiliser ses codes (selected_lots)
5. Pour chaque corps de métier sans catalogue → générer les lots (extra_lots) en respectant les phases ci-dessus
6. Ajuster les durées selon les quantités/montants si visibles dans le document
7. Générer des dépendances qui forment une chaîne logique sans croisement

RETOURNE CE JSON EXACT :
{
  "project_name": "string",
  "reference": "numéro de devis ou référence ou null",
  "client_name": "nom du client / maître d'ouvrage ou null",
  "address": "string ou null",
  "city": "string ou null",
  "postal_code": "code postal ou null",
  "estimated_start": "YYYY-MM-DD ou null",
  "estimated_duration_weeks": number,
  "selected_lots": [
    {
      "template_code": "EL01",
      "catalog_type": "electricien",
      "duration_days": 5,
      "zone": "Tous niveaux",
      "notes": "string ou null"
    }
  ],
  "extra_lots": [
    {
      "code": "XX01",
      "name": "Nom du lot",
      "duration_days": 5,
      "zone": "Tous niveaux",
      "color": "#6366f1",
      "notes": "string ou null"
    }
  ],
  "dependencies": [
    { "pred": "EL01", "succ": "EL02", "type": "FS", "lag_days": 0 }
  ]
}`

  const messages: any[] = fileType === 'pdf'
    ? [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: fileData },
          },
          { type: 'text', text: userPrompt },
        ],
      }]
    : [{ role: 'user', content: `${userPrompt}\n\nCONTENU DU DOCUMENT :\n${fileContent}` }]

  const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    }),
  })

  if (!aiResp.ok) {
    const err = await aiResp.text()
    throw new Error(`Erreur IA: ${err}`)
  }

  const aiData = await aiResp.json() as any
  const rawText = aiData.content?.[0]?.text || ''

  const match = rawText.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Pas de JSON dans la réponse IA')
  return JSON.parse(match[0])
}

// ── Helper : récupérer le contexte des catalogues métier ─────────────────────

async function getCatalogContext(db: any): Promise<string> {
  const catalogsRes = await db.prepare(`
    SELECT DISTINCT catalog_type FROM lot_templates
    WHERE catalog_type NOT IN ('btp', 'facade')
    ORDER BY catalog_type
  `).all()
  const catalogTypes = (catalogsRes.results as any[]).map((r: any) => r.catalog_type as string)
  if (catalogTypes.length === 0) return ''

  const lotsRes = await db.prepare(`
    SELECT catalog_type, code, name, duration_days, zone
    FROM lot_templates
    WHERE catalog_type IN (${catalogTypes.map(() => '?').join(',')})
    ORDER BY catalog_type, sort_order
  `).bind(...catalogTypes).all()

  const byTrade: Record<string, any[]> = {}
  for (const lot of lotsRes.results as any[]) {
    if (!byTrade[lot.catalog_type]) byTrade[lot.catalog_type] = []
    byTrade[lot.catalog_type].push(lot)
  }
  return `\nCATALOGUES CORPS DE MÉTIER DISPONIBLES :\n` +
    Object.entries(byTrade).map(([trade, lots]) =>
      `${trade.toUpperCase()} :\n` +
      lots.map((l: any) => `  - ${l.code} | ${l.name} | ${l.duration_days}j | zone: ${l.zone || 'Tous niveaux'}`).join('\n')
    ).join('\n\n')
}

// ═══════════════════════════════════════════════════════════
// POST /api/projects/analyze-document
// Étape 1 : analyse IA sans écriture D1 — retourne les données extraites
// ═══════════════════════════════════════════════════════════

documentImport.post('/projects/analyze-document', requireAuth, async (c) => {
  const body = await c.req.json() as {
    file_type: 'pdf' | 'excel'
    file_data?: string
    file_content?: string
  }

  if (!body.file_type) return c.json({ error: 'file_type requis' }, 400)
  if (body.file_type === 'pdf' && !body.file_data)
    return c.json({ error: 'file_data (base64) requis pour PDF' }, 400)
  if (body.file_type === 'excel' && !body.file_content)
    return c.json({ error: 'file_content requis pour Excel' }, 400)

  try {
    const catalogContext = await getCatalogContext(c.env.DB)
    const extracted = await analyzeWithClaude(
      c.env,
      body.file_type,
      body.file_data,
      body.file_content,
      catalogContext
    )
    return c.json({ extracted })
  } catch (err: any) {
    return c.json({ error: err.message || 'Erreur analyse IA' }, 500)
  }
})

// ═══════════════════════════════════════════════════════════
// POST /api/projects/from-document
// Étape 2 : création du projet à partir des données confirmées
// ═══════════════════════════════════════════════════════════

documentImport.post('/projects/from-document', requireAuth, async (c) => {
  const user = (c as any).get('user')
  const body = await c.req.json() as {
    project_name: string
    reference?: string
    client_name?: string
    address?: string
    city?: string
    postal_code?: string
    estimated_start?: string
    estimated_duration_weeks?: number
    selected_lots?: any[]
    extra_lots?: any[]
    dependencies?: any[]
  }

  if (!body.project_name) return c.json({ error: 'project_name requis' }, 400)

  const projectId = generateId('proj')
  const now = new Date().toISOString()

  await c.env.DB.prepare(`
    INSERT INTO projects (id, name, reference, client_name, address, city, postal_code, start_date, duration_weeks, status, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
  `).bind(
    projectId,
    body.project_name,
    body.reference || null,
    body.client_name || null,
    body.address || null,
    body.city || null,
    body.postal_code || null,
    body.estimated_start || null,
    body.estimated_duration_weeks || 8,
    user.sub,
    now, now
  ).run()

  const lotIdByCode: Record<string, string> = {}
  let sortOrder = 1

  // Lots depuis catalogues
  if (body.selected_lots?.length) {
    const templateCodes = body.selected_lots.map((l: any) => l.template_code)
    const templatesRes = await c.env.DB.prepare(`
      SELECT * FROM lot_templates
      WHERE code IN (${templateCodes.map(() => '?').join(',')})
    `).bind(...templateCodes).all()
    const templateMap: Record<string, any> = {}
    for (const t of templatesRes.results as any[]) templateMap[t.code] = t

    for (const sel of body.selected_lots) {
      const tmpl = templateMap[sel.template_code]
      if (!tmpl) continue
      const lotId = generateId('lot')
      lotIdByCode[sel.template_code] = lotId
      await c.env.DB.prepare(`
        INSERT INTO lots (id, project_id, code, name, name_tr, duration_days, color, zone, notes,
          progress_percent, status, sort_order, is_critical, early_start, early_finish,
          late_start, late_finish, total_float, is_provisional, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending', ?, 0, 0, 0, 0, 0, 0, 0, ?, ?)
      `).bind(
        lotId, projectId,
        tmpl.code, tmpl.name, tmpl.name_tr || null,
        sel.duration_days || tmpl.duration_days,
        tmpl.color || '#6366f1',
        sel.zone || tmpl.zone || 'Tous niveaux',
        sel.notes || null,
        sortOrder++, now, now
      ).run()
    }
  }

  // Lots extra (hors catalogue)
  if (body.extra_lots?.length) {
    for (const extra of body.extra_lots) {
      const lotId = generateId('lot')
      lotIdByCode[extra.code] = lotId
      await c.env.DB.prepare(`
        INSERT INTO lots (id, project_id, code, name, duration_days, color, zone, notes,
          progress_percent, status, sort_order, is_critical, early_start, early_finish,
          late_start, late_finish, total_float, is_provisional, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending', ?, 0, 0, 0, 0, 0, 0, 0, ?, ?)
      `).bind(
        lotId, projectId,
        extra.code, extra.name,
        extra.duration_days || 5,
        extra.color || '#6366f1',
        extra.zone || 'Tous niveaux',
        extra.notes || null,
        sortOrder++, now, now
      ).run()
    }
  }

  // Dépendances
  if (body.dependencies?.length) {
    for (const dep of body.dependencies) {
      const predId = lotIdByCode[dep.pred]
      const succId = lotIdByCode[dep.succ]
      if (!predId || !succId) continue
      await c.env.DB.prepare(`
        INSERT INTO dependencies (id, project_id, predecessor_id, successor_id, type, lag_days)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        generateId('dep'), projectId, predId, succId,
        dep.type || 'FS', dep.lag_days || 0
      ).run()
    }
  }

  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(projectId).first()
  const lots = await c.env.DB.prepare('SELECT * FROM lots WHERE project_id = ? ORDER BY sort_order').bind(projectId).all()

  return c.json({
    project,
    lots: lots.results,
    lots_count: lots.results.length,
    deps_count: body.dependencies?.length || 0,
  })
})

export default documentImport
