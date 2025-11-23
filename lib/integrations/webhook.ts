/**
 * Webhook Integration
 * Send HTTP POST requests to external URLs for event notifications
 */

import { BaseIntegration, type IntegrationConfigSchema } from "./base";
import type { IntegrationRecord } from "./registry";
import crypto from "crypto";

interface WebhookCredentials {
  webhook_url: string;
  webhook_secret?: string;
  event_types?: string[];          // Which events to listen for
  agent_ids?: string[];            // Specific agent IDs or empty for all
  status_filter?: "all" | "success" | "failure"; // Filter by success/failure
}

interface WebhookPayload {
  event_type: string;
  timestamp: string;
  tenant_id: string;
  integration_id: string;
  data: Record<string, any>;
}

export class WebhookIntegration extends BaseIntegration {
  provider = "webhook";
  type = "webhook" as const;

  private webhookUrl?: string;
  private webhookSecret?: string;
  private filters: {
    event_types: string[];
    agent_ids: string[];
    status_filter: "all" | "success" | "failure";
  };

  constructor(integrationRecord: IntegrationRecord) {
    super(integrationRecord);

    console.log("[WEBHOOK] Constructor - integration record:", {
      id: integrationRecord.id,
      provider: integrationRecord.provider,
      has_config: !!integrationRecord.config,
    });

    // Load webhook URL from credentials (api_key type fields go to credentials)
    const creds = this.getCredentials() as Record<string, any>;
    this.webhookUrl = creds?.webhook_url;
    this.webhookSecret = creds?.webhook_secret;

    // Load filters with backward-compatible defaults
    this.filters = {
      event_types: creds?.event_types || ["agent.completed", "agent.failed"],
      agent_ids: creds?.agent_ids || [],
      status_filter: creds?.status_filter || "all",
    };

    console.log("[WEBHOOK] Configuration:", {
      has_url: !!this.webhookUrl,
      has_secret: !!this.webhookSecret,
      url: this.webhookUrl,
      filters: this.filters,
    });
  }

  /**
   * Authenticate (no auth needed for webhooks)
   */
  async authenticate(): Promise<void> {
    if (!this.webhookUrl) {
      throw new Error("Webhook URL is required");
    }

    // Validate URL format
    try {
      new URL(this.webhookUrl);
    } catch (error) {
      throw new Error("Invalid webhook URL format");
    }
  }

  /**
   * Test webhook connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.webhookUrl) {
        throw new Error("Webhook URL is required");
      }

      // Send test payload
      const testPayload: WebhookPayload = {
        event_type: "test",
        timestamp: new Date().toISOString(),
        tenant_id: this.integrationRecord?.tenant_id || "",
        integration_id: this.integrationRecord?.id || "",
        data: {
          message: "This is a test webhook from Zapta",
          test: true,
        },
      };

      await this.sendWebhook(testPayload);
      console.log("[WEBHOOK] Connection test passed");
      return true;
    } catch (error) {
      console.error("[WEBHOOK] Connection test failed:", error);
      return false;
    }
  }

  /**
   * Check if this webhook should receive a specific event
   */
  shouldSendEvent(
    eventType: string,
    agentId: string,
    success: boolean
  ): boolean {
    // Check event type filter
    if (!this.filters.event_types.includes(eventType)) {
      console.log(
        `[WEBHOOK] Filtered: event type '${eventType}' not in`,
        this.filters.event_types
      );
      return false;
    }

    // Check agent filter (empty array means all agents)
    if (
      this.filters.agent_ids.length > 0 &&
      !this.filters.agent_ids.includes(agentId)
    ) {
      console.log(
        `[WEBHOOK] Filtered: agent '${agentId}' not in`,
        this.filters.agent_ids
      );
      return false;
    }

    // Check status filter
    if (this.filters.status_filter === "success" && !success) {
      console.log("[WEBHOOK] Filtered: status is failure, need success");
      return false;
    }
    if (this.filters.status_filter === "failure" && success) {
      console.log("[WEBHOOK] Filtered: status is success, need failure");
      return false;
    }

    return true;
  }

  /**
   * Send webhook to configured URL
   */
  async sendWebhook(payload: WebhookPayload): Promise<void> {
    if (!this.webhookUrl) {
      throw new Error("Webhook URL not configured");
    }

    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "Zapta-Webhook/1.0",
    };

    // Add HMAC signature if secret is configured
    if (this.webhookSecret) {
      const signature = this.generateSignature(body, this.webhookSecret);
      headers["X-Webhook-Signature"] = `sha256=${signature}`;
    }

    console.log("[WEBHOOK] Sending to:", this.webhookUrl);

    const response = await fetch(this.webhookUrl, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[WEBHOOK] Failed:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(
        `Webhook failed: ${response.status} ${response.statusText}`
      );
    }

    console.log("[WEBHOOK] Successfully sent, status:", response.status);
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: string, secret: string): string {
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
  }

  /**
   * Execute webhook actions
   */
  async executeAction(action: string, params: any): Promise<any> {
    switch (action) {
      case "send":
        return this.sendWebhook(params.payload);
      case "test":
        return this.testConnection();
      case "shouldSend":
        return this.shouldSendEvent(
          params.eventType,
          params.agentId,
          params.success
        );
      default:
        throw new Error(`Unknown webhook action: ${action}`);
    }
  }

  /**
   * Get integration config schema
   */
  getConfigSchema(): IntegrationConfigSchema {
    return {
      type: "api_key" as const,
      fields: [
        {
          key: "webhook_url",
          label: "Webhook URL",
          type: "url",
          required: true,
          placeholder: "https://your-domain.com/webhook",
          description:
            "The URL where webhook events will be sent (e.g., Zapier webhook URL, Make.com webhook, or your custom endpoint)",
        },
        {
          key: "webhook_secret",
          label: "Webhook Secret (Optional)",
          type: "password",
          required: false,
          placeholder: "Optional secret for HMAC signature verification",
          description:
            "If provided, webhooks will include an X-Webhook-Signature header for verifying authenticity",
        },
      ],
    };
  }

  /**
   * Get webhook integration capabilities
   */
  getCapabilities(): string[] {
    return ["send", "test"];
  }
}

export default WebhookIntegration;
