#!/bin/bash

echo "========================================="
echo "Test 1: GET /api/super-admin/metrics without token"
echo "========================================="
curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:3000/api/super-admin/metrics
echo ""
echo ""

echo "========================================="
echo "Test 2: Login and get token"
echo "========================================="
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST http://localhost:3000/api/super-admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"oneill","password":"rabbitHole0+"}'
echo ""
echo ""

echo "Note: If login succeeded, run manually:"
echo 'TOKEN="<paste token here>"'
echo 'curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/super-admin/metrics'
