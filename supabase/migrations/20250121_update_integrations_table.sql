/**
 * Add type and webhook_url columns to integrations table
 * This migration adds missing fields needed for proper integration categorization
 */

-- Add type column to integrations table
ALTER TABLE public.integrations 
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'webhook'
CHECK (type IN ('email', 'slack', 'crm', 'sms', 'webhook', 'calendar', 'payment', 'communication', 'storage', 'productivity', 'development'));

-- Add webhook_url column if missing
ALTER TABLE public.integrations 
ADD COLUMN IF NOT EXISTS webhook_url TEXT;

-- Create index for faster queries by type
CREATE INDEX IF NOT EXISTS integrations_type_idx ON public.integrations(type);

-- Create composite index for tenant + type queries
CREATE INDEX IF NOT EXISTS integrations_tenant_type_idx ON public.integrations(tenant_id, type);

-- Add comment explaining the type field
COMMENT ON COLUMN public.integrations.type IS 'Integration category: email, slack, crm, sms, webhook, calendar, payment, communication, storage, productivity, development';
COMMENT ON COLUMN public.integrations.webhook_url IS 'Webhook URL for receiving events from this integration';
