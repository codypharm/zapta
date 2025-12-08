/**
 * Billing Plan Configuration
 * Defines all subscription plans, limits, and costs
 */

export const PLAN_LIMITS = {
  free: {
    agents: 1,
    messages: 100,
    // Basic: Fast Gemini models only
    models: [
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
    ],
    integrations: {
      // Basic: Email only
      email: 10,
      sms: 0,
      calendar: false,
      google_drive: false,
      google_docs: false,
      google_sheets: false,
      notion: false,
      hubspot: false,
      webhooks: false,
      stripe: false,
      slack: false,
    },
    storage_mb: 10,
    trigger_jobs: 100,

  },
  starter: {
    agents: 3,
    messages: 1000,
    // Free + Gemini 2.5 Flash + GPT-3.5 + Claude Haiku
    models: [
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gpt-3.5-turbo',
      'claude-3.5-haiku',
    ],
    integrations: {
      // Free + SMS, Calendar
      email: 100,
      sms: 20,
      calendar: true,
      google_drive: false,
      google_docs: false,
      google_sheets: false,
      notion: false,
      hubspot: false,
      webhooks: false,
      stripe: false,
      slack: false,
    },
    storage_mb: 100,
    trigger_jobs: 1000,

  },
  pro: {
    agents: 10,
    messages: 5000,
    // Starter + Gemini 2.5 Pro + GPT-4o + Claude Sonnet
    models: [
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-2.0-flash-thinking',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro',
      'gpt-4o',
      'gpt-3.5-turbo',
      'claude-3.5-sonnet',
      'claude-3.5-haiku',
    ],
    integrations: {
      // Starter + Google Suite, Notion
      email: 500,
      sms: 100,
      calendar: true,
      google_drive: true,
      google_docs: true,
      google_sheets: true,
      notion: true,
      hubspot: false,
      webhooks: false,
      stripe: false,
      slack: false,
    },
    storage_mb: 1024, // 1 GB
    trigger_jobs: 5000,

  },
  business: {
    agents: 50,
    messages: 25000,
    // Pro + GPT-4.5, GPT-5, Gemini 3 Pro
    models: [
      'gemini-3-pro',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-2.0-flash-thinking',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro',
      'gpt-5',
      'gpt-4.5',
      'gpt-4o',
      'gpt-3.5-turbo',
      'claude-3.5-sonnet',
      'claude-3.5-haiku',
    ],
    integrations: {
      // Pro + HubSpot, Webhooks, Stripe
      email: 2000,
      sms: 500,
      calendar: true,
      google_drive: true,
      google_docs: true,
      google_sheets: true,
      notion: true,
      hubspot: true,
      webhooks: true,
      stripe: true,
      slack: false,
    },
    storage_mb: 5120, // 5 GB
    trigger_jobs: 20000,

  },
  enterprise: {
    agents: -1, // unlimited
    messages: 100000,
    models: '*',
    integrations: {
      // All integrations
      email: -1, // unlimited
      sms: -1,
      calendar: true,
      google_drive: true,
      google_docs: true,
      google_sheets: true,
      notion: true,
      hubspot: true,
      webhooks: true,
      stripe: true,
      slack: true,
    },
    storage_mb: 51200, // 50 GB
    trigger_jobs: -1, // unlimited

  },
} as const;

export const PLAN_PRICES = {
  free: 0,
  starter: 19,
  pro: 79,
  business: 199,
  enterprise: 499,
} as const;

export const PLAN_NAMES = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
  enterprise: 'Enterprise',
} as const;

export type PlanId = keyof typeof PLAN_LIMITS;

export function getPlanLimits(planId: string) {
  return PLAN_LIMITS[planId as PlanId] || PLAN_LIMITS.free;
}

export function getPlanPrice(planId: string) {
  return PLAN_PRICES[planId as PlanId] || 0;
}

export function canUseModel(planId: string, model: string): boolean {
  const limits = getPlanLimits(planId);
  
  // GPT-5 is only available on Business and Enterprise plans
  if (model === 'gpt-5' && !['business', 'enterprise'].includes(planId)) {
    return false;
  }
  
  if (limits.models === '*') return true;
  
  return (limits.models as readonly string[]).includes(model);
}

export function canCreateAgent(planId: string, currentCount: number): boolean {
  const limits = getPlanLimits(planId);
  
  if (limits.agents === -1) return true; // unlimited
  
  return currentCount < limits.agents;
}

export function canSendMessage(planId: string, monthlyCount: number): boolean {
  const limits = getPlanLimits(planId);
  
  // Enterprise plan has unlimited messages (represented as large number, not -1)
  return monthlyCount < limits.messages;
}

/**
 * Check if a plan allows using a specific integration
 */
export function canUseIntegration(planId: string, provider: string): boolean {
  const limits = getPlanLimits(planId);
  
  // Map provider names to plan limit keys
  const providerToLimit: Record<string, keyof typeof limits.integrations> = {
    // Email
    'email': 'email',
    'resend': 'email',
    'gmail': 'email',
    // SMS
    'sms': 'sms',
    'twilio': 'sms',
    // Calendar
    'google_calendar': 'calendar',
    'google-calendar': 'calendar',
    'calendar': 'calendar',
    // Google Suite
    'google_drive': 'google_drive',
    'google-drive': 'google_drive',
    'google_docs': 'google_docs',
    'google-docs': 'google_docs',
    'google_sheets': 'google_sheets',
    'google-sheets': 'google_sheets',
    // Productivity
    'notion': 'notion',
    // CRM & Business
    'hubspot': 'hubspot',
    'stripe': 'stripe',
    // Advanced
    'webhook': 'webhooks',
    'webhooks': 'webhooks',
    'slack': 'slack',
  };
  
  const limitKey = providerToLimit[provider.toLowerCase()];
  
  // If not in map, deny by default (safer)
  if (!limitKey) {
    console.log(`[canUseIntegration] Unknown provider: ${provider}, denying access`);
    return false;
  }
  
  const limitValue = limits.integrations[limitKey];
  
  // If boolean, it's a feature toggle
  if (typeof limitValue === 'boolean') {
    return limitValue;
  }
  
  // If number, check if > 0 (or -1 for unlimited)
  if (typeof limitValue === 'number') {
    return limitValue !== 0;
  }
  
  return true;
}
