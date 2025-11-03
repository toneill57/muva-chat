CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_airbnb_mphb_imported_reservations_unit_fk 
  ON public.airbnb_mphb_imported_reservations(accommodation_unit_id);
