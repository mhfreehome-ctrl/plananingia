# WORKFLOW — PlanningAI

## Déploiement

```bash
cd "/Volumes/Crucial X9 Pro For Mac/SynologyDrive/03 - ETUDES DEVELLOPEMENT EN COURS/CLAUDE DT/PLANNINGAI"
./deploy.sh
```

Ce script fait tout en une commande :
1. **Worker Cloudflare** → `wrangler deploy` (API)
2. **Pages Cloudflare** → `npm run build` + `wrangler pages deploy` (frontend)
3. **GitHub** → `git push` (backup du code)

## Déploiement partiel (si besoin)

Worker seul :
```bash
cd worker && npm run deploy
```

Pages seules :
```bash
cd pages && npm run build && npx wrangler pages deploy dist --project-name planningia
```

## Structure
```
PLANNINGAI/
├── worker/        — API Hono (Cloudflare Workers)
├── pages/         — Frontend React + Vite (Cloudflare Pages)
└── wrangler.toml  — Config Cloudflare
```

## Ressources Cloudflare
- Worker : `planningai-api` → planningai-api.mhfreehome.workers.dev
- Pages : `planningia` → planningia.com
- D1 : `f89b9344` / KV : `4665fa79`
- GitHub : github.com/mhfreehome-ctrl/plananingia
