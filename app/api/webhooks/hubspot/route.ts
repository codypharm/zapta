/**
 * HubSpot Webhook Handler
 * Handles real-time updates from HubSpot webhooks
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import crypto from "crypto";

// HubSpot webhook events we handle
const SUPPORTED_EVENTS = [
  "contact.creation",
  "contact.deletion",
  "contact.propertyChange",
  "deal.creation",
  "deal.deletion",
  "deal.propertyChange",
  "company.creation",
  "company.deletion",
  "company.propertyChange",
];

/**
 * Verify HubSpot webhook signature
 */
function verifyHubSpotSignature(
  payload: string,
  signature: string,
  clientSecret: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", clientSecret)
    .update(payload)
    .digest("base64");

  return signature === expectedSignature;
}

/**
 * Handle contact webhook events
 */
async function handleContactEvent(event: any, supabase: any, tenantId: string) {
  const { eventType, objectId, properties } = event;

  switch (eventType) {
    case "contact.creation":
      await supabase.from("hubspot_contacts").upsert({
        hubspot_contact_id: objectId,
        tenant_id: tenantId,
        properties,
        data: properties,
        archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      break;

    case "contact.deletion":
      await supabase
        .from("hubspot_contacts")
        .update({
          archived: true,
          updated_at: new Date().toISOString(),
        })
        .eq("hubspot_contact_id", objectId);
      break;

    case "contact.propertyChange":
      await supabase
        .from("hubspot_contacts")
        .update({
          properties,
          data: properties,
          updated_at: new Date().toISOString(),
        })
        .eq("hubspot_contact_id", objectId);
      break;
  }
}

/**
 * Handle deal webhook events
 */
async function handleDealEvent(event: any, supabase: any, tenantId: string) {
  const { eventType, objectId, properties } = event;

  switch (eventType) {
    case "deal.creation":
      await supabase.from("hubspot_deals").upsert({
        hubspot_deal_id: objectId,
        tenant_id: tenantId,
        properties,
        amount: parseFloat(properties.amount) || 0,
        stage: properties.dealstage || "appointmentscheduled",
        data: properties,
        archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      break;

    case "deal.deletion":
      await supabase
        .from("hubspot_deals")
        .update({
          archived: true,
          updated_at: new Date().toISOString(),
        })
        .eq("hubspot_deal_id", objectId);
      break;

    case "deal.propertyChange":
      await supabase
        .from("hubspot_deals")
        .update({
          properties,
          amount: parseFloat(properties.amount) || 0,
          stage: properties.dealstage,
          data: properties,
          updated_at: new Date().toISOString(),
        })
        .eq("hubspot_deal_id", objectId);
      break;
  }
}

/**
 * Main webhook handler
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();

  try {
    // Get webhook signature from headers
    const signature = request.headers.get("X-HubSpot-Signature");
    if (!signature) {
      console.error("Missing HubSpot signature");
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    // Get request body as text for signature verification
    const body = await request.text();

    // Get HubSpot client secret from environment or integrations
    // In production, this should be stored securely
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    if (!clientSecret) {
      console.error("HubSpot client secret not configured");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    // Verify webhook signature
    if (!verifyHubSpotSignature(body, signature, clientSecret)) {
      console.error("Invalid HubSpot signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse webhook payload
    const payload = JSON.parse(body);
    const { events } = payload;

    if (!Array.isArray(events)) {
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      );
    }

    // Process each event
    for (const event of events) {
      const { eventType, subscriptionType } = event;

      // Skip unsupported events
      if (!SUPPORTED_EVENTS.includes(eventType)) {
        console.log(`Skipping unsupported event: ${eventType}`);
        continue;
      }

      // Get tenant ID from integration
      // In a real implementation, you might map HubSpot portal ID to tenant
      const { data: integration } = await supabase
        .from("integrations")
        .select("tenant_id")
        .eq("provider", "hubspot")
        .eq("status", "connected")
        .single();

      if (!integration?.tenant_id) {
        console.error("No HubSpot integration found for tenant");
        continue;
      }

      try {
        // Handle different event types
        if (eventType.startsWith("contact.")) {
          await handleContactEvent(event, supabase, integration.tenant_id);
        } else if (eventType.startsWith("deal.")) {
          await handleDealEvent(event, supabase, integration.tenant_id);
        } else if (eventType.startsWith("company.")) {
          // Company events could be handled similarly
          console.log(`Company event: ${eventType}`);
        }

        console.log(`Processed HubSpot event: ${eventType}`);
      } catch (error) {
        console.error(`Error processing event ${eventType}:`, error);
        // Continue processing other events even if one fails
      }
    }

    return NextResponse.json({
      message: "Webhook processed successfully",
      processedEvents: events.length,
    });
  } catch (error) {
    console.error("HubSpot webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Handle webhook verification (GET request for HubSpot setup)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const challenge = searchParams.get("hubspot-challenge");

  if (challenge) {
    // Return the challenge for webhook verification
    return new NextResponse(challenge, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  return NextResponse.json(
    { error: "Missing challenge parameter" },
    { status: 400 }
  );
}
