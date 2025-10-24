-- Migration: Add new reservation states for pending bookings
-- Date: 2025-10-23
-- Purpose: Support MotoPress reservation states (pending_payment, requires_admin_action)

-- Drop existing constraint if it exists
ALTER TABLE public.guest_reservations
DROP CONSTRAINT IF EXISTS guest_reservations_status_check;

-- Add new constraint with all possible states
ALTER TABLE public.guest_reservations
ADD CONSTRAINT guest_reservations_status_check
CHECK (status IN (
  'active',              -- Confirmed reservation
  'pending_payment',     -- Awaiting payment completion
  'pending_admin',       -- Requires admin review/action (short name for VARCHAR(20))
  'pending',             -- General pending state (legacy)
  'inactive',            -- Inactive/past reservation
  'cancelled'            -- Cancelled or abandoned reservation
));

-- Add comment to explain the new states
COMMENT ON COLUMN public.guest_reservations.status IS
'Reservation status: active (confirmed), pending_payment (awaiting payment), requires_admin_action (needs admin review), pending (general pending), inactive (past), cancelled (cancelled/abandoned)';
