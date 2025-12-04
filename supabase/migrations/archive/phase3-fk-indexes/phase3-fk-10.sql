CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_events_merged_into_fk 
  ON public.calendar_events(merged_into_id);
