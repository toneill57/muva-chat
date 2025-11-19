-- Migration: Create accommodation_manuals and accommodation_manual_analytics tables
-- These tables were created manually in production but missing in local/other environments
-- This migration ensures all environments have the same schema

-- 1. Create accommodation_manuals table (metadata for uploaded .md files)
CREATE TABLE IF NOT EXISTS public.accommodation_manuals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  accommodation_unit_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  filename character varying NOT NULL,
  file_type character varying NOT NULL,
  chunk_count integer NOT NULL DEFAULT 0,
  status character varying NOT NULL DEFAULT 'processing'::character varying,
  error_message text,
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT accommodation_manuals_pkey PRIMARY KEY (id)
);

-- 2. Create accommodation_manual_analytics table (tracks manual usage)
CREATE TABLE IF NOT EXISTS public.accommodation_manual_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  manual_id uuid,
  tenant_id uuid NOT NULL,
  accommodation_unit_id uuid NOT NULL,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT accommodation_manual_analytics_pkey PRIMARY KEY (id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accommodation_manuals_unit_id
ON public.accommodation_manuals(accommodation_unit_id);

CREATE INDEX IF NOT EXISTS idx_accommodation_manuals_tenant_id
ON public.accommodation_manuals(tenant_id);

CREATE INDEX IF NOT EXISTS idx_accommodation_manuals_status
ON public.accommodation_manuals(status);

CREATE INDEX IF NOT EXISTS idx_accommodation_manual_analytics_manual_id
ON public.accommodation_manual_analytics(manual_id);

CREATE INDEX IF NOT EXISTS idx_accommodation_manual_analytics_unit_id
ON public.accommodation_manual_analytics(accommodation_unit_id);

CREATE INDEX IF NOT EXISTS idx_accommodation_manual_analytics_tenant_id
ON public.accommodation_manual_analytics(tenant_id);

-- 4. Add foreign key to link chunks to manuals
-- (accommodation_units_manual_chunks table should already exist)
DO $$
BEGIN
  -- Check if FK already exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'accommodation_units_manual_chunks_manual_id_fkey'
  ) THEN
    ALTER TABLE public.accommodation_units_manual_chunks
    ADD CONSTRAINT accommodation_units_manual_chunks_manual_id_fkey
    FOREIGN KEY (manual_id)
    REFERENCES public.accommodation_manuals(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Add comments
COMMENT ON TABLE public.accommodation_manuals IS
'Metadata table for uploaded accommodation manuals (.md files).
Tracks upload status, chunk count, and processing state.
Related tables: accommodation_units_manual_chunks (vector chunks).';

COMMENT ON TABLE public.accommodation_manual_analytics IS
'Analytics tracking for manual uploads and usage.
Tracks events: upload, view, search_hit, delete.';
