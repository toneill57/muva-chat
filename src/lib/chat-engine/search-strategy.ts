import type { GuestSession } from '@/lib/guest-auth';

export interface SearchContext {
  guestInfo: GuestSession;
  hasMuvaAccess: boolean;
  hasAccommodationUnits: boolean;
  tenantId: string;
}

/**
 * Determine which domains to search based on guest permissions and context
 *
 * @param guestInfo - Guest session with permissions and assigned units
 * @returns Search context with flags for each domain
 */
export function buildSearchContext(guestInfo: GuestSession): SearchContext {
  const hasMuvaAccess = guestInfo.tenant_features?.muva_access === true;
  const accommodationUnits = guestInfo.accommodation_units ||
    (guestInfo.accommodation_unit ? [guestInfo.accommodation_unit] : []);
  const hasAccommodationUnits = accommodationUnits.length > 0;

  return {
    guestInfo,
    hasMuvaAccess,
    hasAccommodationUnits,
    tenantId: guestInfo.tenant_id,
  };
}

/**
 * Log search strategy for debugging
 */
export function logSearchStrategy(context: SearchContext): void {
  console.log('[Chat Engine] Search strategy (3 Domains):', {
    domain_1_muva: context.hasMuvaAccess,
    domain_2_hotel_general: true, // Always enabled
    domain_3_unit_manual: context.hasAccommodationUnits,
    accommodation_public: true, // Always enabled
    tenant: context.tenantId,
    unit_id: context.guestInfo.accommodation_unit?.id || 'not_assigned',
  });
}
