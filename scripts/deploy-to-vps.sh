#!/bin/bash
set -e  # Exit on error

echo "================================================"
echo "🚀 MUVA Chat PRODUCTION Deployment"
echo "================================================"

cd /var/www/muva-chat-prd

# Fix ecosystem config for Node 20
if [ -f "ecosystem.config.js" ]; then
  mv ecosystem.config.js ecosystem.config.cjs
fi

# Stop PM2
pm2 stop all || true

# Clean and reinstall
rm -rf .next node_modules
pnpm install --frozen-lockfile

# Build with explicit output
echo "Building Next.js..."
pnpm run build 2>&1 | tee /tmp/next-build.log

# Show build result
if [ $? -eq 0 ]; then
  echo "✅ Build succeeded"
else
  echo "❌ Build failed - showing last 50 lines:"
  tail -50 /tmp/next-build.log
  exit 1
fi

# Restart PM2
pm2 delete muva-chat-prd 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

echo "✅ Deployment completed"
pm2 list
