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
 * Trigger webhook for an event
 * Sends webhook to ALL configured webhook integrations for the tenant that match filters
 */
export async function triggerWebhookEvent(
  tenantId: string,
  eventType: string,
  eventData: Record<string, any>
): Promise<void> {
  try {
    console.log(`[WEBHOOK_TRIGGER] Event: ${eventType} for tenant: ${tenantId}`);

    // Get all integrations for tenant
    const integrationMap = await getIntegrationMap(tenantId);

    // Find all webhook integrations
    const webhookIntegrations = Array.from(integrationMap.entries()).filter(
      ([provider]) => provider === "webhook"
    );

    if (webhookIntegrations.length === 0) {
      console.log("[WEBHOOK_TRIGGER] No webhook integrations configured");
      return;
    }

    console.log(
      `[WEBHOOK_TRIGGER] Found ${webhookIntegrations.length} webhook(s), checking filters...`
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

        await integration.executeAction("send", { payload });
        console.log(`[WEBHOOK_TRIGGER] ✓ Sent ${eventType} webhook`);
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
  await triggerWebhookEvent(tenantId, "agent.completed", {
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
  await triggerWebhookEvent(tenantId, "agent.failed", {
    agent_id: agentId,
    agent_name: agentName,
    input_type: input.type,
    error_message: error,
    success: false,
  });
}
