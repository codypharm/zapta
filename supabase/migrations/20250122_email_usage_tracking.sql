-- Email Usage Tracking for Billing
-- Tracks email sends per tenant for billing purposes

CREATE TABLE IF NOT EXISTS email_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
  
  -- Email details
  to_address TEXT NOT NULL,
  from_address TEXT NOT NULL,
  subject TEXT,
  
  -- Resend details
  resend_id TEXT, -- Resend's message ID
  status TEXT DEFAULT 'sent', -- sent, delivered, bounced, failed
  
  -- Billing
  billable BOOLEAN DEFAULT TRUE,
  billed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_email_usage_tenant_created ON email_usage(tenant_id, created_at DESC);
CREATE INDEX idx_email_usage_billable ON email_usage(tenant_id, billable, billed_at) WHERE billable = TRUE AND billed_at IS NULL;

-- Row Level Security
ALTER TABLE email_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant's email usage"
  ON email_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.tenant_id = email_usage.tenant_id 
      AND profiles.id = auth.uid()
    )
  );

-- Only system can insert (via service role)
CREATE POLICY "Service role can insert email usage"
  ON email_usage FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Function to get monthly email count for a tenant
CREATE OR REPLACE FUNCTION get_monthly_email_count(p_tenant_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM email_usage
  WHERE tenant_id = p_tenant_id
    AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
    AND billable = TRUE;
$$ LANGUAGE SQL STABLE;

-- Function to get unbilled email count
CREATE OR REPLACE FUNCTION get_unbilled_email_count(p_tenant_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM email_usage
  WHERE tenant_id = p_tenant_id
    AND billable = TRUE
    AND billed_at IS NULL;
$$ LANGUAGE SQL STABLE;

-- Grant permissions
GRANT SELECT ON email_usage TO authenticated;
GRANT ALL ON email_usage TO service_role;

-- Comments
COMMENT ON TABLE email_usage IS 'Tracks email sends for billing and analytics';
COMMENT ON COLUMN email_usage.billable IS 'Whether this email should be billed (false for system emails)';
COMMENT ON COLUMN email_usage.billed_at IS 'When this email was included in billing';
