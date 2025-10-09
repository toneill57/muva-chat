-- FIX: Type mismatch in get_sire_guest_data function
-- PROBLEMA: VARCHAR columns from guest_reservations don't match TEXT return type
-- SOLUCIÓN: Add explicit CAST to TEXT for all VARCHAR columns

CREATE OR REPLACE FUNCTION get_sire_guest_data(p_reservation_id UUID)
RETURNS TABLE (
  reservation_id UUID,
  reservation_code TEXT,
  tenant_id TEXT,
  guest_name TEXT,
  check_in_date DATE,
  check_out_date DATE,
  status TEXT,
  hotel_sire_code TEXT,
  hotel_city_code TEXT,
  document_type TEXT,
  document_type_name TEXT,
  document_number TEXT,
  nationality_code TEXT,
  nationality_name TEXT,
  first_surname TEXT,
  second_surname TEXT,
  given_names TEXT,
  movement_type TEXT,
  movement_date DATE,
  origin_city_code TEXT,
  origin_city_name TEXT,
  destination_city_code TEXT,
  destination_city_name TEXT,
  birth_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gr.id,
    gr.reservation_code::TEXT,
    gr.tenant_id::TEXT,
    gr.guest_name::TEXT,
    gr.check_in_date,
    gr.check_out_date,
    gr.status::TEXT,
    gr.hotel_sire_code::TEXT,
    gr.hotel_city_code::TEXT,
    gr.document_type::TEXT,
    sdt.name::TEXT AS document_type_name,
    gr.document_number::TEXT,
    gr.nationality_code::TEXT,
    sc_nat.name_es::TEXT AS nationality_name,
    gr.first_surname::TEXT,
    gr.second_surname::TEXT,
    gr.given_names::TEXT,
    gr.movement_type::TEXT,
    gr.movement_date,
    gr.origin_city_code::TEXT,
    COALESCE(scit_orig.name, sc_orig.name_es)::TEXT AS origin_city_name,
    gr.destination_city_code::TEXT,
    COALESCE(scit_dest.name, sc_dest.name_es)::TEXT AS destination_city_name,
    gr.birth_date
  FROM guest_reservations gr
  LEFT JOIN sire_document_types sdt ON gr.document_type = sdt.code
  LEFT JOIN sire_countries sc_nat ON gr.nationality_code = sc_nat.sire_code
  LEFT JOIN sire_cities scit_orig ON gr.origin_city_code = scit_orig.code
  LEFT JOIN sire_countries sc_orig ON gr.origin_city_code = sc_orig.iso_code
  LEFT JOIN sire_cities scit_dest ON gr.destination_city_code = scit_dest.code
  LEFT JOIN sire_countries sc_dest ON gr.destination_city_code = sc_dest.iso_code
  WHERE gr.id = p_reservation_id;
END;
$$;

REVOKE ALL ON FUNCTION get_sire_guest_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_sire_guest_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sire_guest_data(UUID) TO service_role;

COMMENT ON FUNCTION get_sire_guest_data(UUID) IS
  'Retrieves complete SIRE guest data for a reservation with human-readable catalog lookups. Fixed VARCHAR→TEXT casting issue.';
