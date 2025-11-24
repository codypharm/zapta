/**
 * Add RLS to Billing Tables
 * Enables Row Level Security on subscriptions, payment_methods, and invoices
 */

-- Enable RLS on all billing tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SUBSCRIPTIONS POLICIES
-- ============================================================================

-- Users can view their own tenant's subscription
CREATE POLICY "Users can view own tenant subscription"
  ON public.subscriptions
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Only service role can insert subscriptions (via Stripe webhook)
-- No user-facing policy needed for INSERT

-- Only service role can update subscriptions (via Stripe webhook)
-- No user-facing policy needed for UPDATE

-- Only service role can delete subscriptions
-- No user-facing policy needed for DELETE

-- ============================================================================
-- PAYMENT_METHODS POLICIES
-- ============================================================================

-- Users can view their own tenant's payment methods
CREATE POLICY "Users can view own tenant payment methods"
  ON public.payment_methods
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Only service role can insert payment methods (via Stripe webhook)
-- No user-facing policy needed for INSERT

-- Only service role can update payment methods (via Stripe webhook)
-- No user-facing policy needed for UPDATE

-- Users can delete their own tenant's payment methods
CREATE POLICY "Users can delete own tenant payment methods"
  ON public.payment_methods
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- INVOICES POLICIES
-- ============================================================================

-- Users can view their own tenant's invoices
CREATE POLICY "Users can view own tenant invoices"
  ON public.invoices
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Only service role can insert invoices (via Stripe webhook)
-- No user-facing policy needed for INSERT

-- Only service role can update invoices (via Stripe webhook)
-- No user-facing policy needed for UPDATE

-- Only service role can delete invoices
-- No user-facing policy needed for DELETE

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can view own tenant subscription" ON public.subscriptions IS 
  'Allows users to view their tenant subscription details';

COMMENT ON POLICY "Users can view own tenant payment methods" ON public.payment_methods IS 
  'Allows users to view their tenant payment methods';

COMMENT ON POLICY "Users can delete own tenant payment methods" ON public.payment_methods IS 
  'Allows users to remove their payment methods';

COMMENT ON POLICY "Users can view own tenant invoices" ON public.invoices IS 
  'Allows users to view their tenant invoices';
