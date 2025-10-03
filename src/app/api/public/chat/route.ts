/**
 * Public Chat API Endpoint
 *
 * Handles chat requests from anonymous/public visitors.
 * NO authentication required.
 */

import { NextRequest, NextResponse } from 'next/server'
import { generatePublicChatResponse } from '@/lib/public-chat-engine'

// ============================================================================
// Rate Limiting (Simple In-Memory)
// ============================================================================

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory rate limit store (IP -> entry)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  const entries = Array.from(rateLimitStore.entries())
  for (const [ip, entry] of entries) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(ip)
    }
  }
}, 5 * 60 * 1000)

/**
 * Check rate limit for IP address
 * Limit: 10 requests per minute
 */
function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const limit = 10
  const windowMs = 60 * 1000 // 1 minute

  const entry = rateLimitStore.get(ip)

  if (!entry || now > entry.resetAt) {
    // New window
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + windowMs,
    })
    return { allowed: true, remaining: limit - 1 }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count }
}

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  // Try various headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fallback (not reliable in production)
  return 'unknown'
}

// ============================================================================
// API Handler
// ============================================================================

/**
 * POST /api/public/chat
 *
 * No authentication required
 * Rate limited: 10 requests/minute per IP
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Get client IP for rate limiting
    const clientIP = getClientIP(request)
    console.log('[public-chat-api] Request from IP:', clientIP)

    // Check rate limit
    const rateLimit = checkRateLimit(clientIP)
    if (!rateLimit.allowed) {
      console.warn('[public-chat-api] Rate limit exceeded for IP:', clientIP)
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message: 'Demasiadas solicitudes. Por favor espera un momento e intenta de nuevo.',
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'Retry-After': '60',
          },
        }
      )
    }

    // Parse request body
    const body = await request.json()
    const { message, session_id, tenant_id } = body

    // Validate required fields
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          message: 'El campo "message" es requerido.',
        },
        { status: 400 }
      )
    }

    if (!tenant_id || typeof tenant_id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          message: 'El campo "tenant_id" es requerido.',
        },
        { status: 400 }
      )
    }

    // Validate message length (prevent abuse)
    if (message.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message too long',
          message: 'El mensaje es demasiado largo. Máximo 1000 caracteres.',
        },
        { status: 400 }
      )
    }

    console.log('[public-chat-api] Processing message:', {
      message_preview: message.substring(0, 50),
      session_id,
      tenant_id,
    })

    // Get session ID from multiple sources (priority: body → cookie → header)
    const cookieSessionId = request.cookies.get('session_id')?.value
    const headerSessionId = request.headers.get('x-session-id')
    const effectiveSessionId = session_id || cookieSessionId || headerSessionId || undefined

    // Generate response
    const response = await generatePublicChatResponse(
      message,
      effectiveSessionId,
      tenant_id
    )

    const responseTime = Date.now() - startTime
    console.log(`[public-chat-api] ✅ Response generated in ${responseTime}ms`)

    // Prepare response with cookie
    const nextResponse = NextResponse.json(
      {
        success: true,
        data: response,
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        },
      }
    )

    // Set session cookie (httpOnly, secure, 7 days)
    if (response.session_id) {
      const cookieOptions = [
        `session_id=${response.session_id}`,
        'HttpOnly',
        'Secure',
        'SameSite=Strict',
        'Path=/',
        `Max-Age=${7 * 24 * 60 * 60}`, // 7 days
      ]

      nextResponse.headers.set('Set-Cookie', cookieOptions.join('; '))
    }

    return nextResponse
  } catch (error) {
    console.error('[public-chat-api] Error processing request:', error)

    // Check for specific error types
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON',
          message: 'El formato de la solicitud es inválido.',
        },
        { status: 400 }
      )
    }

    // Generic server error
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Ocurrió un error procesando tu solicitud. Por favor intenta de nuevo.',
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Session-ID',
      },
    }
  )
}
