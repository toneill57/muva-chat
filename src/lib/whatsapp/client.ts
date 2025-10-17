/**
 * WhatsApp Business Cloud API Client
 *
 * This is a TypeScript wrapper for Meta's WhatsApp Business Cloud API.
 * It handles authentication, message sending, and error handling.
 *
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api
 */

import {
  WhatsAppTextMessage,
  WhatsAppImageMessage,
  WhatsAppTemplateMessage,
  WhatsAppInteractiveButtonMessage,
  WhatsAppSendMessageResponse,
  WhatsAppErrorResponse,
  WhatsAppClientConfig
} from './types';

const DEFAULT_API_VERSION = 'v18.0';
const GRAPH_API_BASE_URL = 'https://graph.facebook.com';

export class WhatsAppClient {
  private phoneNumberId: string;
  private accessToken: string;
  private apiVersion: string;
  private baseUrl: string;

  constructor(config: WhatsAppClientConfig) {
    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion || DEFAULT_API_VERSION;
    this.baseUrl = `${GRAPH_API_BASE_URL}/${this.apiVersion}/${this.phoneNumberId}`;

    // Validate required config
    if (!this.phoneNumberId) {
      throw new Error('WhatsAppClient: phoneNumberId is required');
    }
    if (!this.accessToken) {
      throw new Error('WhatsAppClient: accessToken is required');
    }
  }

  /**
   * Send a text message
   *
   * @param to - Recipient phone number (e.g., "573001234567")
   * @param text - Message text (max 4096 characters)
   * @param options - Optional parameters (reply to message, preview URL)
   * @returns Message ID from WhatsApp
   *
   * @example
   * await client.sendTextMessage("+573001234567", "¡Hola! ¿Cómo puedo ayudarte?");
   */
  async sendTextMessage(
    to: string,
    text: string,
    options?: {
      replyToMessageId?: string;
      previewUrl?: boolean;
    }
  ): Promise<string> {
    const message: WhatsAppTextMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: 'text',
      text: {
        preview_url: options?.previewUrl || false,
        body: text
      }
    };

    if (options?.replyToMessageId) {
      message.context = {
        message_id: options.replyToMessageId
      };
    }

    const response = await this.sendMessage(message);
    return response.messages[0].id;
  }

  /**
   * Send an image message
   *
   * @param to - Recipient phone number
   * @param imageUrl - Public URL to image (or media ID if already uploaded)
   * @param caption - Optional caption (max 1024 characters)
   * @returns Message ID from WhatsApp
   */
  async sendImageMessage(
    to: string,
    imageUrl: string,
    caption?: string
  ): Promise<string> {
    const message: WhatsAppImageMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: 'image',
      image: {
        link: imageUrl,
        caption
      }
    };

    const response = await this.sendMessage(message);
    return response.messages[0].id;
  }

  /**
   * Send a template message (pre-approved by Meta)
   *
   * Templates must be created and approved via Meta Business Suite.
   *
   * @param to - Recipient phone number
   * @param templateName - Template name (e.g., "welcome_message")
   * @param languageCode - Language code (e.g., "es", "en_US")
   * @param parameters - Template parameter values
   * @returns Message ID from WhatsApp
   *
   * @example
   * await client.sendTemplateMessage(
   *   "+573001234567",
   *   "welcome_message",
   *   "es",
   *   [{ type: "text", text: "Juan" }]
   * );
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string,
    parameters?: Array<{ type: 'text'; text: string }>
  ): Promise<string> {
    const message: WhatsAppTemplateMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode
        }
      }
    };

    if (parameters && parameters.length > 0) {
      message.template.components = [
        {
          type: 'body',
          parameters
        }
      ];
    }

    const response = await this.sendMessage(message);
    return response.messages[0].id;
  }

  /**
   * Send interactive message with buttons (Quick Replies)
   *
   * Max 3 buttons per message.
   *
   * @param to - Recipient phone number
   * @param bodyText - Message body text
   * @param buttons - Array of buttons (max 3)
   * @param options - Optional header and footer
   * @returns Message ID from WhatsApp
   *
   * @example
   * await client.sendButtonMessage(
   *   "+573001234567",
   *   "¿En qué puedo ayudarte?",
   *   [
   *     { id: "availability", title: "Ver disponibilidad" },
   *     { id: "amenities", title: "Ver amenidades" }
   *   ]
   * );
   */
  async sendButtonMessage(
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>,
    options?: {
      headerText?: string;
      footerText?: string;
    }
  ): Promise<string> {
    if (buttons.length > 3) {
      throw new Error('WhatsAppClient: Maximum 3 buttons allowed');
    }

    const message: WhatsAppInteractiveButtonMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: bodyText
        },
        action: {
          buttons: buttons.map(btn => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title.substring(0, 20) // Max 20 chars
            }
          }))
        }
      }
    };

    if (options?.headerText) {
      message.interactive.header = {
        type: 'text',
        text: options.headerText
      };
    }

    if (options?.footerText) {
      message.interactive.footer = {
        text: options.footerText
      };
    }

    const response = await this.sendMessage(message);
    return response.messages[0].id;
  }

  /**
   * Mark message as read
   *
   * @param messageId - Message ID to mark as read
   */
  async markMessageAsRead(messageId: string): Promise<void> {
    await this.makeRequest('/messages', {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId
    });
  }

  /**
   * Generic send message method
   *
   * @private
   */
  private async sendMessage(
    message: WhatsAppTextMessage | WhatsAppImageMessage | WhatsAppTemplateMessage | WhatsAppInteractiveButtonMessage
  ): Promise<WhatsAppSendMessageResponse> {
    return this.makeRequest<WhatsAppSendMessageResponse>('/messages', message);
  }

  /**
   * Make HTTP request to WhatsApp API
   *
   * @private
   */
  private async makeRequest<T>(
    endpoint: string,
    body: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data as WhatsAppErrorResponse;
        throw new WhatsAppAPIError(
          error.error.message,
          error.error.code,
          error.error.type,
          error.error.fbtrace_id
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof WhatsAppAPIError) {
        throw error;
      }

      // Network error or JSON parse error
      throw new Error(`WhatsAppClient request failed: ${error}`);
    }
  }

  /**
   * Format phone number to E.164 format
   *
   * WhatsApp requires phone numbers without + prefix.
   *
   * @param phone - Phone number (e.g., "+57 300 123 4567" or "573001234567")
   * @returns Formatted phone number (e.g., "573001234567")
   *
   * @private
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    return phone.replace(/\D/g, '');
  }
}

/**
 * Custom error class for WhatsApp API errors
 */
export class WhatsAppAPIError extends Error {
  constructor(
    message: string,
    public code: number,
    public type: string,
    public fbtraceId: string
  ) {
    super(message);
    this.name = 'WhatsAppAPIError';
  }

  /**
   * Check if error is due to rate limiting
   */
  isRateLimitError(): boolean {
    return this.code === 130429 || this.code === 4;
  }

  /**
   * Check if error is due to invalid access token
   */
  isAuthError(): boolean {
    return this.code === 190;
  }

  /**
   * Check if error is retriable
   */
  isRetriable(): boolean {
    return this.isRateLimitError() || this.code >= 500;
  }
}

/**
 * Create WhatsApp client from environment variables
 *
 * @example
 * const client = createWhatsAppClient();
 * await client.sendTextMessage("+573001234567", "Hello!");
 */
export function createWhatsAppClient(): WhatsAppClient {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error(
      'WhatsApp credentials not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env.local'
    );
  }

  return new WhatsAppClient({
    phoneNumberId,
    accessToken
  });
}
