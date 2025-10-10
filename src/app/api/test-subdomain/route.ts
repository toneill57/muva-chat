/**
 * Test Subdomain Detection Endpoint
 *
 * This endpoint validates that the middleware correctly detects and injects
 * the x-tenant-subdomain header from the request hostname.
 *
 * Usage:
 *   curl -H "Host: simmerdown.localhost:3000" http://localhost:3000/api/test-subdomain
 *   curl -H "Host: free-hotel-test.localhost:3000" http://localhost:3000/api/test-subdomain
 *   curl -H "Host: localhost:3000" http://localhost:3000/api/test-subdomain
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const subdomain = req.headers.get('x-tenant-subdomain');
  const hostname = req.headers.get('host');

  return NextResponse.json({
    subdomain: subdomain || null,
    hostname,
    message: subdomain
      ? `✅ Subdomain detected: ${subdomain}`
      : '❌ No subdomain detected (main domain or invalid format)',
    debug: {
      allHeaders: Object.fromEntries(req.headers.entries()),
    },
  });
}
