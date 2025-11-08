-- Migration: Auto-link reservation_accommodations to accommodation_units_public
-- Trigger que automáticamente vincula reservations cuando se crean o actualizan
--
-- Date: 2025-11-08
-- Related: Reservation cards "Sin nombre" bug fix

-- Function que hace el linking automático
CREATE OR REPLACE FUNCTION public.auto_link_reservation_accommodation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id text;
BEGIN
  -- Si ya tiene accommodation_unit_id, no hacer nada
  IF NEW.accommodation_unit_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Si no tiene motopress_type_id, no podemos matchear
  IF NEW.motopress_type_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Obtener tenant_id de la reservation
  SELECT tenant_id::text INTO v_tenant_id
  FROM public.guest_reservations
  WHERE id = NEW.reservation_id;

  -- Buscar el accommodation_unit_id correspondiente
  SELECT aup.unit_id INTO NEW.accommodation_unit_id
  FROM public.accommodation_units_public aup
  WHERE aup.tenant_id::text = v_tenant_id
    AND (aup.metadata->>'motopress_room_type_id')::int = NEW.motopress_type_id
    AND aup.name LIKE '% - Overview'
  LIMIT 1;

  RETURN NEW;
END;
$$;

-- Trigger que ejecuta ANTES de INSERT o UPDATE
DROP TRIGGER IF EXISTS trg_auto_link_reservation_accommodation ON public.reservation_accommodations;

CREATE TRIGGER trg_auto_link_reservation_accommodation
  BEFORE INSERT OR UPDATE ON public.reservation_accommodations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_reservation_accommodation();

-- Comment
COMMENT ON FUNCTION public.auto_link_reservation_accommodation() IS
'Automatically links reservation_accommodations to accommodation_units_public
when inserted or updated, based on motopress_type_id matching.
Triggered on INSERT/UPDATE of reservation_accommodations table.';
