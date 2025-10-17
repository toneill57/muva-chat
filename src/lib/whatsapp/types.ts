/**
 * WhatsApp Business Cloud API TypeScript Type Definitions
 *
 * These types represent the data structures used in Meta's WhatsApp Business API.
 *
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
 */

// ============================================================================
// WEBHOOK TYPES (Incoming from Meta)
// ============================================================================

/**
 * Root webhook payload structure
 * Meta sends this when events occur (messages, status updates, etc.)
 */
export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: WhatsAppWebhookEntry[];
}

export interface WhatsAppWebhookEntry {
  id: string; // WhatsApp Business Account ID
  changes: WhatsAppWebhookChange[];
}

export interface WhatsAppWebhookChange {
  value: WhatsAppWebhookValue;
  field: 'messages' | 'message_status' | 'contacts';
}

export interface WhatsAppWebhookValue {
  messaging_product: 'whatsapp';
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppIncomingMessage[];
  statuses?: WhatsAppMessageStatus[];
}

// ============================================================================
// MESSAGE TYPES
// ============================================================================

export interface WhatsAppIncomingMessage {
  from: string; // Sender phone number (e.g., "573001234567")
  id: string; // Message ID (wamid.xxx)
  timestamp: string; // Unix timestamp
  type: WhatsAppMessageType;
  context?: {
    from: string;
    id: string;
  };
  text?: {
    body: string;
  };
  image?: WhatsAppMediaMessage;
  document?: WhatsAppMediaMessage;
  audio?: WhatsAppMediaMessage;
  video?: WhatsAppMediaMessage;
  location?: WhatsAppLocationMessage;
  contacts?: WhatsAppContactMessage[];
  button?: {
    text: string;
    payload: string;
  };
  interactive?: WhatsAppInteractiveMessage;
}

export type WhatsAppMessageType =
  | 'text'
  | 'image'
  | 'document'
  | 'audio'
  | 'video'
  | 'location'
  | 'contacts'
  | 'button'
  | 'interactive'
  | 'template'
  | 'sticker'
  | 'unknown';

export interface WhatsAppMediaMessage {
  id: string; // Media ID
  mime_type: string;
  sha256: string;
  caption?: string;
  filename?: string;
}

export interface WhatsAppLocationMessage {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface WhatsAppContactMessage {
  name: {
    formatted_name: string;
    first_name?: string;
    last_name?: string;
  };
  phones?: Array<{
    phone: string;
    type?: string;
  }>;
}

export interface WhatsAppInteractiveMessage {
  type: 'button_reply' | 'list_reply';
  button_reply?: {
    id: string;
    title: string;
  };
  list_reply?: {
    id: string;
    title: string;
    description?: string;
  };
}

export interface WhatsAppMessageStatus {
  id: string; // Message ID
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{
    code: number;
    title: string;
    message: string;
  }>;
}

export interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string; // WhatsApp ID (phone number)
}

// ============================================================================
// OUTGOING MESSAGE TYPES (Sending to users)
// ============================================================================

/**
 * Base message structure for sending messages
 */
export interface WhatsAppOutgoingMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string; // Recipient phone number
  type: WhatsAppMessageType;
  context?: {
    message_id: string; // Reply to this message ID
  };
}

/**
 * Text message (most common)
 */
export interface WhatsAppTextMessage extends WhatsAppOutgoingMessage {
  type: 'text';
  text: {
    preview_url?: boolean;
    body: string; // Max 4096 characters
  };
}

/**
 * Image message
 */
export interface WhatsAppImageMessage extends WhatsAppOutgoingMessage {
  type: 'image';
  image: {
    id?: string; // Media ID (if already uploaded)
    link?: string; // Public URL (alternative to ID)
    caption?: string;
  };
}

/**
 * Template message (pre-approved by Meta)
 */
export interface WhatsAppTemplateMessage extends WhatsAppOutgoingMessage {
  type: 'template';
  template: {
    name: string;
    language: {
      code: string; // e.g., "en", "es", "pt_BR"
    };
    components?: Array<{
      type: 'header' | 'body' | 'button';
      parameters: Array<{
        type: 'text' | 'currency' | 'date_time' | 'image' | 'document';
        text?: string;
        currency?: {
          fallback_value: string;
          code: string;
          amount_1000: number;
        };
        date_time?: {
          fallback_value: string;
        };
        image?: {
          link: string;
        };
        document?: {
          link: string;
          filename: string;
        };
      }>;
    }>;
  };
}

/**
 * Interactive message with buttons
 */
export interface WhatsAppInteractiveButtonMessage extends WhatsAppOutgoingMessage {
  type: 'interactive';
  interactive: {
    type: 'button';
    header?: {
      type: 'text' | 'image' | 'video' | 'document';
      text?: string;
      image?: { link: string };
    };
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: {
      buttons: Array<{
        type: 'reply';
        reply: {
          id: string; // Unique ID (max 256 characters)
          title: string; // Button text (max 20 characters)
        };
      }>;
    };
  };
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface WhatsAppSendMessageResponse {
  messaging_product: 'whatsapp';
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string; // Message ID (wamid.xxx)
  }>;
}

export interface WhatsAppErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

// ============================================================================
// INTERNAL APPLICATION TYPES
// ============================================================================

/**
 * Simplified message format for internal use
 */
export interface ProcessedWhatsAppMessage {
  messageId: string;
  from: string; // Sender phone number
  fromName?: string; // Sender name (from contacts)
  to: string; // Business phone number
  timestamp: Date;
  type: WhatsAppMessageType;
  content: string; // Text content (or caption for media)
  mediaId?: string; // Media ID (for images, documents, etc.)
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  buttonReply?: {
    id: string;
    title: string;
  };
}

/**
 * Webhook configuration
 */
export interface WhatsAppWebhookConfig {
  verifyToken: string;
  appSecret: string;
}

/**
 * WhatsApp client configuration
 */
export interface WhatsAppClientConfig {
  phoneNumberId: string;
  accessToken: string;
  apiVersion?: string; // Default: v17.0
}
