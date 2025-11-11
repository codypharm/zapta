/**
 * Knowledge Base Analytics Migration
 * Adds tracking for document usage, search queries, and RAG effectiveness
 */

-- Document Usage Analytics Table
CREATE TABLE IF NOT EXISTS public.document_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('search_hit', 'context_used', 'citation_shown')),
  query TEXT,
  similarity_score FLOAT,
  user_session TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Search Analytics Table
CREATE TABLE IF NOT EXISTS public.search_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  results_count INTEGER NOT NULL DEFAULT 0,
  top_similarity_score FLOAT,
  user_session TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Knowledge Base Summary Stats (updated daily)
CREATE TABLE IF NOT EXISTS public.knowledge_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_documents INTEGER NOT NULL DEFAULT 0,
  total_searches INTEGER NOT NULL DEFAULT 0,
  successful_searches INTEGER NOT NULL DEFAULT 0,
  documents_used INTEGER NOT NULL DEFAULT 0,
  avg_similarity_score FLOAT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS document_analytics_tenant_id_idx ON public.document_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS document_analytics_agent_id_idx ON public.document_analytics(agent_id);
CREATE INDEX IF NOT EXISTS document_analytics_document_id_idx ON public.document_analytics(document_id);
CREATE INDEX IF NOT EXISTS document_analytics_created_at_idx ON public.document_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS document_analytics_event_type_idx ON public.document_analytics(event_type);

CREATE INDEX IF NOT EXISTS search_analytics_tenant_id_idx ON public.search_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS search_analytics_agent_id_idx ON public.search_analytics(agent_id);
CREATE INDEX IF NOT EXISTS search_analytics_created_at_idx ON public.search_analytics(created_at DESC);

CREATE INDEX IF NOT EXISTS knowledge_stats_tenant_id_idx ON public.knowledge_stats(tenant_id);
CREATE INDEX IF NOT EXISTS knowledge_stats_agent_id_idx ON public.knowledge_stats(agent_id);
CREATE INDEX IF NOT EXISTS knowledge_stats_date_idx ON public.knowledge_stats(date DESC);

-- Unique constraint for daily stats
CREATE UNIQUE INDEX IF NOT EXISTS knowledge_stats_unique_idx
  ON public.knowledge_stats(tenant_id, COALESCE(agent_id::text, 'global'), date);

-- Enable RLS
ALTER TABLE public.document_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view document analytics in their tenant"
  ON public.document_analytics
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view search analytics in their tenant"
  ON public.search_analytics
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view knowledge stats in their tenant"
  ON public.knowledge_stats
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Function to get most used documents
CREATE OR REPLACE FUNCTION get_most_used_documents(
  filter_tenant_id UUID,
  filter_agent_id UUID DEFAULT NULL,
  days_back INTEGER DEFAULT 30,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  document_id UUID,
  document_name TEXT,
  usage_count BIGINT,
  avg_similarity FLOAT,
  last_used TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    da.document_id,
    d.name as document_name,
    COUNT(*) as usage_count,
    AVG(da.similarity_score) as avg_similarity,
    MAX(da.created_at) as last_used
  FROM document_analytics da
  JOIN documents d ON da.document_id = d.id
  WHERE
    da.tenant_id = filter_tenant_id
    AND (filter_agent_id IS NULL OR da.agent_id = filter_agent_id)
    AND da.created_at >= NOW() - INTERVAL '%s days' % days_back
    AND da.event_type = 'context_used'
  GROUP BY da.document_id, d.name
  ORDER BY usage_count DESC
  LIMIT limit_count;
END;
$$;

-- Function to get search effectiveness stats
CREATE OR REPLACE FUNCTION get_search_effectiveness(
  filter_tenant_id UUID,
  filter_agent_id UUID DEFAULT NULL,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_searches BIGINT,
  successful_searches BIGINT,
  success_rate FLOAT,
  avg_results_count FLOAT,
  avg_similarity_score FLOAT,
  avg_execution_time FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_searches,
    COUNT(*) FILTER (WHERE results_count > 0) as successful_searches,
    (COUNT(*) FILTER (WHERE results_count > 0)::FLOAT / COUNT(*)::FLOAT * 100) as success_rate,
    AVG(results_count) as avg_results_count,
    AVG(top_similarity_score) FILTER (WHERE top_similarity_score IS NOT NULL) as avg_similarity_score,
    AVG(execution_time_ms) as avg_execution_time
  FROM search_analytics sa
  WHERE
    sa.tenant_id = filter_tenant_id
    AND (filter_agent_id IS NULL OR sa.agent_id = filter_agent_id)
    AND sa.created_at >= NOW() - INTERVAL '%s days' % days_back;
END;
$$;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_knowledge_stats_updated_at ON public.knowledge_stats;
CREATE TRIGGER update_knowledge_stats_updated_at
  BEFORE UPDATE ON public.knowledge_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.document_analytics IS 'Tracks individual document usage in RAG system';
COMMENT ON TABLE public.search_analytics IS 'Tracks search queries and their effectiveness';
COMMENT ON TABLE public.knowledge_stats IS 'Daily aggregated knowledge base statistics';

-- Add new metric types to usage_metrics
ALTER TABLE public.usage_metrics DROP CONSTRAINT IF EXISTS usage_metrics_metric_type_check;
ALTER TABLE public.usage_metrics
  ADD CONSTRAINT usage_metrics_metric_type_check
  CHECK (metric_type IN ('conversations', 'api_calls', 'messages', 'agents', 'tokens', 'knowledge_searches', 'knowledge_hits'));