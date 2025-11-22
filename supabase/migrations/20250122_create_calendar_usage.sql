-- Create Calendar Usage Tracking Table
-- Tracks all calendar operations for analytics and rate limit monitoring

CREATE TABLE IF NOT EXISTS calendar_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  
  -- Action details
  action_type TEXT NOT NULL CHECK (action_type IN (
    'create_event',
    'update_event', 
    'delete_event',
    'list_events',
    'check_availability',
    'find_available_slots'
  )),
  
  -- Event details (if applicable)
  event_id TEXT,
  event_title TEXT,
  event_start TIMESTAMPTZ,
  event_end TIMESTAMPTZ,
  attendee_email TEXT,
  
  -- API tracking
  google_event_id TEXT,
  calendar_id TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_calendar_usage_tenant ON calendar_usage(tenant_id);
CREATE INDEX idx_calendar_usage_integration ON calendar_usage(integration_id);
CREATE INDEX idx_calendar_usage_agent ON calendar_usage(agent_id);
CREATE INDEX idx_calendar_usage_action_type ON calendar_usage(action_type);
CREATE INDEX idx_calendar_usage_created_at ON calendar_usage(created_at);
CREATE INDEX idx_calendar_usage_event_start ON calendar_usage(event_start);

-- Add RLS policies
ALTER TABLE calendar_usage ENABLE ROW LEVEL SECURITY;

-- Tenants can view their own calendar usage
CREATE POLICY "Tenants can view own calendar usage"
  ON calendar_usage
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Service role can insert calendar usage (for tracking from integrations)
CREATE POLICY "Service role can insert calendar usage"
  ON calendar_usage
  FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE calendar_usage IS 'Tracks calendar operations for analytics and rate limit monitoring';
COMMENT ON COLUMN calendar_usage.action_type IS 'Type of calendar operation performed';
COMMENT ON COLUMN calendar_usage.google_event_id IS 'Google Calendar event ID for correlation';
