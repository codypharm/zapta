/**
 * Fix Analytics Database Functions
 * - Add missing increment_usage_metric function
 * - Add get_top_search_queries function
 * - Fix usage_metrics to support both count and value columns during transition
 */

-- Add increment_usage_metric function for atomic metric updates
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

-- Add get_top_search_queries function
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
