CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_users_created_by_fk 
  ON public.staff_users(created_by);
