/**
 * Agent Class Migration
 * 
 * CORRECT ORDER OF OPERATIONS:
 * 1. Drop existing type constraint (so we can change values)
 * 2. Add new columns (template)
 * 3. Migrate data (update type values)
 * 4. Add new type constraint (now that data is valid)
 */

-- ============================================================================
-- STEP 1: Drop Old Constraint FIRST
-- ============================================================================

-- We MUST drop the constraint before updating 'type' to values that weren't allowed before
ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS agents_type_check;

-- ============================================================================
-- STEP 2: Add New Fields
-- ============================================================================

ALTER TABLE public.agents 
  ADD COLUMN IF NOT EXISTS template TEXT;

CREATE INDEX IF NOT EXISTS agents_template_idx ON public.agents(template);

-- ============================================================================
-- STEP 3: Migrate Existing Data
-- ============================================================================

-- Now it's safe to update 'type' because there is no constraint checking it

-- 1. Migrate 'support' and 'sales' -> 'customer_assistant'
UPDATE public.agents 
SET type = 'customer_assistant' 
WHERE type IN ('support', 'sales');

-- 2. Migrate 'automation' -> 'business_assistant' (template: operations)
UPDATE public.agents 
SET type = 'business_assistant',
    template = 'operations'
WHERE type = 'automation';

-- 3. Migrate 'analytics' -> 'business_assistant' (template: analytics)
UPDATE public.agents 
SET type = 'business_assistant',
    template = 'analytics'
WHERE type = 'analytics';

-- 4. Handle any other types (fallback to general business assistant)
-- This ensures no rows are left with invalid types before we add the constraint
UPDATE public.agents 
SET type = 'business_assistant',
    template = 'general'
WHERE type NOT IN ('customer_assistant', 'business_assistant');

-- ============================================================================
-- STEP 4: Add New Constraint
-- ============================================================================

-- Now that all data is migrated, we can enforce the new constraint
ALTER TABLE public.agents ADD CONSTRAINT agents_type_check 
  CHECK (type IN ('customer_assistant', 'business_assistant'));

-- ============================================================================
-- STEP 5: Update Conversations Table
-- ============================================================================

ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS conversation_type TEXT 
  DEFAULT 'widget' 
  CHECK (conversation_type IN ('widget', 'business_assistant'));

CREATE INDEX IF NOT EXISTS conversations_type_idx 
  ON public.conversations(conversation_type);

-- ============================================================================
-- STEP 6: Add Comments
-- ============================================================================

COMMENT ON COLUMN public.agents.type IS 'Agent class: customer_assistant (widget) or business_assistant (dashboard)';
COMMENT ON COLUMN public.agents.template IS 'Business Assistant template: executive, sales, finance, customer_success, operations, marketing, analytics, or general';
COMMENT ON COLUMN public.conversations.conversation_type IS 'Conversation origin: widget (customer-facing) or business_assistant (business owner)';
