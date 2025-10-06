#!/bin/bash
# Setup cron job for conversation archiving on VPS
# FASE 2.6: Conversation Intelligence - Auto-archiving
#
# Usage: bash scripts/cron/setup-archive-cron.sh
# Requirements: CRON_SECRET environment variable must be set

set -e

echo "🚀 Setting up conversation archiving cron job..."
echo ""

# Validate environment
if [ -z "$CRON_SECRET" ]; then
  echo "❌ Error: CRON_SECRET environment variable not set"
  echo ""
  echo "Generate one with:"
  echo "  openssl rand -base64 32"
  echo ""
  echo "Then export it:"
  echo "  export CRON_SECRET='your-generated-secret'"
  echo ""
  exit 1
fi

# Cron job configuration
CRON_SCHEDULE="0 2 * * *"  # Daily at 2am
CRON_URL="https://innpilot.io/api/cron/archive-conversations"
LOG_FILE="/var/log/innpilot/cron-archive.log"

# Build cron entry
CRON_ENTRY="${CRON_SCHEDULE} curl -s -H 'Authorization: Bearer ${CRON_SECRET}' ${CRON_URL} >> ${LOG_FILE} 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "archive-conversations"; then
  echo "⚠️  Cron job already exists, updating..."
  (crontab -l 2>/dev/null | grep -v "archive-conversations"; echo "$CRON_ENTRY") | crontab -
else
  echo "➕ Adding new cron job..."
  (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
fi

# Create log directory if not exists
sudo mkdir -p /var/log/innpilot
sudo touch $LOG_FILE
sudo chmod 666 $LOG_FILE

echo "✅ Cron job configured successfully!"
echo ""
echo "📋 Configuration:"
echo "   Schedule: Daily at 2am (Colombia timezone)"
echo "   Endpoint: $CRON_URL"
echo "   Log file: $LOG_FILE"
echo ""
echo "🔍 Verify installation:"
echo "   crontab -l | grep archive-conversations"
echo ""
echo "📊 Monitor logs:"
echo "   tail -f $LOG_FILE"
echo ""
echo "🧪 Test manually:"
echo "   curl -H 'Authorization: Bearer \$CRON_SECRET' $CRON_URL"
