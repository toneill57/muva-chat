import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * WhatsApp Business Cloud API Webhook Endpoint
 *
 * This endpoint receives webhook notifications from Meta's WhatsApp Business API.
 * It handles both verification (GET) and message reception (POST).
 *
 * Meta Requirements:
 * - HTTPS/TLS required
 * - GET verification must respond in <5 seconds
 * - POST message handling must respond in <20 seconds
 * - Webhook signature verification (HMAC SHA-256)
 *
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started
 */

/**
 * GET handler - Webhook Verification
 *
 * Meta sends a verification request when you register the webhook URL.
 * We must echo back the challenge parameter if the verify token matches.
 *
 * Query params:
 * - hub.mode: "subscribe"
 * - hub.verify_token: Your custom verify token
 * - hub.challenge: Random string to echo back
 *
 * Example:
 * GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=1234
 * Response: 1234 (plain text)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

    // Verify that this is a subscribe request with the correct token
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[WhatsApp Webhook] Verification successful');

      // Respond with the challenge to complete verification
      return new NextResponse(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Verification failed
    console.error('[WhatsApp Webhook] Verification failed', {
      mode,
      tokenMatch: token === verifyToken,
      hasChallenge: !!challenge
    });

    return NextResponse.json(
      { error: 'Webhook verification failed' },
      { status: 403 }
    );
  } catch (error) {
    console.error('[WhatsApp Webhook] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Webhook Notifications
 *
 * Meta sends webhook notifications for various events:
 * - messages (user sends message to business)
 * - message_status (sent, delivered, read, failed)
 * - contacts (contact information updates)
 *
 * We verify the request signature using HMAC SHA-256 before processing.
 *
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Get raw body and signature
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // 2. Verify webhook signature (CRITICAL SECURITY CHECK)
    if (!verifyWebhookSignature(body, signature)) {
      console.error('[WhatsApp Webhook] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // 3. Parse webhook payload
    const payload = JSON.parse(body);

    // 4. Log incoming webhook for debugging
    console.log('[WhatsApp Webhook] Received notification:', {
      object: payload.object,
      entryCount: payload.entry?.length || 0,
      timestamp: new Date().toISOString()
    });

    // 5. Process webhook events
    if (payload.object === 'whatsapp_business_account') {
      for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            await handleMessageEvent(change.value);
          }
        }
      }
    }

    // 6. Always respond 200 OK immediately (Meta requirement)
    // Processing should happen asynchronously to avoid timeout
    return NextResponse.json({ status: 'received' }, { status: 200 });

  } catch (error) {
    console.error('[WhatsApp Webhook] POST error:', error);

    // Still return 200 to prevent Meta from retrying
    // Log the error for investigation
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}

/**
 * Verify webhook signature using HMAC SHA-256
 *
 * Meta signs all webhook requests with your app secret.
 * We must verify the signature to ensure the request is authentic.
 *
 * @param body - Raw request body (string)
 * @param signature - x-hub-signature-256 header (e.g., "sha256=abc123...")
 * @returns true if signature is valid
 */
function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!signature) {
    return false;
  }

  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.error('[WhatsApp Webhook] WHATSAPP_APP_SECRET not configured');
    return false;
  }

  // Extract hash from signature (format: "sha256=hash")
  const signatureHash = signature.split('sha256=')[1];
  if (!signatureHash) {
    return false;
  }

  // Compute expected signature
  const expectedHash = crypto
    .createHmac('sha256', appSecret)
    .update(body)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signatureHash, 'hex'),
    Buffer.from(expectedHash, 'hex')
  );
}

/**
 * Handle incoming message event
 *
 * This is called when a user sends a message to the business WhatsApp number.
 *
 * FASE 1 will implement the full logic:
 * - Extract message details (from, text, message_id)
 * - Identify tenant from phone number
 * - Call Claude AI chat engine
 * - Send response back to user
 *
 * For now, we just log the event.
 */
async function handleMessageEvent(value: any) {
  const messages = value.messages || [];

  for (const message of messages) {
    console.log('[WhatsApp Webhook] Message received:', {
      from: message.from,
      id: message.id,
      type: message.type,
      timestamp: message.timestamp,
      text: message.text?.body || '(non-text message)'
    });

    // TODO FASE 1: Process message and send response
    // - Identify tenant from phone number
    // - Call /api/chat with message text
    // - Send Claude AI response via WhatsApp API
  }

  // Mark messages as read (optional)
  const contacts = value.contacts || [];
  for (const contact of contacts) {
    console.log('[WhatsApp Webhook] Contact info:', {
      name: contact.profile?.name,
      wa_id: contact.wa_id
    });
  }
}
