/**
 * Usage Tracking Actions
 * Track and enforce usage limits for billing plans
 */

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getPlanLimits, canSendMessage, canCreateAgent } from "./plans";

/**
 * Increment message usage for tenant
 */
export async function incrementMessageUsage(tenantId: string): Promise<void> {
  const supabase = await createServerClient();

  // Get current usage
  const { data: tenant } = await supabase
    .from("tenants")
    .select("usage_messages_month, usage_reset_at, subscription_plan")
    .eq("id", tenantId)
    .single();

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  // Check if we need to reset monthly usage
  const now = new Date();
  const resetAt = tenant.usage_reset_at ? new Date(tenant.usage_reset_at) : null;

  if (!resetAt || now > resetAt) {
    // Reset usage and set next reset date (first of next month)
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    await supabase
      .from("tenants")
      .update({
        usage_messages_month: 1,
        usage_reset_at: nextReset.toISOString(),
      })
      .eq("id", tenantId);
  } else {
    // Increment usage
    await supabase
      .from("tenants")
      .update({
        usage_messages_month: tenant.usage_messages_month + 1,
      })
      .eq("id", tenantId);
  }
}

/**
 * Check if tenant can send more messages
 */
export async function checkMessageLimit(tenantId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  planId: string;
}> {
  const supabase = await createServerClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("usage_messages_month, subscription_plan")
    .eq("id", tenantId)
    .single();

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  const planId = tenant.subscription_plan || "free";
  const current = tenant.usage_messages_month || 0;
  const allowed = canSendMessage(planId, current);
  const limits = getPlanLimits(planId);

  return {
    allowed,
    current,
    limit: limits.messages,
    planId,
  };
}

/**
 * Comprehensive subscription validation
 * Checks subscription status, expiry, and usage limits
 */
export async function validateSubscription(tenantId: string): Promise<{
  valid: boolean;
  reason?: string;
  subscriptionStatus?: string;
}> {
  const supabase = await createServerClient();

  // Get tenant and subscription info
  const { data: tenant } = await supabase
    .from("tenants")
    .select("subscription_plan")
    .eq("id", tenantId)
    .single();

  if (!tenant) {
    return { valid: false, reason: "Tenant not found" };
  }

  const planId = tenant.subscription_plan || "free";

  // Free plan - always valid (no expiry)
  if (planId === "free") {
    return { valid: true };
  }

  // Check subscription record for paid plans
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, cancel_at_period_end")
    .eq("tenant_id", tenantId)
    .single();

  if (!subscription) {
    // No subscription record but not on free plan - downgrade to free
    await supabase
      .from("tenants")
      .update({ subscription_plan: "free" })
      .eq("id", tenantId);
    
    return { valid: true }; // Allow on free plan
  }

  // Check subscription status
  if (subscription.status === "canceled") {
    return { 
      valid: false, 
      reason: "Subscription canceled",
      subscriptionStatus: "canceled"
    };
  }

  if (subscription.status === "past_due") {
    return { 
      valid: false, 
      reason: "Payment past due",
      subscriptionStatus: "past_due"
    };
  }

  if (subscription.status === "incomplete") {
    return { 
      valid: false, 
      reason: "Payment incomplete",
      subscriptionStatus: "incomplete"
    };
  }

  // Check if subscription has expired
  if (subscription.current_period_end) {
    const now = new Date();
    const periodEnd = new Date(subscription.current_period_end);
    
    if (now > periodEnd && !subscription.cancel_at_period_end) {
      // Grace period: Allow 24 hours after expiry
      const gracePeriodEnd = new Date(periodEnd.getTime() + 24 * 60 * 60 * 1000);
      
      if (now > gracePeriodEnd) {
        return { 
          valid: false, 
          reason: "Subscription expired",
          subscriptionStatus: "expired"
        };
      }
    }
  }

  return { valid: true, subscriptionStatus: subscription.status };
}

/**
 * Check if tenant can create more agents
 */
export async function checkAgentLimit(tenantId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  planId: string;
}> {
  const supabase = await createServerClient();

  // Get tenant plan
  const { data: tenant } = await supabase
    .from("tenants")
    .select("subscription_plan")
    .eq("id", tenantId)
    .single();

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  // Count active agents
  const { count } = await supabase
    .from("agents")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  const planId = tenant.subscription_plan || "free";
  const current = count || 0;
  const allowed = canCreateAgent(planId, current);
  const limits = getPlanLimits(planId);

  return {
    allowed,
    current,
    limit: limits.agents,
    planId,
  };
}
