#!/bin/bash
set -e
PLAN="/Volumes/Crucial X9 Pro For Mac/SynologyDrive/03 - ETUDES DEVELLOPEMENT EN COURS/CLAUDE DT/PLANNINGAI"
cd "$PLAN"

# ── Vérification branche ──────────────────────────────────────────────────────

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "develop" ]; then
  echo ""
  echo "🚫 Vous êtes sur '$CURRENT_BRANCH', pas sur 'develop'."
  echo "   Ce script est réservé à la branche develop."
  echo ""
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "   DÉPLOIEMENT STAGING — PlanningAI (develop)"
echo "═══════════════════════════════════════════════════════"
echo "   Worker  → planningai-api-staging.mhfreehome.workers.dev"
echo "   Pages   → develop.planningia.pages.dev"
echo "   PAS de déploiement en production"
echo "═══════════════════════════════════════════════════════"
echo ""

# ── Déploiement Worker Staging ────────────────────────────────────────────────

echo "🚀 Déploiement Worker staging..."
cd "$PLAN/worker" && npm run deploy:staging

# ── Build Pages (mode staging → VITE_API_BASE = staging worker) ───────────────

echo ""
echo "🚀 Build + Déploiement Pages staging..."
cd "$PLAN/pages" && npm run build:staging && npx wrangler pages deploy dist --project-name planningia --branch develop

# ── Commit + push develop ─────────────────────────────────────────────────────

echo ""
echo "📦 Push develop..."
cd "$PLAN"
git add -A
git commit -m "dev: $(date '+%Y-%m-%d %H:%M')" 2>/dev/null || echo "Rien à commiter"
git push origin develop

echo ""
echo "✅ Staging déployé — develop.planningia.pages.dev"
