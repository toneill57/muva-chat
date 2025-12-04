CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hotel_operations_created_by_fk 
  ON public.hotel_operations(created_by);
