/**
 * Integration Server Actions
 * Handles integration CRUD operations and management
 */

"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import type { IntegrationCredentials } from "./base";

/**
 * Create a new integration
 */
export async function createIntegration(data: {
  provider: string;
  type: string;
  credentials: any;
  config?: any;
  webhook_url?: string;
}) {
  const supabase = await createServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get user's tenant_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) {
    return { error: "User profile not found" };
  }

  try {
    const { data: integration, error } = await supabase
      .from("integrations")
      .insert({
        tenant_id: profile.tenant_id,
        provider: data.provider,
        type: data.type,
        credentials: data.credentials,
        config: data.config || {},
        status: "connected",
        webhook_url: data.webhook_url,
      })
      .select()
      .single();

    if (error) {
      console.error("Integration creation error:", error);
      return { error: "Failed to create integration" };
    }

    revalidatePath("/integrations");
    return { success: true, integration };
  } catch (error) {
    console.error("Integration creation error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Get all integrations for current tenant
 */
export async function getIntegrations() {
  const supabase = await createServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get user's tenant_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) {
    return { error: "User profile not found" };
  }

  try {
    const { data: integrations, error } = await supabase
      .from("integrations")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching integrations:", error);
      return { error: "Failed to fetch integrations" };
    }

    return { integrations: integrations || [] };
  } catch (error) {
    console.error("Error fetching integrations:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Get a single integration by ID
 */
export async function getIntegration(id: string) {
  const supabase = await createServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get user's tenant_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) {
    return { error: "User profile not found" };
  }

  try {
    const { data: integration, error } = await supabase
      .from("integrations")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (error) {
      console.error("Error fetching integration:", error);
      return { error: "Integration not found" };
    }

    return { integration };
  } catch (error) {
    console.error("Error fetching integration:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Update an existing integration
 */
export async function updateIntegration(
  id: string,
  data: Partial<{
    credentials: any;
    config: any;
    status: string;
    webhook_url?: string;
  }>
) {
  const supabase = await createServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get user's tenant_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) {
    return { error: "User profile not found" };
  }

  try {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.credentials !== undefined)
      updateData.credentials = data.credentials;
    if (data.config !== undefined) updateData.config = data.config;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.webhook_url !== undefined)
      updateData.webhook_url = data.webhook_url;

    const { data: integration, error } = await supabase
      .from("integrations")
      .update(updateData)
      .eq("id", id)
      .eq("tenant_id", profile.tenant_id)
      .select()
      .single();

    if (error) {
      console.error("Integration update error:", error);
      return { error: "Failed to update integration" };
    }

    revalidatePath("/integrations");
    return { success: true, integration };
  } catch (error) {
    console.error("Integration update error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Delete an integration
 */
export async function deleteIntegration(id: string) {
  const supabase = await createServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get user's tenant_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) {
    return { error: "User profile not found" };
  }

  try {
    const { error } = await supabase
      .from("integrations")
      .delete()
      .eq("id", id)
      .eq("tenant_id", profile.tenant_id);

    if (error) {
      console.error("Integration deletion error:", error);
      return { error: "Failed to delete integration" };
    }

    revalidatePath("/integrations");
    return { success: true };
  } catch (error) {
    console.error("Integration deletion error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Test integration connection
 */
export async function testIntegration(id: string) {
  const supabase = await createServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get user's tenant_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) {
    return { error: "User profile not found" };
  }

  try {
    const { data: integration, error } = await supabase
      .from("integrations")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (error || !integration) {
      return { error: "Integration not found" };
    }

    // Use registry to get integration instance
    const { getIntegrationInstance } = await import("./registry");
    const integrationInstance = await getIntegrationInstance(id);

    if (!integrationInstance) {
      return { error: "Failed to create integration instance" };
    }

    // Test the connection
    const result = await integrationInstance.testConnection();

    // Ensure we always return a consistent object format
    if (typeof result === 'object' && 'success' in result) {
      return result;
    } else {
      // Handle boolean result from older integrations
      return { 
        success: !!result, 
        message: result ? "Connection test successful" : "Connection test failed" 
      };
    }
  } catch (error) {
    console.error("Integration test error:", error);
    return { error: "Failed to test integration" };
  }
}

/**
 * Get available integration providers
 */
export async function getAvailableProviders() {
  return [
    {
      id: "email",
      name: "Email",
      description: "Platform-wide email service - send and receive emails with zero setup",
      type: "email",
      icon: "📧",
      features: [
        "Inbound emails",
        "Outbound emails",
        "Auto-responses",
        "Usage tracking",
      ],
    },
    {
      id: "google_calendar",
      name: "Google Calendar",
      description: "Schedule meetings and manage appointments automatically",
      type: "calendar",
      icon: "📅",
      features: [
        "Event creation",
        "Availability check",
        "Meeting scheduling",
        "Calendar sync",
      ],
    },
    {
      id: "stripe",
      name: "Stripe",
      description: "Process payments, create invoices, and manage subscriptions",
      type: "payment",
      icon: "💳",
      features: [
        "Payment processing",
        "Invoice creation",
        "Subscription management",
        "Refund handling",
      ],
    },
    {
      id: "twilio",
      name: "Twilio SMS",
      description: "Send SMS notifications with zero setup - platform-wide service included",
      type: "sms",
      icon: "📱",
      features: [
        "Platform SMS included",
        "Two-way messaging",
        "Delivery tracking",
        "Custom credentials optional",
      ],
    },
    {
      id: "hubspot",
      name: "HubSpot",
      description: "Sync contacts and deals with HubSpot CRM",
      type: "crm",
      icon: "🎯",
      features: [
        "Contact sync",
        "Deal creation",
        "Company sync",
        "OAuth 2.0",
      ],
    },
    {
      id: "slack",
      name: "Slack",
      description:
        "Connect to Slack workspaces, send messages, and respond to mentions",
      type: "slack",
      icon: "💬",
      features: [
        "Bot mentions",
        "Channel posting",
        "DM responses",
        "Slash commands",
      ],
    },
    {
      id: "webhook",
      name: "Webhook",
      description: "Connect to any service via custom webhooks",
      type: "webhook",
      icon: "🔗",
      features: [
        "Custom endpoints",
        "Event filtering",
        "Payload transformation",
        "Retry logic",
      ],
    },
  ];
}
