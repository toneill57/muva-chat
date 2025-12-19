/**
 * Type definitions for Guest Chat System
 *
 * Types for guest authentication, chat messages, and API responses
 */

import { GuestSession } from './guest-auth'
import type { Tenant } from '@/contexts/TenantContext'

// ============================================================================
// Chat Message Types
// ============================================================================

export interface GuestChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  entities?: string[]
  sources?: Array<{
    type: 'accommodation' | 'tourism'
    name: string
    similarity: number
  }>
}

// ============================================================================
// Entity Types
// ============================================================================

export interface TrackedEntity {
  name: string
  type: 'activity' | 'place' | 'amenity' | 'other'
  firstMentioned: Date
  mentionCount: number
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface GuestLoginRequest {
  tenant_id: string
  check_in_date: string  // YYYY-MM-DD
  phone_last_4: string   // 4 digits
}

export interface GuestLoginResponse {
  token: string
  conversation_id: string
  guest_info: {
    name: string
    check_in: string
    check_out: string
    reservation_code: string
  }
}

export interface GuestChatRequest {
  message: string
  conversation_id: string
}

export interface GuestChatResponse {
  response: string
  entities: string[]
  followUpSuggestions: string[]
  sources?: Array<{
    type: 'accommodation' | 'tourism'
    name: string
    similarity: number
  }>
  enhanced?: boolean
  original_query?: string
}

export interface GuestChatHistoryResponse {
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    created_at: string
    entities?: string[]
  }>
  total: number
}

// ============================================================================
// UI Component Props
// ============================================================================

export interface GuestLoginProps {
  tenantId: string
  onLoginSuccess: (session: GuestSession, token: string) => void
  onError?: (error: string) => void
}

export interface GuestChatInterfaceProps {
  session: GuestSession
  token: string
  tenant?: Tenant | null
  onLogout: () => void
  // mode is now internal state, not a prop (dynamic activation via ComplianceReminder)
}

export interface EntityBadgeProps {
  entity: string
  type: 'activity' | 'place' | 'amenity' | 'other'
  onClick?: () => void
  onRemove?: () => void
  isNew?: boolean
}

export interface FollowUpSuggestionsProps {
  suggestions: string[]
  onSuggestionClick: (suggestion: string) => void
  isLoading?: boolean
  displayMode?: 'compact' | 'expanded' | 'carousel'
  trackedEntities?: string[]
  onAnalytics?: boolean
}

// ============================================================================
// Form Validation Types
// ============================================================================

export interface ValidationError {
  field: 'check_in_date' | 'phone_last_4'
  message: string
}

export interface FormState {
  check_in_date: string
  phone_last_4: string
  errors: ValidationError[]
  isValid: boolean
}
