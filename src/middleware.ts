import { NextRequest, NextResponse } from 'next/server'
import { getSubdomain, isValidSubdomain } from '@/lib/tenant-utils'

const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100 // 100 requests per minute for MotoPress sync
const MOTOPRESS_MAX_REQUESTS = 300 // Higher limit for MotoPress endpoints

interface RateLimitInfo {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitInfo>()

function getClientId(request: NextRequest): string {
  // Get IP from various headers (for production deployment)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
           request.headers.get('x-real-ip') ||
           'unknown'

  return ip
}

function isRateLimited(clientId: string, pathname: string): boolean {
  const now = Date.now()
  const clientInfo = rateLimitStore.get(clientId)

  // Higher limits for specific endpoint types
  const isMotoPress = pathname.includes('/api/integrations/motopress')
  const isChatEndpoint = pathname.includes('/api/chat')
  const limit = isMotoPress ? MOTOPRESS_MAX_REQUESTS :
               isChatEndpoint ? 50 : // More generous for chat endpoints
               MAX_REQUESTS_PER_WINDOW

  if (!clientInfo || now > clientInfo.resetTime) {
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    })
    return false
  }

  if (clientInfo.count >= limit) {
    return true
  }

  clientInfo.count++
  rateLimitStore.set(clientId, clientInfo)
  return false
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Only add CSP for API routes
  if (response.url.includes('/api/')) {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'none'; object-src 'none'"
    )
  }

  return response
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 🌐 SUBDOMAIN DETECTION (for multi-tenant routing)
  // Extract subdomain from Nginx header (production) or hostname (local dev)
  const hostname = request.headers.get('host') || request.nextUrl.hostname
  const nginxSubdomain = request.headers.get('x-tenant-subdomain')

  // Use Nginx header if available (production), otherwise extract from hostname
  let subdomain = nginxSubdomain || getSubdomain(hostname)

  // Validate subdomain format (lowercase, alphanumeric, hyphens only)
  const validSubdomain = subdomain && isValidSubdomain(subdomain) ? subdomain : null

  console.log('[middleware] Subdomain detected:', validSubdomain || 'none', '(from:', nginxSubdomain ? 'nginx-header' : 'hostname', ')')

  // Create new headers with tenant context
  const requestHeaders = new Headers(request.headers)

  // Always inject subdomain header for API routes and server components
  // Set to valid subdomain string or empty string (never undefined)
  requestHeaders.set('x-tenant-subdomain', validSubdomain || '')

  // Only apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    const clientId = getClientId(request)

    if (isRateLimited(clientId, pathname)) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: 60
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': MAX_REQUESTS_PER_WINDOW.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil((Date.now() + RATE_LIMIT_WINDOW) / 1000).toString()
          }
        }
      )
    }

    // Add rate limit headers to successful responses
    const clientInfo = rateLimitStore.get(clientId)
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })

    if (clientInfo) {
      response.headers.set('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString())
      response.headers.set('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS_PER_WINDOW - clientInfo.count).toString())
      response.headers.set('X-RateLimit-Reset', Math.ceil(clientInfo.resetTime / 1000).toString())
    }

    return addSecurityHeaders(response)
  }

  // Set subdomain cookie for client-side access (non-API routes)
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  if (validSubdomain) {
    response.cookies.set('tenant_subdomain', validSubdomain, {
      httpOnly: false, // Accessible by client JS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
  }

  // Add security headers to all responses
  return addSecurityHeaders(response)
}

export const config = {
  matcher: [
    // Match all API routes
    '/api/(.*)',
    // Match all routes except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}