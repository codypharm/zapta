/**
 * Stripe Webhook Handler
 * Handles Stripe events for subscription management
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const tenantId = session.metadata?.tenant_id;
  const planId = session.metadata?.plan_id;

  if (!tenantId || !planId) {
    console.error("Missing metadata in checkout session");
    return;
  }

  // Update subscription record
  await supabase
    .from("subscriptions")
    .update({
      stripe_subscription_id: session.subscription as string,
      plan_id: planId,
      status: "active",
    })
    .eq("tenant_id", tenantId);

  // Update tenant plan
  await supabase
    .from("tenants")
    .update({ subscription_plan: planId })
    .eq("id", tenantId);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata?.tenant_id;

  if (!tenantId) {
    console.error("Missing tenant_id in subscription metadata");
    return;
  }

  const planId = getPlanIdFromPrice(subscription.items.data[0].price.id);

  await supabase
    .from("subscriptions")
    .update({
      plan_id: planId,
      status: subscription.status,
      current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
      current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq("tenant_id", tenantId);

  // Update tenant plan
  await supabase
    .from("tenants")
    .update({ subscription_plan: planId })
    .eq("id", tenantId);
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata?.tenant_id;

  if (!tenantId) {
    console.error("Missing tenant_id in subscription metadata");
    return;
  }

  // Downgrade to free plan
  await supabase
    .from("subscriptions")
    .update({
      plan_id: "free",
      status: "canceled",
    })
    .eq("tenant_id", tenantId);

  await supabase
    .from("tenants")
    .update({ subscription_plan: "free" })
    .eq("id", tenantId);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const tenantId = invoice.metadata?.tenant_id;

  if (!tenantId) return;

  // Store invoice record
  await supabase.from("invoices").insert({
    tenant_id: tenantId,
    stripe_invoice_id: invoice.id,
    amount_due: invoice.amount_due,
    amount_paid: invoice.amount_paid,
    status: "paid",
    invoice_pdf: invoice.invoice_pdf,
    period_start: new Date(invoice.period_start! * 1000).toISOString(),
    period_end: new Date(invoice.period_end! * 1000).toISOString(),
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const tenantId = invoice.metadata?.tenant_id;

  if (!tenantId) return;

  // Update subscription status
  await supabase
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("tenant_id", tenantId);

  // TODO: Send email notification
}

function getPlanIdFromPrice(priceId: string): string {
  const priceMap: Record<string, string> = {
    [process.env.STRIPE_PRICE_ID_STARTER!]: "starter",
    [process.env.STRIPE_PRICE_ID_PRO!]: "pro",
    [process.env.STRIPE_PRICE_ID_BUSINESS!]: "business",
    [process.env.STRIPE_PRICE_ID_ENTERPRISE!]: "enterprise",
  };

  return priceMap[priceId] || "free";
}
