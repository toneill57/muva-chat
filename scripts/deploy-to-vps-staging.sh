#!/bin/bash
set -e  # Exit on error

echo "================================================"
echo "🚀 MUVA Chat STAGING Deployment"
echo "================================================"

cd /var/www/muva-chat-staging

# Fix ecosystem config for Node 20
if [ -f "ecosystem.config.js" ]; then
  mv ecosystem.config.js ecosystem.config.cjs
fi

# Stop PM2
pm2 stop muva-chat-staging || true

# Clean build cache (keep node_modules for prebuild script)
rm -rf .next

# Install/update dependencies
pnpm install --frozen-lockfile

# Build with explicit output
echo "Building Next.js..."
pnpm run build 2>&1 | tee /tmp/next-build-staging.log

# Show build result
if [ $? -eq 0 ]; then
  echo "✅ Build succeeded"
else
  echo "❌ Build failed - showing last 50 lines:"
  tail -50 /tmp/next-build-staging.log
  exit 1
fi

# Restart PM2
pm2 restart muva-chat-staging
pm2 save

echo "✅ Deployment completed"
pm2 list
