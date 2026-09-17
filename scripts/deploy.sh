#!/usr/bin/env bash
# Deploy one language build of the Lotus 99 demo to its own Vercel project (team flow-gpt).
#   scripts/deploy.sh zh   -> lotus-99-interactive-demo      (original Chinese build)
#   scripts/deploy.sh en   -> lotus-99-interactive-demo-en   (NEXT_PUBLIC_STORY_LANG=en)
# Both builds come from the same commit; only the build variable differs (app/locale.ts reads it at build time).
# Vercel builds remotely with package.json's `next build --webpack`; nothing is built locally here.
# VERCEL_TOKEN comes from the environment (or /opt/christina/.env) and is never echoed.
set -euo pipefail
cd "$(dirname "$0")/.."

LANG_ARG="${1:-}"
case "$LANG_ARG" in
  zh) PROJECT_ID="prj_OnvDHZmW7NFiBG4BhZh2DbUqYdJ3"; BUILD_ENV=("--build-env" "NEXT_PUBLIC_STORY_LANG=zh") ;;
  en) PROJECT_ID="prj_6s8baeMQNxz2OWTmP6TbkGR7sKLV"; BUILD_ENV=("--build-env" "NEXT_PUBLIC_STORY_LANG=en") ;;
  *) echo "usage: scripts/deploy.sh zh|en" >&2; exit 2 ;;
esac

if [ -z "${VERCEL_TOKEN:-}" ] && [ -f /opt/christina/.env ]; then
  VERCEL_TOKEN="$(grep -E '^VERCEL_TOKEN=' /opt/christina/.env | cut -d= -f2-)"
fi
[ -n "${VERCEL_TOKEN:-}" ] || { echo "VERCEL_TOKEN not set" >&2; exit 2; }

export VERCEL_ORG_ID="team_0WXITBrXOI35C1zASnZlGZp0"
export VERCEL_PROJECT_ID="$PROJECT_ID"
# --force: skip the deployment/build cache (a cached CSS chunk once shipped stale globals.css), so every deploy builds from scratch.
exec vercel --prod --yes --force --scope flow-gpt --token "$VERCEL_TOKEN" "${BUILD_ENV[@]}"
