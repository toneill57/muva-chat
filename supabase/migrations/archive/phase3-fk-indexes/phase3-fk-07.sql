CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hotels_guest_information_property_fk 
  ON hotels.guest_information(property_id);
