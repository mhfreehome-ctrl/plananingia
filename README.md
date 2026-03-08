# PlanningAI — Gestion de chantier BTP

Application de planification et suivi de chantiers BTP. Multi-entreprises, multilingue.

**Production :** https://planningia.com

## Stack
- **Worker** — Cloudflare Workers + Hono (API REST)
- **Frontend** — React + Vite + Tailwind (Cloudflare Pages)
- **DB** — Cloudflare D1 (SQLite)
- **Email** — Resend (reset mot de passe)

## Développement local

**Worker (API) :**
```bash
cd worker
npm install
npm run dev        # http://localhost:8787
```

**Frontend :**
```bash
cd pages
npm install
npm run dev        # http://localhost:5173
```

## Déploiement

```bash
./deploy.sh        # Worker + Pages + git push
```

## Structure
```
PLANNINGAI/
├── worker/src/
│   ├── index.ts           — routes principales
│   └── routes/            — auth, projects, tasks, users, templates
├── pages/src/
│   ├── pages/             — Login, Dashboard, Detail, Admin, Docs...
│   └── components/        — Layout, Sidebar, modales...
└── wrangler.toml
```

## Ressources Cloudflare
| Ressource | Nom |
|-----------|-----|
| Worker | `planningai-api` |
| Pages | `planningia` |
| D1 | `f89b9344` |
| KV | `4665fa79` |

## Comptes test
- Admin : `lornc.travaux@outlook.com` / `Admin1234!`
- Sous-traitant : `ozkbah@gmail.com` / `12345678`
