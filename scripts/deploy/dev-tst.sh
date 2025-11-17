#!/bin/bash
# Run Next.js dev server with TST environment on port 3001
# Three-tier architecture: Test environment

set -e

echo "🧹 Killing any existing processes on port 3001..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
pkill -f "next dev.*3001" 2>/dev/null || true
pkill -f "node.*next.*3001" 2>/dev/null || true
sleep 1
echo "✅ Port 3001 cleared"
echo ""

echo "🚀 Starting development server with TST environment..."
echo "   Port: 3001"
echo "   Database: bddcvjoeoiekzfetvxoe (tst)"
echo "   Target: staging.muva.chat"
echo ""

# Load tst environment variables from .env.tst
if [ -f .env.tst ]; then
  set -a
  source .env.tst
  set +a
  echo "✅ Loaded .env.tst"
else
  echo "❌ .env.tst not found"
  exit 1
fi

# Run Next.js dev server on port 3001
PORT=3001 pnpm run dev
