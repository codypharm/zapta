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

    const { error } = await supabase
      .from("integrations")
      .update(updateData)
      .eq("id", id)
      .eq("tenant_id", profile.tenant_id);

    if (error) {
      console.error("Integration update error:", error);
      return { error: "Failed to update integration" };
    }

    revalidatePath("/integrations");
    return { success: true };
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

    // Import and test the specific integration
    const integrationModule = await import(`./${integration.type}`);
    const IntegrationClass =
      integrationModule.default || integrationModule[integration.type];
    const integrationInstance = new IntegrationClass();

    const isConnected = await integrationInstance.testConnection();

    // Update integration status
    await supabase
      .from("integrations")
      .update({
        status: isConnected ? "connected" : "error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return { success: isConnected };
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
      description: "Send and receive emails, configure custom email addresses",
      type: "email",
      icon: "📧",
      features: [
        "Inbound emails",
        "Outbound emails",
        "Custom domains",
        "Auto-responses",
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
      id: "hubspot",
      name: "HubSpot",
      description: "Sync contacts and deals with HubSpot CRM",
      type: "crm",
      icon: "🎯",
      features: [
        "Contact sync",
        "Deal creation",
        "Company sync",
        "Ticket integration",
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
    {
      id: "twilio",
      name: "Twilio SMS",
      description: "Send and receive SMS messages via Twilio",
      type: "sms",
      icon: "📱",
      features: [
        "SMS sending",
        "SMS receiving",
        "Number management",
        "Message templates",
      ],
    },
    {
      id: "google_calendar",
      name: "Google Calendar",
      description: "Create and manage calendar events",
      type: "calendar",
      icon: "📅",
      features: [
        "Event creation",
        "Availability checking",
        "Meeting scheduling",
        "Calendar sync",
      ],
    },
    {
      id: "stripe",
      name: "Stripe",
      description: "Process payments and manage subscriptions",
      type: "payment",
      icon: "💳",
      features: [
        "Payment processing",
        "Subscription management",
        "Invoice creation",
        "Webhook events",
      ],
    },
    {
      id: "discord",
      name: "Discord",
      description: "Connect to Discord servers and channels",
      type: "communication",
      icon: "🎮",
      features: [
        "Bot commands",
        "Channel posting",
        "DM responses",
        "Server management",
      ],
    },
    {
      id: "google_drive",
      name: "Google Drive",
      description: "Access and manage files in Google Drive",
      type: "storage",
      icon: "📁",
      features: [
        "File upload/download",
        "Document sharing",
        "Folder management",
        "Search capabilities",
      ],
    },
    {
      id: "notion",
      name: "Notion",
      description: "Create and manage Notion databases and pages",
      type: "productivity",
      icon: "📝",
      features: [
        "Database operations",
        "Page creation",
        "Block management",
        "Content sync",
      ],
    },
    {
      id: "github",
      name: "GitHub",
      description: "Manage repositories and automate workflows",
      type: "development",
      icon: "🐙",
      features: [
        "Repository management",
        "Issue tracking",
        "Pull requests",
        "Actions automation",
      ],
    },
  ];
}
