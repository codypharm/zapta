/**
 * Update Agents and Usage Metrics Tables
 * - Rename config to configuration in agents table
 * - Update usage_metrics schema to support detailed tracking
 * - Remove created_by requirement from agents
 */

-- Rename config to configuration in agents table
ALTER TABLE public.agents RENAME COLUMN config TO configuration;

-- Make created_by optional (nullable) since we'll auto-set it
ALTER TABLE public.agents ALTER COLUMN created_by DROP NOT NULL;

-- Update usage_metrics to support more detailed tracking
ALTER TABLE public.usage_metrics DROP CONSTRAINT IF EXISTS usage_metrics_metric_type_check;

-- Update metric_type to support tokens tracking
ALTER TABLE public.usage_metrics
  ADD CONSTRAINT usage_metrics_metric_type_check
  CHECK (metric_type IN ('conversations', 'api_calls', 'messages', 'agents', 'message', 'tokens'));

-- Rename count to value for clarity
ALTER TABLE public.usage_metrics RENAME COLUMN count TO value;

-- Make date optional and add agent_id reference
ALTER TABLE public.usage_metrics ALTER COLUMN date DROP NOT NULL;
ALTER TABLE public.usage_metrics ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE;
ALTER TABLE public.usage_metrics ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add index for agent_id
CREATE INDEX IF NOT EXISTS usage_metrics_agent_id_idx ON public.usage_metrics(agent_id);

-- Update unique constraint to be optional with date
DROP INDEX IF EXISTS usage_metrics_unique_idx;
CREATE UNIQUE INDEX IF NOT EXISTS usage_metrics_unique_idx
  ON public.usage_metrics(tenant_id, metric_type, date)
  WHERE date IS NOT NULL;

COMMENT ON TABLE public.usage_metrics IS 'Usage tracking for billing, quotas, and analytics (supports both daily aggregates and per-message tracking)';
