/**
 * Webhook Event Triggers
 * Helper functions to trigger webhooks for various events
 */

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getIntegrationMap } from "@/lib/integrations/registry";

export interface WebhookEventPayload {
  event_type: string;
  timestamp: string;
  tenant_id: string;
  integration_id: string;
  data: Record<string, any>;
}

/**
 * Log webhook delivery attempt to database
 */
async function logWebhookDelivery(
  tenantId: string,
  integrationId: string | undefined,
  eventType: string,
  status: "success" | "failed",
  attempts: number,
  errorMessage?: string
): Promise<void> {
  try {
    const supabase = await createServerClient();
    await supabase.from("webhook_logs").insert({
      tenant_id: tenantId,
      integration_id: integrationId,
      event_type: eventType,
      status,
      attempts,
      error_message: errorMessage,
      delivered_at: new Date().toISOString(),
    });
  } catch (error) {
    // Don't let logging failures break the webhook flow
    console.error("[WEBHOOK_LOG] Failed to log delivery:", error);
  }
}

/**
 * Trigger webhook for an event
 * Sends webhook to configured webhook integrations for the tenant that match filters
 * and are allowed for this agent
 */
export async function triggerWebhookEvent(
  tenantId: string,
  agentId: string, // NEW - agent ID to filter integrations
  eventType: string,
  eventData: Record<string, any>
): Promise<void> {
  try {
    console.log(`[WEBHOOK_TRIGGER] Event: ${eventType} for agent: ${agentId}`);

    // Get integrations for this specific agent (respects integration selection)
    const integrationMap = await getIntegrationMap(tenantId, agentId);

    // Find all webhook integrations
    const webhookIntegrations = Array.from(integrationMap.entries()).filter(
      ([provider]) => provider === "webhook"
    );

    if (webhookIntegrations.length === 0) {
      console.log("[WEBHOOK_TRIGGER] No webhook integrations configured for this agent");
      return;
    }

    console.log(
      `[WEBHOOK_TRIGGER] Found ${webhookIntegrations.length} webhook(s) for agent, checking filters...`
    );

    // Send to webhooks that match filters
    const promises = webhookIntegrations.map(async ([, integration]) => {
      try {
        // Check if this webhook should receive this event
        const shouldSend = await integration.executeAction("shouldSend", {
          eventType,
          agentId: eventData.agent_id,
          success: eventData.success,
        });

        if (!shouldSend) {
          console.log(
            `[WEBHOOK_TRIGGER] Skipped webhook (filtered out ${eventType})`
          );
          return;
        }

        const payload: WebhookEventPayload = {
          event_type: eventType,
          timestamp: new Date().toISOString(),
          tenant_id: tenantId,
          integration_id: (integration as any).integrationRecord?.id || "",
          data: eventData,
        };

        // Retry logic with exponential backoff
        const maxRetries = 3;
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            await integration.executeAction("send", { payload });
            console.log(`[WEBHOOK_TRIGGER] ✓ Sent ${eventType} webhook (attempt ${attempt})`);
            
            // Log successful delivery
            await logWebhookDelivery(tenantId, (integration as any).integrationRecord?.id, eventType, "success", attempt);
            return; // Success, exit retry loop
          } catch (sendError) {
            lastError = sendError instanceof Error ? sendError : new Error(String(sendError));
            console.warn(`[WEBHOOK_TRIGGER] Attempt ${attempt}/${maxRetries} failed:`, lastError.message);
            
            if (attempt < maxRetries) {
              // Exponential backoff: 1s, 2s, 4s
              const delay = Math.pow(2, attempt - 1) * 1000;
              console.log(`[WEBHOOK_TRIGGER] Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        
        // All retries failed
        console.error(`[WEBHOOK_TRIGGER] All ${maxRetries} attempts failed for ${eventType}`);
        await logWebhookDelivery(tenantId, (integration as any).integrationRecord?.id, eventType, "failed", maxRetries, lastError?.message);
        
      } catch (error) {
        console.error(
          `[WEBHOOK_TRIGGER] Failed to send webhook:`,
          error
        );
        // Don't throw - continue sending to other webhooks
      }
    });

    await Promise.all(promises);
  } catch (error) {
    console.error("[WEBHOOK_TRIGGER] Error triggering webhooks:", error);
    // Don't throw - webhook failures shouldn't break agent execution
  }
}

/**
 * Trigger agent completion webhook
 */
export async function triggerAgentCompletedEvent(
  tenantId: string,
  agentId: string,
  agentName: string,
  input: any,
  output: any,
  durationMs?: number
): Promise<void> {
  await triggerWebhookEvent(tenantId, agentId, "agent.completed", {
    agent_id: agentId,
    agent_name: agentName,
    input_type: input.type,
    message: output.message,
    actions_count: output.actions?.length || 0,
    duration_ms: durationMs,
    success: true,
  });
}

/**
 * Trigger agent failure webhook
 */
export async function triggerAgentFailedEvent(
  tenantId: string,
  agentId: string,
  agentName: string,
  input: any,
  error: string
): Promise<void> {
  await triggerWebhookEvent(tenantId, agentId, "agent.failed", {
    agent_id: agentId,
    agent_name: agentName,
    input_type: input.type,
    error_message: error,
    success: false,
  });
}

/**
 * Trigger lead created webhook
 */
export async function triggerLeadCreatedEvent(
  tenantId: string,
  agentId: string,
  agentName: string,
  lead: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    source?: string;
  }
): Promise<void> {
  await triggerWebhookEvent(tenantId, agentId, "lead.created", {
    agent_id: agentId,
    agent_name: agentName,
    lead_id: lead.id,
    lead_name: lead.name,
    lead_email: lead.email,
    lead_phone: lead.phone,
    lead_company: lead.company,
    source: lead.source || "widget",
    success: true,
  });
}

/**
 * Trigger new conversation webhook
 */
export async function triggerConversationNewEvent(
  tenantId: string,
  agentId: string,
  agentName: string,
  conversation: {
    id: string;
    visitor_id?: string;
    source?: string;
  }
): Promise<void> {
  await triggerWebhookEvent(tenantId, agentId, "conversation.new", {
    agent_id: agentId,
    agent_name: agentName,
    conversation_id: conversation.id,
    visitor_id: conversation.visitor_id,
    source: conversation.source || "widget",
    success: true,
  });
}

/**
 * Trigger conversation closed webhook
 */
export async function triggerConversationClosedEvent(
  tenantId: string,
  agentId: string,
  agentName: string,
  conversation: {
    id: string;
    visitor_id?: string;
    messages_count?: number;
    duration_seconds?: number;
  }
): Promise<void> {
  await triggerWebhookEvent(tenantId, agentId, "conversation.closed", {
    agent_id: agentId,
    agent_name: agentName,
    conversation_id: conversation.id,
    visitor_id: conversation.visitor_id,
    messages_count: conversation.messages_count,
    duration_seconds: conversation.duration_seconds,
    success: true,
  });
}

