-- Junction table for many-to-many relationship between reservations and accommodation units
-- Supports multiple rooms per reservation (e.g., family booking 3 rooms)

CREATE TABLE IF NOT EXISTS public.reservation_accommodations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.guest_reservations(id) ON DELETE CASCADE,
  accommodation_unit_id UUID REFERENCES hotels.accommodation_units(id) ON DELETE SET NULL,
  motopress_accommodation_id INTEGER,
  motopress_type_id INTEGER,
  room_rate DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reservation_accommodations_reservation_id
  ON public.reservation_accommodations(reservation_id);

CREATE INDEX IF NOT EXISTS idx_reservation_accommodations_accommodation_unit_id
  ON public.reservation_accommodations(accommodation_unit_id);

CREATE INDEX IF NOT EXISTS idx_reservation_accommodations_motopress_ids
  ON public.reservation_accommodations(motopress_accommodation_id, motopress_type_id);

-- Enable RLS
ALTER TABLE public.reservation_accommodations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: tenant isolation (same as guest_reservations)
-- Staff can only see accommodations for reservations in their tenant
CREATE POLICY "reservation_accommodations_tenant_isolation" ON public.reservation_accommodations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.guest_reservations gr
      WHERE gr.id = reservation_accommodations.reservation_id
        AND gr.tenant_id::TEXT = current_setting('app.current_tenant_id', TRUE)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.guest_reservations gr
      WHERE gr.id = reservation_accommodations.reservation_id
        AND gr.tenant_id::TEXT = current_setting('app.current_tenant_id', TRUE)
    )
  );

-- Add helpful comment
COMMENT ON TABLE public.reservation_accommodations IS
  'Junction table for many-to-many relationship between reservations and accommodation units. Supports multiple rooms per booking.';
