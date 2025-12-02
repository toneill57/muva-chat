// Staff Chat System Types

export interface StaffInfo {
  staff_id: string;
  username: string;
  full_name: string;
  role: 'ceo' | 'admin' | 'housekeeper';
  permissions: {
    sire_access: boolean;
    admin_panel: boolean;
    reports_access: boolean;
  };
}

export interface StaffLoginResponse {
  token: string;
  staff_info: StaffInfo;
  session_expires_at: string;
  tenant_slug?: string; // Returned for subdomain redirect after login
}

export interface Conversation {
  id: string;
  title: string;
  category: 'sire' | 'operations' | 'admin';
  last_message_preview: string;
  updated_at: string;
}

export interface Source {
  table_name: string;
  similarity: number;
  content: string;
  metadata?: Record<string, any>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  timestamp: string;
}

export interface ChatResponse {
  conversation_id: string;
  response: string;
  sources: Source[];
  metadata: {
    tokens_used: number;
    response_time_ms: number;
  };
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
}
