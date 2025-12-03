CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hotels_policies_property_fk 
  ON hotels.policies(property_id);
