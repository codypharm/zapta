/**
 * Twilio SMS Integration
 * Handles sending and receiving SMS messages via Twilio
 */

import { BaseIntegration, IntegrationConfigSchema } from "./base";
import { Twilio } from "twilio";

interface TwilioCredentials {
  account_sid?: string;
  auth_token?: string;
  from_number?: string;
}

interface TwilioWebhookPayload {
  From: string;
  To: string;
  Body: string;
  MessageSid: string;
  AccountSid: string;
  MessagingServiceSid?: string;
  NumMedia?: string;
  MediaUrl0?: string;
}

export class TwilioIntegration extends BaseIntegration {
  provider = "twilio";
  type = "sms" as const;

  /**
   * Get Twilio client instance
   * Uses custom credentials if provided, otherwise falls back to platform credentials
   */
  private getTwilioClient(): Twilio {
    const credentials = this.getCredentials() as TwilioCredentials;

    // Use custom credentials if provided, otherwise use platform credentials
    const accountSid = credentials.account_sid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = credentials.auth_token || process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error(
        "Twilio not configured. Either provide credentials or set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables."
      );
    }

    return new Twilio(accountSid, authToken);
  }

  /**
   * Get from phone number (custom or platform)
   */
  private getFromNumber(): string {
    const credentials = this.getCredentials() as TwilioCredentials;
    const fromNumber = credentials.from_number || process.env.TWILIO_FROM_NUMBER;

    if (!fromNumber) {
      throw new Error(
        "Twilio from number not configured. Either provide from_number or set TWILIO_FROM_NUMBER environment variable."
      );
    }

    return fromNumber;
  }

  /**
   * Get integration config schema
   */
  getConfigSchema(): IntegrationConfigSchema {
    return {
      type: "api_key" as const,
      auth_url: "https://www.twilio.com/console",
      fields: [
        {
          key: "account_sid",
          label: "Custom Account SID (Optional)",
          type: "text" as const,
          required: false,
          description: "Leave empty to use platform SMS service. Enterprise clients can provide their own Twilio Account SID.",
          placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        },
        {
          key: "auth_token",
          label: "Custom Auth Token (Optional)",
          type: "password" as const,
          required: false,
          description: "Leave empty to use platform SMS service. Provide if using custom Account SID.",
          placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        },
        {
          key: "from_number",
          label: "Custom From Phone Number (Optional)",
          type: "text" as const,
          required: false,
          description: "Leave empty to use platform SMS service. If provided, must be a phone number purchased from Twilio and registered to your account (E.164 format: +1234567890).",
          placeholder: "+15551234567",
        },
      ],
    };
  }

  /**
   * Authenticate Twilio integration
   * Only validates if custom credentials are provided
   */
  async authenticate(credentials: TwilioCredentials): Promise<void> {
    // If no custom credentials, platform credentials will be used - no validation needed here
    if (!credentials.account_sid && !credentials.auth_token && !credentials.from_number) {
      return;
    }

    // If any custom credential is provided, validate them all
    if (credentials.account_sid || credentials.auth_token || credentials.from_number) {
      if (!credentials.account_sid?.startsWith("AC")) {
        throw new Error("Invalid Account SID format. Must start with 'AC'");
      }

      if (!credentials.auth_token) {
        throw new Error("Auth Token required when using custom Account SID");
      }

      if (!credentials.from_number?.startsWith("+")) {
        throw new Error("Phone number must be in E.164 format (e.g., +15551234567)");
      }

      // Test credentials by creating client
      try {
        const client = new Twilio(credentials.account_sid, credentials.auth_token);
        // Validate by fetching account info
        await client.api.accounts(credentials.account_sid).fetch();
      } catch (error) {
        throw new Error("Failed to authenticate with Twilio. Check your credentials.");
      }
    }
  }

  /**
   * Test SMS connection
   * Works with both platform and custom credentials
   */
  async testConnection(): Promise<boolean> {
    try {
      const credentials = this.getCredentials() as TwilioCredentials;

      // Get effective credentials (custom or platform)
      const accountSid = credentials.account_sid || process.env.TWILIO_ACCOUNT_SID;
      const authToken = credentials.auth_token || process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = credentials.from_number || process.env.TWILIO_FROM_NUMBER;

      // Validate credentials exist (either custom or platform)
      if (!accountSid || !authToken || !fromNumber) {
        console.error('Twilio test failed: No credentials configured (neither custom nor platform)');
        return false;
      }

      // Validate format
      if (!accountSid.startsWith("AC")) {
        console.error('Twilio test failed: Invalid Account SID format');
        return false;
      }

      if (!fromNumber.startsWith("+")) {
        console.error('Twilio test failed: Invalid phone number format');
        return false;
      }

      // Test by fetching account info
      const client = this.getTwilioClient();
      await client.api.accounts(accountSid).fetch();

      const usingPlatform = !credentials.account_sid;
      console.log(`[TWILIO] Connection test passed (using ${usingPlatform ? 'platform' : 'custom'} credentials)`);
      return true;
    } catch (error) {
      console.error("Twilio connection test failed:", error);
      return false;
    }
  }

  /**
   * Execute SMS actions
   */
  async executeAction(action: string, params: any): Promise<any> {
    switch (action) {
      case "send_sms":
        return this.sendSMS(params);
      case "get_sms_history":
        return this.getSMSHistory(params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Handle incoming SMS webhook
   */
  async handleWebhook(payload: TwilioWebhookPayload): Promise<void> {
    try {
      console.log(`📱 Processing inbound SMS from ${payload.From}`);

      // Find agent configured for this phone number
      const agent = await this.findAgentByPhoneNumber(payload.To);

      if (!agent) {
        console.log(`No agent found for phone number: ${payload.To}`);
        return;
      }

      // Execute agent with SMS content
      const { executeAgent } = await import("@/lib/agents/execute");
      const response = await executeAgent(agent.id, {
        type: "sms",
        from: payload.From,
        to: payload.To,
        message: payload.Body,
        timestamp: new Date().toISOString(),
      });

      // Send response SMS
      if (response.message) {
        await this.sendSMS({
          to: payload.From,
          message: response.message,
        });
      }

      console.log(`✅ SMS processed and response sent to ${payload.From}`);
    } catch (error) {
      console.error("Error handling SMS webhook:", error);
    }
  }

  /**
   * Send SMS message
   */
  private async sendSMS(params: {
    to: string;
    message: string;
    from?: string;
    mediaUrl?: string[];
    agent_id?: string;
  }): Promise<any> {
    const client = this.getTwilioClient();
    const tenantId = this.getTenantId();
    const fromNumber = this.getFromNumber();

    // Check SMS usage limit before sending
    const { createClient } = await import("@supabase/supabase-js");
    const { getPlanLimits } = await import("@/lib/billing/plans");
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get tenant's subscription plan
    const { data: tenant } = await supabase
      .from("tenants")
      .select("subscription_plan")
      .eq("id", tenantId)
      .single();

    const planId = tenant?.subscription_plan || "free";
    const planLimits = getPlanLimits(planId);

    // Count SMS sent this month
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const { count } = await supabase
      .from("sms_usage")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("created_at", firstOfMonth.toISOString())
      .eq("direction", "outbound");

    const currentUsage = count || 0;
    const smsLimit = planLimits.integrations.sms;

    if (smsLimit === 0) {
      throw new Error(
        `SMS is not available on your ${planId} plan. Please upgrade to use SMS features.`
      );
    }

    if (smsLimit !== -1 && currentUsage >= smsLimit) {
      throw new Error(
        `SMS limit reached (${currentUsage}/${smsLimit}). Please upgrade your plan to send more SMS.`
      );
    }

    try {
      const messageData: any = {
        from: params.from || fromNumber,
        to: params.to,
        body: params.message,
      };

      // Add media URLs if provided (MMS)
      if (params.mediaUrl && params.mediaUrl.length > 0) {
        messageData.mediaUrl = params.mediaUrl;
      }

      const message = await client.messages.create(messageData);

      // Track usage for billing
      await this.trackSMSUsage({
        tenant_id: tenantId,
        integration_id: this.integrationRecord?.id || "",
        to_number: params.to,
        from_number: fromNumber,
        message_body: params.message,
        twilio_sid: message.sid,
        agent_id: params.agent_id,
        direction: "outbound",
      });

      return { 
        success: true, 
        messageSid: message.sid,
        status: message.status 
      };
    } catch (error) {
      console.error("Failed to send SMS via Twilio:", error);
      throw error;
    }
  }

  /**
   * Get SMS message history
   */
  private async getSMSHistory(params: {
    limit?: number;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<any[]> {
    const client = this.getTwilioClient();

    try {
      const options: any = {
        limit: params.limit || 20,
      };

      if (params.dateFrom) {
        options.dateSentAfter = params.dateFrom;
      }

      if (params.dateTo) {
        options.dateSentBefore = params.dateTo;
      }

      const messages = await client.messages.list(options);

      return messages.map((msg) => ({
        sid: msg.sid,
        from: msg.from,
        to: msg.to,
        body: msg.body,
        status: msg.status,
        direction: msg.direction,
        dateSent: msg.dateSent,
        dateCreated: msg.dateCreated,
        numMedia: msg.numMedia,
      }));
    } catch (error) {
      console.error("Failed to fetch SMS history:", error);
      throw error;
    }
  }

  /**
   * Track SMS usage for billing
   */
  private async trackSMSUsage(usage: {
    tenant_id: string;
    integration_id: string;
    to_number: string;
    from_number: string;
    message_body: string;
    twilio_sid: string;
    agent_id?: string;
    direction: "inbound" | "outbound";
  }): Promise<void> {
    try {
      // Use service role client for usage tracking
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      await supabase.from("sms_usage").insert({
        tenant_id: usage.tenant_id,
        integration_id: usage.integration_id,
        to_number: usage.to_number,
        from_number: usage.from_number,
        message_body: usage.message_body,
        twilio_sid: usage.twilio_sid,
        agent_id: usage.agent_id || null,
        direction: usage.direction,
        status: "sent",
      });
    } catch (error) {
      // Don't fail SMS send if tracking fails
      console.error("Failed to track SMS usage:", error);
    }
  }

  /**
   * Find agent by phone number
   */
  private async findAgentByPhoneNumber(phoneNumber: string): Promise<any> {
    const { createServerClient } = await import("@/lib/supabase/server");
    const supabase = await createServerClient();

    // Look for agent with SMS trigger matching this phone number
    const { data: agents } = await supabase
      .from("agents")
      .select("*")
      .eq("status", "active")
      .contains("triggers", { type: "sms", phone_number: phoneNumber });

    if (!agents || agents.length === 0) {
      return null;
    }

    // Return first matching agent
    return agents[0];
  }

  /**
   * Get Twilio integration capabilities
   */
  getCapabilities(): string[] {
    return ["send_sms", "get_sms_history", "handle_webhooks", "send_mms"];
  }
}

export default TwilioIntegration;
