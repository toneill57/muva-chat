#!/bin/bash

# Benchmark Runner - Uses environment variables for API keys
# Usage: ./scripts/run-benchmarks.sh

set -e

echo "🚀 Running InnPilot Conversation Memory Benchmarks"
echo "=================================================="

# Verify API keys are set
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "❌ Error: ANTHROPIC_API_KEY not set"
  echo "Please set it in .env.local or export it"
  exit 1
fi

if [ -z "$OPENAI_API_KEY" ]; then
  echo "❌ Error: OPENAI_API_KEY not set"
  echo "Please set it in .env.local or export it"
  exit 1
fi

# Export Supabase credentials (safe to commit)
export NEXT_PUBLIC_SUPABASE_URL="https://ooaumjzaztmutltifhoq.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDIwOSwiZXhwIjoyMDcyNDMwMjA5fQ.ngQSR4E9UHWLcbDAhi0QJy3ffriuV2bi4rGxyHy8Eoc"

echo ""
echo "1️⃣  Running Conversation Memory Benchmark..."
npx tsx scripts/benchmark-conversation-memory.ts

echo ""
echo "2️⃣  Running Search Optimization Benchmark..."
npx tsx scripts/benchmark-search-optimized.ts

echo ""
echo "3️⃣  Running Simple Benchmark..."
npx tsx scripts/benchmark-simple.ts

echo ""
echo "✅ All benchmarks completed!"
echo ""
echo "📊 Results Summary:"
echo "- Conversation Memory: See output above"
echo "- Search Optimization: See output above"
echo "- Simple Test: See output above"
