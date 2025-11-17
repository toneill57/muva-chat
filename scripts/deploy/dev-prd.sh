#!/bin/bash
# Run Next.js dev server with PRD environment on port 3000
# Three-tier architecture: Production environment

set -e

echo "🧹 Killing any existing processes on port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "node.*next" 2>/dev/null || true
sleep 1
echo "✅ Port 3000 cleared"
echo ""

echo "🚀 Starting development server with PRD environment..."
echo "   Port: 3000"
echo "   Database: kprqghwdnaykxhostivv (prd)"
echo "   Target: muva.chat"
echo ""

# Load prd environment variables from .env.prd
if [ -f .env.prd ]; then
  set -a
  source .env.prd
  set +a
  echo "✅ Loaded .env.prd"
else
  echo "❌ .env.prd not found"
  exit 1
fi

# Run Next.js dev server on port 3000 (default)
pnpm run dev
