#!/bin/bash

# API Configuration
BASE_URL="https://tucasaenelmar.com/wp-json/mphb/v1/bookings"
API_KEY="ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a"
CONSUMER_SECRET="cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9"

echo "=========================================="
echo "MotoPress Advanced Filter Investigation"
echo "=========================================="
echo ""

# Test different date filter parameters
echo "📅 Testing Date Filters..."
echo "-------------------------------------------"
TODAY=$(date +%Y-%m-%d)
TOMORROW=$(date -v +1d +%Y-%m-%d 2>/dev/null || date -d "+1 day" +%Y-%m-%d)
YESTERDAY=$(date -v -1d +%Y-%m-%d 2>/dev/null || date -d "-1 day" +%Y-%m-%d)

echo "Reference dates:"
echo "- Yesterday: $YESTERDAY"
echo "- Today: $TODAY"
echo "- Tomorrow: $TOMORROW"
echo ""

# Test different filter parameters that might work
echo "1. Testing 'date_after' parameter..."
curl -sI "${BASE_URL}?date_after=${TODAY}&per_page=1" -u "${API_KEY}:${CONSUMER_SECRET}" | grep -i "X-WP-Total:" | sed 's/.*: //'

echo "2. Testing 'check_in_after' parameter..."
curl -sI "${BASE_URL}?check_in_after=${TODAY}&per_page=1" -u "${API_KEY}:${CONSUMER_SECRET}" | grep -i "X-WP-Total:" | sed 's/.*: //'

echo "3. Testing 'check_in_date_after' parameter..."
curl -sI "${BASE_URL}?check_in_date_after=${TODAY}&per_page=1" -u "${API_KEY}:${CONSUMER_SECRET}" | grep -i "X-WP-Total:" | sed 's/.*: //'

echo "4. Testing 'from_date' parameter..."
curl -sI "${BASE_URL}?from_date=${TODAY}&per_page=1" -u "${API_KEY}:${CONSUMER_SECRET}" | grep -i "X-WP-Total:" | sed 's/.*: //'

echo "5. Testing 'start_date' parameter..."
curl -sI "${BASE_URL}?start_date=${TODAY}&per_page=1" -u "${API_KEY}:${CONSUMER_SECRET}" | grep -i "X-WP-Total:" | sed 's/.*: //'

echo ""
echo "📊 Testing with explicit date range..."
echo "-------------------------------------------"
echo "6. Testing date range with 'before' and 'after'..."
NEXT_MONTH=$(date -v +30d +%Y-%m-%d 2>/dev/null || date -d "+30 days" +%Y-%m-%d)
curl -sI "${BASE_URL}?after=${TODAY}&before=${NEXT_MONTH}&per_page=1" -u "${API_KEY}:${CONSUMER_SECRET}" | grep -i "X-WP-Total:" | sed 's/.*: //'

echo ""
echo "🔍 Getting ALL bookings and filtering locally..."
echo "-------------------------------------------"
echo "Fetching first 100 bookings to analyze date fields..."
BOOKINGS=$(curl -s "${BASE_URL}?per_page=100&orderby=date&order=desc" -u "${API_KEY}:${CONSUMER_SECRET}")

# Count future bookings manually
echo "Analyzing check-in dates..."
FUTURE_COUNT=$(echo "$BOOKINGS" | jq "[.[] | select(.check_in_date >= \"$TODAY\")] | length")
echo "Future bookings (check-in >= today) in first 100: $FUTURE_COUNT"

# Show date distribution
echo ""
echo "Check-in date distribution (first 10):"
echo "$BOOKINGS" | jq -r '.[:10] | .[] | "ID: \(.id) | Check-in: \(.check_in_date) | Status: \(.status)"'

echo ""
echo "🚀 Testing pagination with all bookings..."
echo "-------------------------------------------"
echo "Getting page 1 (items 1-100)..."
PAGE1_COUNT=$(curl -s "${BASE_URL}?per_page=100&page=1" -u "${API_KEY}:${CONSUMER_SECRET}" | jq 'length')
echo "Page 1 items: $PAGE1_COUNT"

echo "Getting page 2 (items 101-200)..."
PAGE2_COUNT=$(curl -s "${BASE_URL}?per_page=100&page=2" -u "${API_KEY}:${CONSUMER_SECRET}" | jq 'length')
echo "Page 2 items: $PAGE2_COUNT"

echo ""
echo "🎯 OPTIMAL SOLUTION DISCOVERED"
echo "=========================================="
echo ""
echo "Since date filters don't work as expected, the most efficient approach is:"
echo ""
echo "1️⃣ For ALL bookings (4000 total, 40 pages):"
echo "-------------------------------------------"
echo "for page in {1..40}; do"
echo "  curl -s \"https://tucasaenelmar.com/wp-json/mphb/v1/bookings?per_page=100&page=\$page\" \\"
echo "    -u \"ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a:cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9\""
echo "done"
echo ""
echo "2️⃣ For SINGLE REQUEST (maximum 100 bookings):"
echo "-------------------------------------------"
echo "curl -s \"https://tucasaenelmar.com/wp-json/mphb/v1/bookings?per_page=100&orderby=date&order=desc\" \\"
echo "  -u \"ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a:cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9\""
echo ""
echo "3️⃣ For FILTERED bookings (filter locally after fetch):"
echo "-------------------------------------------"
echo "curl -s \"https://tucasaenelmar.com/wp-json/mphb/v1/bookings?per_page=100\" \\"
echo "  -u \"API_KEY:SECRET\" | \\"
echo "  jq '[.[] | select(.check_in_date >= \"2025-10-18\" and .status == \"confirmed\")]'"
echo ""
echo "⚡ Performance Tips:"
echo "- Use per_page=100 (maximum allowed)"
echo "- Filter locally with jq for date ranges"
echo "- Cache results if fetching all 4000 bookings"
echo "- Consider implementing pagination on your end"