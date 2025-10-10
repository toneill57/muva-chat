#!/bin/bash

# Subdomain Middleware Integration Test Script
# This script validates the complete subdomain detection system

set -e

echo "==============================================="
echo "🧪 SUBDOMAIN MIDDLEWARE INTEGRATION TESTS"
echo "==============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local host_header="$2"
    local expected_subdomain="$3"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -e "${YELLOW}Test $TOTAL_TESTS: $test_name${NC}"
    echo "Host: $host_header"

    # Run the request
    RESPONSE=$(curl -s -H "Host: $host_header" http://localhost:3000/api/test-subdomain)

    # Extract subdomain from response
    ACTUAL_SUBDOMAIN=$(echo "$RESPONSE" | jq -r '.subdomain')

    # Compare results
    if [ "$ACTUAL_SUBDOMAIN" == "$expected_subdomain" ]; then
        echo -e "${GREEN}✅ PASS${NC} - Expected: $expected_subdomain, Got: $ACTUAL_SUBDOMAIN"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAIL${NC} - Expected: $expected_subdomain, Got: $ACTUAL_SUBDOMAIN"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo "Full response: $RESPONSE"
    fi

    echo ""
}

# Check if server is running
if ! curl -s http://localhost:3000/api/test-subdomain > /dev/null 2>&1; then
    echo -e "${RED}❌ ERROR: Development server is not running on port 3000${NC}"
    echo ""
    echo "Please start the server first:"
    echo "  ./scripts/dev-with-keys.sh"
    echo ""
    exit 1
fi

echo "✅ Server is running on port 3000"
echo ""

# Run all test cases
run_test "Valid subdomain (simmerdown.localhost)" "simmerdown.localhost:3000" "simmerdown"
run_test "Valid subdomain with hyphens (free-hotel-test.localhost)" "free-hotel-test.localhost:3000" "free-hotel-test"
run_test "No subdomain (localhost)" "localhost:3000" "null"
run_test "WWW subdomain (should be treated as null)" "www.innpilot.io" "null"
run_test "Production subdomain (simmerdown.innpilot.io)" "simmerdown.innpilot.io" "simmerdown"
run_test "Invalid subdomain - uppercase (should be rejected)" "INVALID.localhost:3000" "null"
run_test "Complex subdomain (my-hotel-123.localhost)" "my-hotel-123.localhost:3000" "my-hotel-123"
run_test "Main domain (innpilot.io)" "innpilot.io" "null"

# Summary
echo "==============================================="
echo "📊 TEST SUMMARY"
echo "==============================================="
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}✅ Passed: $PASSED_TESTS${NC}"
echo -e "${RED}❌ Failed: $FAILED_TESTS${NC}"
echo "Success Rate: $(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)%"
echo "==============================================="
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️ SOME TESTS FAILED!${NC}"
    echo ""
    exit 1
fi
