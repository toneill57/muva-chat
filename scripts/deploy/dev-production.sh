#!/bin/bash
# Run Next.js dev server with PRODUCTION environment on port 3000

set -e

echo "🧹 Killing any existing processes on port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "node.*next" 2>/dev/null || true
sleep 1
echo "✅ Port 3000 cleared"
echo ""

echo "🚀 Starting development server with PRODUCTION environment..."
echo "   Port: 3000"
echo "   Database: ooaumjzaztmutltifhoq (production)"
echo ""

# Load production environment variables
export NEXT_PUBLIC_SUPABASE_URL="https://ooaumjzaztmutltifhoq.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIxOTgyNzksImV4cCI6MjAzNzc3NDI3OX0.gtoWU5CDHna0W5ODKSk1qVH1pj0s0bgGy8G2YhC-OxI"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjE5ODI3OSwiZXhwIjoyMDM3Nzc0Mjc5fQ.vGPP9pRx3VO_kH38cMXOG9P2uuMPALLWdDpZOCDtxrY"

# Load other environment variables from .env.local (OpenAI, etc.)
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a

  # Override Supabase vars with production values
  export NEXT_PUBLIC_SUPABASE_URL="https://ooaumjzaztmutltifhoq.supabase.co"
  export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIxOTgyNzksImV4cCI6MjAzNzc3NDI3OX0.gtoWU5CDHna0W5ODKSk1qVH1pj0s0bgGy8G2YhC-OxI"
  export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjE5ODI3OSwiZXhwIjoyMDM3Nzc0Mjc5fQ.vGPP9pRx3VO_kH38cMXOG9P2uuMPALLWdDpZOCDtxrY"
fi

# Run Next.js dev server on port 3000 (default)
pnpm run dev
