# Agent-as-a-Service Platform - Implementation Plan
**TypeScript-First, Serverless Architecture**

---

## Design Philosophy

**UI Inspiration: HubSpot's Minimalist Approach**
- Clean white backgrounds with subtle gray accents
- Generous whitespace and breathing room
- Orange accent color (#FF7A59) for CTAs
- Simple card-based layouts
- Clear typography hierarchy (Inter or similar sans-serif)
- Minimal borders, use shadows for depth
- Focused single-column flows for key actions
- Subtle animations and micro-interactions
- Progressive disclosure - show advanced options only when needed

**Code Philosophy**
- Senior-level quality, junior-level readability
- Comprehensive inline comments explaining WHY, not just WHAT
- Descriptive variable and function names
- Small, single-purpose functions
- Type safety everywhere with TypeScript
- Consistent patterns across the codebase

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 15 (App Router) | Full-stack React with SSR, TypeScript |
| **UI** | TailwindCSS + shadcn/ui | Utility-first CSS, customizable components |
| **Database** | Supabase PostgreSQL | Managed DB with auth, realtime, storage |
| **Auth** | Supabase Auth | Built-in multi-tenant auth |
| **LLM** | Vercel AI SDK | Streaming, multi-provider support |
| **Jobs** | Trigger.dev | Serverless background tasks |
| **Payments** | Stripe | Subscription & usage billing |
| **Deployment** | Vercel | Zero-config, auto-scaling |

---

## Project Structure

```
zapta/
├── app/
│   ├── (auth)/              # Auth pages (login, signup)
│   ├── (dashboard)/         # Protected dashboard routes
│   │   ├── agents/          # Agent management
│   │   ├── conversations/   # Conversation viewer
│   │   ├── integrations/    # Integration marketplace
│   │   └── settings/        # Settings & billing
│   ├── api/                 # API routes
│   └── layout.tsx
├── components/
│   ├── ui/                  # shadcn/ui base components
│   ├── agents/              # Agent-specific components
│   ├── integrations/        # Integration components
│   └── shared/              # Shared components
├── lib/
│   ├── supabase/            # Database client & types
│   ├── ai/                  # LLM & agent runtime
│   ├── integrations/        # Integration implementations
│   └── utils/               # Utilities & helpers
├── trigger/                 # Background jobs
├── supabase/                # Database migrations
└── types/                   # Shared TypeScript types
```

---

## Phase 1: Foundation (Week 1)

### Setup & Configuration
**Goal:** Initialize project with all tooling and basic structure

**Tasks:**
1. Initialize Next.js 15 with TypeScript, App Router, TailwindCSS
2. Install dependencies: Supabase, Vercel AI SDK, shadcn/ui, Zod
3. Configure environment variables
4. Set up Supabase project (database, auth)
5. Install shadcn/ui components (button, card, input, form, etc.)
6. Create base layout with HubSpot-inspired design system

**Code Standards:**
```typescript
// Example: Well-commented utility function
/**
 * Creates a Supabase client for server-side operations
 * Uses cookies for auth state persistence across requests
 *
 * @returns Authenticated Supabase client with user context
 */
export function createServerClient() {
  const cookieStore = cookies();

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}
```

**Deliverables:**
- ✅ Working Next.js app with dev server
- ✅ Supabase connected and configured
- ✅ Base UI components installed
- ✅ ESLint + Prettier configured

---

## Phase 2: Database Schema (Week 1)

### Database Design
**Goal:** Create multi-tenant database schema with RLS

**Schema Tables:**

```sql
-- Organizations (tenants)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free', -- free, pro, business
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  tenant_id UUID REFERENCES tenants(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'member', -- owner, admin, member
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agents
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- support, sales, automation, analytics
  config JSONB NOT NULL, -- LLM config, prompts, etc.
  status TEXT DEFAULT 'inactive', -- active, inactive, error
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integrations (OAuth credentials)
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  provider TEXT NOT NULL, -- slack, email, sms, crm
  credentials JSONB NOT NULL, -- encrypted OAuth tokens
  config JSONB, -- provider-specific settings
  status TEXT DEFAULT 'connected',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  agent_id UUID REFERENCES agents(id),
  messages JSONB NOT NULL, -- array of message objects
  metadata JSONB, -- custom fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent executions (audit log)
CREATE TABLE agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  agent_id UUID REFERENCES agents(id),
  status TEXT NOT NULL, -- success, error, timeout
  duration_ms INTEGER,
  input JSONB,
  output JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage metrics
CREATE TABLE usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  metric_type TEXT NOT NULL, -- conversations, api_calls, messages
  count INTEGER NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Row-Level Security (RLS):**
```sql
-- Enable RLS on all tables
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Example RLS policy: Users can only access their tenant's data
CREATE POLICY tenant_isolation ON agents
  FOR ALL
  USING (tenant_id = (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ));
```

**Deliverables:**
- ✅ Database schema created
- ✅ RLS policies applied
- ✅ TypeScript types generated from schema
- ✅ Seed data for development

---

## Phase 3: Authentication (Week 1-2)

### Auth Implementation
**Goal:** Complete auth flow with organization support

**Tasks:**
1. Build login page (minimal, HubSpot-style)
2. Build signup page with organization creation
3. Create auth middleware for protected routes
4. Implement session management
5. Add role-based access control

**UI Design (HubSpot-inspired):**
```
┌─────────────────────────────────────────┐
│                                         │
│              [Logo]                     │
│                                         │
│     Welcome back                        │
│     Sign in to your account             │
│                                         │
│     ┌─────────────────────────────┐    │
│     │ Email                       │    │
│     └─────────────────────────────┘    │
│                                         │
│     ┌─────────────────────────────┐    │
│     │ Password                    │    │
│     └─────────────────────────────┘    │
│                                         │
│     [ Sign in →  ] (orange button)     │
│                                         │
│     Or continue with                    │
│     [Google] [GitHub]                   │
│                                         │
└─────────────────────────────────────────┘
```

**Code Example:**
```typescript
// app/(auth)/login/page.tsx
/**
 * Login Page
 * Minimal, HubSpot-inspired design with email/password and OAuth
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md p-8 shadow-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to your account
          </p>
        </div>

        {/* Auth form component */}
        <AuthForm />
      </Card>
    </div>
  );
}
```

**Deliverables:**
- ✅ Login/signup pages
- ✅ OAuth integration (Google, GitHub)
- ✅ Organization creation flow
- ✅ Protected route middleware

---

## Phase 4: Agent Builder (Week 2-3)

### Natural Language Agent Creation
**Goal:** Let users describe agents in plain English

**UI Flow:**
```
Step 1: What should your agent do?
┌─────────────────────────────────────────────────┐
│ Describe your agent in plain English           │
│ ┌─────────────────────────────────────────────┐ │
│ │ e.g. "Reply to customer emails about        │ │
│ │ pricing and send follow-up reminders"       │ │
│ └─────────────────────────────────────────────┘ │
│                                [ Continue → ]   │
└─────────────────────────────────────────────────┘

Step 2: Review configuration
┌─────────────────────────────────────────────────┐
│ Agent: Customer Email Responder                 │
│                                                  │
│ Type: Customer Support                          │
│ Trigger: Incoming email                         │
│ Actions: Send email reply, Create reminder      │
│ Integrations: Email (SendGrid)                  │
│                                                  │
│ [ ← Back ]              [ Create Agent → ]      │
└─────────────────────────────────────────────────┘
```

**Implementation:**
```typescript
// lib/ai/agent-parser.ts
/**
 * Parses natural language description into agent configuration
 * Uses Claude to understand user intent and extract structured config
 *
 * @param description - User's natural language description
 * @returns Structured agent configuration
 */
export async function parseAgentDescription(
  description: string
): Promise<AgentConfig> {
  const prompt = `You are an expert at understanding user requirements for AI agents.
Parse this description into a structured agent configuration:

"${description}"

Extract:
1. Agent type (support, sales, automation, analytics)
2. Trigger type (email, slack, webhook, scheduled)
3. Required actions (send_email, create_ticket, update_crm, etc.)
4. Integrations needed (email, slack, sms, crm)
5. Suggested system prompt

Return as JSON.`;

  // Use Anthropic Claude for parsing
  const response = await generateText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    prompt,
  });

  // Parse and validate response
  const config = JSON.parse(response.text);
  return agentConfigSchema.parse(config);
}
```

**Agent Templates:**
1. **Customer Support Bot** - Answers FAQs, escalates complex issues
2. **Lead Qualifier** - Asks qualifying questions, scores leads
3. **Email Auto-Responder** - Acknowledges emails, sends templated responses
4. **Daily Digest** - Aggregates data, sends summary reports

**Deliverables:**
- ✅ Natural language input interface
- ✅ LLM-powered intent parser
- ✅ Configuration review/edit UI
- ✅ 4 pre-built templates
- ✅ Agent CRUD operations

---

## Phase 5: Agent Runtime (Week 3-4)

### Agent Execution Engine
**Goal:** Execute agents based on triggers with LLM

**Architecture:**
```
Trigger (Webhook/Manual/Scheduled)
  ↓
Load Agent Config from DB
  ↓
Build Context (conversation history, integrations)
  ↓
Execute with LLM (streaming)
  ↓
Process Response & Execute Actions
  ↓
Log Execution & Store Results
```

**Implementation:**
```typescript
// lib/ai/agent-executor.ts
/**
 * Executes an agent with given input
 * Handles context loading, LLM invocation, action execution
 *
 * @param agentId - Agent to execute
 * @param input - Input data (user message, webhook payload, etc.)
 * @param tenantId - Tenant context for data isolation
 */
export async function executeAgent(
  agentId: string,
  input: AgentInput,
  tenantId: string
): Promise<AgentOutput> {
  const startTime = Date.now();

  try {
    // 1. Load agent configuration
    const agent = await loadAgent(agentId, tenantId);

    // 2. Build context (conversation history, knowledge base)
    const context = await buildContext(agent, input);

    // 3. Execute with LLM
    const llmResponse = await callLLM(agent.config, context);

    // 4. Execute actions based on response
    const actions = await executeActions(agent, llmResponse);

    // 5. Store results
    await storeExecution({
      agentId,
      tenantId,
      status: 'success',
      duration: Date.now() - startTime,
      input,
      output: llmResponse,
    });

    return { success: true, response: llmResponse, actions };

  } catch (error) {
    // Log error and return graceful failure
    await storeExecution({
      agentId,
      tenantId,
      status: 'error',
      duration: Date.now() - startTime,
      error: error.message,
    });

    throw error;
  }
}
```

**Chat Interface (Streaming):**
```typescript
// app/api/chat/route.ts
/**
 * Streaming chat endpoint for real-time agent responses
 * Uses Vercel AI SDK for streaming text generation
 */
export async function POST(req: Request) {
  const { agentId, message } = await req.json();

  // Load agent config
  const agent = await getAgent(agentId);

  // Stream response with Vercel AI SDK
  const result = await streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    system: agent.config.systemPrompt,
    messages: [{ role: 'user', content: message }],
  });

  return result.toAIStreamResponse();
}
```

**Deliverables:**
- ✅ Agent executor with error handling
- ✅ Streaming chat interface
- ✅ Execution logging
- ✅ Manual, webhook, scheduled triggers

---

## Phase 6: Integrations (Week 5-6)

### Integration Framework
**Goal:** Modular integration system with OAuth

**Base Interface:**
```typescript
// lib/integrations/base.ts
/**
 * Base interface for all integrations
 * All integrations must implement these methods
 */
export interface Integration {
  /** Integration provider name */
  provider: string;

  /** Authenticate with OAuth or API key */
  authenticate(credentials: unknown): Promise<void>;

  /** Test connection health */
  testConnection(): Promise<boolean>;

  /** Execute an action (send message, create record, etc.) */
  executeAction(action: string, params: unknown): Promise<unknown>;

  /** Handle incoming webhooks */
  handleWebhook?(payload: unknown): Promise<void>;
}
```

### Email Integration (SendGrid)
```typescript
// lib/integrations/email.ts
/**
 * Email integration using SendGrid
 * Supports sending emails and receiving via webhook
 */
export class EmailIntegration implements Integration {
  provider = 'email';
  private client: SendGridClient;

  /**
   * Send email via SendGrid
   */
  async sendEmail(params: {
    to: string;
    subject: string;
    body: string;
  }): Promise<void> {
    await this.client.send({
      to: params.to,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: params.subject,
      html: params.body,
    });
  }

  /**
   * Handle incoming email webhook from SendGrid
   */
  async handleWebhook(payload: SendGridWebhook): Promise<void> {
    // Extract email data
    const { from, subject, text } = payload;

    // Find agent configured for this email
    const agent = await findAgentByTrigger('email', from);

    // Execute agent with email content
    if (agent) {
      await executeAgent(agent.id, { from, subject, text });
    }
  }
}
```

### Slack Integration
```typescript
// lib/integrations/slack.ts
/**
 * Slack integration with OAuth, messages, slash commands
 */
export class SlackIntegration implements Integration {
  /**
   * Send message to Slack channel
   */
  async sendMessage(params: {
    channel: string;
    text: string;
  }): Promise<void> {
    await this.client.chat.postMessage({
      channel: params.channel,
      text: params.text,
    });
  }

  /**
   * Handle Slack events (mentions, DMs)
   */
  async handleEvent(event: SlackEvent): Promise<void> {
    if (event.type === 'app_mention') {
      // Agent was mentioned, respond
      const agent = await findAgentByTrigger('slack_mention');
      const response = await executeAgent(agent.id, {
        message: event.text,
        channel: event.channel,
      });

      await this.sendMessage({
        channel: event.channel,
        text: response.text,
      });
    }
  }
}
```

**Integration UI (Marketplace):**
```
┌───────────────────────────────────────────────┐
│  Integrations                                 │
│                                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│  │  📧     │  │  💬     │  │  📱     │      │
│  │  Email  │  │  Slack  │  │  SMS    │      │
│  │ Connect │  │Connected│  │ Connect │      │
│  └─────────┘  └─────────┘  └─────────┘      │
│                                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│  │  🎯     │  │  🔗     │  │  📊     │      │
│  │  CRM    │  │Webhooks │  │Database │      │
│  │ Connect │  │  Setup  │  │ Connect │      │
│  └─────────┘  └─────────┘  └─────────┘      │
└───────────────────────────────────────────────┘
```

**Deliverables:**
- ✅ Integration base interface
- ✅ Email (SendGrid) - send + receive
- ✅ Slack - messages, mentions, slash commands
- ✅ SMS (Twilio) - send + receive
- ✅ CRM (HubSpot) - contacts, deals
- ✅ Webhooks - generic incoming/outgoing
- ✅ OAuth flows for each
- ✅ Integration marketplace UI

---

## Phase 7: Monitoring (Week 7)

### Analytics Dashboard
**Goal:** HubSpot-style analytics with clean charts

**UI Design:**
```
┌──────────────────────────────────────────────┐
│  Analytics                    Last 30 days ▾ │
│                                              │
│  ┌─────────────┐  ┌─────────────┐          │
│  │ 1,234       │  │ 856         │          │
│  │ Conversations│  │ Messages    │          │
│  │ +12% ↑      │  │ +8% ↑       │          │
│  └─────────────┘  └─────────────┘          │
│                                              │
│  [Conversations Over Time Chart]            │
│   ▃▄▅█▇▆▅▄▃▂▁▂▃▄▅▆▇█▆▅▄▃                 │
│                                              │
│  Top Performing Agents                       │
│  ┌────────────────────────────────────────┐ │
│  │ Customer Support Bot    523 conv.  ✓   │ │
│  │ Lead Qualifier          234 conv.  ✓   │ │
│  │ Email Responder         123 conv.  ✓   │ │
│  └────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

**Implementation:**
```typescript
// app/(dashboard)/analytics/page.tsx
/**
 * Analytics dashboard with metrics and charts
 * Shows conversations, messages, agent performance
 */
export default async function AnalyticsPage() {
  // Fetch metrics for current tenant
  const metrics = await getMetrics({
    tenantId: currentTenantId,
    period: 'last_30_days',
  });

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Conversations"
          value={metrics.conversations.total}
          change={metrics.conversations.change}
        />
        <MetricCard
          title="Messages Sent"
          value={metrics.messages.total}
          change={metrics.messages.change}
        />
        <MetricCard
          title="Active Agents"
          value={metrics.agents.active}
          change={metrics.agents.change}
        />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Conversations Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ConversationsChart data={metrics.timeline} />
        </CardContent>
      </Card>

      {/* Top agents */}
      <TopAgentsTable agents={metrics.topAgents} />
    </div>
  );
}
```

**Deliverables:**
- ✅ Analytics dashboard
- ✅ Conversation viewer with filters
- ✅ Real-time activity feed (Supabase Realtime)
- ✅ Error logs and debugging
- ✅ Export functionality

---

## Phase 8: Background Jobs (Week 8)

### Trigger.dev Integration
**Goal:** Scheduled agents and async processing

**Setup:**
```typescript
// trigger.config.ts
import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_xxx",
  runtime: "node",
  logLevel: "info",
});
```

**Scheduled Agent Job:**
```typescript
// trigger/scheduled-agents.ts
import { schedules } from "@trigger.dev/sdk/v3";

/**
 * Runs scheduled agents based on their cron configuration
 * Executes daily reports, periodic checks, etc.
 */
export const scheduledAgents = schedules.task({
  id: "scheduled-agents",
  // Run every hour
  cron: "0 * * * *",
  run: async (payload) => {
    // Find all agents with scheduled triggers due now
    const agents = await getScheduledAgents();

    for (const agent of agents) {
      // Execute each agent
      await executeAgent(agent.id, {
        trigger: 'scheduled',
        timestamp: new Date(),
      }, agent.tenantId);
    }
  },
});
```

**Deliverables:**
- ✅ Trigger.dev configured
- ✅ Scheduled agent execution
- ✅ Async webhook processing
- ✅ Email queue

---

## Phase 9: Billing (Week 9)

### Stripe Integration
**Goal:** Subscription billing with usage tracking

**Pricing Tiers:**
```typescript
// Free: $0/mo
{
  agents: 1,
  conversations: 100,
  integrations: ['email'],
}

// Pro: $49/mo
{
  agents: 10,
  conversations: 5000,
  integrations: 'all',
}

// Business: $199/mo
{
  agents: 'unlimited',
  conversations: 50000,
  integrations: 'all',
  support: 'priority',
}
```

**Usage Enforcement:**
```typescript
// lib/billing/quota.ts
/**
 * Check if tenant has quota available for action
 * Throws error if limit exceeded
 */
export async function checkQuota(
  tenantId: string,
  metric: 'conversations' | 'agents' | 'messages'
): Promise<void> {
  const tenant = await getTenant(tenantId);
  const usage = await getCurrentUsage(tenantId, metric);
  const limit = PLAN_LIMITS[tenant.plan][metric];

  if (usage >= limit) {
    throw new QuotaExceededError(
      `You've reached your ${metric} limit. Upgrade to continue.`
    );
  }
}
```

**Deliverables:**
- ✅ Stripe checkout integration
- ✅ Usage tracking and quotas
- ✅ Billing dashboard
- ✅ Upgrade/downgrade flows

---

## Phase 9.5: Notification System (Week 9-10)

### Email & In-App Notifications
**Goal:** Keep users informed of important events and activity

**Current Status:**
- ✅ Notification preferences UI (Settings page)
- ✅ Database column for preferences (`profiles.notification_preferences`)
- ❌ Email sending infrastructure (needs implementation)
- ❌ In-app notification system (needs implementation)
- ❌ Notification triggers (needs implementation)

**Email Notifications (Priority):**
```typescript
// lib/notifications/email.ts
/**
 * Email notification system using Resend
 * Sends notifications based on user preferences
 */
export async function sendEmailNotification(params: {
  to: string;
  type: 'new_lead' | 'new_conversation' | 'daily_summary' | 'weekly_summary';
  data: any;
  tenantId: string;
}): Promise<void> {
  // 1. Check user's notification preferences
  const preferences = await getNotificationPreferences(params.to);

  // 2. Check if this notification type is enabled
  const typeMap = {
    new_lead: preferences.email.newLeads,
    new_conversation: preferences.email.newConversations,
    daily_summary: preferences.email.dailySummary,
    weekly_summary: preferences.email.weeklySummary,
  };

  if (!typeMap[params.type]) {
    return; // User has disabled this notification
  }

  // 3. Get email template
  const template = getEmailTemplate(params.type, params.data);

  // 4. Send via Resend
  await resend.emails.send({
    from: 'notifications@zapta.ai',
    to: params.to,
    subject: template.subject,
    react: template.component, // React Email component
  });
}
```

**Email Templates (React Email):**
```typescript
// emails/new-lead.tsx
/**
 * Email template for new lead notifications
 * Uses React Email for consistent, beautiful emails
 */
export function NewLeadEmail({ lead, agent }: {
  lead: Lead;
  agent: Agent;
}) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New Lead Captured! 🎉</Heading>

          <Text style={text}>
            Your agent <strong>{agent.name}</strong> just captured a new lead:
          </Text>

          <Section style={leadInfo}>
            {lead.name && <Text><strong>Name:</strong> {lead.name}</Text>}
            {lead.email && <Text><strong>Email:</strong> {lead.email}</Text>}
            {lead.phone && <Text><strong>Phone:</strong> {lead.phone}</Text>}
            {lead.company && <Text><strong>Company:</strong> {lead.company}</Text>}
          </Section>

          <Button style={button} href={`https://app.zapta.ai/leads/${lead.id}`}>
            View Lead Details
          </Button>

          <Hr style={hr} />

          <Text style={footer}>
            You're receiving this because you have new lead notifications enabled.
            <Link href="https://app.zapta.ai/settings">Manage preferences</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

**Notification Triggers:**
```typescript
// lib/leads/actions.ts (updated)
/**
 * Create a new lead - UPDATED with notification trigger
 */
export async function createLead(data: CreateLeadData) {
  // ... existing lead creation code ...

  // NEW: Trigger email notification
  await sendEmailNotification({
    to: tenant.owner_email, // Or all users with newLeads enabled
    type: 'new_lead',
    data: { lead, agent },
    tenantId: profile.tenant_id,
  });

  return { success: true, lead };
}
```

**Scheduled Summaries (Trigger.dev):**
```typescript
// trigger/email-summaries.ts
/**
 * Daily and weekly email summary jobs
 * Sends activity digests to users based on preferences
 */
export const dailySummary = schedules.task({
  id: "daily-email-summary",
  cron: "0 9 * * *", // 9 AM daily
  run: async () => {
    // Find all users with daily summary enabled
    const users = await getUsersWithPreference('email.dailySummary', true);

    for (const user of users) {
      // Get yesterday's activity
      const activity = await getTenantActivity(user.tenant_id, 'yesterday');

      // Send summary email
      await sendEmailNotification({
        to: user.email,
        type: 'daily_summary',
        data: activity,
        tenantId: user.tenant_id,
      });
    }
  },
});

export const weeklySummary = schedules.task({
  id: "weekly-email-summary",
  cron: "0 9 * * 1", // 9 AM every Monday
  run: async () => {
    // Similar to daily, but for weekly summaries
    // ...
  },
});
```

**In-App Notifications (Advanced - Optional):**
```typescript
// Database table for in-app notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL, -- 'lead', 'conversation', 'system'
  title TEXT NOT NULL,
  message TEXT,
  link TEXT, -- URL to navigate to
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

// Component for notification dropdown
// components/dashboard/notifications-dropdown.tsx
export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Subscribe to real-time notifications using Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
        setUnreadCount(count => count + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {/* Notification list */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Implementation Order:**
1. **Email infrastructure setup** (Resend account, React Email)
2. **Create email templates** (new lead, new conversation)
3. **Add notification triggers** to existing actions
4. **Test email delivery**
5. **Implement scheduled summaries** (daily/weekly)
6. **(Optional) In-app notifications** if needed

**Deliverables:**
- [ ] Resend integration configured
- [ ] React Email templates for all notification types
- [ ] Notification triggers in lead/conversation creation
- [ ] Daily/weekly summary jobs with Trigger.dev
- [ ] (Optional) In-app notification system with Supabase Realtime
- [ ] Notification testing & monitoring

---

## Phase 10: Knowledge Base & RAG (Week 10)

### Document Upload & Semantic Search
**Goal:** Let agents answer from uploaded docs

**Flow:**
```
Upload PDF/DOC → Extract Text → Chunk → Embed → Store in pgvector
           ↓
When agent executes:
  Query → Similarity Search → Retrieve Relevant Chunks → Add to Prompt
```

**Implementation:**
```typescript
// lib/ai/rag.ts
/**
 * Retrieves relevant document chunks for a query
 * Uses semantic similarity search with pgvector
 */
export async function retrieveContext(
  query: string,
  agentId: string,
  limit = 5
): Promise<DocumentChunk[]> {
  // Generate embedding for query
  const embedding = await generateEmbedding(query);

  // Similarity search in pgvector
  const { data } = await supabase.rpc('match_documents', {
    query_embedding: embedding,
    match_threshold: 0.7,
    match_count: limit,
    agent_id: agentId,
  });

  return data;
}
```

**Deliverables:**
- ✅ Document upload UI
- ✅ Text extraction & chunking
- ✅ Embedding generation
- ✅ Semantic search with pgvector
- ✅ RAG-enhanced agents

---

## Phase 11-12: Polish & Launch (Weeks 11-12)

### Final Tasks
- ✅ Security audit & penetration testing
- ✅ Performance optimization (caching, indexing)
- ✅ Error boundaries and fallbacks
- ✅ Unit & E2E tests
- ✅ User documentation & tutorials
- ✅ In-app onboarding flow
- ✅ Production deployment
- ✅ Monitoring setup (Sentry, Vercel Analytics)
- ✅ Beta user testing

---

## Code Quality Standards

**Every file should:**
1. Have a header comment explaining its purpose
2. Export well-named, single-purpose functions
3. Include JSDoc comments for all public functions
4. Use TypeScript types/interfaces (no `any`)
5. Handle errors gracefully
6. Follow consistent naming conventions

**Example:**
```typescript
/**
 * Agent Configuration Schema
 * Defines the structure and validation for agent configs
 */

import { z } from 'zod';

/**
 * Agent configuration schema with validation
 */
export const agentConfigSchema = z.object({
  // Model to use for agent responses
  model: z.enum(['gpt-4o', 'claude-3-5-sonnet', 'gpt-4o-mini']),

  // System prompt that defines agent behavior
  systemPrompt: z.string().min(10).max(5000),

  // Temperature for response randomness (0-1)
  temperature: z.number().min(0).max(1).default(0.7),

  // Maximum tokens in response
  maxTokens: z.number().min(100).max(4000).default(1000),

  // Integrations this agent can use
  allowedIntegrations: z.array(z.string()).default([]),
});

export type AgentConfig = z.infer<typeof agentConfigSchema>;
```

---

## Deployment Checklist

- [ ] Environment variables configured in Vercel
- [ ] Supabase production project created
- [ ] Database migrations applied
- [ ] RLS policies enabled
- [ ] Stripe webhooks configured
- [ ] Custom domain connected
- [ ] SSL certificate active
- [ ] Analytics enabled
- [ ] Error tracking active
- [ ] Backup strategy confirmed

---

## Success Metrics

**Week 4:** Agent creation working end-to-end
**Week 6:** All integrations functional
**Week 8:** Background jobs running
**Week 10:** RAG system operational
**Week 12:** Production launch ready

---

**Ready to build! Let's start with Phase 1. 🚀**
