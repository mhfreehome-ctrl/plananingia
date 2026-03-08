# FICHE DE LIAISON — PlanningIA v3.0
**Mise à jour : 2026-03-08**
**Statut : Production — V3 déployée ✅ (sous-projets + train de travaux)**

---

## 1. INFRASTRUCTURE CLOUDFLARE

| Élément | Valeur |
|---|---|
| **Worker** | `planningai-api` — https://planningai-api.mhfreehome.workers.dev |
| **Pages** | https://planningia.pages.dev · https://planningia.com · https://www.planningia.com |
| **D1 Database** | `planningAI-v2` — ID : `f89b9344-ab63-42c7-b73c-3624de36ce07` |
| **KV Namespace** | `cca68384` (binding : KV, ID : `4665fa794ded4f719560dd9f03bc2e2f`) |
| **Secrets** | `JWT_SECRET`, `RESEND_API_KEY`, `RESEND_FROM` |
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
├── PlanningIA_BACKUP_20260307_175911.zip
├── PlanningIA_BACKUP_20260307_STABLE_v2.1.zip
├── PlanningIA_BACKUP_20260308_0228_v3_AVANT_SOUS_PROJETS.zip   ← backup avant dev V3
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
│   │   └── email.ts       ← sendEmail via Resend
│   └── routes/
│       ├── auth.ts        ← /api/auth/* (login, refresh, invite, me, forgot, reset)
│       ├── projects.ts    ← /api/projects/*
│       ├── lots.ts        ← /api/lots/* + /api/projects/:id/lots
│       ├── planning.ts    ← /api/projects/:id/planning (IA génération)
│       ├── milestones.ts  ← /api/projects/:id/milestones
│       ├── lot-tasks.ts   ← /api/projects/:id/lot-tasks
│       ├── lot-assignments.ts ← /api/lots/:id/assignments
│       ├── teams.ts       ← /api/teams/*
│       ├── users.ts       ← /api/users/*
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
    │   ├── Layout.tsx     ← sidebar nav, liens admin/ST
    │   ├── GanttChart.tsx ← Gantt SVG (drag&drop, CPM, jalons, sous-lots)
    │   ├── ClientSelect.tsx ← dropdown client avec création inline
    │   └── ProgressModal.tsx ← modal % avancement lot
    └── pages/
        ├── Dashboard.tsx
        ├── Projects/
        │   ├── index.tsx  ← liste projets (filtres, tri, grid/list)
        │   ├── Create.tsx ← formulaire création (isMetier check)
        │   └── Detail.tsx ← fiche projet (lots, Gantt, jalons, stats)
        ├── Clients/
        │   ├── index.tsx  ← liste + CRUD clients
        │   └── Detail.tsx ← fiche client + projets liés
        ├── Users.tsx      ← gestion utilisateurs (accès, invitations)
        ├── Teams.tsx      ← équipes + membres
        ├── UnifiedPlanning.tsx ← planning global multi-projets
        ├── STWorkload.tsx ← charge sous-traitants
        ├── TeamWorkload.tsx ← charge équipes
        ├── Notifications.tsx
        ├── Company.tsx
        ├── Platform.tsx   ← super-admin (lot_templates, companies)
        ├── Aide.tsx
        └── Subcontractor/ ← vue sous-traitant
```

---

## 3. SCHÉMA BASE DE DONNÉES (état v3.0 — 2026-03-08)

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
ai_prompt, lot_types (JSON),         -- types façade sélectionnés
company_id → companies(id),
meeting_time,                         -- "Lundi 14h"
created_by → users(id),
parent_project_id → projects(id),    -- sous-projets (migration 0019)
project_type (standalone|program|sub_project),  -- migration 0019
created_at, updated_at

-- lots
id, project_id → projects(id),
code, name, name_tr, duration_days,
start_date_planned, end_date_planned,  -- forçage manuel OU résultat CPM
start_date_actual, end_date_actual,
progress_percent (0-100), status (pending|active|done),
subcontractor_id → users(id),          -- ST ou salarié assigné
team_id → teams(id),                   -- équipe assignée
color, zone, notes,
is_critical (0|1), early_start, early_finish, late_start, late_finish, total_float,
sort_order,
market_deadline,                        -- date limite marché
is_provisional (0|1),                   -- hachuré sur Gantt
parent_lot_id → lots(id),              -- sous-lots (découpage)
created_at, updated_at

-- dependencies
id, project_id, predecessor_id → lots(id), successor_id → lots(id),
type (FS|SS|FF), lag_days
UNIQUE(predecessor_id, successor_id)

-- milestones
id, project_id, name, date, color, created_at, updated_at

-- lot_tasks
id, lot_id, project_id, type (commande|livraison|execution|reception|autre),
title, description, due_date, done (0|1), created_by → users(id),
created_at, updated_at

-- lot_assignments (historique affectations)
id, lot_id, project_id, user_id → users(id), assigned_by → users(id),
assigned_at, notes

-- teams
id, name, color, leader_id → users(id), description, created_at, updated_at

-- team_members
id, team_id, user_id, role_in_team (leader|member)
UNIQUE(team_id, user_id)

-- clients
id, name, email, phone, address, city, postal_code, notes,
company_id → companies(id),           -- isolation multi-tenant
created_at, updated_at

-- notifications
id, user_id, project_id, lot_id, type, title, title_tr, message, message_tr,
is_read (0|1), created_at

-- progress_updates
id, lot_id, user_id, progress_percent, comment, created_at

-- lot_templates (platform)
id, catalog_type (btp|facade), code, name, name_tr, duration_days, color, zone,
sort_order, lot_types (JSON), parent_code, created_at, updated_at

-- lot_template_deps (platform)
id, catalog_type, pred_code, succ_code, dep_type, lag_days

-- platform_menu_config (platform)
id, key, label, label_tr, sort_order, is_visible, icon
```

### Migrations appliquées
| # | Fichier | Contenu |
|---|---|---|
| 0001 | schema.sql | Tables de base : users, projects, lots, deps, notifs |
| 0002 | seed.sql | Données initiales |
| 0003 | companies.sql | Table companies + company_id sur users/projects |
| 0004 | milestones.sql | Table milestones |
| 0005 | password_reset.sql | Table password_reset_tokens |
| 0006 | lot_tasks.sql | Table lot_tasks (tâches opérationnelles) |
| 0007 | lot_assignments.sql | Table lot_assignments (historique) |
| 0008 | provisional.sql | Champ is_provisional sur lots |
| 0009 | sublots.sql | Champ parent_lot_id sur lots |
| 0010 | enterprise.sql | user_type + tables teams/team_members |
| 0011 | lot_team.sql | Champ team_id sur lots |
| 0012 | design_facades.sql | Champ lot_types sur projects + seed 47 users DESIGN FACADES |
| 0013 | baran_meeting_time.sql | Champ meeting_time sur projects |
| 0014 | clients.sql | Table clients + client_id sur projects |
| 0015 | excel_seed.sql | Seed données Excel initiales |
| 0016 | companies.sql | Table companies (v2) + company_id sur users/projects |
| 0017 | seed_company.sql | Seed sociétés initiales |
| 0018 | platform.sql | Tables lot_templates, lot_template_deps, platform_menu_config |
| **Manuel** | access_level | `ALTER TABLE users ADD COLUMN access_level TEXT NOT NULL DEFAULT 'admin'` |
| 0019 | subprojects.sql | `ALTER TABLE projects ADD COLUMN parent_project_id` + `project_type` ← **déployée 2026-03-08** |

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
| POST | /forgot-password | public | Envoie lien reset |
| POST | /reset-password | public | Reset avec token |

### Projects — `/api/projects`
| Méthode | Route | Middleware | Description |
|---|---|---|---|
| GET | / | requireAuth | Liste projets (filtrés par company_id + access_level) |
| POST | / | requireWrite | Créer projet |
| GET | /:id | requireAuth | Détail projet + stats |
| PUT | /:id | requireWrite | Modifier projet |
| DELETE | /:id | requireEditeur | Supprimer projet |
| GET | /:id/stats | requireAuth | Stats lots (total, done, active, critical, avgProgress) |
| POST | /:id/planning | requireAdmin | Générer planning IA (BTP ou Façade) |

### Lots — `/api`
| Méthode | Route | Middleware | Description |
|---|---|---|---|
| GET | /projects/:id/lots | requireAuth | Liste lots d'un projet |
| POST | /projects/:id/lots | requireAdmin | Créer lot (avec auto-câblage sous-lots) |
| PUT | /lots/:id | requireAdmin | Modifier lot (incl. start/end_date_planned) |
| DELETE | /lots/:id | requireAdmin | Supprimer lot |
| POST | /projects/:id/recalculate | requireAdmin | Recalcul CPM |
| POST | /projects/:id/lots/train | requireAdmin | **Train de travaux** — découpe lot(s) en sous-lots par zone/niveau |
| GET | /projects/:id/dependencies | requireAuth | Liste dépendances |
| POST | /projects/:id/dependencies | requireAdmin | Ajouter dépendance |
| DELETE | /dependencies/:id | requireAdmin | Supprimer dépendance |
| PATCH | /lots/:id/dates | requireAdmin | Drag&drop Gantt → update dates |
| PATCH | /lots/:id/progress | requireAdmin | Mettre à jour % avancement |
| PUT | /projects/:id/lots/reorder | requireAdmin | Réordonner lots |

### Planning IA — `/api/projects/:id/planning`
| Mode | Déclencheur | Modèle IA | Description |
|---|---|---|---|
| BTP | company_type ≠ entreprise_metier | claude-3-5-haiku-20241022 | Génère lots + deps BTP depuis description |
| Façade | company_type = entreprise_metier | claude-3-5-haiku-20241022 | Génère lots façade depuis lot_types sélectionnés |

### Autres routes
- `/api/milestones/*` — CRUD jalons
- `/api/lots/:id/tasks` — tâches opérationnelles
- `/api/lots/:id/assignments` — historique affectations
- `/api/teams/*` — équipes + membres
- `/api/users/*` — gestion utilisateurs (requireFullAdmin pour PUT/DELETE)
- `/api/clients/*` — CRUD clients (GET avec project_count, GET/:id avec projets)
- `/api/companies/*` — gestion sociétés
- `/api/notifications/*` — notifications + mark-read
- `/api/my/*` — vue sous-traitant (ses lots)
- `/api/platform/*` — super-admin (lot_templates, companies, config)

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
- `company_type` pilote les fonctionnalités affichées :
  - `entreprise_metier` → mode DESIGN FACADES (lots façade + IA façade)
  - `entreprise_generale` → mode BTP (lots BTP + IA BTP)
- Super-admin (company_id IS NULL) → accès total + gestion plateforme

### Sociétés configurées en production
| company_id | Nom | Type | Logins |
|---|---|---|---|
| company_001 | LORRAINE CONSTRUCTEURS | entreprise_generale | lornc.travaux@outlook.com / Admin1234! |
| design_facades_001 | DESIGN FACADES | entreprise_metier | serhat.guclu@designfacades.fr / Admin1234! |

---

## 7. LOGIQUE MÉTIER CLÉS

### CPM (Chemin Critique) — `worker/src/utils/cpm.ts`
- Algorithme Bellman-Ford avec tri topologique
- Types de dépendances : **FS** (Fin→Début), **SS** (Début→Début), **FF** (Fin→Fin)
- Champs calculés sur lots : `early_start`, `early_finish`, `late_start`, `late_finish`, `total_float`, `is_critical`
- `total_float = 0` → lot critique
- `applyDatesToLots()` : convertit les jours CPM en dates calendaires (jours ouvrés, skip WE)

### Sous-lots (découpage)
- `lots.parent_lot_id` → relation parent/enfant
- Tri Gantt : parents d'abord, enfants regroupés sous le parent
- Auto-câblage à la création :
  - 1er sous-lot → hérite des dépendances prédécesseurs du parent
  - Nième sous-lot → dépendance FS depuis le dernier sous-lot existant
- Repair SQL utilisé pour LORRAINE CONSTRUCTEURS (L10-A/B/C) : 2026-03-08

### Train de travaux (`POST /api/projects/:id/lots/train`)
- Sélection multi-lots + saisie des zones/niveaux (ex : RDC, R+1, R+2, R+3)
- Préréglages : A/B/C, RDC→R+3, 1→4, Bât.A→C
- Pour chaque lot sélectionné :
  1. Crée N sous-lots (1 par zone) avec code `[LOT]-[ZONE]` et nom `[NOM] — [ZONE]`
  2. Hérite les prédécesseurs du lot parent sur le **1er** sous-lot
  3. Chaîne FS (ou SS) entre sous-lots avec lag_days configurable
  4. Reroute les successeurs du lot parent vers le **dernier** sous-lot
  5. Ignore les successeurs qui sont eux-mêmes dans la liste sélectionnée (anti-circulaire)
- Affiche aperçu live avant soumission
- Message de confirmation : "🚂 N sous-lot(s) créés — lancez le CPM pour recalculer"

### Sous-projets (`projects.project_type` + `projects.parent_project_id`)
- `project_type` : `standalone` (défaut) | `program` (parent) | `sub_project` (enfant)
- `parent_project_id` : FK vers le projet parent (nullable)
- Vue Detail : onglet "Sous-projets" visible si type=program ou sub_projects.length > 0
- Breadcrumb : lien vers le programme parent si sous-projet
- Badges : 🏗 Programme (violet) / ↳ Sous-projet (sky blue) dans le header
- Create.tsx : dropdown de sélection du parent (pré-rempli depuis `?parent=` URL param)

### Avancement global (avg_progress)
- **Formule** : `COALESCE(ROUND(AVG(NULLIF(progress_percent, 0))), 0)`
- Seuls les lots avec `progress_percent > 0` entrent dans la moyenne
- Évite la dilution par les lots non encore renseignés (qui valent 0 par défaut)

### Génération IA — Mode BTP
- Modèle : `claude-3-5-haiku-20241022` (API Anthropic)
- Prompt basé sur description projet + durée + types de lots
- Retourne : liste de lots avec code/name/durée/couleur + dépendances FS
- Stocké sur projet : `ai_prompt`

### Génération IA — Mode Façade (DESIGN FACADES)
- Basé sur `lot_types` sélectionnés (ECHAF, ITE, ENDUIT, BARDAGE, LASURE, RAVALEMENT)
- Génère les lots dans l'ordre logique façade + dépendances

---

## 8. FRONTEND — COMPOSANTS CLÉS

### GanttChart (`pages/src/components/GanttChart.tsx`)
- SVG responsive, scroll horizontal
- Drag & drop des barres → PATCH /api/lots/:id/dates
- Affichage barres critiques (rouge), provisionnelles (hachurées)
- Sous-lots : indentés + étiquette parent
- Jalons : losanges sur la timeline
- Zoom mois/semaine/jour

### LotModal (`pages/src/pages/Projects/Detail.tsx`)
Champs éditables par lot :
- Code, Durée, Nom (FR + TR), Couleur, Zone
- Affectation : Sous-traitant / Salarié / Équipe (tri-bouton)
- **Plage de dates manuelles** : start_date_planned + end_date_planned (forçage manuel, override CPM)
- Date limite marché
- Lot prévisionnel (checkbox)

### Authentification
- JWT `access_token` (15 min) + `refresh_token` (30j, rotation)
- Stockage localStorage : `planningai_token` + `planningai_refresh`
- PBKDF2-SHA256, 100k itérations (≠ sekat 310k)
- Format hash : `pbkdf2:100000:<saltHex>:<hashHex>`

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

### DEV 1 — Sous-projets (parent_project_id) — ✅ DÉPLOYÉ 2026-03-08

**Objectif** : Permettre de créer des sous-projets rattachés à un projet parent.
**Use case** : Programme immobilier 3 maisons → 1 projet parent + 3 sous-projets.

**Migration** : `migrations/0019_subprojects.sql` ← appliquée sur D1
```sql
ALTER TABLE projects ADD COLUMN parent_project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN project_type TEXT DEFAULT 'standalone';
```

**Backend — projects.ts** ✅ :
- `GET /api/projects` → inclut `sub_projects_count`
- `GET /api/projects/:id` → inclut tableau `sub_projects[]` avec stats consolidées
- `POST /api/projects` → accepte `parent_project_id` + `project_type`

**Frontend** ✅ :
- `Detail.tsx` : onglet 🏗 Sous-projets (conditionnel), breadcrumb parent, badges type
- `Projects/index.tsx` : sous-projets indentés sous leur programme, badge PROGRAMME
- `Create.tsx` : dropdown parent pré-rempli depuis `?parent=` URL param

### DEV 2 — Train de travaux — ✅ DÉPLOYÉ 2026-03-08

**Objectif** : Génération automatique de sous-lots séquentiels pour les bâtiments collectifs.
**Use case** : Carrelage RDC à R+3 avec dépendances FS automatiques entre niveaux.

**Backend — lots.ts** ✅ :
- `POST /api/projects/:id/lots/train` → crée N sous-lots par lot × M zones
- Auto-câblage complet (prédécesseurs, chaîne, successeurs rerouted)

**Frontend — Detail.tsx** ✅ :
- Bouton 🚂 "Train de travaux" dans la barre d'outils de l'onglet Lots
- `TrainModal` avec sélection multi-lots, préréglages zones, aperçu live, submit

---

## 11. BACKLOG / FONCTIONNALITÉS FUTURES

| Priorité | Feature | Description |
|---|---|---|
| ✅ | Sous-projets | Programmes immobiliers + bâtiments — **livré v3** |
| ✅ | Train de travaux | Découpage par niveau/zone pour collectif — **livré v3** |
| ⭐⭐ | Dépendances graphiques | Dessiner les dépendances directement sur le Gantt |
| ⭐⭐ | Module OPR/SAV | Gestion des réserves par appartement (punch list) |
| ⭐⭐ | Planning global V2 | Consolidation multi-projets + sous-projets |
| ⭐ | Export PDF amélioré | Inclure sous-lots + jalons + légende |
| ⭐ | Notifications push | Rappels jalons, retards |
| ⭐ | Import Excel | Import planning depuis fichier XLSX |
| ⭐ | Graphiques historique | Courbe d'avancement dans le temps |

---

## 12. CORRECTIFS RÉCENTS (v2.x → v3.0)

### 2026-03-08 (V3 — session 2)
- ✅ **DEV 1 — Sous-projets** :
  - Migration `0019_subprojects.sql` appliquée sur D1 (parent_project_id + project_type)
  - Backend `projects.ts` : GET liste avec sub_projects_count, GET/:id avec sub_projects[], POST accepte parent_project_id
  - Frontend `Detail.tsx` : onglet Sous-projets (conditionnel), breadcrumb programme, badges type
  - Frontend `Projects/index.tsx` : hiérarchie programme → sous-projets indentés, badge PROGRAMME
  - Frontend `Create.tsx` : dropdown parent pré-rempli via `?parent=` URL param
- ✅ **DEV 2 — Train de travaux** :
  - Backend `lots.ts` : `POST /api/projects/:id/lots/train` — multi-lots × multi-zones, auto-câblage complet
  - Frontend `Detail.tsx` : bouton "🚂 Train de travaux" + `TrainModal` (préréglages, aperçu live, submit)
  - `api/client.ts` : `api.lots.train()` ajouté
  - Vérifié end-to-end : L14 → L14-RDC, L14-R+1, L14-R+2, L14-R+3 créés + CPM "199 jours, 12 critiques" ✅
- ✅ **Déploiements** : worker + pages déployés après chaque dev

### 2026-03-08 (V3 — session 1)
- ✅ **Façade catalog** : `Create.tsx` + `ProjectEditModal` dans `Detail.tsx` — affiché uniquement si `company_type === 'entreprise_metier'`
- ✅ **AI error 400** : messages d'erreur Anthropic désormais visibles dans l'UI (`planning.ts`)
- ✅ **Sous-lots auto-câblage** : `POST /api/projects/:id/lots` — 1er sous-lot hérite deps parent, Nième chaîne depuis dernier frère
- ✅ **Repair SQL L10-A/B/C** : dépendances réparées manuellement pour LORRAINE CONSTRUCTEURS
- ✅ **Plages de dates manuelles** : ajout `start_date_planned` + `end_date_planned` dans `LotModal` + `PUT /api/lots/:id`
- ✅ **avg_progress** : `AVG(NULLIF(progress_percent, 0))` → ne compte que les lots renseignés
- ✅ **Backup V3** : `PlanningIA_BACKUP_20260308_0228_v3_AVANT_SOUS_PROJETS.zip`
- ✅ **Snapshot V3** : dossier `V3/` créé (sans node_modules)

### 2026-03-07 (session précédente)
- ✅ **Droits utilisateurs** (access_level) : 4 niveaux admin/editeur/conducteur/salarie
- ✅ **Page Clients** : liste + CRUD + fiche client avec projets liés
- ✅ **Multi-tenant audit** : isolation company_id sur toutes les routes
- ✅ **Équipes multi-tenant** : isolation company_id sur teams + team_members
- ✅ **CORS** : planningia.com + www.planningia.com ajoutés
- ✅ **Export PDF A4/A3** : html2canvas + jsPDF lazy load
- ✅ **Emails** : companyName dans notifications + footer planningia.com

---

## 13. VARIABLES D'ENVIRONNEMENT WORKER

| Var | Usage |
|---|---|
| `JWT_SECRET` | Signature JWT (HS256) |
| `RESEND_API_KEY` | Envoi emails (Resend.com) |
| `RESEND_FROM` | Email expéditeur |
| `DB` | Binding D1 |
| `KV` | Binding KV |
| `ENVIRONMENT` | "production" |

Pour recréer un secret : `echo "valeur" | npx wrangler secret put NOM_SECRET`

---

*Fiche générée automatiquement par Claude Code — 2026-03-08 (V3 finale)*
