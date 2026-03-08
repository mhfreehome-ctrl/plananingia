# PlanningIA — Fiche de Liaison
**Version :** 1.3
**Date :** 2026-03-05
**Backups :**
- `planningIA_backup_2026-03-05.zip` ← session 1
- `planningIA_backup_20260305_1235.zip` ← session 2 (avant évolution "Entreprise")

---

## 1. Infrastructure

| Élément | Valeur |
|---|---|
| Worker (API) | `https://planningia-api.mhfreehome.workers.dev` |
| Pages (Frontend) | `https://planningia.pages.dev` · `https://planningia.com` · `https://www.planningia.com` |
| D1 Database | `planningIA` · ID `452accca-1330-4f84-9c02-ceb0eb20aaab` |
| KV Namespace | ID `cca68384a1414bf49ad7f301618579f3` |
| Projet Wrangler | `planningia-api` |
| Pages project | `planningia` |

### Stack technique
- **Worker :** Cloudflare Workers · Hono · TypeScript
- **Base de données :** D1 (SQLite) via Cloudflare
- **Frontend :** React + Vite + Tailwind CSS · Cloudflare Pages
- **Email :** Resend (`noreply@planningia.fr`)
- **Auth :** JWT HS256 maison (access 15min / refresh 30j) · PBKDF2-SHA256 100k iters

### Secrets Worker (à recréer si besoin)
```
JWT_SECRET         — secret JWT
RESEND_API_KEY     — clé API Resend
RESEND_FROM        — expéditeur email (ex: PlanningIA <noreply@planningia.fr>)
CLAUDE_API_KEY     — clé API Anthropic (génération IA)
```

---

## 2. Comptes de test

| Email | Mot de passe | Rôle |
|---|---|---|
| `lornc.travaux@outlook.com` | `Admin1234!` | Admin |
| `ozkbah@gmail.com` | `12345678` | Sous-traitant |

---

## 3. Structure des fichiers

```
planningIA/
├── wrangler.toml
├── migrations/
│   ├── 0001_schema.sql         — schéma initial (users, projects, lots, deps, notifications, etc.)
│   ├── 0002_seed.sql           — données de test
│   ├── 0003_companies.sql      — (à vérifier contenu)
│   ├── 0004_milestones.sql     — table milestones (jalons Gantt)
│   ├── 0005_password_reset.sql — table password_reset_tokens
│   ├── 0006_lot_tasks.sql      — table lot_tasks (sous-tâches par lot)
│   ├── 0007_lot_assignments.sql— table lot_assignments (non utilisé en UI — à réserver)
│   ├── 0008_provisional.sql    — ALTER lots: market_deadline, is_provisional
│   ├── 0009_sublots.sql        — ALTER lots: parent_lot_id (découpage/duplication de lots)
│   ├── 0010_enterprise.sql     — ALTER users: user_type + CREATE teams + team_members ✅ v1.3
│   └── 0011_lot_team.sql       — ALTER lots: team_id (FK → teams) ✅ v1.3
├── worker/src/
│   ├── index.ts                — app Hono, CORS, routes (+ teams monté)
│   ├── types.ts                — Env, JWTPayload, User, Project, Lot, Dependency, Notification,
│   │                              Team, TeamMember (ajoutés v1.3)
│   ├── middleware/auth.ts      — requireAuth / requireAdmin
│   ├── routes/
│   │   ├── auth.ts             — register, login, refresh, logout, me, invite (+ user_type),
│   │   │                          accept-invite, forgot-password, reset-password
│   │   ├── projects.ts         — CRUD projets
│   │   ├── lots.ts             — CRUD lots + drag/resize + notifications + market_deadline +
│   │   │                          is_provisional + parent_lot_id + team_id (v1.3)
│   │   ├── planning.ts         — CPM + generate-ai (5 types chantier incl. Entreprise) + gantt
│   │   │                          (gantt JOIN teams pour team_name/team_color — v1.3)
│   │   ├── milestones.ts       — CRUD jalons (GET/POST /projects/:id/milestones,
│   │   │                          PUT/DELETE /milestones/:id)
│   │   ├── lot-tasks.ts        — CRUD sous-tâches (GET/POST /lots/:id/tasks,
│   │   │                          GET /projects/:id/lot-tasks, PUT/DELETE /lot-tasks/:id)
│   │   ├── lot-assignments.ts  — CRUD affectations multi-ST (table en D1, UI désactivée)
│   │   ├── teams.ts            — CRUD équipes + membres (GET/POST/PUT/DELETE + members) ✅ v1.3
│   │   ├── subcontractor.ts    — /api/my/* (projets & lots du sous-traitant connecté)
│   │   ├── notifications.ts    — liste + marquage lu
│   │   └── users.ts            — liste / GET / PUT (+ user_type) / DELETE + GET /:id/lots
│   └── utils/
│       ├── crypto.ts           — PBKDF2 hash/verify, generateId
│       ├── jwt.ts              — signJWT, verifyJWT
│       ├── cpm.ts              — calcul chemin critique (CPM)
│       ├── defaults.ts         — lots et dépendances par défaut
│       └── email.ts            — templates HTML email (Resend)
└── pages/src/
    ├── main.tsx / App.tsx      — routeur React (+ /teams — v1.3)
    ├── i18n/                   — traductions (fr, tr)
    ├── api/client.ts           — toutes les fonctions API (+ api.teams — v1.3)
    ├── store/auth.tsx          — Zustand : user, login, logout, init
    ├── components/
    │   ├── GanttChart.tsx      — Gantt drag/drop + export PDF A4/A3 + jalons +
    │   │                          sous-tâches + lots provisionnels + dates limites marché +
    │   │                          parent_lot_id (indentation sous-lots)
    │   │                          + affichage team_name/team_color (v1.3)
    │   ├── Layout.tsx          — navigation admin (+ lien Équipes — v1.3)
    │   ├── ProgressModal.tsx   — modal avancement sous-traitant
    │   └── ... (autres petits composants)
    └── pages/
        ├── Login.tsx           — + lien "Mot de passe oublié"
        ├── ForgotPassword.tsx  — formulaire email pour reset mdp
        ├── ResetPassword.tsx   — formulaire nouveau mdp (token URL)
        ├── AcceptInvite.tsx    — acceptation invitation sous-traitant
        ├── Dashboard.tsx       — vue admin : liste projets, stats
        ├── Users.tsx           — gestion utilisateurs + user_type badges + filtres + édition
        │                          + 📅 charge de travail ST (uniquement sous-traitants)
        ├── Teams.tsx           — gestion équipes (CRUD équipes + membres) ✅ v1.3
        ├── STWorkload.tsx      — Gantt lecture seule par ST (charge + conflits)
        ├── Notifications.tsx
        ├── Projects/
        │   ├── index.tsx       — liste projets
        │   ├── Create.tsx      — création projet
        │   └── Detail.tsx      — détail projet + planning Gantt + jalons +
        │                          ✏️ édition fiche projet + ✂️ découpage lots +
        │                          📋 sous-tâches + lots provisionnels + types IA +
        │                          assignation lot → Sous-traitant OU Équipe (v1.3)
        └── Subcontractor/
            ├── Dashboard.tsx   — tableau de bord sous-traitant
            ├── MyLots.tsx      — mes lots + mise à jour avancement
            └── Planning.tsx    — planning Gantt (lecture seule, multi-projets)
```

---

## 4. API Worker

### Auth
| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Inscription |
| POST | `/api/auth/login` | Connexion → access_token + refresh_token |
| POST | `/api/auth/refresh` | Renouvelle access_token |
| POST | `/api/auth/logout` | Révoque refresh token |
| GET  | `/api/auth/me` | Profil utilisateur connecté |
| PUT  | `/api/auth/profile` | Modifie profil |
| PUT  | `/api/auth/change-password` | Change mot de passe |
| POST | `/api/auth/invite` | Envoie invitation (admin) — supporte `user_type` |
| POST | `/api/auth/accept-invite` | Accepte invitation + définit mot de passe |
| POST | `/api/auth/forgot-password` | Envoie email reset mdp |
| POST | `/api/auth/reset-password` | Valide token + nouveau mdp |

### Projets
| Méthode | Route | Description |
|---|---|---|
| GET    | `/api/projects` | Liste projets (admin) |
| POST   | `/api/projects` | Crée projet |
| GET    | `/api/projects/:id` | Détail projet |
| PUT    | `/api/projects/:id` | Modifie projet (nom, adresse, client, etc.) |
| DELETE | `/api/projects/:id` | Supprime projet |
| GET    | `/api/projects/:id/lots` | Lots du projet |
| GET    | `/api/projects/:id/gantt` | Lots + dépendances pour Gantt (JOIN teams) |
| GET    | `/api/projects/:id/dependencies` | Dépendances |
| POST   | `/api/projects/:id/dependencies` | Ajoute dépendance |
| DELETE | `/api/dependencies/:id` | Supprime dépendance |
| POST   | `/api/projects/:id/compute-cpm` | Calcule CPM (chemin critique) |
| POST   | `/api/projects/:id/generate-ai` | Génère planning IA (param: `chantier_type`) |
| GET    | `/api/projects/:id/milestones` | Jalons du projet |
| POST   | `/api/projects/:id/milestones` | Crée jalon |
| PUT    | `/api/milestones/:id` | Modifie jalon |
| DELETE | `/api/milestones/:id` | Supprime jalon |
| GET    | `/api/projects/:id/lot-tasks` | Toutes les sous-tâches du projet |
| GET    | `/api/projects/:id/lot-assignments` | Toutes les affectations multi-ST |
| GET    | `/api/projects/:id/stats` | Statistiques projet |

### Lots
| Méthode | Route | Description |
|---|---|---|
| POST   | `/api/projects/:id/lots` | Crée lot (supporte `parent_lot_id`, `team_id`) |
| POST   | `/api/projects/:id/lots/init` | Init lots par défaut |
| PUT    | `/api/lots/:id` | Modifie lot (notif email si ST assigné) — supporte `team_id` |
| DELETE | `/api/lots/:id` | Supprime lot |
| PATCH  | `/api/lots/:id/dates` | Met à jour dates drag/resize (notif email ST) |
| PATCH  | `/api/lots/:id/progress` | Mise à jour avancement (par ST, notif admin) |
| GET    | `/api/lots/:id/tasks` | Sous-tâches d'un lot |
| POST   | `/api/lots/:id/tasks` | Crée sous-tâche |
| PUT    | `/api/lot-tasks/:id` | Modifie sous-tâche |
| DELETE | `/api/lot-tasks/:id` | Supprime sous-tâche |
| GET    | `/api/lots/:id/assignments` | Affectations multi-ST (table réservée) |
| POST   | `/api/lots/:id/assignments` | Crée affectation (table réservée) |

### Équipes ✅ v1.3
| Méthode | Route | Description |
|---|---|---|
| GET    | `/api/teams` | Liste toutes les équipes (requireAuth) |
| GET    | `/api/teams/:id` | Détail équipe + membres (requireAdmin) |
| POST   | `/api/teams` | Crée équipe (requireAdmin) |
| PUT    | `/api/teams/:id` | Modifie équipe (requireAdmin) |
| DELETE | `/api/teams/:id` | Supprime équipe (requireAdmin) |
| GET    | `/api/teams/:id/members` | Membres de l'équipe (requireAdmin) |
| POST   | `/api/teams/:id/members` | Ajoute membre (requireAdmin) — 409 si déjà membre |
| DELETE | `/api/teams/:id/members/:userId` | Retire membre (requireAdmin) |

### Sous-traitant
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/my/lots` | Mes lots |
| GET | `/api/my/projects` | Mes projets |
| GET | `/api/my/notifications` | Mes notifications |

### Notifications
| Méthode | Route | Description |
|---|---|---|
| GET   | `/api/notifications` | Liste notifications |
| GET   | `/api/notifications/unread-count` | Nombre non lus |
| PATCH | `/api/notifications/:id/read` | Marque comme lu |
| PATCH | `/api/notifications/read-all` | Marque tout lu |

### Utilisateurs (admin)
| Méthode | Route | Description |
|---|---|---|
| GET    | `/api/users` | Liste tous les utilisateurs (+ user_type) |
| GET    | `/api/users/:id` | Détail utilisateur |
| PUT    | `/api/users/:id` | Modifie utilisateur (+ user_type) |
| DELETE | `/api/users/:id` | Supprime utilisateur (non-admin) |
| GET    | `/api/users/:id/lots` | Lots assignés à un sous-traitant |

---

## 5. Fonctionnalités implémentées (état 2026-03-05 v1.3)

### Modèle "Entreprise" ✅ v1.3
- **user_type** : colonne sur `users` → `'employee'` (salarié interne) ou `'subcontractor'` (externe)
- **Invitation** : sélection du type au moment de l'invitation (carte visuelle Sous-traitant / Salarié)
- **Édition utilisateur** : modification du type (bascule radio Sous-traitant / Salarié)
- **Filtres Users** : onglets "Tous / 👷 Salariés / 🏢 Sous-traitants" + compteurs
- **Badges** : Admin (bleu), Salarié (vert), Sous-traitant (gris)
- **Équipes** : page `/teams` — création/édition d'équipes avec couleur, responsable (leader), description
- **Membres d'équipe** : ajout/retrait de salariés (`user_type='employee'`) dans une équipe
- **Assignation lots** : LotModal toggle → Sous-traitant OU Équipe (exclusif)
  - Si équipe : affichage `👥 Nom équipe` dans la colonne sous-traitant du Gantt
- **Gantt** : colonne affiche `team_name` en priorité sur `subcontractor_name`
- **IA "Entreprise"** : 5e type de chantier `👥 Entreprise / Régie` dans le sélecteur IA

### Planning Gantt (admin — `Detail.tsx` + `GanttChart.tsx`)
- Zoom Jour / Semaine / Mois
- **Drag & drop** + **Resize** (bord droit)
- **Cascade FS** : décalage automatique des successeurs FS
- **Chemin critique** : lots critiques entourés en rouge
- **Flèches dépendances** : FS (gris) et SS (vert pointillé)
- **Tooltip** au survol
- **Export PDF A4/A3 paysage** (html2canvas + jsPDF, lazy import)
- **Jalons** (lignes colorées + losange + label rotaté 55°, cliquables)
- **Légende** : chemin critique, terminé, jalon, FS, SS, Échéance
- **Sous-tâches** (zoom jour/semaine uniquement) : 3 types (commande, exécution, livraison)
- **Lots provisionnels** : hachures diagonales + opacité réduite
- **Date limite marché** : ligne orange pointillée + triangle
- **Sous-lots (découpés)** : indentation ↳ + barre légèrement plus petite
- **Équipes** : affichage couleur équipe dans la colonne assignation (v1.3)

### Gestion des lots
- Onglet Lots : liste avec %, statut, ST assigné ou Équipe
- **✂️ Découper** : crée un sous-lot rattaché au lot parent
- **📋 Sous-tâches** : gestion des phases d'un lot (commande/exécution/livraison)
- **📊 Avancement** : mise à jour % + statut + commentaire
- Lot prévisionnel (case à cocher) → hachuré sur le Gantt
- Date limite marché (date picker) → marqueur orange dans le Gantt
- **Assignation** : Sous-traitant OU Équipe (toggle exclusif — v1.3)

### Génération IA (Claude API)
Types de chantier supportés :
- Auto (description libre)
- 🏠 Maison individuelle
- 🏢 Collectif résidentiel
- 🏭 Tertiaire dépôt/logistique
- 🏗 Tertiaire bureaux
- 👥 Entreprise / Régie interne ✅ v1.3

### Gestion projet
- **✏️ Modifier** : édition de la fiche projet (nom, adresse, client, dates, description, statut)

### Auth & Utilisateurs
- **Mot de passe oublié** : email avec lien reset (token haché en D1, expiration 1h)
- **Reset mot de passe** : page `/reset-password?token=...`
- **Édition utilisateur** : admin peut modifier profil + user_type d'un utilisateur
- **Invitation** : email d'invitation avec sélection du type (salarié/sous-traitant) — v1.3

### Vue charge de travail (📅)
- Accessible depuis la liste Utilisateurs (bouton 📅 sur les **sous-traitants** uniquement)
- Route : `/users/:id/workload`
- Gantt lecture seule de tous les lots assignés à ce ST
- Détection de chevauchements → lots conflictuels en orange + bandeau d'alerte

### Notifications email (Resend)
- **Lot assigné** → ST : nom entreprise générale, lot, projet, dates
- **Planning modifié** → ST : nouvelles dates
- **Avancement mis à jour** → admin : qui, quel lot, quel %
- **Invitation** → nouveau ST/salarié
- **Reset mot de passe** → lien sécurisé
- Footer : `www.planningia.com`

---

## 6. Migrations D1

| Fichier | Tables / Colonnes | Statut |
|---|---|---|
| `0001_schema.sql` | users, projects, lots, dependencies, notifications, refresh_tokens, progress_updates | ✅ |
| `0002_seed.sql` | Données de test | ✅ |
| `0003_companies.sql` | (à vérifier) | ✅ |
| `0004_milestones.sql` | `milestones` | ✅ |
| `0005_password_reset.sql` | `password_reset_tokens` | ✅ |
| `0006_lot_tasks.sql` | `lot_tasks` | ✅ |
| `0007_lot_assignments.sql` | `lot_assignments` (réservé, UI désactivée) | ✅ |
| `0008_provisional.sql` | `lots.market_deadline`, `lots.is_provisional` | ✅ |
| `0009_sublots.sql` | `lots.parent_lot_id` | ✅ |
| `0010_enterprise.sql` | `users.user_type`, `teams`, `team_members` | ✅ v1.3 |
| `0011_lot_team.sql` | `lots.team_id` | ✅ v1.3 |

### Appliquer une migration en prod
```bash
cd "/Volumes/Crucial X9 Pro For Mac/SynologyDrive/03 - ETUDES DEVELLOPEMENT EN COURS/planningIA"
npx wrangler d1 execute planningIA --file=migrations/00XX_nom.sql --remote
```

---

## 7. Commandes de déploiement

```bash
# Worker
cd planningIA/worker
npm run deploy

# Pages
cd planningIA/pages
npm run build
npx wrangler pages deploy dist --project-name planningia
```

---

## 8. Calcul CPM

Fichier : `worker/src/utils/cpm.ts`
- Algorithme forward/backward pass
- Types : FS (avec lag_days), SS
- Résultat : `early_start`, `early_finish`, `late_start`, `late_finish`, `total_float`, `is_critical`

---

## 9. Notes techniques

### Auth JWT
- Access token : 15 min (`localStorage planningia_token`)
- Refresh token : 30 jours (haché en D1, rotation à chaque refresh)

### Mot de passe
Format : `pbkdf2:100000:<saltHex>:<hashHex>` — SHA-256, 100 000 itérations

### Export PDF
- `html2canvas` + `jspdf` (lazy import — chunks séparés)
- Bascule automatique zoom **mois** avant capture → restaure après

### Email
- Provider : Resend · `noreply@planningia.fr`
- Entreprise générale incluse dans les notifs ST
- URL base : `https://www.planningia.com`

### CORS
Origins : `planningia.pages.dev`, `planningia.com`, `www.planningia.com`, `www.planningia.fr`, `localhost:5173`

### Modèle Entreprise (v1.3)
- `users.user_type` : `'subcontractor'` (défaut) | `'employee'`
- `users.role` reste `'admin'` | `'subcontractor'` (JWT inchangé)
- Un lot a soit `subcontractor_id` soit `team_id` (exclusif, l'autre = NULL)
- Seuls les `user_type='employee'` peuvent être membres d'une équipe
- Le bouton 📅 charge de travail est masqué pour les `user_type='employee'`

---

## 10. Prochaines étapes (backlog)

### Modèle "Entreprise" — suite
- [ ] Phase 5 : Interface salarié (vue dédiée comme sous-traitant)
- [ ] Vue charge équipe (Gantt lecture seule tous lots d'une équipe)
- [ ] IA "Entreprise" enrichie : inclure composition équipes dans le prompt

### Autres améliorations identifiées
- [ ] Alerte lots en retard (dashboard admin)
- [ ] Filtres / recherche liste lots
- [ ] Export PDF multi-pages (planning très large)
- [ ] Notifications push (PWA)
- [ ] Historique modifications d'un lot
- [ ] Dashboard : graphiques d'avancement global
- [ ] Internationalisation TR complète
- [ ] Table `lot_assignments` : réutiliser ou supprimer (actuellement vide, UI désactivée)
- [ ] CLAUDE_API_KEY : ajouter dans les secrets Wrangler si pas encore fait
