-- Create SMS Usage Tracking Table
-- Tracks all SMS messages sent/received for billing and analytics

CREATE TABLE IF NOT EXISTS sms_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  
  -- Message details
  to_number TEXT NOT NULL,
  from_number TEXT NOT NULL,
  message_body TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  
  -- Twilio tracking
  twilio_sid TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'sent',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_sms_usage_tenant ON sms_usage(tenant_id);
CREATE INDEX idx_sms_usage_integration ON sms_usage(integration_id);
CREATE INDEX idx_sms_usage_agent ON sms_usage(agent_id);
CREATE INDEX idx_sms_usage_created_at ON sms_usage(created_at);
CREATE INDEX idx_sms_usage_direction ON sms_usage(direction);

-- Add RLS policies
ALTER TABLE sms_usage ENABLE ROW LEVEL SECURITY;

-- Tenants can view their own SMS usage
CREATE POLICY "Tenants can view own SMS usage"
  ON sms_usage
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Service role can insert SMS usage (for tracking from integrations)
CREATE POLICY "Service role can insert SMS usage"
  ON sms_usage
  FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE sms_usage IS 'Tracks SMS message usage for billing and analytics';
COMMENT ON COLUMN sms_usage.direction IS 'Whether the message was inbound or outbound';
COMMENT ON COLUMN sms_usage.twilio_sid IS 'Twilio message SID for correlation';
