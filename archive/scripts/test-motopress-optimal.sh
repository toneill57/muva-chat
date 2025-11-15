#!/bin/bash

# API Configuration
BASE_URL="https://tucasaenelmar.com/wp-json/mphb/v1/bookings"
API_KEY="ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a"
CONSUMER_SECRET="cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9"

echo "=========================================="
echo "MotoPress Bookings API - Optimal Retrieval"
echo "=========================================="
echo ""

# Step 1: Get total count of bookings
echo "📊 Step 1: Checking total number of bookings..."
echo "-------------------------------------------"
HEADERS=$(curl -sI "${BASE_URL}?per_page=1" -u "${API_KEY}:${CONSUMER_SECRET}")
TOTAL=$(echo "$HEADERS" | grep -i "X-WP-Total:" | sed 's/[^0-9]*//g' | tr -d '\r')
TOTAL_PAGES=$(echo "$HEADERS" | grep -i "X-WP-TotalPages:" | sed 's/[^0-9]*//g' | tr -d '\r')

echo "Total bookings: $TOTAL"
echo "Total pages (at per_page=1): $TOTAL_PAGES"
echo ""

# Step 2: Test maximum per_page limit (WordPress allows up to 100)
echo "🚀 Step 2: Testing maximum items per page..."
echo "-------------------------------------------"
echo "Testing per_page=100 (WordPress maximum)..."
RESPONSE=$(curl -s "${BASE_URL}?per_page=100" -u "${API_KEY}:${CONSUMER_SECRET}")
ITEMS_RETURNED=$(echo "$RESPONSE" | jq 'length')
echo "Items returned with per_page=100: $ITEMS_RETURNED"

HEADERS_100=$(curl -sI "${BASE_URL}?per_page=100" -u "${API_KEY}:${CONSUMER_SECRET}")
PAGES_100=$(echo "$HEADERS_100" | grep -i "X-WP-TotalPages:" | sed 's/[^0-9]*//g' | tr -d '\r')
echo "Total pages needed with per_page=100: $PAGES_100"
echo ""

# Step 3: Get future bookings only
echo "📅 Step 3: Testing filters for future bookings..."
echo "-------------------------------------------"
TODAY=$(date +%Y-%m-%d)
echo "Today's date: $TODAY"
echo ""

# Test 'after' parameter (bookings with check-in after today)
echo "Testing 'after' parameter (check-in after today)..."
FUTURE_RESPONSE=$(curl -s "${BASE_URL}?after=${TODAY}&per_page=100" -u "${API_KEY}:${CONSUMER_SECRET}")
FUTURE_COUNT=$(echo "$FUTURE_RESPONSE" | jq 'length')
echo "Bookings with check-in after today: $FUTURE_COUNT"

# Get total count for future bookings
FUTURE_HEADERS=$(curl -sI "${BASE_URL}?after=${TODAY}&per_page=100" -u "${API_KEY}:${CONSUMER_SECRET}")
FUTURE_TOTAL=$(echo "$FUTURE_HEADERS" | grep -i "X-WP-Total:" | sed 's/[^0-9]*//g' | tr -d '\r')
FUTURE_PAGES=$(echo "$FUTURE_HEADERS" | grep -i "X-WP-TotalPages:" | sed 's/[^0-9]*//g' | tr -d '\r')
echo "Total future bookings: $FUTURE_TOTAL"
echo "Pages needed for future bookings: $FUTURE_PAGES"
echo ""

# Step 4: Test status filters
echo "📋 Step 4: Testing status filters..."
echo "-------------------------------------------"
STATUSES=("confirmed" "pending" "cancelled" "completed")

for status in "${STATUSES[@]}"; do
  echo -n "Status '$status': "
  STATUS_HEADERS=$(curl -sI "${BASE_URL}?status=${status}&per_page=1" -u "${API_KEY}:${CONSUMER_SECRET}")
  STATUS_COUNT=$(echo "$STATUS_HEADERS" | grep -i "X-WP-Total:" | sed 's/[^0-9]*//g' | tr -d '\r')
  echo "$STATUS_COUNT bookings"
done
echo ""

# Step 5: Combine filters for optimal query
echo "✅ Step 5: Testing optimal combined filters..."
echo "-------------------------------------------"
echo "Getting confirmed future bookings (most relevant)..."
OPTIMAL_RESPONSE=$(curl -s "${BASE_URL}?after=${TODAY}&status=confirmed&per_page=100" -u "${API_KEY}:${CONSUMER_SECRET}")
OPTIMAL_COUNT=$(echo "$OPTIMAL_RESPONSE" | jq 'length')

OPTIMAL_HEADERS=$(curl -sI "${BASE_URL}?after=${TODAY}&status=confirmed&per_page=100" -u "${API_KEY}:${CONSUMER_SECRET}")
OPTIMAL_TOTAL=$(echo "$OPTIMAL_HEADERS" | grep -i "X-WP-Total:" | sed 's/[^0-9]*//g' | tr -d '\r')
OPTIMAL_PAGES=$(echo "$OPTIMAL_HEADERS" | grep -i "X-WP-TotalPages:" | sed 's/[^0-9]*//g' | tr -d '\r')

echo "Confirmed future bookings: $OPTIMAL_TOTAL"
echo "Pages needed: $OPTIMAL_PAGES"
echo ""

# Step 6: Test orderby parameter for most recent first
echo "🔄 Step 6: Testing ordering parameters..."
echo "-------------------------------------------"
echo "Testing orderby=date with order=desc (most recent first)..."
ORDERED_RESPONSE=$(curl -s "${BASE_URL}?orderby=date&order=desc&per_page=5" -u "${API_KEY}:${CONSUMER_SECRET}")
echo "First 5 bookings (most recent):"
echo "$ORDERED_RESPONSE" | jq -r '.[] | "ID: \(.id) | Check-in: \(.check_in_date) | Status: \(.status)"' 2>/dev/null || echo "No bookings found"
echo ""

# Step 7: Show optimal solution
echo "=========================================="
echo "🎯 OPTIMAL SOLUTION"
echo "=========================================="
echo ""
echo "Most efficient command for ALL bookings:"
echo "----------------------------------------"
echo 'curl -s "https://tucasaenelmar.com/wp-json/mphb/v1/bookings?per_page=100" \'
echo '  -u "ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a:cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9"'
echo ""
echo "For bookings across multiple pages, iterate with &page=N"
echo ""
echo "Most efficient command for FUTURE CONFIRMED bookings:"
echo "-----------------------------------------------------"
echo "curl -s \"https://tucasaenelmar.com/wp-json/mphb/v1/bookings?after=${TODAY}&status=confirmed&per_page=100\" \\"
echo '  -u "ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a:cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9"'
echo ""

# Step 8: Performance comparison
echo "📊 PERFORMANCE ANALYSIS"
echo "=========================================="
echo "Method 1 - No filters: $TOTAL bookings in $PAGES_100 requests"
echo "Method 2 - Future only: $FUTURE_TOTAL bookings in $FUTURE_PAGES requests"
echo "Method 3 - Future confirmed: $OPTIMAL_TOTAL bookings in $OPTIMAL_PAGES requests"
echo ""
echo "✅ Recommendation: Use Method 3 for production (future confirmed bookings)"
echo "   - Reduces data transfer by filtering irrelevant bookings"
echo "   - Uses maximum per_page=100 for fewer requests"
echo "   - Filters by status to get only actionable bookings"
echo ""

# Step 9: Show sample booking structure
echo "📄 Sample Booking Structure:"
echo "-------------------------------------------"
if [ "$OPTIMAL_COUNT" -gt 0 ]; then
  echo "$OPTIMAL_RESPONSE" | jq '.[0]' 2>/dev/null || echo "No bookings to show"
else
  echo "No future confirmed bookings found. Showing any available booking:"
  curl -s "${BASE_URL}?per_page=1" -u "${API_KEY}:${CONSUMER_SECRET}" | jq '.[0]' 2>/dev/null || echo "No bookings available"
fi