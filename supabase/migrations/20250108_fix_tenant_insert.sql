/**
 * Fix Tenant Insert Policy
 * Allow authenticated users to create tenants during signup
 */

-- Drop existing policies on tenants
DROP POLICY IF EXISTS "Users can insert tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can view own tenant" ON public.tenants;
DROP POLICY IF EXISTS "Owners can update tenant" ON public.tenants;

-- Allow any authenticated user to insert tenants (needed for signup)
CREATE POLICY "Authenticated users can insert tenants"
  ON public.tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to view their tenant
CREATE POLICY "Users can view own tenant"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = tenants.id
    )
  );

-- Allow owners to update their tenant
CREATE POLICY "Owners can update tenant"
  ON public.tenants
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = tenants.id
      AND profiles.role = 'owner'
    )
  );
