#!/bin/bash
TOKEN=$(node scripts/get-super-admin-token.js)
curl -s http://localhost:3000/api/super-admin/settings \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "maintenanceMode": false,
    "globalAnnouncement": "",
    "maxFileSize": 10,
    "defaultModel": "claude-sonnet-4-5"
  }'
