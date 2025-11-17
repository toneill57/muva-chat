-- Migration: Fix foreign key in accommodation_units_manual_chunks
-- Problem: FK points to wrong table (accommodation_units_manual instead of accommodation_manuals)
-- Impact: Cannot insert chunks - FK constraint violation
-- Root cause: FK was created pointing to accommodation_units_manual(unit_id) instead of accommodation_manuals(id)

-- 1. Drop incorrect FK
ALTER TABLE public.accommodation_units_manual_chunks
DROP CONSTRAINT IF EXISTS accommodation_units_manual_chunks_manual_id_fkey;

-- 2. Create correct FK pointing to accommodation_manuals(id)
ALTER TABLE public.accommodation_units_manual_chunks
ADD CONSTRAINT accommodation_units_manual_chunks_manual_id_fkey
FOREIGN KEY (manual_id)
REFERENCES public.accommodation_manuals(id)
ON DELETE CASCADE;

-- 3. Add comment
COMMENT ON CONSTRAINT accommodation_units_manual_chunks_manual_id_fkey
ON public.accommodation_units_manual_chunks IS
'Links chunks to their parent manual in accommodation_manuals table (NOT accommodation_units_manual).
CASCADE delete ensures chunks are removed when manual is deleted.';
