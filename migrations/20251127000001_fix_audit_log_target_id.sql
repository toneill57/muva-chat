-- Fix audit log target_id column type
-- Change from UUID to TEXT to support non-UUID targets (like usernames)

ALTER TABLE public.super_admin_audit_log
  ALTER COLUMN target_id TYPE TEXT;

COMMENT ON COLUMN public.super_admin_audit_log.target_id IS 'ID of target resource (can be UUID, username, filename, etc.)';
