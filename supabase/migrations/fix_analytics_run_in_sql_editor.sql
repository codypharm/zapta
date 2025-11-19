/**
 * Fix Analytics Functions - Run this in Supabase SQL Editor
 * This recreates all analytics functions with correct PostgreSQL syntax
 */

-- Drop and recreate get_most_used_documents with fixed syntax
DROP FUNCTION IF EXISTS public.get_most_used_documents(UUID, UUID, INTEGER, INTEGER);
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
    AND da.created_at >= NOW() - make_interval(days => days_back)
    AND da.event_type = 'context_used'
  GROUP BY da.document_id, d.name
  ORDER BY usage_count DESC
  LIMIT limit_count;
END;
$$;

-- Drop and recreate get_search_effectiveness with fixed syntax
DROP FUNCTION IF EXISTS public.get_search_effectiveness(UUID, UUID, INTEGER);
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
    AVG(results_count)::FLOAT as avg_results_count,
    (AVG(top_similarity_score) FILTER (WHERE top_similarity_score IS NOT NULL))::FLOAT as avg_similarity_score,
    AVG(execution_time_ms)::FLOAT as avg_execution_time
  FROM search_analytics sa
  WHERE
    sa.tenant_id = filter_tenant_id
    AND (filter_agent_id IS NULL OR sa.agent_id = filter_agent_id)
    AND sa.created_at >= NOW() - make_interval(days => days_back);
END;
$$;

-- Create increment_usage_metric function
CREATE OR REPLACE FUNCTION increment_usage_metric(
  p_tenant_id UUID,
  p_metric_type TEXT,
  p_date DATE
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Try to update existing metric
  UPDATE usage_metrics
  SET value = value + 1
  WHERE tenant_id = p_tenant_id
    AND metric_type = p_metric_type
    AND date = p_date;

  -- If no row was updated, insert new one
  IF NOT FOUND THEN
    INSERT INTO usage_metrics (tenant_id, metric_type, date, value)
    VALUES (p_tenant_id, p_metric_type, p_date, 1)
    ON CONFLICT (tenant_id, metric_type, date)
    DO UPDATE SET value = usage_metrics.value + 1;
  END IF;
END;
$$;

-- Create get_top_search_queries function
CREATE OR REPLACE FUNCTION get_top_search_queries(
  filter_tenant_id UUID,
  filter_agent_id UUID DEFAULT NULL,
  days_back INTEGER DEFAULT 30,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  query TEXT,
  search_count BIGINT,
  avg_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sa.query,
    COUNT(*) as search_count,
    AVG(sa.top_similarity_score) as avg_score
  FROM search_analytics sa
  WHERE
    sa.tenant_id = filter_tenant_id
    AND (filter_agent_id IS NULL OR sa.agent_id = filter_agent_id)
    AND sa.created_at >= NOW() - make_interval(days => days_back)
    AND sa.results_count > 0
  GROUP BY sa.query
  ORDER BY search_count DESC
  LIMIT limit_count;
END;
$$;

-- Add comments
COMMENT ON FUNCTION increment_usage_metric IS 'Atomically increment a usage metric for a tenant and date';
COMMENT ON FUNCTION get_top_search_queries IS 'Get the most frequent search queries with success metrics';
COMMENT ON FUNCTION get_most_used_documents IS 'Get most frequently used documents in RAG context';
COMMENT ON FUNCTION get_search_effectiveness IS 'Get search effectiveness statistics';
