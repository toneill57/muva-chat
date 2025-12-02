#!/bin/bash
# Run Next.js dev server with STAGING environment on port 3001

set -e

echo "🧹 Killing any existing processes on port 3001..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
pkill -f "next dev.*3001" 2>/dev/null || true
pkill -f "node.*next.*3001" 2>/dev/null || true
sleep 1
echo "✅ Port 3001 cleared"
echo ""

echo "🚀 Starting development server with STAGING environment..."
echo "   Port: 3001"
echo "   Database: hoaiwcueleiemeplrurv (staging)"
echo ""

# Load staging environment variables
export NEXT_PUBLIC_SUPABASE_URL="https://hoaiwcueleiemeplrurv.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvYWl3Y3VlbGVpZW1lcGxydXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NzgzMTYsImV4cCI6MjA3ODA1NDMxNn0.y8gH0RihykruW5d15b-JuV-kdC7vZmEi_rIxhcPEMQg"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvYWl3Y3VlbGVpZW1lcGxydXJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ3ODMxNiwiZXhwIjoyMDc4MDU0MzE2fQ.ddsf2Jl8--jbN05avrNjxLr4335VGTX-Xg3RQvH6IE4"

# Load other environment variables from .env.local (OpenAI, etc.)
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a

  # Override Supabase vars with staging values
  export NEXT_PUBLIC_SUPABASE_URL="https://hoaiwcueleiemeplrurv.supabase.co"
  export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvYWl3Y3VlbGVpZW1lcGxydXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NzgzMTYsImV4cCI6MjA3ODA1NDMxNn0.y8gH0RihykruW5d15b-JuV-kdC7vZmEi_rIxhcPEMQg"
  export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvYWl3Y3VlbGVpZW1lcGxydXJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ3ODMxNiwiZXhwIjoyMDc4MDU0MzE2fQ.ddsf2Jl8--jbN05avrNjxLr4335VGTX-Xg3RQvH6IE4"
fi

# Run Next.js dev server on port 3001
PORT=3001 pnpm run dev
