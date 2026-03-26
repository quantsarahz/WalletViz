#!/bin/bash
# WalletViz daily update: collect, purge, export snapshot, commit & push
set -e

export PATH="/Users/sig/.nvm/versions/node/v20.20.1/bin:$PATH"
cd /Users/sig/WalletViz

LOG="data/cron.log"
echo "=== $(date) ===" >> "$LOG"

# Collect and purge
npx tsx scripts/collect.ts full >> "$LOG" 2>&1
npx tsx scripts/collect.ts purge >> "$LOG" 2>&1

# Export snapshot
npx tsx scripts/export-snapshot.ts >> "$LOG" 2>&1

# Commit and push if snapshot changed
if git diff --quiet public/data/snapshot.json 2>/dev/null; then
  echo "No snapshot changes, skipping push." >> "$LOG"
else
  git add public/data/snapshot.json
  git commit -m "data: daily update $(date +%Y-%m-%d)" >> "$LOG" 2>&1
  git push >> "$LOG" 2>&1
  echo "Pushed updated snapshot." >> "$LOG"
fi
