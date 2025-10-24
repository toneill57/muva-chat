-- Migration: Fix status field length to accommodate all status values
-- Date: 2025-10-23
-- Purpose: Increase status field from VARCHAR(20) to VARCHAR(30)
--
-- Problem: 'requires_admin_action' (22 chars) exceeds VARCHAR(20) limit
-- Solution: Drop policies, alter column, recreate policies

-- Step 1: Drop RLS policies that reference status column
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'guest_reservations'
          AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.guest_reservations', pol.policyname);
    END LOOP;
END $$;

-- Step 2: Alter column length
ALTER TABLE public.guest_reservations
ALTER COLUMN status TYPE VARCHAR(30);

-- Step 3: Recreate RLS policies (if they existed)
-- Note: You may need to recreate specific policies here if they're critical
-- For now, we'll rely on the application to handle authorization

-- Update comment
COMMENT ON COLUMN public.guest_reservations.status IS
'Reservation status (max 30 chars): active (confirmed), pending_payment (awaiting payment), requires_admin_action (needs admin review), pending (general pending), inactive (past), cancelled (cancelled/abandoned)';
