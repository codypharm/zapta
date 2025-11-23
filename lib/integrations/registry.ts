/**
 * Integration Registry
 * Central place to instantiate and manage integrations with proper credential loading
 */

import { createServerClient } from "@/lib/supabase/server";
import { EmailIntegration } from "./email";
import { HubSpotIntegration } from "./hubspot";
import { GoogleCalendarIntegration } from "./google-calendar";
import { TwilioIntegration } from "./twilio";
import type { Integration, IntegrationClass } from "./base";

/**
 * Integration record from database
 */
export interface IntegrationRecord {
  id: string;
  tenant_id: string;
  provider: string;
  type: string;
  credentials: any;
  config: any;
  status: string;
  webhook_url?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Get integration instance by ID with credentials loaded
 * @param integrationId - Integration ID from database
 * @returns Integration instance or null if not found
 */
export async function getIntegrationInstance(
  integrationId: string
): Promise<IntegrationClass | null> {
  const supabase = await createServerClient();

  const { data: integration, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("id", integrationId)
    .single();

  if (error || !integration) {
    console.error("Integration not found:", integrationId, error);
    return null;
  }

  return createIntegrationInstance(integration as IntegrationRecord);
}

/**
 * Get all integration instances for a tenant
 * @param tenantId - Tenant ID
 * @param status - Filter by status (optional)
 * @returns Array of integration instances
 */
export async function getTenantIntegrations(
  tenantId: string,
  status?: string
): Promise<IntegrationClass[]> {
  const supabase = await createServerClient();

  let query = supabase
    .from("integrations")
    .select("*")
    .eq("tenant_id", tenantId);

  if (status) {
    query = query.eq("status", status);
  }

  const { data: integrations, error } = await query;

  if (error || !integrations) {
    console.error("Error fetching integrations:", error);
    return [];
  }

  return integrations
    .map((integration) =>
      createIntegrationInstance(integration as IntegrationRecord)
    )
    .filter((instance): instance is IntegrationClass => instance !== null);
}

/**
 * Get integration instance by provider and tenant
 * @param provider - Provider name (email, hubspot, slack, etc.)
 * @param tenantId - Tenant ID
 * @returns Integration instance or null
 */
export async function getIntegrationByProvider(
  provider: string,
  tenantId: string
): Promise<IntegrationClass | null> {
  const supabase = await createServerClient();

  const { data: integration, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("provider", provider)
    .eq("tenant_id", tenantId)
    .eq("status", "connected")
    .single();

  if (error || !integration) {
    return null;
  }

  return createIntegrationInstance(integration as IntegrationRecord);
}

/**
 * Create integration instance from database record
 * @param integration - Integration record from database
 * @returns Integration instance
 */
function createIntegrationInstance(
  integration: IntegrationRecord
): IntegrationClass | null {
  try {
    // Decrypt credentials before passing to integration
    const { safeDecryptCredentials } = require('./encryption');
    const decryptedIntegration = {
      ...integration,
      credentials: integration.credentials 
        ? safeDecryptCredentials(integration.credentials) 
        : {}
    };
    
    console.log('[REGISTRY] Creating integration instance:', {
      provider: integration.provider,
      has_encrypted_creds: !!integration.credentials,
      has_decrypted_creds: !!decryptedIntegration.credentials
    });

    switch (integration.provider) {
      case "email":
        return new EmailIntegration(decryptedIntegration);

      case "hubspot":
        return new HubSpotIntegration(decryptedIntegration);

      case "google_calendar":
        return new GoogleCalendarIntegration(decryptedIntegration);

      case "twilio":
        return new TwilioIntegration(decryptedIntegration);

      case "webhook":
        const { WebhookIntegration } = require("./webhook");
        return new WebhookIntegration(decryptedIntegration);

      // TODO: Add more integrations as they're implemented
      // case "slack":
      //   return new SlackIntegration(integration);
      //
      // case "twilio":
      //   return new TwilioIntegration(integration);
      //
      // case "webhook":
      //   return new WebhookIntegration(integration);

      default:
        console.warn(`Unknown integration provider: ${integration.provider}`);
        return null;
    }
  } catch (error) {
    console.error(
      `Error creating integration instance for ${integration.provider}:`,
      error
    );
    return null;
  }
}

/**
 * Get integration map for agent execution
 * Returns a Map of provider -> integration instance
 * @param tenantId - Tenant ID
 * @returns Map of provider to integration instance
 */
export async function getIntegrationMap(
  tenantId: string
): Promise<Map<string, IntegrationClass>> {
  const integrations = await getTenantIntegrations(tenantId, "connected");
  const map = new Map<string, IntegrationClass>();

  integrations.forEach((integration) => {
    map.set(integration.provider, integration);
  });

  return map;
}
