#!/bin/bash
set -e
PLAN="/Volumes/Crucial X9 Pro For Mac/SynologyDrive/03 - ETUDES DEVELLOPEMENT EN COURS/CLAUDE DT/PLANNINGAI"

echo "🚀 Déploiement PlanningAI — Worker..."
cd "$PLAN/worker" && npm run deploy

echo ""
echo "🚀 Déploiement PlanningAI — Pages..."
cd "$PLAN/pages" && npm run build && npx wrangler pages deploy dist --project-name planningia

echo ""
echo "📦 Push Git (backup)..."
cd "$PLAN"
git add -A
git commit -m "deploy: $(date '+%Y-%m-%d %H:%M')" 2>/dev/null || echo "Rien à commiter"
git push origin main

echo ""
echo "✅ Terminé — Cloudflare Worker + Pages + GitHub mis à jour"
