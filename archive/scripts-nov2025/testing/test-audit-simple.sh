#!/bin/bash

# Simple audit log test
echo "Testing audit log endpoint directly..."

# Use the existing dev server on localhost:3000
# Generate a simple token for testing (not production-ready)

curl -X GET "http://localhost:3000/api/super-admin/audit-log?page=1&limit=5" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdXBlckFkbWluSWQiOiI5OTk5OTk5OS05OTk5LTk5OTktOTk5OS05OTk5OTk5OTk5OTkiLCJ1c2VybmFtZSI6Im9uZWlsbCIsImZ1bGxOYW1lIjoiT25laWxsIEFkbWluIiwiaWF0IjoxNzMyNjg5NDYxLCJleHAiOjE3MzI3NzU4NjF9.lGO4mEnzyR2rHjDp05KRO5y8-jLO4GZl9Mq1R6XDVN0" \
  -s | jq '.'
