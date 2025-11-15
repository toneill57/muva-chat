#!/bin/bash
###############################################################################
# Automated RPC Functions Monitoring
#
# Purpose: Monitor RPC functions and alert if validation fails
# Designed to run via cron for continuous monitoring
#
# Usage:
#   ./scripts/monitor-rpc-functions.sh
#   ./scripts/monitor-rpc-functions.sh staging
#   ./scripts/monitor-rpc-functions.sh production
#
# Setup cron (runs every hour):
#   0 * * * * cd /path/to/muva-chat && ./scripts/monitor-rpc-functions.sh production >> /var/log/muva-rpc-monitor.log 2>&1
#
# Environment Variables (optional):
#   SLACK_WEBHOOK_URL     - Slack webhook for alerts
#   EMAIL_TO              - Email address for alerts
#   ALERT_METHOD          - "slack", "email", or "log" (default: log)
###############################################################################

set -e

# Environment (default: production)
ENV="${1:-production}"

# Alert configuration
ALERT_METHOD="${ALERT_METHOD:-log}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
EMAIL_TO="${EMAIL_TO:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Starting RPC Functions monitoring for $ENV environment"

# Change to script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
cd "$PROJECT_DIR"

# Load environment variables if .env.local exists
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

# Run validation
if pnpm run validate:rpc -- --env=$ENV > /tmp/rpc-validation-$ENV.log 2>&1; then
  echo -e "[$TIMESTAMP] ${GREEN}✅ RPC Functions validation PASSED for $ENV${NC}"
  exit 0
else
  EXIT_CODE=$?
  echo -e "[$TIMESTAMP] ${RED}❌ RPC Functions validation FAILED for $ENV (exit code: $EXIT_CODE)${NC}"

  # Read validation output
  VALIDATION_OUTPUT=$(cat /tmp/rpc-validation-$ENV.log)

  # Send alert based on configured method
  send_alert

  exit 1
fi

###############################################################################
# Alert Functions
###############################################################################

send_alert() {
  case "$ALERT_METHOD" in
    slack)
      send_slack_alert
      ;;
    email)
      send_email_alert
      ;;
    log)
      send_log_alert
      ;;
    *)
      send_log_alert
      ;;
  esac
}

send_slack_alert() {
  if [ -z "$SLACK_WEBHOOK_URL" ]; then
    echo "[$TIMESTAMP] ⚠️  SLACK_WEBHOOK_URL not configured - falling back to log"
    send_log_alert
    return
  fi

  # Prepare Slack message
  SLACK_PAYLOAD=$(cat <<EOF
{
  "text": "🚨 RPC Functions Validation Failed",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "🚨 RPC Functions Validation Failed",
        "emoji": true
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Environment:*\n\`$ENV\`"
        },
        {
          "type": "mrkdwn",
          "text": "*Timestamp:*\n$TIMESTAMP"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Action Required:*\n\`\`\`pnpm run validate:rpc:fix -- --env=$ENV\`\`\`"
      }
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Validation Output:*\n\`\`\`${VALIDATION_OUTPUT:0:2000}\`\`\`"
      }
    }
  ]
}
EOF
)

  # Send to Slack
  curl -X POST -H 'Content-type: application/json' \
    --data "$SLACK_PAYLOAD" \
    "$SLACK_WEBHOOK_URL"

  echo "[$TIMESTAMP] ✅ Alert sent to Slack"
}

send_email_alert() {
  if [ -z "$EMAIL_TO" ]; then
    echo "[$TIMESTAMP] ⚠️  EMAIL_TO not configured - falling back to log"
    send_log_alert
    return
  fi

  # Prepare email
  EMAIL_SUBJECT="🚨 MUVA Chat: RPC Functions Validation Failed ($ENV)"
  EMAIL_BODY="RPC Functions validation failed for $ENV environment at $TIMESTAMP

Environment: $ENV
Timestamp: $TIMESTAMP

Action Required:
  pnpm run validate:rpc:fix -- --env=$ENV

Validation Output:
$VALIDATION_OUTPUT

---
Automated monitoring by MUVA Chat
"

  # Send email (requires mail command to be configured)
  echo "$EMAIL_BODY" | mail -s "$EMAIL_SUBJECT" "$EMAIL_TO"

  echo "[$TIMESTAMP] ✅ Alert sent to $EMAIL_TO"
}

send_log_alert() {
  # Log to file and stderr
  LOG_FILE="/var/log/muva-rpc-monitor.log"

  ALERT_MESSAGE="
================================================================================
🚨 RPC FUNCTIONS VALIDATION FAILED
================================================================================
Environment: $ENV
Timestamp: $TIMESTAMP

Action Required:
  cd $PROJECT_DIR
  pnpm run validate:rpc:fix -- --env=$ENV

Validation Output:
$VALIDATION_OUTPUT

================================================================================
"

  # Write to log file if writable
  if [ -w "$(dirname "$LOG_FILE")" ] 2>/dev/null; then
    echo "$ALERT_MESSAGE" >> "$LOG_FILE"
    echo "[$TIMESTAMP] ✅ Alert logged to $LOG_FILE"
  else
    # Fallback to local log
    LOCAL_LOG="$PROJECT_DIR/logs/rpc-monitor.log"
    mkdir -p "$(dirname "$LOCAL_LOG")"
    echo "$ALERT_MESSAGE" >> "$LOCAL_LOG"
    echo "[$TIMESTAMP] ✅ Alert logged to $LOCAL_LOG"
  fi

  # Also output to stderr
  echo -e "${RED}$ALERT_MESSAGE${NC}" >&2
}
