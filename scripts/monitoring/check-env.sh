#!/bin/bash
# Check which Supabase environment is active in .env.local

if [ ! -f .env.local ]; then
  echo "❌ .env.local not found"
  echo ""
  echo "Create it by copying one of:"
  echo "  cp .env.dev .env.local        # For development"
  echo "  cp .env.staging .env.local    # For staging testing"
  echo "  cp .env.production .env.local # For production testing"
  exit 1
fi

PROJECT_ID=$(grep "^SUPABASE_PROJECT_ID=" .env.local | cut -d'=' -f2)

case "$PROJECT_ID" in
  "iyeueszchbvlutlcmvcb")
    echo "✅ Active Environment: DEV / PRODUCTION"
    echo "   Branch: dev (or main for production)"
    echo "   Project: iyeueszchbvlutlcmvcb"
    echo "   URL: https://iyeueszchbvlutlcmvcb.supabase.co"
    echo "   Records: 6,641"
    ;;
  "rmrflrttpobzlffhctjt")
    echo "✅ Active Environment: STAGING-V21"
    echo "   Branch: staging-v21"
    echo "   Project: rmrflrttpobzlffhctjt"
    echo "   URL: https://rmrflrttpobzlffhctjt.supabase.co"
    echo "   ⚠️  Reference branch - DO NOT MODIFY"
    ;;
  *)
    echo "⚠️  Unknown Environment"
    echo "   Project: $PROJECT_ID"
    echo ""
    echo "Expected project IDs:"
    echo "  - iyeueszchbvlutlcmvcb (dev/production)"
    echo "  - rmrflrttpobzlffhctjt (staging-v21)"
    ;;
esac

echo ""
echo "Current Git Branch: $(git branch --show-current)"
