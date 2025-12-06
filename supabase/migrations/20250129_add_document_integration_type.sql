/**
 * Add 'document' type to integrations type check constraint
 * This allows Notion and Google Drive integrations
 */

-- Drop the existing constraint
ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS integrations_type_check;

-- Re-add with 'document' included
ALTER TABLE public.integrations 
ADD CONSTRAINT integrations_type_check 
CHECK (type IN ('email', 'slack', 'crm', 'sms', 'webhook', 'calendar', 'payment', 'communication', 'storage', 'productivity', 'development', 'document'));

-- Update comment
COMMENT ON COLUMN public.integrations.type IS 'Integration category: email, slack, crm, sms, webhook, calendar, payment, communication, storage, productivity, development, document';
