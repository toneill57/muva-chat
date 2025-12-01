// Super Admin Types for Tenant Management

export interface Tenant {
  tenant_id: string;
  subdomain: string;
  business_name: string;
  logo_url?: string;
  subscription_tier: 'free' | 'basic' | 'premium' | 'enterprise';
  is_active: boolean;
  last_activity?: string;
  conversation_count?: number;
  public_conversations?: number;         // Conversaciones públicas (/with-me)
  authenticated_conversations?: number;  // Conversaciones autenticadas (/my-stay)
  created_at: string;
}

export interface TenantDetails extends Tenant {
  nit?: string;
  legal_name?: string;
  address?: string;
  phone?: string;
  contact_email?: string;
  active_users?: number;
  accommodation_count?: number;
  avg_response_time?: number;
  integrations?: TenantIntegration[];
  users?: TenantUser[];
}

export interface TenantIntegration {
  provider: string;
  is_enabled: boolean;
  last_sync?: string;
  config?: Record<string, unknown>;
}

export interface TenantUser {
  user_id: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface TenantFilters {
  status: string;
  tier: string;
  search: string;
}

export interface TenantListResponse {
  tenants: Tenant[];
  totalPages: number;
  totalCount: number;
  page: number;
  limit: number;
}

// Content Management Types

export interface ContentItem {
  id: string;
  title: string;
  category: string;
  source_file?: string;
  total_chunks: number;        // Total number of chunks for this document
  chunk_index: number;          // Index of this chunk
  embedding?: number[];         // Main embedding vector
  embedding_fast?: number[];    // Fast embedding vector
  created_at: string;
}

export type FileStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'error';

export interface FileItem {
  file: File;
  progress: number;
  status: FileStatus;
  error: string | null;
  embeddingsCount?: number;
}

// Audit Log Types

export interface AuditLog {
  log_id: string;
  super_admin_id: string;
  admin_username?: string;
  admin_full_name?: string;
  action: string;
  target_type?: string;
  target_id?: string;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AuditLogFilters {
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface AuditLogListResponse {
  logs: AuditLog[];
  totalPages: number;
  totalCount: number;
  page: number;
  limit: number;
}

// AI Monitoring Types

export interface AIUsageStat {
  date: string;
  total_tokens: number;
  total_cost: number;
  avg_latency: number;
  request_count: number;
  model?: string;
}

export interface AITopConsumer {
  tenant_id: string;
  subdomain: string;
  business_name: string;
  total_tokens: number;
  total_cost: number;
  avg_latency: number;
  request_count: number;
}

export interface AIModelDistribution {
  model: string;
  request_count: number;
  percentage: number;
  total_tokens: number;
  total_cost: number;
}

export interface AIMonitoringMetrics {
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  totalRequests: number;
}

export interface AIMonitoringResponse {
  metrics: AIMonitoringMetrics;
  stats: AIUsageStat[];
  topConsumers: AITopConsumer[];
  modelDistribution: AIModelDistribution[];
}
