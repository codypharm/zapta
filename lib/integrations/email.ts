/**
 * Email Integration
 * Handles inbound/outbound emails via Resend (Platform-wide service)
 */

import { BaseIntegration, IntegrationConfigSchema } from "./base";
import { Resend } from "resend";
import { executeAgent } from "@/lib/agents/execute";

interface EmailCredentials {
  from_email: string;
  from_name?: string;
  api_key?: string; // Optional: Allow enterprise clients to use custom key
}

interface EmailWebhookPayload {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    type: string;
  }>;
  timestamp: string;
}

interface AgentInput {
  type: "chat" | "email" | "webhook" | "slack" | "sms";
  from?: string;
  to?: string | string[];
  subject?: string;
  body?: string;
  message?: string;
  payload?: any;
  timestamp?: string;
  attachments?: any[];
  html?: string;
}

export class EmailIntegration extends BaseIntegration {
  provider = "email";
  type = "email" as const;

  /**
   * Get Resend client instance
   * Uses platform key by default, or custom key if provided
   */
  private getResendClient(): Resend {
    const credentials = this.getCredentials() as EmailCredentials;
    
    // Use custom API key if provided (enterprise feature)
    // Otherwise use platform-wide key
    const apiKey = credentials.api_key || process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      throw new Error("Resend API key not configured (platform or custom)");
    }
    
    return new Resend(apiKey);
  }

  /**
   * Get email integration config schema
   */
  getConfigSchema(): IntegrationConfigSchema {
    return {
      type: "api_key" as const,
      auth_url: "https://resend.com/domains",
      fields: [
        {
          key: "from_email",
          label: "From Email Address",
          type: "email" as const,
          required: true,
          description:
            "Email address to send from. Use your verified domain or onboarding@resend.dev for testing.",
          placeholder: "support@yourcompany.com",
        },
        {
          key: "from_name",
          label: "From Name",
          type: "text" as const,
          required: false,
          description: "Display name for outgoing emails",
          placeholder: "Support Team",
        },
        // Enterprise option: custom API key
        {
          key: "api_key",
          label: "Custom Resend API Key (Optional)",
          type: "password" as const,
          required: false,
          description: "Leave empty to use platform email service. Enterprise clients can provide their own key.",
          placeholder: "re_xxxxxxxxxxxx",
        },
      ],
    };
  }

  /**
   * Authenticate email integration
   */
  async authenticate(credentials: EmailCredentials): Promise<void> {
    // Validate Resend API key
    if (!credentials.api_key) {
      throw new Error("Resend API key is required");
    }

    // Test the API key by creating a Resend client
    try {
      const resend = new Resend(credentials.api_key);
      // Resend doesn't have a simple test endpoint, so we just validate format
      if (!credentials.api_key.startsWith("re_")) {
        throw new Error("Invalid Resend API key format");
      }
    } catch (error) {
      throw new Error("Failed to validate Resend API key");
    }
  }

  /**
   * Test email connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const credentials = this.getCredentials() as EmailCredentials;
      
      // Check if from_email is configured
      if (!credentials.from_email) {
        console.error('Email test failed: from_email not configured');
        return false;
      }
      
      // Check if we have a valid API key (custom or platform)
      const apiKey = credentials.api_key || process.env.RESEND_API_KEY;
      
      if (!apiKey) {
        console.error('Email test failed: No API key available');
        return false;
      }
      
      // Validate API key format
      if (!apiKey.startsWith("re_")) {
        console.error('Email test failed: Invalid API key format');
        return false;
      }
      
      console.log('[EMAIL] Connection test passed');
      return true;
    } catch (error) {
      console.error("Email connection test failed:", error);
      return false;
    }
  }

  /**
   * Execute email actions
   */
  async executeAction(action: string, params: any): Promise<any> {
    switch (action) {
      case "send_email":
        return this.sendEmail(params);
      case "parse_inbound":
        return this.parseInboundEmail(params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Handle inbound email webhook
   */
  async handleWebhook(payload: EmailWebhookPayload): Promise<void> {
    try {
      console.log(`📧 Processing inbound email to ${payload.to.join(", ")}`);

      // Find agent configured for this email address
      const agent = await this.findAgentByEmail(payload.to[0]);

      if (!agent) {
        console.log(`No agent found for email address: ${payload.to[0]}`);
        return;
      }

      // Execute agent with email content
      const response = await executeAgent(agent.id, {
        type: "email",
        from: payload.from,
        to: payload.to,
        subject: payload.subject,
        body: payload.text,
        html: payload.html,
        attachments: payload.attachments,
        timestamp: payload.timestamp,
      });

      // Send response email
      if (response.message) {
        await this.sendEmailResponse(
          payload.from,
          response.message,
          payload.subject
        );
      }

      console.log(`✅ Email processed and response sent to ${payload.from}`);
    } catch (error) {
      console.error("Error handling email webhook:", error);
    }
  }

  /**
   * Send outbound email
   */
  private async sendEmail(params: {
    to: string | string[];
    subject: string;
    body: string;
    html?: string;
    from?: string;
    attachments?: any[];
    agent_id?: string;
    billable?: boolean;
  }): Promise<any> {
    const credentials = this.getCredentials() as EmailCredentials;
    const resend = this.getResendClient();
    const tenantId = this.getTenantId();

    // Check email usage limit before sending (if billable)
    if (params.billable !== false) {
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

      // Count emails sent this month
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const { count } = await supabase
        .from("email_usage")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .gte("created_at", firstOfMonth.toISOString())
        .eq("billable", true);

      const currentUsage = count || 0;
      const emailLimit = planLimits.integrations.email;

      if (emailLimit !== -1 && currentUsage >= emailLimit) {
        throw new Error(
          `Email limit reached (${currentUsage}/${emailLimit}). Please upgrade your plan to send more emails.`
        );
      }
    }

    try {
      const { data, error } = await resend.emails.send({
        from: params.from || `${credentials.from_name || "Zapta"} <${credentials.from_email}>`,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        text: params.body,
        html: params.html || params.body,
        // Resend handles attachments differently - would need to convert format
      });

      if (error) {
        throw new Error(`Resend API error: ${error.message}`);
      }

      // Track usage for billing
      await this.trackEmailUsage({
        tenant_id: tenantId,
        integration_id: this.integrationRecord?.id || "",
        to_address: Array.isArray(params.to) ? params.to[0] : params.to,
        from_address: credentials.from_email,
        subject: params.subject,
        resend_id: data?.id || null,
        agent_id: params.agent_id,
        billable: params.billable !== false, // Default to true
      });

      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Failed to send email via Resend:", error);
      throw error;
    }
  }

  /**
   * Track email usage for billing
   */
  private async trackEmailUsage(usage: {
    tenant_id: string;
    integration_id: string;
    to_address: string;
    from_address: string;
    subject: string;
    resend_id: string | null;
    agent_id?: string;
    billable: boolean;
  }): Promise<void> {
    try {
      // Use service role client for usage tracking
      // This works in all contexts (server, edge, background jobs)
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      await supabase.from("email_usage").insert({
        tenant_id: usage.tenant_id,
        integration_id: usage.integration_id,
        to_address: usage.to_address,
        from_address: usage.from_address,
        subject: usage.subject,
        resend_id: usage.resend_id,
        agent_id: usage.agent_id || null,
        billable: usage.billable,
        status: "sent",
      });
    } catch (error) {
      // Don't fail email send if tracking fails
      console.error("Failed to track email usage:", error);
    }
  }

  /**
   * Send email response
   */
  private async sendEmailResponse(
    to: string,
    message: string,
    originalSubject: string
  ): Promise<void> {
    try {
      const subject = originalSubject.startsWith("Re:")
        ? originalSubject
        : `Re: ${originalSubject}`;

      await this.sendEmail({
        to,
        subject,
        body: message,
        html: this.formatEmailResponse(message),
      });

      console.log(`📧 Response email sent to ${to}`);
    } catch (error) {
      console.error("Failed to send response email:", error);
    }
  }

  /**
   * Parse inbound email content
   */
  private parseInboundEmail(params: { emailData: EmailWebhookPayload }): any {
    const { emailData } = params;

    return {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      body: emailData.text,
      html: emailData.html,
      attachments: emailData.attachments,
      timestamp: emailData.timestamp,
    };
  }

  /**
   * Find agent by email address
   */
  private async findAgentByEmail(email: string): Promise<any> {
    const { createServerClient } = await import("@/lib/supabase/server");
    const supabase = await createServerClient();
    
    // Extract domain from email
    const domain = email.split("@")[1];

    // Look for agent with email trigger matching this domain/address
    const { data: agents } = await supabase
      .from("agents")
      .select(
        `
        *,
        tenants!inner(
          name,
          slug
        )
      `
      )
      .eq("tenants.slug", domain)
      .eq("status", "active");

    if (!agents || agents.length === 0) {
      return null;
    }

    // Return first active agent (in production, you might have multiple agents per domain)
    return agents[0];
  }

  /**
   * Format email response with proper styling
   */
  private formatEmailResponse(message: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
          <p style="color: #333; line-height: 1.6; margin: 0;">${message}</p>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px; text-align: center;">
          This message was sent by Zapta AI Agent
        </p>
      </div>
    `;
  }

  /**
   * Get email integration capabilities
   */
  getCapabilities(): string[] {
    return ["send_email", "parse_inbound", "get_emails", "auto_respond"];
  }
}

export default EmailIntegration;
