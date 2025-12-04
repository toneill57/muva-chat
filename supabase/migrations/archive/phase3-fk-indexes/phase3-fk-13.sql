CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sire_export_logs_user_fk 
  ON public.sire_export_logs(user_id);
