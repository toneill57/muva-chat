#!/bin/bash

#
# Health Check Cron Job
# Runs daily to verify guest chat system health
# Sends Slack alert if unhealthy
#

set -euo pipefail

# Configuration
HEALTH_ENDPOINT="https://simmerdown.house/api/health/guest-chat"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
LOG_FILE="/var/log/muva-chat/health-check.log"

# Create log directory if not exists
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log with timestamp
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Function to send Slack alert
send_alert() {
  local status="$1"
  local message="$2"

  if [ -z "$SLACK_WEBHOOK_URL" ]; then
    log "WARN: No Slack webhook configured, skipping alert"
    return
  fi

  local emoji=""
  local color=""

  case "$status" in
    healthy)
      emoji=":white_check_mark:"
      color="good"
      ;;
    degraded)
      emoji=":warning:"
      color="warning"
      ;;
    unhealthy)
      emoji=":x:"
      color="danger"
      ;;
  esac

  local payload=$(cat <<EOF
{
  "attachments": [
    {
      "color": "$color",
      "title": "$emoji Guest Chat Health Check",
      "text": "$message",
      "footer": "MUVA Chat Monitoring",
      "ts": $(date +%s)
    }
  ]
}
EOF
)

  curl -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d "$payload" \
    --silent --show-error
}

# Main execution
log "Starting health check..."

# Fetch health status
HTTP_CODE=$(curl -s -o /tmp/health-response.json -w "%{http_code}" "$HEALTH_ENDPOINT")
RESPONSE=$(cat /tmp/health-response.json)

log "HTTP Code: $HTTP_CODE"
log "Response: $RESPONSE"

# Parse status
STATUS=$(echo "$RESPONSE" | jq -r '.status')
DURATION=$(echo "$RESPONSE" | jq -r '.duration')
CHECKS=$(echo "$RESPONSE" | jq -r '.checks')

log "Status: $STATUS (took ${DURATION}ms)"

# Alert logic
if [ "$STATUS" = "unhealthy" ]; then
  log "CRITICAL: System is unhealthy!"

  # Build failure details
  FAILED_CHECKS=$(echo "$CHECKS" | jq -r '.[] | select(.status == "unhealthy") | .name')
  FAILURE_MSG="Guest chat system is UNHEALTHY.\n\nFailed checks:\n$FAILED_CHECKS\n\nSee logs: $LOG_FILE"

  send_alert "unhealthy" "$FAILURE_MSG"

  exit 1

elif [ "$STATUS" = "degraded" ]; then
  log "WARNING: System is degraded"

  DEGRADED_CHECKS=$(echo "$CHECKS" | jq -r '.[] | select(.status == "degraded") | .name')
  DEGRADED_MSG="Guest chat system is DEGRADED.\n\nDegraded checks:\n$DEGRADED_CHECKS\n\nInvestigate: $LOG_FILE"

  send_alert "degraded" "$DEGRADED_MSG"

  exit 0

else
  log "SUCCESS: System is healthy"
  # Optionally send daily success notification
  # send_alert "healthy" "Guest chat system is healthy. All checks passed."
  exit 0
fi
