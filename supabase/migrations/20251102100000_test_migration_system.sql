-- Test migration for FASE 3 CI/CD implementation
-- This migration creates a simple test table to verify the migration system works

-- Create test table
CREATE TABLE IF NOT EXISTS public.test_migration_fase3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  test_value TEXT,
  test_number INTEGER DEFAULT 0
);

-- Add comment
COMMENT ON TABLE public.test_migration_fase3 IS 'Test table for FASE 3 CI/CD migration system verification';

-- Enable RLS (for consistency with other tables)
ALTER TABLE public.test_migration_fase3 ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policy
CREATE POLICY "Allow all for testing" ON public.test_migration_fase3
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert test record
INSERT INTO public.test_migration_fase3 (test_value, test_number)
VALUES ('FASE 3 Migration Test', 1);