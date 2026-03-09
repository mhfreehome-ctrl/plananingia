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
echo "   → Cloudflare Pages preview (branche develop)"
echo "   → PAS de déploiement en production"
echo "═══════════════════════════════════════════════════════"
echo ""

# ── Commit + push develop ─────────────────────────────────────────────────────

git add -A
git commit -m "dev: $(date '+%Y-%m-%d %H:%M')" 2>/dev/null || echo "Rien à commiter"
git push origin develop

echo ""
echo "📦 Push develop → Cloudflare Pages preview auto-déployé"
echo "✅ Staging OK — vérifier l'URL preview Cloudflare Pages"
