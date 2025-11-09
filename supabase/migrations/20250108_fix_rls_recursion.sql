/**
 * Fix RLS Infinite Recursion
 * The profiles table policies were referencing themselves, causing infinite recursion
 * This migration fixes that issue
 */

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Drop policies on other tables that reference profiles
DROP POLICY IF EXISTS "Users can view their own tenant" ON public.tenants;
DROP POLICY IF EXISTS "Owners can update tenant" ON public.tenants;
DROP POLICY IF EXISTS "Users can view agents in their tenant" ON public.agents;
DROP POLICY IF EXISTS "Users can create agents in their tenant" ON public.agents;
DROP POLICY IF EXISTS "Users can update agents in their tenant" ON public.agents;
DROP POLICY IF EXISTS "Users can delete agents in their tenant" ON public.agents;
DROP POLICY IF EXISTS "Users can manage integrations in their tenant" ON public.integrations;
DROP POLICY IF EXISTS "Users can view conversations in their tenant" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations in their tenant" ON public.conversations;
DROP POLICY IF EXISTS "Users can view executions in their tenant" ON public.agent_executions;
DROP POLICY IF EXISTS "Users can view metrics in their tenant" ON public.usage_metrics;
DROP POLICY IF EXISTS "Users can manage documents in their tenant" ON public.documents;

-- =============================================================================
-- PROFILES POLICIES (Fixed - no self-reference)
-- =============================================================================

-- Allow users to insert their own profile during signup
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid());

-- =============================================================================
-- TENANTS POLICIES (Fixed)
-- =============================================================================

-- Allow users to insert tenants (during signup)
CREATE POLICY "Users can insert tenants"
  ON public.tenants
  FOR INSERT
  WITH CHECK (true);

-- Users can view their own tenant (using a helper function to avoid recursion)
CREATE POLICY "Users can view own tenant"
  ON public.tenants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = tenants.id
    )
  );

-- Owners can update their tenant
CREATE POLICY "Owners can update tenant"
  ON public.tenants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = tenants.id
      AND profiles.role = 'owner'
    )
  );

-- =============================================================================
-- HELPER FUNCTION (to avoid recursion)
-- =============================================================================

-- Function to get current user's tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- =============================================================================
-- AGENTS POLICIES (Using helper function)
-- =============================================================================

CREATE POLICY "Users can view agents in their tenant"
  ON public.agents
  FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create agents in their tenant"
  ON public.agents
  FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update agents in their tenant"
  ON public.agents
  FOR UPDATE
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete agents in their tenant"
  ON public.agents
  FOR DELETE
  USING (tenant_id = get_user_tenant_id());

-- =============================================================================
-- INTEGRATIONS POLICIES
-- =============================================================================

CREATE POLICY "Users can manage integrations in their tenant"
  ON public.integrations
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- =============================================================================
-- CONVERSATIONS POLICIES
-- =============================================================================

CREATE POLICY "Users can view conversations in their tenant"
  ON public.conversations
  FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create conversations in their tenant"
  ON public.conversations
  FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

-- =============================================================================
-- AGENT_EXECUTIONS POLICIES
-- =============================================================================

CREATE POLICY "Users can view executions in their tenant"
  ON public.agent_executions
  FOR SELECT
  USING (tenant_id = get_user_tenant_id());

-- =============================================================================
-- USAGE_METRICS POLICIES
-- =============================================================================

CREATE POLICY "Users can view metrics in their tenant"
  ON public.usage_metrics
  FOR SELECT
  USING (tenant_id = get_user_tenant_id());

-- =============================================================================
-- DOCUMENTS POLICIES
-- =============================================================================

CREATE POLICY "Users can manage documents in their tenant"
  ON public.documents
  FOR ALL
  USING (tenant_id = get_user_tenant_id());
