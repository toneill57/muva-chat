CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accommodation_units_tenant_hotel_fk 
  ON public.accommodation_units(tenant_id, hotel_id);
