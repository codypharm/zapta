/**
 * Initial Database Schema
 * Creates all tables with Row-Level Security (RLS) for multi-tenancy
 *
 * Strategy: Create all tables first, then enable RLS and add policies
 */

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector extension for RAG (semantic search)
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- STEP 1: CREATE ALL TABLES
-- =============================================================================

-- TENANTS TABLE
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'business')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tenants_slug_idx ON public.tenants(slug);

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profiles_tenant_id_idx ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);

-- AGENTS TABLE
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('support', 'sales', 'automation', 'analytics')),
  config JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agents_tenant_id_idx ON public.agents(tenant_id);
CREATE INDEX IF NOT EXISTS agents_status_idx ON public.agents(status);
CREATE INDEX IF NOT EXISTS agents_type_idx ON public.agents(type);

-- INTEGRATIONS TABLE
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  credentials JSONB NOT NULL DEFAULT '{}',
  config JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS integrations_tenant_id_idx ON public.integrations(tenant_id);
CREATE INDEX IF NOT EXISTS integrations_provider_idx ON public.integrations(provider);

-- CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conversations_tenant_id_idx ON public.conversations(tenant_id);
CREATE INDEX IF NOT EXISTS conversations_agent_id_idx ON public.conversations(agent_id);
CREATE INDEX IF NOT EXISTS conversations_created_at_idx ON public.conversations(created_at DESC);

-- AGENT_EXECUTIONS TABLE
CREATE TABLE IF NOT EXISTS public.agent_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
  duration_ms INTEGER,
  input JSONB,
  output JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_executions_tenant_id_idx ON public.agent_executions(tenant_id);
CREATE INDEX IF NOT EXISTS agent_executions_agent_id_idx ON public.agent_executions(agent_id);
CREATE INDEX IF NOT EXISTS agent_executions_status_idx ON public.agent_executions(status);
CREATE INDEX IF NOT EXISTS agent_executions_created_at_idx ON public.agent_executions(created_at DESC);

-- USAGE_METRICS TABLE
CREATE TABLE IF NOT EXISTS public.usage_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('conversations', 'api_calls', 'messages', 'agents')),
  count INTEGER NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS usage_metrics_tenant_id_idx ON public.usage_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS usage_metrics_date_idx ON public.usage_metrics(date DESC);
CREATE INDEX IF NOT EXISTS usage_metrics_type_idx ON public.usage_metrics(metric_type);

CREATE UNIQUE INDEX IF NOT EXISTS usage_metrics_unique_idx
  ON public.usage_metrics(tenant_id, metric_type, date);

-- DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_tenant_id_idx ON public.documents(tenant_id);
CREATE INDEX IF NOT EXISTS documents_agent_id_idx ON public.documents(agent_id);

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS documents_embedding_idx
  ON public.documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- =============================================================================
-- STEP 2: ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 3: CREATE RLS POLICIES
-- =============================================================================

-- TENANTS POLICIES
CREATE POLICY "Users can view their own tenant"
  ON public.tenants
  FOR SELECT
  USING (
    id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Owners can update tenant"
  ON public.tenants
  FOR UPDATE
  USING (
    id IN (
      SELECT tenant_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- PROFILES POLICIES
CREATE POLICY "Users can view profiles in their tenant"
  ON public.profiles
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- AGENTS POLICIES
CREATE POLICY "Users can view agents in their tenant"
  ON public.agents
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create agents in their tenant"
  ON public.agents
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update agents in their tenant"
  ON public.agents
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete agents in their tenant"
  ON public.agents
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- INTEGRATIONS POLICIES
CREATE POLICY "Users can manage integrations in their tenant"
  ON public.integrations
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- CONVERSATIONS POLICIES
CREATE POLICY "Users can view conversations in their tenant"
  ON public.conversations
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations in their tenant"
  ON public.conversations
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- AGENT_EXECUTIONS POLICIES
CREATE POLICY "Users can view executions in their tenant"
  ON public.agent_executions
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can create executions"
  ON public.agent_executions
  FOR INSERT
  WITH CHECK (true);

-- USAGE_METRICS POLICIES
CREATE POLICY "Users can view metrics in their tenant"
  ON public.usage_metrics
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can manage metrics"
  ON public.usage_metrics
  FOR ALL
  USING (true);

-- DOCUMENTS POLICIES
CREATE POLICY "Users can manage documents in their tenant"
  ON public.documents
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- =============================================================================
-- STEP 4: CREATE HELPER FUNCTIONS
-- =============================================================================

/**
 * Function to match documents using vector similarity search
 */
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_tenant_id uuid DEFAULT NULL,
  filter_agent_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  FROM documents
  WHERE
    (filter_tenant_id IS NULL OR documents.tenant_id = filter_tenant_id)
    AND (filter_agent_id IS NULL OR documents.agent_id = filter_agent_id)
    AND 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

/**
 * Function to automatically update updated_at timestamp
 */
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 5: CREATE TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS update_tenants_updated_at ON public.tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agents_updated_at ON public.agents;
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_integrations_updated_at ON public.integrations;
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- STEP 6: ADD COMMENTS
-- =============================================================================

COMMENT ON TABLE public.tenants IS 'Organizations/workspaces for multi-tenancy';
COMMENT ON TABLE public.profiles IS 'User profiles extending auth.users';
COMMENT ON TABLE public.agents IS 'AI agent configurations';
COMMENT ON TABLE public.integrations IS 'Third-party integration credentials';
COMMENT ON TABLE public.conversations IS 'Conversation history between users and agents';
COMMENT ON TABLE public.agent_executions IS 'Audit log of agent executions';
COMMENT ON TABLE public.usage_metrics IS 'Usage tracking for billing and quotas';
COMMENT ON TABLE public.documents IS 'Documents for RAG (knowledge base)';
