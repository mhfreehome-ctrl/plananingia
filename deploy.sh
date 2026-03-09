#!/bin/bash
set -e
PLAN="/Volumes/Crucial X9 Pro For Mac/SynologyDrive/03 - ETUDES DEVELLOPEMENT EN COURS/CLAUDE DT/PLANNINGAI"
cd "$PLAN"

# ── Vérifications préalables ──────────────────────────────────────────────────

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo ""
  echo "🚫 Vous êtes sur '$CURRENT_BRANCH', pas sur 'main'."
  echo "   Mergez develop → main manuellement, puis relancez ./deploy.sh"
  echo ""
  exit 1
fi

# Vérifie que main n'est pas en retard sur develop
BEHIND=$(git rev-list main..develop --count 2>/dev/null || echo "0")
if [ "$BEHIND" -gt 0 ]; then
  echo ""
  echo "⚠️  main est en retard de $BEHIND commit(s) sur develop."
  echo "   Avez-vous bien mergé develop → main ?"
  echo ""
fi

# Confirmation explicite
echo ""
echo "═══════════════════════════════════════════════════════"
echo "   DÉPLOIEMENT PRODUCTION — PlanningAI"
echo "═══════════════════════════════════════════════════════"
echo "   Branche      : main"
echo "   Dernier commit: $(git log --oneline -1)"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "⚠️  Cette action déploie sur planningia.com (PRODUCTION)."
echo ""
printf "   Tapez OUI pour confirmer : "
read CONFIRM

if [ "$CONFIRM" != "OUI" ]; then
  echo ""
  echo "Annulé."
  exit 0
fi

# ── Déploiement ───────────────────────────────────────────────────────────────

echo ""
echo "🚀 Déploiement Worker..."
cd "$PLAN/worker" && npm run deploy

echo ""
echo "🚀 Déploiement Pages..."
cd "$PLAN/pages" && npm run build && npx wrangler pages deploy dist --project-name planningia

echo ""
echo "📦 Push Git main..."
cd "$PLAN"
git add -A
git commit -m "deploy: $(date '+%Y-%m-%d %H:%M')" 2>/dev/null || echo "Rien à commiter"
PLANNINGAI_DEPLOY=1 git push origin main

echo ""
echo "✅ Production déployée — planningia.com"
