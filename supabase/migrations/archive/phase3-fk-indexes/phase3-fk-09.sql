CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hotels_properties_client_fk 
  ON hotels.properties(client_id);
