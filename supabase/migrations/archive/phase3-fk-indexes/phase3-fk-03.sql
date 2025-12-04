CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prospective_sessions_reservation_fk 
  ON public.prospective_sessions(converted_to_reservation_id);
