CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_airbnb_motopress_comparison_ics_fk 
  ON public.airbnb_motopress_comparison(ics_event_id);
