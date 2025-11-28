#!/bin/bash
#
# Apply TST Deployment Workflow Fix
# This script applies the fix to deploy-tst.yml to handle dirty working tree on VPS
#
# Issue: VPS TST server has local modifications (package.json, pnpm-lock.yaml, public/config/settings.json)
# Solution: Change git pull to git fetch + reset --hard + clean -fd
#

set -e

echo "🔧 Applying TST deployment workflow fix..."
echo ""

# Copy the fixed workflow to active location
cp .github/workflows-fixed/deploy-tst.yml .github/workflows/deploy-tst.yml

echo "✅ Workflow file updated"
echo ""
echo "Changes made:"
echo "- git pull --ff-only → git fetch + git reset --hard + git clean -fd"
echo "- This discards local VPS changes and prevents merge conflicts"
echo ""
echo "Next steps:"
echo "1. Review the changes: git diff .github/workflows/deploy-tst.yml"
echo "2. Commit: git add .github/workflows/deploy-tst.yml && git commit"
echo "3. Push to trigger deployment"
echo ""
