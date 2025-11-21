/**
 * Email Webhook Endpoint
 * Handles inbound emails from SendGrid and other email providers
 */

import { NextRequest, NextResponse } from "next/server";
import { EmailIntegration } from "@/lib/integrations/email";
import { headers } from "next/headers";

// SendGrid webhook signature verification
function verifySendGridSignature(
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  const secret = process.env.SENDGRID_WEBHOOK_SECRET;
  if (!secret) {
    console.warn(
      "SendGrid webhook secret not configured - skipping verification"
    );
    return true; // Allow in development
  }

  const crypto = require("crypto");
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(timestamp + payload)
    .digest("hex");

  return signature === expectedSignature;
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();

    // Get webhook data from request body
    const webhookData = await request.text();
    let payload;

    try {
      payload = JSON.parse(webhookData);
    } catch (error) {
      console.error("Invalid JSON in webhook payload:", error);
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    // Verify SendGrid signature if present
    const signature = headersList.get("X-SendGrid-Signature");
    const timestamp = headersList.get("X-SendGrid-Timestamp");

    if (signature && timestamp) {
      if (!verifySendGridSignature(webhookData, signature, timestamp)) {
        console.error("Invalid SendGrid webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    // Process different webhook events
    const events = Array.isArray(payload) ? payload : [payload];
    const emailIntegration = new EmailIntegration();

    for (const event of events) {
      if (event.event === "inbound") {
        // Process inbound email
        const emailPayload = {
          from: event.from,
          to: event.to || [],
          subject: event.subject || "",
          text: event.text || "",
          html: event.html || "",
          attachments: event.attachments || [],
          timestamp: event.timestamp || new Date().toISOString(),
          spam_score: event.spam_score,
        };

        await emailIntegration.handleWebhook(emailPayload);
        console.log(`📧 Processed inbound email from ${event.from}`);
      } else if (event.event === "delivered") {
        // Log email delivery
        console.log(`📧 Email delivered to ${event.to}`);
      } else if (event.event === "open") {
        // Log email open
        console.log(`📧 Email opened by ${event.email}`);
      } else if (event.event === "click") {
        // Log email click
        console.log(`📧 Email clicked by ${event.email}: ${event.url}`);
      } else {
        console.log(`📧 Unhandled email event: ${event.event}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle webhook verification (GET request for some providers)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const challenge = searchParams.get("challenge");

  if (challenge) {
    // Webhook verification challenge
    return new NextResponse(challenge);
  }

  return NextResponse.json({ status: "Email webhook endpoint is active" });
}
