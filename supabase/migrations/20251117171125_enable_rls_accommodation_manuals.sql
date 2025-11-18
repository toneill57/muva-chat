-- Migration: Enable RLS for accommodation_manuals table
-- Problem: Table exists but RLS disabled → PostgREST doesn't expose it in schema cache
-- Impact: Manual uploads fail with "Could not find the table 'public.accommodation_manuals'"

-- 1. Enable Row Level Security
ALTER TABLE public.accommodation_manuals ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS Policies (using service_role bypass for API endpoints)

-- SELECT: Allow service_role to read all (API endpoints use service_role key)
CREATE POLICY accommodation_manuals_select_service_role
ON public.accommodation_manuals FOR SELECT
TO service_role
USING (true);

-- INSERT: Allow service_role to insert (API endpoints use service_role key)
CREATE POLICY accommodation_manuals_insert_service_role
ON public.accommodation_manuals FOR INSERT
TO service_role
WITH CHECK (true);

-- UPDATE: Allow service_role to update (API endpoints use service_role key)
CREATE POLICY accommodation_manuals_update_service_role
ON public.accommodation_manuals FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- DELETE: Allow service_role to delete (API endpoints use service_role key)
CREATE POLICY accommodation_manuals_delete_service_role
ON public.accommodation_manuals FOR DELETE
TO service_role
USING (true);

-- Add table comment
COMMENT ON TABLE public.accommodation_manuals IS
'Metadata table for uploaded accommodation manuals (.md files).
Tracks upload status, chunk count, and processing state.
Related tables: accommodation_units_manual_chunks (vector chunks).
RLS enabled with service_role policies for API access.';
