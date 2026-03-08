# FICHE DE LIAISON — PlanningIA v2.0
## Point de sauvegarde validé — 07/03/2026

---

## 📌 INFORMATIONS GÉNÉRALES

| Élément | Valeur |
|---|---|
| **Date de sauvegarde** | 07/03/2026 — 18h00 (heure Paris) |
| **Version** | v2.0 — Droits utilisateurs 4 niveaux + Page Clients + Gantt amélioré + Projets liste/tri |
| **Backup ZIP** | `PlanningIA_BACKUP_20260307_175911.zip` (123 Mo) dans le dossier `planningIA/` |
| **Répertoire projet** | `/Volumes/Crucial X9 Pro For Mac/SynologyDrive/03 - ETUDES DEVELLOPEMENT EN COURS/planningIA/PLANNINGAI/` |
| **Worker déployé** | `https://planningai-api.mhfreehome.workers.dev` |
| **Pages déployé** | `https://planningia.pages.dev` · `https://planningia.com` · `https://www.planningia.com` |

---

## 🏗️ INFRASTRUCTURE CLOUDFLARE

| Service | ID / Nom | Détail |
|---|---|---|
| **Worker** | `planningai-api` | Version ID : `343ddace-2ece-423e-9915-30c5892453d1` |
| **D1 Database** | `planningAI-v2` | ID : `f89b9344-ab63-42c7-b73c-3624de36ce07` |
| **KV Namespace** | KV | ID : `4665fa794ded4f719560dd9f03bc2e2f` |
| **Pages Project** | `planningia` | URL : `4b83023a.planningia.pages.dev` |
| **Domaines custom** | `planningia.com` + `www.planningia.com` | CNAME → Pages |

### Secrets Worker (à recréer si réinitialisé)
```
JWT_SECRET       — secret JWT pour les tokens d'accès (15 min) et refresh (30j)
RESEND_API_KEY   — clé API Resend pour les emails (invitations, reset password)
RESEND_FROM      — adresse expéditeur email
```
Commandes pour recréer :
```bash
cd PLANNINGAI && echo "VALEUR" | npx wrangler secret put JWT_SECRET
```

---

## 🚀 COMMANDES DE DÉPLOIEMENT

```bash
# 1. Worker uniquement
cd "/Volumes/.../planningIA/PLANNINGAI/worker"
npm run deploy

# 2. Pages (frontend) uniquement
cd "/Volumes/.../planningIA/PLANNINGAI/pages"
npm run build
npx wrangler pages deploy dist --project-name planningia

# 3. Tout déployer (worker puis pages)
cd worker && npm run deploy
cd ../pages && npm run build && npx wrangler pages deploy dist --project-name planningia
```

---

## 🗄️ BASE DE DONNÉES — MIGRATIONS

| Migration | Contenu |
|---|---|
| `0001_schema.sql` | Schéma initial : users, projects, lots, dependencies, refresh_tokens |
| `0002_seed.sql` | Données de test initiales |
| `0003_companies.sql` | Table companies (multi-tenant) |
| `0004_milestones.sql` | Table milestones |
| `0005_password_reset.sql` | Table password_reset_tokens |
| `0006_lot_tasks.sql` | Table lot_tasks (tâches par lot) |
| `0007_lot_assignments.sql` | Table lot_assignments |
| `0008_provisional.sql` | Champ is_provisional dans lots |
| `0009_sublots.sql` | Support sous-lots (parent_lot_id) |
| `0010_enterprise.sql` | Champs entreprise dans users |
| `0011_lot_team.sql` | Champ team_id dans lots + table team_members |
| `0012_design_facades.sql` | Seed Design Facades |
| `0013_baran_meeting_time.sql` | Données réunion Baran |
| `0014_clients.sql` | **Table `clients`** (id, name, email, phone, address, city, postal_code, notes, company_id) |
| `0015_excel_seed.sql` | Import Excel lots |
| `0016_companies.sql` | Champs supplémentaires companies |
| `0017_seed_company.sql` | Seed entreprise |
| `0018_platform.sql` | Tables platform (lot_templates, lot_template_deps, menu_config) |
| **⚠️ SQL manuel** | `ALTER TABLE users ADD COLUMN access_level TEXT NOT NULL DEFAULT 'admin'` |

### Colonne `access_level` — ajoutée manuellement
La colonne `access_level` a été ajoutée directement via Wrangler D1 :
```sql
ALTER TABLE users ADD COLUMN access_level TEXT NOT NULL DEFAULT 'admin';
```
**Valeurs valides** : `admin` | `editeur` | `conducteur` | `salarie`

**Comptes Design Facades promus à 'admin'** :
```sql
UPDATE users SET access_level='admin' WHERE email IN (
  'serhat.guclu@designfacades.fr',
  'zelal.guclu@designfacades.fr'
);
```

---

## 🔐 SYSTÈME D'AUTHENTIFICATION

### Comptes de test
| Rôle | Email | Mot de passe |
|---|---|---|
| Admin (Design Facades) | `lornc.travaux@outlook.com` | `Admin1234!` |
| Sous-traitant | `ozkbah@gmail.com` | `12345678` |

### Tokens
- **Access token** : JWT HS256, durée **15 minutes**
- **Refresh token** : Hashé (SHA-256) en D1, durée **30 jours**, rotation à chaque refresh
- **Hashage password** : PBKDF2-SHA256, **100 000 itérations**, format `pbkdf2:100000:<saltHex>:<hashHex>`

### Flux d'invitation
1. Admin → `POST /api/auth/invite` → génère token 7j → email Resend avec lien `/invite?token=XXX`
2. Invité → `POST /api/auth/accept-invite` → définit son mot de passe → compte activé

---

## 🏛️ ARCHITECTURE TECHNIQUE

### Stack
- **Frontend** : React 18 + TypeScript + Vite 5 + Tailwind CSS + React Router v6
- **Backend** : Cloudflare Workers (Hono) + TypeScript
- **Base de données** : Cloudflare D1 (SQLite)
- **Cache/KV** : Cloudflare KV
- **Emails** : Resend API
- **Déploiement** : Wrangler CLI

### Structure des fichiers

```
PLANNINGAI/
├── wrangler.toml               # Config Worker + D1 + KV
├── migrations/                 # SQL migrations (0001 → 0018)
├── worker/
│   ├── package.json
│   └── src/
│       ├── index.ts            # Point d'entrée Hono + CORS + routes
│       ├── types.ts            # Interfaces TypeScript (Env, JWTPayload, User, etc.)
│       ├── middleware/
│       │   └── auth.ts         # 5 middlewares auth (voir ci-dessous)
│       ├── routes/
│       │   ├── auth.ts         # login, refresh, logout, me, profile, invite, accept-invite, forgot/reset-password
│       │   ├── projects.ts     # CRUD projets + génération IA + CPM + Gantt
│       │   ├── lots.ts         # CRUD lots + progress + catalog
│       │   ├── users.ts        # CRUD users + reset-password + lots
│       │   ├── clients.ts      # CRUD clients + project_count + projets liés
│       │   ├── teams.ts        # CRUD équipes + members
│       │   ├── planning.ts     # Unified planning multi-projets
│       │   ├── notifications.ts# Notifications + unread count
│       │   ├── milestones.ts   # Jalons de projet
│       │   ├── lot-tasks.ts    # Tâches par lot
│       │   ├── lot-assignments.ts # Assignations horaires par lot
│       │   ├── subcontractor.ts# Routes portail ST (/my/lots, /my/projects)
│       │   ├── companies.ts    # Fiche entreprise (multi-tenant)
│       │   └── platform.ts     # Admin PlanningIA (templates, menu, companies)
│       └── utils/
│           ├── crypto.ts       # hashPassword, verifyPassword, generateId, hashToken
│           ├── jwt.ts          # signJWT, verifyJWT
│           ├── email.ts        # sendEmail, htmlPasswordReset
│           ├── cpm.ts          # Calcul Critical Path Method
│           └── defaults.ts     # Lots par défaut (façade + BTP)
└── pages/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── main.tsx            # Point d'entrée React
        ├── App.tsx             # Routeur principal + RequireAuth
        ├── index.css           # Tailwind + classes utilitaires custom
        ├── api/
        │   └── client.ts       # Client API REST (toutes les routes)
        ├── store/
        │   └── auth.tsx        # Zustand store auth (user, login, logout, init)
        ├── i18n/
        │   ├── fr.ts           # Traductions françaises (langue principale)
        │   ├── tr.ts           # Traductions turques
        │   └── index.ts        # Hook useT(), useI18n(), setLang()
        ├── components/
        │   ├── Layout.tsx      # Sidebar nav + header (admin + ST)
        │   ├── GanttChart.tsx  # Diagramme Gantt (drag, zoom jour/semaine/mois, bandes années)
        │   ├── ClientSelect.tsx# Composant select client réutilisable
        │   └── ProgressModal.tsx# Modal mise à jour avancement lot
        └── pages/
            ├── Login.tsx        # Connexion
            ├── ForgotPassword.tsx / ResetPassword.tsx / AcceptInvite.tsx
            ├── Dashboard.tsx    # Tableau de bord (stats + projets récents)
            ├── Users.tsx        # Gestion utilisateurs (CRUD + droits + sélection groupée)
            ├── Teams.tsx        # Gestion équipes
            ├── STWorkload.tsx   # Charge de travail sous-traitant/salarié
            ├── TeamWorkload.tsx # Charge de travail équipe
            ├── UnifiedPlanning.tsx # Planning global multi-projets
            ├── Notifications.tsx
            ├── Company.tsx      # Fiche entreprise
            ├── Aide.tsx         # Mode d'emploi / FAQ
            ├── Platform.tsx     # Admin PlanningIA (super-admin)
            ├── Projects/
            │   ├── index.tsx    # Liste projets (cards + liste triable + filtres)
            │   ├── Create.tsx   # Création projet
            │   └── Detail.tsx   # Fiche projet (lots, Gantt, dépendances, jalons)
            ├── Clients/
            │   ├── index.tsx    # Liste clients (CRUD + recherche + compteur chantiers)
            │   └── Detail.tsx   # Fiche client (infos + chantiers liés)
            └── Subcontractor/
                ├── Dashboard.tsx
                ├── MyLots.tsx
                └── Planning.tsx
```

---

## 🔑 SYSTÈME DE DROITS UTILISATEURS (v2.0)

### 4 niveaux d'accès (`access_level`)

| Niveau | Libellé | Badge | Règles |
|---|---|---|---|
| `admin` | 🔑 Admin | Bleu | Accès complet + gestion droits users (max 2 recommandé) |
| `editeur` | ✏️ Éditeur | Violet | Lecture + écriture tout + CRUD clients, SAUF modifier les droits |
| `conducteur` | 🎯 Conducteur | Jaune | Ses projets seulement, peut éditer, PAS supprimer |
| `salarie` | 👁 Lecture seule | Gris | Lecture seule de ses projets/tâches/équipes |

**Note** : `access_level` ne s'applique qu'aux utilisateurs internes (`role = 'admin'`). Les sous-traitants (`role = 'subcontractor'`) ont leur propre portail limité.

### Middlewares d'authentification (`worker/src/middleware/auth.ts`)

| Middleware | Condition | Utilisé pour |
|---|---|---|
| `requireAuth` | JWT valide (admin OU ST) | GET endpoints publics |
| `requireAdmin` | JWT valide + `role = 'admin'` | Plupart des endpoints admin |
| `requireWrite` | `requireAdmin` + `access_level ≠ 'salarie'` | POST/PUT projets, lots |
| `requireEditeur` | `requireAdmin` + `access_level ∈ ['admin', 'editeur']` | DELETE projets, CRUD clients |
| `requireFullAdmin` | `requireAdmin` + `access_level = 'admin'` | PUT/DELETE users, gestion droits |
| `requireSuperAdmin` | `requireAdmin` + `access_level = 'admin'` + `company_id IS NULL` | Routes platform |

### Tableau des droits par niveau

| Action | Admin | Éditeur | Conducteur | Salarié |
|---|---|---|---|---|
| Voir tous les projets (company) | ✅ | ✅ | ❌ (ses projets) | ❌ (ses projets) |
| Créer/modifier projets et lots | ✅ | ✅ | ✅ (ses projets) | ❌ |
| Supprimer projets et lots | ✅ | ✅ | ❌ | ❌ |
| CRUD clients | ✅ | ✅ | ❌ | ❌ |
| Voir/modifier utilisateurs | ✅ | ✅ (lecture) | ❌ | ❌ |
| Modifier droits users | ✅ | ❌ | ❌ | ❌ |
| Supprimer utilisateurs | ✅ | ❌ | ❌ | ❌ |

---

## 📄 ÉTAT DÉTAILLÉ DES FICHIERS CLÉS

### `worker/src/types.ts`
```typescript
interface JWTPayload {
  sub: string          // user.id
  role: 'admin' | 'subcontractor'
  email: string
  company_id: string | null
  company_type: string | null
  access_level: 'admin' | 'editeur' | 'conducteur' | 'salarie'  // ← AJOUTÉ v2.0
  iat: number
  exp: number
}

interface User {
  id, email, password_hash, role, user_type
  first_name, last_name, company_name, phone, lang
  access_level: 'admin' | 'editeur' | 'conducteur' | 'salarie'  // ← AJOUTÉ v2.0
  is_active, invite_token, invite_expires_at, created_at, updated_at
}
```

### `worker/src/routes/auth.ts`
- **POST /login** : JOIN companies → JWT inclut `access_level` + réponse inclut `access_level`
- **POST /refresh** : SELECT inclut `u.access_level` → nouveau JWT avec `access_level`
- **GET /me** : SELECT inclut `u.access_level`
- **POST /invite** : accepte `access_level` dans le body → INSERT avec `access_level || 'editeur'`

### `worker/src/routes/users.ts`
- **GET /** : SELECT inclut `access_level`; filtré par `company_id`
- **PUT /:id** : middleware `requireFullAdmin` (était `requireAdmin`); UPDATE inclut `access_level`
- **DELETE /:id** : middleware `requireFullAdmin` (était `requireAdmin`)
- **POST /:id/reset-password** : middleware `requireFullAdmin`; génère temp password `Temp{4chiffres}!`
- **GET /:id/lots** : retourne lots via `subcontractor_id` UNION `team_members`

### `worker/src/routes/clients.ts`
- **GET /** : inclut `COUNT(p.id) as project_count`; filtré par `company_id`
- **GET /:id** : retourne client + `projects: []` (avec avg_progress calculé par sous-requête)
- **POST /** : `requireAdmin`; INSERT avec `company_id` de l'admin
- **PUT /:id** : `requireAdmin`; UPDATE complet
- **DELETE /:id** : `requireAdmin`; vérifie 0 projets liés (409 si projets existent)

### `worker/src/index.ts` — CORS configuré pour :
```
https://planningia.pages.dev
https://planningia.com
https://www.planningia.com
http://localhost:5173
```

---

## 🖥️ FRONTEND — PAGES CLÉS

### `pages/src/store/auth.tsx`
```typescript
interface AuthUser {
  id, email, role, first_name, last_name, company_name, lang
  access_level?: 'admin' | 'editeur' | 'conducteur' | 'salarie'  // ← AJOUTÉ v2.0
  company_id, company_type, company_activity, company_lot_types, company_display_name
}
```

### `pages/src/App.tsx` — Routes
```
/ (admin)
  /dashboard, /projects, /projects/new, /projects/:id
  /users, /users/:id/workload
  /teams, /teams/:id/workload
  /planning
  /clients, /clients/:id        ← AJOUTÉS v2.0
  /notifications, /company, /platform, /aide

/sub (subcontractor)
  /, /lots, /planning, /notifications, /aide
```

### `pages/src/components/Layout.tsx`
Menu admin (dans l'ordre) :
1. 🏠 Tableau de bord → `/dashboard`
2. 📁 Projets → `/projects`
3. 👥 Clients → `/clients`  ← AJOUTÉ v2.0
4. 📅 Planning global → `/planning`
5. 👤 Utilisateurs → `/users`
6. 👷 Équipes → `/teams`
7. 🏢 Entreprise → `/company`

Détection super-admin : `role = 'admin'` + `access_level = 'admin'` + `company_id IS NULL` → affiche lien ⚙️ Admin PlanningIA

### `pages/src/pages/Users.tsx` — Fonctionnalités v2.0
- **Filtre tabs** : Tous / Salariés / Sous-traitants
- **Colonne "Type / Droits"** : 2 badges distincts (type : Salarié/Sous-traitant; droits : 🔑/✏️/🎯/👁)
- **Modal d'invitation** : champ `Droits d'accès` (select 4 niveaux) pour les salariés
- **Modal d'édition** : champ `Droits d'accès` pour les users internes
- **Bouton 📅 (charge de travail)** : visible pour TOUS les utilisateurs (salariés + ST)
- **Sélection groupée** (NEW v2.0) :
  - Checkboxes par ligne (visible si `isFullAdmin`)
  - Checkbox "tout sélectionner" en en-tête
  - Barre d'action groupée (fond bleu) quand ≥1 sélectionné
  - Dropdown droits + bouton "✓ Appliquer" → `handleBulkApply()` met à jour tous les sélectionnés
  - "✕ Désélectionner" pour vider la sélection
  - Lignes sélectionnées surlignées `bg-primary-50/60`

### `pages/src/pages/Projects/index.tsx` — Vue liste/tri v2.0
- **Toggle Cards / Liste** (icônes 🃏/☰) avec persistance `localStorage`
- **Vue Cards** : grille 3 colonnes, hover lift, badge statut coloré, barre progression
- **Vue Liste** : tableau avec colonnes triables
- **Colonnes triables** (`ThSort`) : Nom, Référence, Date début, Statut, Avancement, Lots
- **Tri** : clic colonne → ASC, re-clic → DESC; persisté en `localStorage`
- **Filtres avancés** : statut, date de/à, client (select), ville (select)
- **"Effacer les filtres"** + compteur résultats
- **localStorage keys** : `planningIA_projects_view`, `planningIA_projects_sort`, `planningIA_projects_dir`

### `pages/src/components/GanttChart.tsx` — Bandes années v2.0
- **Vue Mois** : headers sur 1 ligne uniquement (inchangé)
- **Vue Semaine** : bande supérieure "2026" + colonnes "S16 avr." en dessous
- **Vue Jour** : bandes "AVR. 2026" / "MAI 2026" au-dessus des numéros de jours
- `computeGroupBands()` : groupe les colonnes consécutives par année (semaine) ou mois+année (jour)
- `GROUP_H = 22px` : hauteur de la bande de groupe
- `headerH = zoom === 'month' ? 40 : 62` : hauteur totale du header Gantt

### `pages/src/pages/Clients/index.tsx` — CRÉÉ v2.0
- Liste clients avec barre de recherche (nom, ville, email)
- Tableau : Nom | Ville | Email | Téléphone | Nb chantiers (badge)
- Bouton "+ Nouveau client" → modal `ClientModal`
- Bouton Modifier → modal en mode édition
- Bouton Supprimer → `confirm()` + catch erreur 409 (client utilisé)
- Clic ligne → `navigate('/clients/:id')`

### `pages/src/pages/Clients/Detail.tsx` — CRÉÉ v2.0
- En-tête : nom, ville, adresse + bouton "✏️ Modifier"
- Infos : email (lien mailto), téléphone (lien tel), adresse, notes
- Section "Chantiers associés" : grille cards avec badge statut + barre progression + clic → `/projects/:id`
- Bouton "← Retour" → `/clients`

### `pages/src/i18n/fr.ts` — Clés ajoutées v2.0
```
'nav.clients': 'Clients'
'clients.title': "Clients / Maîtres d'ouvrage"
'clients.new': 'Nouveau client'
'clients.search': 'Rechercher un client...'
'clients.no_clients': 'Aucun client enregistré'
'clients.projects_count': 'chantier(s)'
'users.access.admin': 'Admin'
'users.access.editeur': 'Editeur'
'users.access.conducteur': 'Conducteur'
'users.access.salarie': 'Salarié'
```

### `pages/src/api/client.ts`
Méthodes disponibles (résumé) :
```
api.auth.{login, logout, me, profile, changePassword, invite, acceptInvite, forgotPassword, resetPassword}
api.projects.{list, get, create, update, delete, stats}
api.lots.{list, init, catalog, fromCatalog, create, update, updateDates, delete, progress, history}
api.deps.{list, create, delete}
api.planning.{generateAI, computeCPM, gantt, unified}
api.notifications.{list, unreadCount, markRead, markAllRead}
api.users.{list, update, delete, lots, resetPassword}
api.lotTasks.{listForProject, list, create, update, delete}
api.lotAssignments.{listForProject, list, create, update, delete}
api.milestones.{list, create, update, delete}
api.teams.{list, get, create, update, delete, lots, members.{list, add, remove}}
api.clients.{list, get, create, update, delete}   ← AJOUTÉ v2.0
api.companies.{me, update, create}
api.platform.{lotTemplates, createLotTemplate, updateLotTemplate, deleteLotTemplate,
              createLotDep, updateLotDep, deleteLotDep,
              menuConfig, saveMenuConfig, companies, blockCompany, stats}
```

---

## ✅ FONCTIONNALITÉS COMPLÈTES (état au 07/03/2026)

### Core BTP
- [x] Multi-tenant (isolation par company_id)
- [x] CRUD Projets (draft/preparation/active/reception/closed)
- [x] CRUD Lots avec dépendances (FS/SS/FF/SF) et CPM
- [x] Génération planning par IA (Claude API)
- [x] Diagramme Gantt interactif (drag & drop, zoom jour/semaine/mois)
- [x] Bandes contextuelles années/mois dans Gantt (v2.0)
- [x] Vue liste + tri multi-colonnes des projets (v2.0)
- [x] Planning global multi-projets (UnifiedPlanning)
- [x] Export PDF Gantt (html2canvas + jsPDF, A4/A3)

### Utilisateurs
- [x] Système d'invitation par email (Resend)
- [x] 4 niveaux de droits (admin/editeur/conducteur/salarie)
- [x] Sélection groupée + modification groupée des droits (v2.0)
- [x] Charge de travail par utilisateur (salariés ET sous-traitants) (v2.0)
- [x] Réinitialisation mot de passe admin → temp password
- [x] Portail sous-traitant (planning + lots + notifications)

### Clients
- [x] CRUD Clients/Maîtres d'ouvrage (v2.0)
- [x] Compteur de chantiers par client (v2.0)
- [x] Fiche client avec liste chantiers liés (v2.0)
- [x] Lien client → projets bidirectionnel

### Équipes
- [x] CRUD Équipes
- [x] Gestion membres équipe
- [x] Charge de travail équipe

### Entreprise / Platform
- [x] Fiche entreprise (multi-tenant)
- [x] Catalogue lots (façade + BTP)
- [x] Admin PlanningIA (super-admin sans company_id)

### Authentification
- [x] Login / Logout / Refresh tokens (rotation)
- [x] Forgot password / Reset password (lien email)
- [x] Accept invite (activation compte)
- [x] CORS configuré : pages.dev + planningia.com + www.planningia.com

---

## 🔧 CONFIGURATION VITE (proxy dev local)

```typescript
// pages/vite.config.ts
proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true } }
```

En production, `BASE = 'https://planningai-api.mhfreehome.workers.dev/api'`

---

## 🔄 COMMENT RESTAURER CETTE VERSION

En cas de problème, pour revenir à cette version exacte :

### 1. Restaurer les fichiers sources
```bash
cd "/Volumes/.../planningIA"
unzip PlanningIA_BACKUP_20260307_175911.zip -d PLANNINGAI_restored/
```

### 2. Réinstaller les dépendances
```bash
cd PLANNINGAI_restored/worker && npm install
cd ../pages && npm install
```

### 3. Redéployer
```bash
cd worker && npm run deploy
cd ../pages && npm run build && npx wrangler pages deploy dist --project-name planningia
```

### 4. Vérifier la DB (si access_level manquant)
```bash
npx wrangler d1 execute planningAI-v2 --remote --command="SELECT access_level FROM users LIMIT 1;"
# Si erreur "no column" → recréer la colonne :
npx wrangler d1 execute planningAI-v2 --remote --command="ALTER TABLE users ADD COLUMN access_level TEXT NOT NULL DEFAULT 'admin';"
npx wrangler d1 execute planningAI-v2 --remote --command="UPDATE users SET access_level='admin' WHERE email IN ('serhat.guclu@designfacades.fr', 'zelal.guclu@designfacades.fr');"
```

---

## 📋 CHECKLIST DE VÉRIFICATION

Après tout déploiement, vérifier :
1. [ ] `/login` → connexion OK avec `lornc.travaux@outlook.com`
2. [ ] Menu latéral → lien "Clients" visible entre "Projets" et "Planning global"
3. [ ] `/projects` → toggle Cards/Liste fonctionnel, tri colonnes OK
4. [ ] `/projects/:id` → Gantt semaine → bande "2026" au-dessus des colonnes
5. [ ] `/users` → colonne "Type / Droits" avec 2 badges, checkboxes visibles
6. [ ] `/users` → sélectionner 1+ users → barre d'action groupée apparaît
7. [ ] `/users` → bouton 📅 visible pour TOUS les utilisateurs
8. [ ] `/clients` → liste avec compteur chantiers, bouton "+ Nouveau client"
9. [ ] `/clients/:id` → fiche avec chantiers liés, clic → `/projects/:id`
10. [ ] Invitation nouvel utilisateur → email reçu → acceptation OK

---

## 🗒️ HISTORIQUE DES VERSIONS

| Version | Date | Changements majeurs |
|---|---|---|
| v1.0 | Avant 06/03/2026 | Version initiale : projets, lots, Gantt, ST portail |
| v2.0-pre | 06/03/2026 | CORS fixes, export PDF A4/A3, emails avec company name |
| v2.1 | 06/03/2026 22h | Bug fixes : CPM, Gantt drag, notifications, PDF |
| **v2.0 stable** | **07/03/2026** | **Droits 4 niveaux + Page Clients + Gantt bandes + Projets liste/tri + Bulk rights + Workload pour tous** |

---

*Fiche générée automatiquement le 07/03/2026 — PlanningIA v2.0*
