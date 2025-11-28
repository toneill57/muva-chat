-- =====================================================
-- MIGRATION: sire_submissions table
-- COPY THIS ENTIRE FILE AND PASTE IT IN SUPABASE DASHBOARD
-- URL: https://supabase.com/dashboard/project/zpyxgkvonrxbhvmkuzlt/sql/new
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sire_submissions (
  submission_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant_registry(tenant_id) ON DELETE CASCADE,
  submission_date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  reservations_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sire_submissions_tenant_id ON public.sire_submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sire_submissions_submission_date ON public.sire_submissions(submission_date DESC);
CREATE INDEX IF NOT EXISTS idx_sire_submissions_status ON public.sire_submissions(status);

ALTER TABLE public.sire_submissions ENABLE ROW LEVEL SECURITY;

-- Drop policy if it exists and recreate
-- Note: Super admin access is controlled via middleware JWT auth, not RLS
-- This policy allows service role access (used by the API)
DROP POLICY IF EXISTS "super_admin_view_all_submissions" ON public.sire_submissions;

CREATE POLICY "super_admin_view_all_submissions"
  ON public.sire_submissions
  FOR ALL
  USING (true);

COMMENT ON TABLE public.sire_submissions IS 'SIRE compliance submission tracking for all tenants';
