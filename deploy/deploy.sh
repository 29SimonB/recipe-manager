#!/usr/bin/env bash
# Synct den lokalen Projektstand auf den Pi, baut Backend + Frontend neu
# und startet den systemd-Service neu. Auf dem Mac ausführen:
#   ./deploy/deploy.sh
set -euo pipefail

PI_HOST="simonb29@mypi4"
PI_DIR="~/recipe-manager"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Synce Quellcode nach $PI_HOST:$PI_DIR"
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude 'dev-dist' \
  --exclude 'data' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '.DS_Store' \
  "$PROJECT_ROOT/" "$PI_HOST:$PI_DIR/"

echo "==> Baue Backend"
ssh "$PI_HOST" "cd $PI_DIR/backend && npm install && npm run build"

echo "==> Baue Frontend"
ssh "$PI_HOST" "cd $PI_DIR/frontend && npm install && npm run build"

echo "==> Starte Dienst neu"
ssh "$PI_HOST" "sudo systemctl restart recipe-manager && sleep 1 && curl -s http://localhost:3001/api/health"

echo "==> Fertig: http://mypi4:3001"
