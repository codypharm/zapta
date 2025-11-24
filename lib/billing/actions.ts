/**
 * Billing Actions
 * Server actions for subscription management
 */

"use server";

import { createServerClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { getPlanPrice, PLAN_LIMITS } from "./plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

/**
 * Get current subscription for logged-in user
 */
export async function getCurrentSubscription() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { error: "Profile not found" };
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .single();

  if (!subscription) {
    // No subscription record, create default free plan
    const { data: newSub } = await supabase
      .from("subscriptions")
      .insert({
        tenant_id: profile.tenant_id,
        plan_id: "free",
        status: "active",
      })
      .select()
      .single();

    return { subscription: newSub };
  }

  return { subscription };
}

/**
 * Get usage stats for current tenant
 */
export async function getUsageStats() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, tenants(*)")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { error: "Profile not found" };
  }

  const tenant = (profile as any).tenants;

  // Get agent count
  const { count: agentCount } = await supabase
    .from("agents")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", profile.tenant_id)
    .eq("status", "active");

  const usage = {
    agents: agentCount || 0,
    messages: tenant.usage_messages_month || 0,
    storage_mb: Math.round((tenant.usage_storage_bytes || 0) / 1024 / 1024),
  };

  return { usage };
}

/**
 * Get or create Stripe customer
 */
export async function getOrCreateStripeCustomer(tenantId: string) {
  const supabase = await createServerClient();

  // Check if subscription record exists with Stripe customer
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("tenant_id", tenantId)
    .single();

  if (subscription?.stripe_customer_id) {
    return subscription.stripe_customer_id;
  }

  // Get tenant info to create customer
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .single();

  // Create Stripe customer
  const customer = await stripe.customers.create({
    metadata: {
      tenant_id: tenantId,
    },
    name: tenant?.name || undefined,
  });

  // Update subscription record
  await supabase
    .from("subscriptions")
    .update({ stripe_customer_id: customer.id })
    .eq("tenant_id", tenantId);

  return customer.id;
}

/**
 * Create checkout session
 */
export async function createCheckoutSession(planId: string) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { error: "Profile not found" };
  }

  try {
    const customerId = await getOrCreateStripeCustomer(profile.tenant_id);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: getStripePriceId(planId),
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/settings/billing`,
      metadata: {
        tenant_id: profile.tenant_id,
        plan_id: planId,
      },
    });

    return { url: session.url };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Get Stripe Price ID for plan
 */
function getStripePriceId(planId: string): string {
  // These will be set as environment variables from Stripe dashboard
  const priceIds: Record<string, string> = {
    starter: process.env.STRIPE_PRICE_ID_STARTER!,
    pro: process.env.STRIPE_PRICE_ID_PRO!,
    business: process.env.STRIPE_PRICE_ID_BUSINESS!,
    enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE!,
  };

  return priceIds[planId];
}

/**
 * Create customer portal session
 */
export async function createPortalSession() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { error: "Profile not found" };
  }

  try {
    const customerId = await getOrCreateStripeCustomer(profile.tenant_id);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_URL}/settings/billing`,
    });

    return { url: session.url };
  } catch (error: any) {
    return { error: error.message };
  }
}
