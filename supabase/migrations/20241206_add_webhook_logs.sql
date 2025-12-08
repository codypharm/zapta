-- Webhook Logs Table
-- Tracks webhook delivery attempts for debugging and monitoring

CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    integration_id UUID REFERENCES public.integrations(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 1,
    error_message TEXT,
    delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_webhook_logs_tenant_id ON public.webhook_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_integration_id ON public.webhook_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON public.webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON public.webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_delivered_at ON public.webhook_logs(delivered_at);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see webhook logs for their tenant
CREATE POLICY "Users can view their tenant's webhook logs"
    ON public.webhook_logs
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Grant access
GRANT SELECT ON public.webhook_logs TO authenticated;
GRANT INSERT ON public.webhook_logs TO authenticated;
