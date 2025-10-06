#!/bin/bash
# Post-Tool-Use Error Detector Hook
# Captura errores automáticamente después de cada tool call
# y los registra en .claude/errors.jsonl para análisis posterior

# Input parameters from Claude Code
TOOL_NAME="${1:-unknown}"
TOOL_OUTPUT="${2:-}"
EXIT_CODE="${3:-0}"

# Timestamp ISO 8601
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Error log file
ERROR_LOG=".claude/errors.jsonl"

# Ensure .claude directory exists
mkdir -p .claude

# Function to escape JSON strings
escape_json() {
  echo "$1" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | tr '\n' ' '
}

# Detect errors
ERROR_DETECTED=false
ERROR_TYPE=""
ERROR_DETAILS=""

# 1. Check exit code
if [ "$EXIT_CODE" -ne 0 ]; then
  ERROR_DETECTED=true
  ERROR_TYPE="exit_code"
  ERROR_DETAILS="Exit code: $EXIT_CODE"
fi

# 2. Check for error keywords in output
if echo "$TOOL_OUTPUT" | grep -qi "error\|failed\|exception\|not found\|cannot\|invalid"; then
  ERROR_DETECTED=true
  if [ -z "$ERROR_TYPE" ]; then
    ERROR_TYPE="keyword_match"
  fi
  # Extract first line with error
  ERROR_LINE=$(echo "$TOOL_OUTPUT" | grep -i "error\|failed\|exception\|not found\|cannot\|invalid" | head -n 1)
  ERROR_DETAILS="${ERROR_DETAILS}${ERROR_DETAILS:+ | }${ERROR_LINE}"
fi

# 3. Log error if detected
if [ "$ERROR_DETECTED" = true ]; then
  ESCAPED_OUTPUT=$(escape_json "$TOOL_OUTPUT")
  ESCAPED_DETAILS=$(escape_json "$ERROR_DETAILS")

  echo "{\"timestamp\":\"$TIMESTAMP\",\"tool\":\"$TOOL_NAME\",\"type\":\"$ERROR_TYPE\",\"exit_code\":$EXIT_CODE,\"details\":\"$ESCAPED_DETAILS\",\"output\":\"${ESCAPED_OUTPUT:0:500}\"}" >> "$ERROR_LOG"

  # Keep only last 100 errors (prevent file from growing indefinitely)
  if [ -f "$ERROR_LOG" ]; then
    tail -n 100 "$ERROR_LOG" > "$ERROR_LOG.tmp" && mv "$ERROR_LOG.tmp" "$ERROR_LOG"
  fi
fi

# Exit successfully (don't block Claude's workflow)
exit 0
