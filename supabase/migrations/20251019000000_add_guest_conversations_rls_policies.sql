-- RLS Policies for guest_conversations
-- Auth is handled at API layer via JWT verification, so policies are permissive for service role

-- Allow service role to INSERT conversations (API creates them after verifying JWT)
CREATE POLICY "guest_conversations_service_insert" ON guest_conversations
  FOR INSERT
  WITH CHECK (true);

-- Allow service role to SELECT conversations (API filters by guest_id after verifying JWT)
CREATE POLICY "guest_conversations_service_select" ON guest_conversations
  FOR SELECT
  USING (true);

-- Allow service role to UPDATE conversations (API verifies ownership via JWT)
CREATE POLICY "guest_conversations_service_update" ON guest_conversations
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow service role to DELETE conversations (API verifies ownership via JWT)
CREATE POLICY "guest_conversations_service_delete" ON guest_conversations
  FOR DELETE
  USING (true);

-- Add helpful comment
COMMENT ON TABLE guest_conversations IS 'Guest chat conversations. RLS enabled with permissive policies - security enforced at API layer via JWT verification.';
