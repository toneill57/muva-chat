-- Fix sire_submissions table - drop and recreate cleanly
-- This ensures a fresh start

-- Drop existing table and policies
DROP TABLE IF EXISTS public.sire_submissions CASCADE;

-- Create sire_submissions table
CREATE TABLE public.sire_submissions (
  submission_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant_registry(tenant_id) ON DELETE CASCADE,
  submission_date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  reservations_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_sire_submissions_tenant_id ON public.sire_submissions(tenant_id);
CREATE INDEX idx_sire_submissions_submission_date ON public.sire_submissions(submission_date DESC);
CREATE INDEX idx_sire_submissions_status ON public.sire_submissions(status);

-- Add RLS policies
ALTER TABLE public.sire_submissions ENABLE ROW LEVEL SECURITY;

-- Super admin can view all submissions
CREATE POLICY "super_admin_view_all_submissions"
  ON public.sire_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admin_users
      WHERE super_admin_users.super_admin_id = auth.uid()
    )
  );

-- Add comment
COMMENT ON TABLE public.sire_submissions IS 'SIRE compliance submission tracking for all tenants';
