# FICHE DE LIAISON — PlanningIA v4.0
**Mise à jour : 2026-03-08**
**Statut : Production — V4 déployée ✅ (icônes, emails, templates globaux, bulk actions)**

---

## 1. INFRASTRUCTURE CLOUDFLARE

| Élément | Valeur |
|---|---|
| **Worker** | `planningai-api` — https://planningai-api.mhfreehome.workers.dev |
| **Pages** | https://planningia.pages.dev · https://planningia.com · https://www.planningia.com |
| **D1 Database** | `planningAI-v2` — ID : `f89b9344-ab63-42c7-b73c-3624de36ce07` |
| **KV Namespace** | `cca68384` (binding : KV, ID : `4665fa794ded4f719560dd9f03bc2e2f`) |
| **Secrets** | `JWT_SECRET`, `RESEND_API_KEY`, `RESEND_FROM` (`PlanningIA <noreply@planningia.com>`) |
| **CORS autorisés** | planningia.pages.dev · planningia.com · www.planningia.com · localhost:5173 |

### Déploiement
```bash
# Worker
cd PLANNINGAI && npm run deploy
# (= wrangler deploy --config wrangler.toml)

# Pages
cd PLANNINGAI/pages && npm run build && npx wrangler pages deploy dist --project-name planningia

# Migration D1 distante
npx wrangler d1 execute planningAI-v2 --remote --file=migrations/XXXX.sql
# ou directement :
npx wrangler d1 execute planningAI-v2 --remote --command="SQL;"
```

---

## 2. RÉPERTOIRE DE TRAVAIL

```
/Volumes/Crucial X9 Pro For Mac/SynologyDrive/03 - ETUDES DEVELLOPEMENT EN COURS/planningIA/
├── PLANNINGAI/            ← CODE SOURCE ACTIF (worker + pages + migrations)
├── V3/                    ← SNAPSHOT v3 (copie propre sans node_modules, créée 2026-03-08)
├── FICHE_LIAISON_v1.0.md
├── FICHE_LIAISON_v2.0.md
├── FICHE_LIAISON_v3.0.md
├── PlanningIA_BACKUP_20260307_175911.zip
├── PlanningIA_BACKUP_20260307_STABLE_v2.1.zip
├── PlanningIA_BACKUP_20260308_0228_v3_AVANT_SOUS_PROJETS.zip
├── planningIA_backup_20260306_2211.zip
├── migrations/            ← ancien (ne plus utiliser, utiliser PLANNINGAI/migrations)
├── pages/                 ← ancien (ne plus utiliser)
└── worker/                ← ancien (ne plus utiliser)

PLANNINGAI/
├── wrangler.toml          ← config Cloudflare
├── migrations/            ← fichiers SQL appliqués sur D1
├── worker/src/            ← backend Hono (TypeScript)
│   ├── index.ts           ← point d'entrée, CORS, routing
│   ├── types.ts           ← Env, JWTPayload, User, Lot, Dependency...
│   ├── middleware/auth.ts ← 6 middlewares auth
│   ├── utils/
│   │   ├── crypto.ts      ← generateId, PBKDF2, hash
│   │   ├── jwt.ts         ← signJWT, verifyJWT (HS256)
│   │   ├── cpm.ts         ← computeCPM, addWorkingDays, applyDatesToLots
│   │   └── email.ts       ← sendEmail via Resend (FROM: noreply@planningia.com)
│   └── routes/
│       ├── auth.ts        ← /api/auth/* (login, refresh, invite, me, forgot, reset)
│       ├── projects.ts    ← /api/projects/* (templates globaux si company_id IS NULL)
│       ├── lots.ts        ← /api/lots/* + /api/projects/:id/lots
│       ├── planning.ts    ← /api/projects/:id/planning (IA génération)
│       ├── milestones.ts  ← /api/projects/:id/milestones
│       ├── lot-tasks.ts   ← /api/projects/:id/lot-tasks
│       ├── lot-assignments.ts ← /api/lots/:id/assignments
│       ├── teams.ts       ← /api/teams/*
│       ├── users.ts       ← /api/users/* (bulk reset password)
│       ├── clients.ts     ← /api/clients/*
│       ├── companies.ts   ← /api/companies/*
│       ├── notifications.ts ← /api/notifications/*
│       ├── subcontractor.ts ← /api/my/*
│       └── platform.ts    ← /api/platform/* (super-admin)
└── pages/src/
    ├── App.tsx            ← routes React Router
    ├── api/client.ts      ← api.* (toutes les fonctions fetch)
    ├── store/auth.tsx     ← AuthUser, useAuth, login/logout/refresh
    ├── i18n/fr.ts         ← toutes les traductions FR
    ├── components/
    │   ├── Layout.tsx     ← sidebar nav (logo % vert, icône doc, lien aide SVG)
    │   ├── GanttChart.tsx ← Gantt SVG (drag&drop, CPM, jalons, sous-lots)
    │   ├── ClientSelect.tsx ← dropdown client avec création inline
    │   └── ProgressModal.tsx ← modal % avancement lot
    └── pages/
        ├── Dashboard.tsx
        ├── Projects/
        │   ├── index.tsx  ← liste projets (filtres, tri, grid/list)
        │   ├── Create.tsx ← formulaire création (isMetier check)
        │   └── Detail.tsx ← fiche projet (lots, Gantt, jalons, stats, icônes SVG actions)
        ├── Clients/
        │   ├── index.tsx  ← liste + CRUD clients
        │   └── Detail.tsx ← fiche client + projets liés
        ├── Users.tsx      ← gestion utilisateurs (bulk droits + bulk MDP + bulk langue)
        ├── Teams.tsx      ← équipes + membres
        ├── UnifiedPlanning.tsx ← planning global multi-projets
        ├── STWorkload.tsx ← charge sous-traitants
        ├── TeamWorkload.tsx ← charge équipes
        ├── Notifications.tsx
        ├── Company.tsx
        ├── Platform.tsx   ← super-admin (lot_templates, companies)
        ├── Aide.tsx       ← guide utilisateur inline (v1.1)
        ├── Docs.tsx       ← mode d'emploi PDF (MODE_EMPLOI_PLANNINGIA.pdf)
        └── Subcontractor/ ← vue sous-traitant
```

---

## 3. SCHÉMA BASE DE DONNÉES (état v4.0 — 2026-03-08)

### Tables principales

```sql
-- users
id, email, password_hash, role (admin|subcontractor), user_type (employee|subcontractor),
first_name, last_name, company_name, phone, lang, is_active,
invite_token, invite_expires_at,
company_id → companies(id),         -- multi-tenant
access_level (admin|editeur|conducteur|salarie),  -- droits (migration manuelle)
created_at, updated_at

-- companies
id, name, type (entreprise_generale|maitre_oeuvre|promoteur|entreprise_metier),
activity, lot_types (JSON), address, city, postal_code, phone, email, siret,
created_at, updated_at

-- projects
id, name, reference, address, city, postal_code,
client_name, client_email, client_phone, client_id → clients(id),
description, start_date, duration_weeks, budget_ht,
status (devis|programme|en_cours|livre|sav),
ai_prompt, lot_types (JSON),
company_id → companies(id),          -- NULL = template global visible par toutes les entreprises
meeting_time,
created_by → users(id),
parent_project_id → projects(id),    -- sous-projets (migration 0019)
project_type (standalone|program|sub_project),
created_at, updated_at

-- lots, dependencies, milestones, lot_tasks, lot_assignments,
-- teams, team_members, clients, notifications, progress_updates,
-- lot_templates, lot_template_deps, platform_menu_config
-- (inchangés depuis v3.0)
```

### ⚠️ Règle templates globaux (v4.0)
Les projets avec `status = 'MODELE'` et `company_id = NULL` sont visibles par **toutes** les entreprises.
- 3 projets MODELE mis en global en production (IDs : `xls_p078`, `proj_d94b...`, `proj_d463...`)
- Les templates apparaissent **en premier** dans la liste projets (ORDER BY `company_id IS NULL DESC`)

### Migrations appliquées
| # | Fichier | Contenu |
|---|---|---|
| 0001–0018 | (voir v3.0) | Toutes les migrations initiales |
| 0019 | subprojects.sql | `parent_project_id` + `project_type` ← déployée 2026-03-08 |
| **Manuel v4** | — | 3 projets MODELE → `company_id = NULL` (UPDATE direct D1) |

---

## 4. API COMPLÈTE

### Auth — `/api/auth`
| Méthode | Route | Middleware | Description |
|---|---|---|---|
| POST | /login | public | Login → JWT access + refresh |
| POST | /refresh | public | Renouvelle access token |
| POST | /logout | requireAuth | Révoque refresh token |
| GET | /me | requireAuth | Profil utilisateur |
| POST | /invite | requireAdmin | Invite un utilisateur par email |
| POST | /accept-invite | public | Finalise invitation |
| POST | /forgot-password | public | Envoie lien reset (email via Resend, domaine planningia.com) |
| POST | /reset-password | public | Reset avec token |

### Projects — `/api/projects`
| Méthode | Route | Middleware | Description |
|---|---|---|---|
| GET | / | requireAuth | Liste projets `(company_id = ? OR company_id IS NULL)`, templates en premier |
| POST | / | requireWrite | Créer projet |
| GET | /:id | requireAuth | Détail projet + stats |
| PUT | /:id | requireWrite | Modifier projet |
| DELETE | /:id | requireEditeur | Supprimer projet |
| GET | /:id/stats | requireAuth | Stats lots |
| POST | /:id/planning | requireAdmin | Générer planning IA |

### Lots, Milestones, Tasks, Teams, Users, Clients, Notifications — inchangés depuis v3.0

### Users — `/api/users` (ajouts v4.0)
- `POST /api/users/:id/reset-password` → génère un mot de passe temporaire, retourne `{ temp_password }`

---

## 5. MIDDLEWARES D'AUTHENTIFICATION

```
requireAuth      → JWT valide (tous les rôles)
requireAdmin     → role = 'admin'
requireWrite     → role=admin + access_level ≠ 'salarie'
requireEditeur   → role=admin + access_level IN ('admin','editeur')
requireFullAdmin → role=admin + access_level = 'admin'
requireSuperAdmin→ role=admin + access_level='admin' + company_id IS NULL
```

### Droits par niveau (access_level)
| Action | admin | editeur | conducteur | salarie |
|---|---|---|---|---|
| Voir tous les projets company | ✅ | ✅ | ❌ (siens) | ❌ (siens) |
| Créer/modifier projets/lots | ✅ | ✅ | ✅ | ❌ |
| Supprimer projets/lots | ✅ | ✅ | ❌ | ❌ |
| Gérer clients | ✅ | ✅ | ❌ | ❌ |
| Gérer utilisateurs | ✅ | ❌ | ❌ | ❌ |
| Modifier droits users | ✅ | ❌ | ❌ | ❌ |

---

## 6. MULTI-TENANT

Isolation complète par `company_id` :
- Chaque société a ses propres projets, lots, équipes, clients, utilisateurs
- `company_id = NULL` → **template global** visible par toutes les entreprises (nouveauté v4)
- `company_type` pilote les fonctionnalités :
  - `entreprise_metier` → mode DESIGN FACADES
  - `entreprise_generale` → mode BTP

### Sociétés configurées en production
| company_id | Nom | Type | Logins |
|---|---|---|---|
| company_001 | LORRAINE CONSTRUCTEURS | entreprise_generale | lornc.travaux@outlook.com / Admin1234! |
| design_facades_001 | DESIGN FACADES | entreprise_metier | serhat.guclu@designfacades.fr / Admin1234! |

---

## 7. LOGIQUE MÉTIER CLÉS

### CPM, Sous-lots, Train de travaux, Sous-projets, Avancement global, Génération IA
→ Inchangé depuis v3.0 (voir FICHE_LIAISON_v3.0.md §7)

---

## 8. FRONTEND — COMPOSANTS CLÉS

### Sidebar — `Layout.tsx`
- **Logo** : carré vert (#22c55e, rx=9, 40×40) + % blanc (2 cercles + diagonale)
- **Documentation** : icône livre/article SVG (remplacement graduation cap)
- **Aide** : icône ? cerclée SVG blanche
- **Super-admin** : lien ⚙️ Admin PlanningIA (company_id IS NULL uniquement)

### Tableau des lots — `Detail.tsx` colonne ACTIONS
| Bouton | Icône | Couleur | Action |
|---|---|---|---|
| Avancement | Carré vert + % blanc (SVG 20×20) | #22c55e | Ouvre ProgressModal |
| Sous-tâches | Boîte+horloge+hiérarchie (SVG 20×20) | #7c3aed (violet) | Ouvre TaskModal |
| Découper | ✂️ emoji | — | Ouvre SplitModal |
| Modifier | Texte | — | Ouvre LotModal |
| Supprimer | Texte rouge | — | Supprime lot |

### Users.tsx — Actions groupées (bulk)
| Action | Champ | Comportement |
|---|---|---|
| Droits d'accès | access_level | Applique le niveau sélectionné à tous les users sélectionnés |
| Langue | lang (fr/tr) | Applique la langue à tous les users sélectionnés |
| Reset MDP | — | Appelle `api.users.resetPassword()` pour chaque user → modal résultats avec MDP temporaires + copie |

### Docs.tsx — Mode d'emploi
- Affiche le PDF `MODE_EMPLOI_PLANNINGIA.pdf` (stocké dans `/public`)
- Accessible via sidebar (lien Documentation) pour tous les utilisateurs

### Aide.tsx (v1.1)
- Guide interactif inline (pas de PDF)
- Sections accordéon : Premiers pas, Projets, Lots & Planning, Gantt, Équipes

### GanttChart, LotModal, Authentification
→ Inchangé depuis v3.0

---

## 9. COMPTES DE TEST

| Société | Email | Mot de passe | Rôle |
|---|---|---|---|
| LORRAINE CONSTRUCTEURS | lornc.travaux@outlook.com | Admin1234! | Admin |
| DESIGN FACADES | serhat.guclu@designfacades.fr | Admin1234! | Admin |
| DESIGN FACADES | zelal.guclu@designfacades.fr | Admin1234! | Admin |
| DESIGN FACADES (ST test) | ozkbah@gmail.com | 12345678 | Subcontractor |

---

## 10. DÉVELOPPEMENTS V3 — LIVRÉS ✅

→ Voir FICHE_LIAISON_v3.0.md §10 (Sous-projets + Train de travaux)

---

## 11. BACKLOG / FONCTIONNALITÉS FUTURES

| Priorité | Feature | Description |
|---|---|---|
| ✅ | Sous-projets | Programmes immobiliers + bâtiments — livré v3 |
| ✅ | Train de travaux | Découpage par niveau/zone — livré v3 |
| ✅ | Templates globaux | Projets MODELE visibles inter-entreprises — livré v4 |
| ✅ | Bulk reset MDP | Réinitialisation groupée des mots de passe — livré v4 |
| ⭐⭐ | Dépendances graphiques | Dessiner les dépendances directement sur le Gantt |
| ⭐⭐ | Module OPR/SAV | Gestion des réserves par appartement (punch list) |
| ⭐⭐ | Planning global V2 | Consolidation multi-projets + sous-projets |
| ⭐ | Export PDF amélioré | Inclure sous-lots + jalons + légende |
| ⭐ | Notifications push | Rappels jalons, retards |
| ⭐ | Import Excel | Import planning depuis fichier XLSX |
| ⭐ | Graphiques historique | Courbe d'avancement dans le temps |

---

## 12. CORRECTIFS ET ÉVOLUTIONS (v3.0 → v4.0)

### 2026-03-08 (V4 — session 3 : icônes, email, templates, bulk)

#### UX / Interface
- ✅ **Logo sidebar** (`Layout.tsx`) : graduation cap → **carré vert arrondi + % blanc** (SVG inline, fill="#22c55e")
- ✅ **Icône Documentation** (`Layout.tsx`) : graduation cap → icône livre/article SVG Material (fill="currentColor")
- ✅ **Icône ❓ Aide** (`Layout.tsx`) : emoji ❓ rouge → SVG cercle blanc (w-5 h-5)
- ✅ **Icône Avancement** (`Detail.tsx` colonne ACTIONS) : emoji 📊 → carré vert + % blanc SVG (20×20, identique logo)
- ✅ **Icône Sous-tâches** (`Detail.tsx` colonne ACTIONS) : emoji 📋 → SVG violet (boîte+horloge+arbre hiérarchique 3 nœuds)

#### Email (reset password)
- ✅ **Worker crashé** : redéployé (`npm run deploy`)
- ✅ **Domaine Resend non vérifié** : `RESEND_FROM` secret mis à jour → `PlanningIA <noreply@planningia.com>` (domaine `planningia.com` vérifié dans Resend, `planningia.fr` était non vérifié → 403)
- ✅ **DEFAULT_FROM** dans `email.ts` : `planningia.fr` → `planningia.com`
- ✅ **sendEmail** : logging erreur actif (plus de catch silencieux)

#### Templates globaux (projets MODELE inter-entreprises)
- ✅ **DB** : 3 projets MODELE → `company_id = NULL` (UPDATE direct via Cloudflare MCP)
- ✅ **projects.ts** `GET /api/projects` : `WHERE p.company_id = ?` → `WHERE (p.company_id = ? OR p.company_id IS NULL)` + `ORDER BY p.company_id IS NULL DESC` (templates en premier)
- ✅ **Vérifié** : ozkbah@gmail.com (LORRAINE CONSTRUCTEURS) voit 3 MODELE + ses projets

#### Users.tsx — Actions groupées
- ✅ **Bulk langue** : sélection fr/tr + Apply → `api.users.update(id, { lang })` sur tous les users sélectionnés
- ✅ **Bulk reset MDP** : bouton 🔑 amber → `api.users.resetPassword(id)` pour chaque user sélectionné → modale résultats avec liste nom/email/MDP + bouton copie individuel + "📋 Copier tout"

#### Documentation / Aide
- ✅ **MODE_EMPLOI PDF** : généré et intégré dans l'app (route `/docs` et `/sub/docs`)
- ✅ **Aide.tsx v1.1** : page guide interactif mis à jour

### 2026-03-08 (V3 — sessions 1 & 2)
→ Voir FICHE_LIAISON_v3.0.md §12

### 2026-03-07 (sessions précédentes)
→ Voir FICHE_LIAISON_v3.0.md §12

---

## 13. VARIABLES D'ENVIRONNEMENT WORKER

| Var | Usage |
|---|---|
| `JWT_SECRET` | Signature JWT (HS256) |
| `RESEND_API_KEY` | Envoi emails (Resend.com) |
| `RESEND_FROM` | `PlanningIA <noreply@planningia.com>` ← domaine vérifié |
| `DB` | Binding D1 |
| `KV` | Binding KV |
| `ENVIRONMENT` | "production" |

Pour recréer un secret : `echo "valeur" | npx wrangler secret put NOM_SECRET`

---

## 14. POINTS D'ATTENTION PRODUCTION

1. **Resend** : seul `planningia.com` est vérifié. Ne pas utiliser `planningia.fr` comme FROM.
2. **Worker URL** : `planningai-api.mhfreehome.workers.dev` (attention : pas `planningia-api`)
3. **Projets MODELE** : les 3 templates globaux ont `company_id = NULL`. Tout projet créé avec l'UI aura automatiquement le `company_id` de l'admin connecté (pas NULL).
4. **Backup** : pas de git — faire un ZIP avant toute session de développement majeure.

---

*Fiche générée automatiquement par Claude Code — 2026-03-08 (V4)*
