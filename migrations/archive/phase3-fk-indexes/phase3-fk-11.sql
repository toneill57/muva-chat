CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_event_conflicts_winning_fk 
  ON public.calendar_event_conflicts(winning_event_id);
