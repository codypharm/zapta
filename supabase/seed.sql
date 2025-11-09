/**
 * Seed Data for Development
 * Creates sample tenant, user, agents, and conversations for testing
 *
 * NOTE: This is for development only. Do not run in production!
 */

-- =============================================================================
-- SAMPLE TENANT
-- =============================================================================

INSERT INTO public.tenants (id, name, slug, plan)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Demo Company',
  'demo-company',
  'pro'
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SAMPLE AGENTS
-- =============================================================================

-- Note: You'll need to create a user first via Supabase Auth signup
-- Then get the user ID and insert into profiles table
-- For now, this is commented out until you create your first user

/*
-- After creating your first user, uncomment and update the UUIDs below

-- Sample profile (replace with your actual user ID from auth.users)
INSERT INTO public.profiles (id, tenant_id, email, full_name, role)
VALUES (
  'YOUR_USER_ID_HERE'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'demo@example.com',
  'Demo User',
  'owner'
) ON CONFLICT (id) DO NOTHING;

-- Sample Customer Support Agent
INSERT INTO public.agents (id, tenant_id, name, description, type, config, status, created_by)
VALUES (
  '00000000-0000-0000-0000-000000000101'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Customer Support Bot',
  'Answers customer questions about pricing and features',
  'support',
  '{
    "model": "claude-3-5-sonnet-20241022",
    "systemPrompt": "You are a helpful customer support agent. Answer questions about pricing and product features politely and concisely.",
    "temperature": 0.7,
    "maxTokens": 1000,
    "allowedIntegrations": ["email", "slack"]
  }'::jsonb,
  'active',
  'YOUR_USER_ID_HERE'::uuid
) ON CONFLICT (id) DO NOTHING;

-- Sample Sales Lead Qualifier
INSERT INTO public.agents (id, tenant_id, name, description, type, config, status, created_by)
VALUES (
  '00000000-0000-0000-0000-000000000102'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Lead Qualifier',
  'Qualifies sales leads and scores them',
  'sales',
  '{
    "model": "gpt-4o",
    "systemPrompt": "You are a sales qualification agent. Ask relevant questions to understand the lead''s needs and score them based on fit.",
    "temperature": 0.8,
    "maxTokens": 1500,
    "allowedIntegrations": ["crm", "email"]
  }'::jsonb,
  'active',
  'YOUR_USER_ID_HERE'::uuid
) ON CONFLICT (id) DO NOTHING;

-- Sample Email Auto-Responder
INSERT INTO public.agents (id, tenant_id, name, description, type, config, status, created_by)
VALUES (
  '00000000-0000-0000-0000-000000000103'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Email Auto-Responder',
  'Automatically responds to incoming emails',
  'automation',
  '{
    "model": "gpt-4o-mini",
    "systemPrompt": "You are an email auto-responder. Acknowledge receipt and provide helpful information based on the email content.",
    "temperature": 0.6,
    "maxTokens": 800,
    "allowedIntegrations": ["email"]
  }'::jsonb,
  'active',
  'YOUR_USER_ID_HERE'::uuid
) ON CONFLICT (id) DO NOTHING;

-- Sample integrations
INSERT INTO public.integrations (tenant_id, provider, credentials, config, status)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'email',
  '{"api_key": "demo_key"}'::jsonb,
  '{"from_email": "demo@example.com"}'::jsonb,
  'connected'
) ON CONFLICT DO NOTHING;

*/

-- =============================================================================
-- HELPER QUERIES FOR TESTING
-- =============================================================================

-- Check all tables
-- SELECT * FROM public.tenants;
-- SELECT * FROM public.profiles;
-- SELECT * FROM public.agents;
-- SELECT * FROM public.integrations;
-- SELECT * FROM public.conversations;
-- SELECT * FROM public.agent_executions;
-- SELECT * FROM public.usage_metrics;
