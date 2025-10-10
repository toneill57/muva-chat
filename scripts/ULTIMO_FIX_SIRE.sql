-- ÚLTIMO FIX: Crear función get_sire_guest_data
-- EJECUTA ESTO EN SUPABASE DASHBOARD SQL EDITOR

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
    gr.reservation_code,
    gr.tenant_id,
    gr.guest_name,
    gr.check_in_date,
    gr.check_out_date,
    gr.status,
    gr.hotel_sire_code,
    gr.hotel_city_code,
    gr.document_type,
    sdt.name AS document_type_name,
    gr.document_number,
    gr.nationality_code,
    sc_nat.name_es AS nationality_name,
    gr.first_surname,
    gr.second_surname,
    gr.given_names,
    gr.movement_type,
    gr.movement_date,
    gr.origin_city_code,
    COALESCE(dcit_orig.name, sc_orig.name_es) AS origin_city_name,
    gr.destination_city_code,
    COALESCE(dcit_dest.name, sc_dest.name_es) AS destination_city_name,
    gr.birth_date
  FROM guest_reservations gr
  LEFT JOIN sire_document_types sdt ON gr.document_type = sdt.code
  LEFT JOIN sire_countries sc_nat ON gr.nationality_code = sc_nat.sire_code
  LEFT JOIN divipola_cities dcit_orig ON gr.origin_city_code = dcit_orig.code
  LEFT JOIN sire_countries sc_orig ON gr.origin_city_code = sc_orig.sire_code
  LEFT JOIN divipola_cities dcit_dest ON gr.destination_city_code = dcit_dest.code
  LEFT JOIN sire_countries sc_dest ON gr.destination_city_code = sc_dest.sire_code
  WHERE gr.id = p_reservation_id;
END;
$$;

REVOKE ALL ON FUNCTION get_sire_guest_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_sire_guest_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sire_guest_data(UUID) TO service_role;

COMMENT ON FUNCTION get_sire_guest_data(UUID) IS
  'Retrieves complete SIRE guest data for a reservation with human-readable catalog lookups. Used for guest data confirmation UI and individual SIRE exports.';
