#!/bin/bash

# MUVA Chat Deployment Verification Script
# Run this script on VPS after deployment to verify all systems are working

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="muva.chat"
TENANTS=("simmerdown" "xyz" "hotel-boutique")

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MUVA Chat Deployment Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Task 6.5: Verify Wildcard DNS
echo -e "${YELLOW}📡 Task 6.5: Verifying Wildcard DNS...${NC}"
echo ""

dns_success=0
dns_total=${#TENANTS[@]}

for tenant in "${TENANTS[@]}"; do
    subdomain="${tenant}.${DOMAIN}"
    echo -n "Testing ${subdomain}... "

    if dig +short "$subdomain" | grep -q '^[0-9]'; then
        ip=$(dig +short "$subdomain" | head -1)
        echo -e "${GREEN}✓ Resolves to ${ip}${NC}"
        ((dns_success++))
    else
        echo -e "${RED}✗ DNS resolution failed${NC}"
    fi
done

echo ""
echo -e "DNS Resolution: ${dns_success}/${dns_total} tenants"
echo ""

# Task 6.5: Verify HTTP/HTTPS Access
echo -e "${YELLOW}🌐 Task 6.5: Verifying HTTP/HTTPS Access...${NC}"
echo ""

http_success=0
http_total=${#TENANTS[@]}

for tenant in "${TENANTS[@]}"; do
    url="https://${tenant}.${DOMAIN}/chat"
    echo -n "Testing ${url}... "

    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")

    if [ "$status_code" = "200" ]; then
        echo -e "${GREEN}✓ HTTP ${status_code}${NC}"
        ((http_success++))
    else
        echo -e "${RED}✗ HTTP ${status_code}${NC}"
    fi
done

echo ""
echo -e "HTTP Access: ${http_success}/${http_total} tenants"
echo ""

# Task 6.7: Performance Testing
echo -e "${YELLOW}⚡ Task 6.7: Performance Testing...${NC}"
echo ""

perf_pass=0
perf_total=0

for tenant in "${TENANTS[@]}"; do
    url="https://${tenant}.${DOMAIN}/chat"
    echo -n "Testing ${url} load time... "

    # Measure total time
    total_time=$(curl -w "%{time_total}" -s -o /dev/null "$url")

    # Convert to milliseconds for comparison
    total_ms=$(echo "$total_time * 1000" | bc)

    if (( $(echo "$total_time < 1.0" | bc -l) )); then
        echo -e "${GREEN}✓ ${total_time}s (< 1s target)${NC}"
        ((perf_pass++))
    else
        echo -e "${YELLOW}⚠ ${total_time}s (> 1s target)${NC}"
    fi

    ((perf_total++))
done

echo ""
echo -e "Performance: ${perf_pass}/${perf_total} endpoints < 1s"
echo ""

# Task 6.7: Chat API Performance
echo -e "${YELLOW}💬 Task 6.7: Chat API Response Time...${NC}"
echo ""

api_pass=0
api_total=0

for tenant in "${TENANTS[@]}"; do
    url="https://${tenant}.${DOMAIN}/api/tenant-chat"
    echo -n "Testing ${url}... "

    # Measure chat API response time
    response_time=$(curl -w "%{time_total}" -s -o /dev/null \
        -X POST "$url" \
        -H "Content-Type: application/json" \
        -d '{"message":"test","history":[]}')

    if (( $(echo "$response_time < 2.0" | bc -l) )); then
        echo -e "${GREEN}✓ ${response_time}s (< 2s target)${NC}"
        ((api_pass++))
    else
        echo -e "${YELLOW}⚠ ${response_time}s (> 2s target)${NC}"
    fi

    ((api_total++))
done

echo ""
echo -e "Chat API: ${api_pass}/${api_total} endpoints < 2s"
echo ""

# Health Check
echo -e "${YELLOW}🏥 Health Check: Main API...${NC}"
echo ""

health_url="https://${DOMAIN}/api/health"
echo -n "Testing ${health_url}... "

health_response=$(curl -s "$health_url")
health_status=$(echo "$health_response" | jq -r '.status' 2>/dev/null || echo "error")

if [ "$health_status" = "ok" ]; then
    echo -e "${GREEN}✓ Healthy${NC}"
    echo -e "   Response: ${health_response}"
else
    echo -e "${RED}✗ Unhealthy${NC}"
fi

echo ""

# PM2 Status
echo -e "${YELLOW}📊 PM2 Process Status...${NC}"
echo ""

if command -v pm2 &> /dev/null; then
    pm2 status muva-chat
else
    echo -e "${RED}✗ PM2 not found (run on VPS)${NC}"
fi

echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Deployment Verification Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

total_checks=$((dns_total + http_total + perf_total + api_total + 1))
total_passed=$((dns_success + http_success + perf_pass + api_pass))

if [ "$health_status" = "ok" ]; then
    ((total_passed++))
fi

echo -e "DNS Resolution:    ${dns_success}/${dns_total} ✓"
echo -e "HTTP Access:       ${http_success}/${http_total} ✓"
echo -e "Page Load < 1s:    ${perf_pass}/${perf_total} ✓"
echo -e "Chat API < 2s:     ${api_pass}/${api_total} ✓"
echo -e "Health Check:      $([ "$health_status" = "ok" ] && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}")"
echo ""
echo -e "Total:             ${total_passed}/${total_checks} checks passed"
echo ""

# Final verdict
if [ "$total_passed" -eq "$total_checks" ]; then
    echo -e "${GREEN}🎉 All deployment checks PASSED!${NC}"
    exit 0
elif [ "$total_passed" -ge $((total_checks * 2 / 3)) ]; then
    echo -e "${YELLOW}⚠️  Deployment partially successful (${total_passed}/${total_checks})${NC}"
    exit 1
else
    echo -e "${RED}❌ Deployment verification FAILED (${total_passed}/${total_checks})${NC}"
    exit 2
fi
