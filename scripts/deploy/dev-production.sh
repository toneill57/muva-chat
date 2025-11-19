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
echo "   Database: kprqghwdnaykxhostivv (production)"
echo ""

# Load production environment variables
export NEXT_PUBLIC_SUPABASE_URL="https://kprqghwdnaykxhostivv.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcnFnaHdkbmF5a3hob3N0aXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMTc5NjksImV4cCI6MjA3ODg5Mzk2OX0.tm-EjVqO25o3kjC73rTsgNr6IJOPeqytlilHVdM_7M8"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcnFnaHdkbmF5a3hob3N0aXZ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzMxNzk2OSwiZXhwIjoyMDc4ODkzOTY5fQ.Ypsb1ZpV59b0zAL3JqnyArMx3ZU9OAiltOnsT0rE6MY"

# Load other environment variables from .env.local (OpenAI, etc.)
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a

  # Override Supabase vars with production values
  export NEXT_PUBLIC_SUPABASE_URL="https://kprqghwdnaykxhostivv.supabase.co"
  export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcnFnaHdkbmF5a3hob3N0aXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMTc5NjksImV4cCI6MjA3ODg5Mzk2OX0.tm-EjVqO25o3kjC73rTsgNr6IJOPeqytlilHVdM_7M8"
  export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcnFnaHdkbmF5a3hob3N0aXZ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzMxNzk2OSwiZXhwIjoyMDc4ODkzOTY5fQ.Ypsb1ZpV59b0zAL3JqnyArMx3ZU9OAiltOnsT0rE6MY"
fi

# Run Next.js dev server on port 3000 (default)
pnpm run dev
