-- =============================================================================
-- LEADS TABLE
-- Store visitor contact information collected before chat
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,

  -- Contact information
  name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,

  -- Custom fields (for future extensibility)
  custom_data JSONB DEFAULT '{}',

  -- Metadata
  source TEXT DEFAULT 'widget', -- widget, dashboard, api
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS leads_tenant_id_idx ON public.leads(tenant_id);
CREATE INDEX IF NOT EXISTS leads_agent_id_idx ON public.leads(agent_id);
CREATE INDEX IF NOT EXISTS leads_conversation_id_idx ON public.leads(conversation_id);
CREATE INDEX IF NOT EXISTS leads_email_idx ON public.leads(email);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads(created_at DESC);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view leads in their tenant"
  ON public.leads
  FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create leads in their tenant"
  ON public.leads
  FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update leads in their tenant"
  ON public.leads
  FOR UPDATE
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete leads in their tenant"
  ON public.leads
  FOR DELETE
  USING (tenant_id = get_user_tenant_id());

-- =============================================================================
-- UPDATE AGENTS TABLE
-- Add lead collection configuration
-- =============================================================================

-- Note: The config column already exists as JSONB, we just need to update
-- the agent creation/edit forms to include leadCollection settings
-- Structure will be: config.leadCollection = { enabled, fields, welcomeMessage, etc }

COMMENT ON TABLE public.leads IS 'Stores visitor contact information collected before chat interactions';
COMMENT ON COLUMN public.leads.custom_data IS 'Extensible field for custom contact information';
COMMENT ON COLUMN public.leads.source IS 'Where the lead was created: widget, dashboard, or api';
