/**
 * Billing Plan Configuration
 * Defines all subscription plans, limits, and costs
 */

export const PLAN_LIMITS = {
  free: {
    agents: 1,
    messages: 100,
    models: ['gemini-2.0-flash', 'gemini-1.5-flash'],
    integrations: {
      email: 10,
      sms: 0,
      calendar: false,
      hubspot: false,
      webhooks: false,
      slack: false,
    },
    storage_mb: 10,
    trigger_jobs: 100,
    team_seats: 1,
  },
  starter: {
    agents: 3,
    messages: 1000,
    models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gpt-3.5-turbo'],
    integrations: {
      email: 100,
      sms: 20,
      calendar: true,
      hubspot: false,
      webhooks: false,
      slack: false,
    },
    storage_mb: 100,
    trigger_jobs: 1000,
    team_seats: 1,
  },
  pro: {
    agents: 10,
    messages: 5000,
    models: '*', // all models
    integrations: {
      email: 500,
      sms: 100,
      calendar: true,
      hubspot: true,
      webhooks: true,
      slack: false,
    },
    storage_mb: 1024, // 1 GB
    trigger_jobs: 5000,
    team_seats: 3,
  },
  business: {
    agents: 50,
    messages: 25000,
    models: '*',
    integrations: {
      email: 2000,
      sms: 500,
      calendar: true,
      hubspot: true,
      webhooks: true,
      slack: true,
    },
    storage_mb: 5120, // 5 GB
    trigger_jobs: 20000,
    team_seats: 5,
  },
  enterprise: {
    agents: -1, // unlimited
    messages: 100000,
    models: '*',
    integrations: {
      email: -1, // unlimited
      sms: -1,
      calendar: true,
      hubspot: true,
      webhooks: true,
      slack: true,
    },
    storage_mb: 51200, // 50 GB
    trigger_jobs: -1, // unlimited
    team_seats: -1, // unlimited
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
