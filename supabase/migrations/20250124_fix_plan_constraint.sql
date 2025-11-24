/**
 * Fix tenants plan check constraint
 * Adds 'enterprise' to the allowed subscription plans
 */

-- Drop the existing constraint
ALTER TABLE public.tenants 
DROP CONSTRAINT IF EXISTS tenants_plan_check;

-- Add new constraint with all plan types including enterprise
ALTER TABLE public.tenants
ADD CONSTRAINT tenants_plan_check 
CHECK (subscription_plan IN ('free', 'starter', 'pro', 'business', 'enterprise'));

-- Verify constraint
COMMENT ON CONSTRAINT tenants_plan_check ON public.tenants IS 
  'Ensures subscription_plan is one of: free, starter, pro, business, enterprise';
