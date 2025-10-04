#!/bin/bash
#
# Manual Test Script: Conversation Memory Compression
#
# This script sends test messages to trigger auto-compression
# and outputs SQL queries to manually verify the results.
#
# USAGE:
#   ./scripts/test-conversation-compression.sh [tenant_id]
#
# EXAMPLES:
#   ./scripts/test-conversation-compression.sh                # Uses 'simmerdown' (default)
#   ./scripts/test-conversation-compression.sh my-hotel       # Uses 'my-hotel'
#   TENANT_ID=custom ./scripts/test-conversation-compression.sh  # Uses env var
#
# REQUIREMENTS:
#   - Development server running (./scripts/dev-with-keys.sh)
#   - curl installed
#   - jq installed (optional, for pretty JSON)
#

set -e

API_URL="http://localhost:3000/api/dev/chat"

# Get tenant_id from: 1) CLI arg, 2) env var, 3) default to 'simmerdown'
TENANT_ID="${1:-${TENANT_ID:-simmerdown}}"

echo "======================================"
echo "Conversation Memory Compression Test"
echo "======================================"
echo -e "${CYAN}Tenant ID: $TENANT_ID${NC}"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test 1: Create session and send 18 messages (no compression)
echo -e "${CYAN}TEST 1: Sending 18 messages (should NOT compress)${NC}"
echo ""

# Create session
echo "Creating session..."
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Hello, starting test\", \"tenant_id\": \"$TENANT_ID\"}")

SESSION_ID=$(echo "$RESPONSE" | jq -r '.data.session_id')

if [ "$SESSION_ID" = "null" ] || [ -z "$SESSION_ID" ]; then
  echo "ERROR: Failed to create session"
  echo "$RESPONSE" | jq '.'
  exit 1
fi

echo -e "${GREEN}✓ Session created: $SESSION_ID${NC}"
echo ""

# Send 8 more messages (16 more = 18 total)
echo "Sending 8 more messages..."
for i in {2..9}; do
  curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"Test message $i\", \"session_id\": \"$SESSION_ID\", \"tenant_id\": \"$TENANT_ID\"}" \
    > /dev/null
  echo -n "."
done
echo ""
echo -e "${GREEN}✓ 18 messages sent${NC}"
echo ""

# Wait a bit
sleep 2

echo -e "${YELLOW}Verification SQL:${NC}"
echo ""
echo "-- Check conversation_memory (should be 0 rows)"
echo "SELECT COUNT(*) FROM conversation_memory WHERE session_id = '$SESSION_ID';"
echo ""
echo "-- Check conversation_history length (should be 18)"
echo "SELECT array_length(conversation_history, 1) FROM prospective_sessions WHERE session_id = '$SESSION_ID';"
echo ""
echo "======================================"
echo ""

# Test 2: Send 2 more messages to trigger compression
echo -e "${CYAN}TEST 2: Sending 2 more messages (should trigger compression at 20)${NC}"
echo ""

# Create new session
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Hello, test for compression\", \"tenant_id\": \"$TENANT_ID\"}")

SESSION_ID_2=$(echo "$RESPONSE" | jq -r '.data.session_id')
echo -e "${GREEN}✓ Session created: $SESSION_ID_2${NC}"

# Send 9 more messages (18 more = 20 total)
echo "Sending 9 messages to reach 20 total..."
for i in {2..10}; do
  curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"Message $i about beachfront apartments\", \"session_id\": \"$SESSION_ID_2\", \"tenant_id\": \"$TENANT_ID\"}" \
    > /dev/null
  echo -n "."
done
echo ""
echo -e "${GREEN}✓ 20 messages sent (compression should trigger)${NC}"
echo ""

# Wait for async compression
echo "Waiting 5 seconds for compression to complete..."
sleep 5

echo -e "${YELLOW}Verification SQL:${NC}"
echo ""
echo "-- Check conversation_memory (should be 1 row)"
echo "SELECT message_range, message_count, length(summary_text), array_length(embedding_fast, 1) FROM conversation_memory WHERE session_id = '$SESSION_ID_2';"
echo ""
echo "-- Check conversation_history length (should be 10)"
echo "SELECT array_length(conversation_history, 1) FROM prospective_sessions WHERE session_id = '$SESSION_ID_2';"
echo ""
echo "-- View summary"
echo "SELECT summary_text, key_entities FROM conversation_memory WHERE session_id = '$SESSION_ID_2';"
echo ""
echo "======================================"
echo ""

# Test 3: Continue to 30 messages
echo -e "${CYAN}TEST 3: Sending 10 more messages (should trigger second compression at 30)${NC}"
echo ""

# Send 10 more messages
echo "Sending 10 more messages..."
for i in {11..20}; do
  curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"Message $i about pricing\", \"session_id\": \"$SESSION_ID_2\", \"tenant_id\": \"$TENANT_ID\"}" \
    > /dev/null
  echo -n "."
done
echo ""
echo -e "${GREEN}✓ 30 total messages sent${NC}"
echo ""

# Wait for compression
echo "Waiting 5 seconds for second compression..."
sleep 5

echo -e "${YELLOW}Verification SQL:${NC}"
echo ""
echo "-- Check conversation_memory (should be 2 rows)"
echo "SELECT message_range, message_count, created_at FROM conversation_memory WHERE session_id = '$SESSION_ID_2' ORDER BY created_at;"
echo ""
echo "-- Check conversation_history length (should be 10)"
echo "SELECT array_length(conversation_history, 1) FROM prospective_sessions WHERE session_id = '$SESSION_ID_2';"
echo ""
echo "-- Verify total coverage (should be 30)"
echo "SELECT "
echo "  (SELECT SUM(message_count) FROM conversation_memory WHERE session_id = '$SESSION_ID_2') as compressed,"
echo "  (SELECT array_length(conversation_history, 1) FROM prospective_sessions WHERE session_id = '$SESSION_ID_2') as active;"
echo ""
echo "======================================"
echo ""

echo -e "${GREEN}Tests complete!${NC}"
echo ""
echo "Test sessions created:"
echo "  1. $SESSION_ID (18 messages)"
echo "  2. $SESSION_ID_2 (30 messages)"
echo ""
echo "To cleanup test data, run:"
echo "  DELETE FROM conversation_memory WHERE session_id IN ('$SESSION_ID', '$SESSION_ID_2');"
echo "  DELETE FROM prospective_sessions WHERE session_id IN ('$SESSION_ID', '$SESSION_ID_2');"
echo ""
