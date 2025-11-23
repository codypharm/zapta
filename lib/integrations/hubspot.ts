/**
 * HubSpot CRM Integration
 * OAuth 2.0 integration for managing contacts, companies, and deals
 */

import { BaseIntegration, type IntegrationConfigSchema } from "./base";
import type { IntegrationRecord } from "./registry";

interface HubSpotCredentials {
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: number;
}

interface HubSpotContact {
  id?: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    company?: string;
    [key: string]: any;
  };
}

interface HubSpotDeal {
  id?: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    pipeline?: string;
    closedate?: string;
    [key: string]: any;
  };
}

interface HubSpotCompany {
  id?: string;
  properties: {
    name?: string;
    domain?: string;
    city?: string;
    state?: string;
    [key: string]: any;
  };
}

export class HubSpotIntegration extends BaseIntegration {
  provider = "hubspot";
  type = "crm" as const;

  private accessToken?: string;
  private refreshToken?: string;
  private tokenExpiresAt?: number;

  constructor(integrationRecord: IntegrationRecord) {
    super(integrationRecord);

    console.log("[HUBSPOT] Constructor - integration record:", {
      id: integrationRecord.id,
      provider: integrationRecord.provider,
      has_credentials: !!integrationRecord.credentials,
    });

    // Load OAuth tokens from credentials
    const creds = this.getCredentials() as HubSpotCredentials;
    console.log("[HUBSPOT] Decrypted credentials:", {
      has_access_token: !!creds?.access_token,
      has_refresh_token: !!creds?.refresh_token,
      has_token_expires_at: !!creds?.token_expires_at,
    });

    this.accessToken = creds?.access_token;
    this.refreshToken = creds?.refresh_token;
    this.tokenExpiresAt = creds?.token_expires_at;

    // Check for platform-wide API key as fallback
    if (!this.accessToken && process.env.HUBSPOT_API_KEY) {
      console.log("[HUBSPOT] Using platform-wide API key");
      this.accessToken = process.env.HUBSPOT_API_KEY;
    }
  }

  /**
   * Get OAuth authorization URL to initiate the flow
   */
  static getAuthorizationUrl(state: string): string {
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const redirectUri = process.env.HUBSPOT_REDIRECT_URI;
    const scopes = [
      // Core CRM objects (available on free tier)
      "crm.objects.contacts.read",
      "crm.objects.contacts.write",
      "crm.objects.companies.read",
      "crm.objects.companies.write",
      "crm.objects.deals.read",
      "crm.objects.deals.write",
      // Schemas - read custom field definitions
      "crm.schemas.contacts.read",
      "crm.schemas.companies.read",
      "crm.schemas.deals.read",
      // Lists
      "crm.lists.read",
      "crm.lists.write",
      // OAuth required
      "oauth",
    ];

    const params = new URLSearchParams({
      client_id: clientId || "",
      redirect_uri: redirectUri || "",
      scope: scopes.join(" "),
      state: state,
    });

    return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access tokens
   */
  static async exchangeCode(code: string): Promise<HubSpotCredentials> {
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    const redirectUri = process.env.HUBSPOT_REDIRECT_URI;

    const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId || "",
        client_secret: clientSecret || "",
        redirect_uri: redirectUri || "",
        code: code,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[HUBSPOT] Token exchange failed:", error);
      throw new Error(`Failed to exchange authorization code: ${error}`);
    }

    const data = await response.json();

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_expires_at: Date.now() + data.expires_in * 1000,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    console.log("[HUBSPOT] Refreshing access token...");

    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;

    try {
      const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: clientId || "",
          client_secret: clientSecret || "",
          refresh_token: this.refreshToken,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("[HUBSPOT] Token refresh failed:", error);
        throw new Error(`Failed to refresh token: ${error}`);
      }

      const data = await response.json();

      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

      // Note: Updated tokens are only in memory, not persisted
      // This is acceptable as OAuth flow will refresh them automatically

      console.log("[HUBSPOT] Token refreshed successfully");
    } catch (error) {
      console.error("[HUBSPOT] Error refreshing token:", error);
      throw error;
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<string> {
    if (!this.accessToken) {
      throw new Error("No access token available. Please re-authenticate.");
    }

    // If using API key (no refresh token), skip expiration check
    if (!this.refreshToken) {
      return this.accessToken;
    }

    // Check if OAuth token is expired or expiring soon (within 5 minutes)
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (this.tokenExpiresAt && this.tokenExpiresAt - now < fiveMinutes) {
      console.log("[HUBSPOT] Token expired or expiring soon, refreshing...");
      await this.refreshAccessToken();
    }

    return this.accessToken!;
  }

  /**
   * Make authenticated request to HubSpot API
   */
  private async makeHubSpotRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.ensureValidToken();

    // Check if using API key (no refresh token) or OAuth token
    const isApiKey = !this.refreshToken;
    
    let url = `https://api.hubapi.com${endpoint}`;
    let headers: Record<string, string> = {
      ...options.headers as Record<string, string>,
      "Content-Type": "application/json",
    };

    if (isApiKey) {
      // For API keys, use hapikey query parameter
      const separator = endpoint.includes('?') ? '&' : '?';
      url = `${url}${separator}hapikey=${token}`;
    } else {
      // For OAuth tokens, use Bearer authorization
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[HUBSPOT] API error:", error);
      throw new Error(`HubSpot API error: ${error}`);
    }

    return response.json();
  }

  /**
   * Authenticate (OAuth is handled via redirect flow)
   */
  async authenticate(): Promise<void> {
    if (!this.accessToken || !this.refreshToken) {
      throw new Error("Not authenticated - no tokens available");
    }
  }

  /**
   * Test HubSpot connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test by fetching a simple contact search (returns empty if no contacts)
      // This works for both OAuth and API key authentication
      await this.makeHubSpotRequest("/crm/v3/objects/contacts?limit=1", {
        method: "GET",
      });
      console.log("[HUBSPOT] Connection test passed");
      return true;
    } catch (error) {
      console.error("[HUBSPOT] Connection test failed:", error);
      return false;
    }
  }

  /**
   * Execute HubSpot actions
   */
  async executeAction(action: string, params: any): Promise<any> {
    switch (action) {
      case "create_contact":
        return this.createContact(params.contact);
      case "update_contact":
        return this.updateContact(params.id, params.contact);
      case "get_contact":
        return this.getContact(params.id);
      case "search_contacts":
        return this.searchContacts(params.query, params.limit);
      case "create_company":
        return this.createCompany(params.company);
      case "update_company":
        return this.updateCompany(params.id, params.company);
      case "create_deal":
        return this.createDeal(params.deal);
      case "update_deal":
        return this.updateDeal(params.id, params.deal);
      case "get_deals":
        return this.getDeals(params.limit);
      default:
        throw new Error(`Unknown HubSpot action: ${action}`);
    }
  }

  /**
   * Create a contact in HubSpot
   */
  async createContact(contact: HubSpotContact): Promise<string> {
    const result = await this.makeHubSpotRequest<any>("/crm/v3/objects/contacts", {
      method: "POST",
      body: JSON.stringify({ properties: contact.properties }),
    });

    console.log(`[HUBSPOT] Created contact: ${result.id}`);
    return result.id;
  }

  /**
   * Update a contact
   */
  async updateContact(id: string, contact: HubSpotContact): Promise<void> {
    await this.makeHubSpotRequest(`/crm/v3/objects/contacts/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ properties: contact.properties }),
    });

    console.log(`[HUBSPOT] Updated contact: ${id}`);
  }

  /**
   * Get a contact by ID
   */
  async getContact(id: string): Promise<HubSpotContact> {
    return this.makeHubSpotRequest<HubSpotContact>(`/crm/v3/objects/contacts/${id}`);
  }

  /**
   * Search contacts
   */
  async searchContacts(query: string, limit: number = 10): Promise<HubSpotContact[]> {
    const result = await this.makeHubSpotRequest<any>("/crm/v3/objects/contacts/search", {
      method: "POST",
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: "CONTAINS_TOKEN",
                value: query,
              },
            ],
          },
        ],
        limit,
      }),
    });

    return result.results || [];
  }

  /**
   * Create a company in HubSpot
   */
  async createCompany(company: HubSpotCompany): Promise<string> {
    const result = await this.makeHubSpotRequest<any>("/crm/v3/objects/companies", {
      method: "POST",
      body: JSON.stringify({ properties: company.properties }),
    });

    console.log(`[HUBSPOT] Created company: ${result.id}`);
    return result.id;
  }

  /**
   * Update a company
   */
  async updateCompany(id: string, company: HubSpotCompany): Promise<void> {
    await this.makeHubSpotRequest(`/crm/v3/objects/companies/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ properties: company.properties }),
    });

    console.log(`[HUBSPOT] Updated company: ${id}`);
  }

  /**
   * Create a deal in HubSpot
   */
  async createDeal(deal: HubSpotDeal): Promise<string> {
    const result = await this.makeHubSpotRequest<any>("/crm/v3/objects/deals", {
      method: "POST",
      body: JSON.stringify({ properties: deal.properties }),
    });

    console.log(`[HUBSPOT] Created deal: ${result.id}`);
    return result.id;
  }

  /**
   * Update a deal
   */
  async updateDeal(id: string, deal: HubSpotDeal): Promise<void> {
    await this.makeHubSpotRequest(`/crm/v3/objects/deals/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ properties: deal.properties }),
    });

    console.log(`[HUBSPOT] Updated deal: ${id}`);
  }

  /**
   * Get deals
   */
  async getDeals(limit: number = 10): Promise<HubSpotDeal[]> {
    const result = await this.makeHubSpotRequest<any>(
      `/crm/v3/objects/deals?limit=${limit}`
    );

    return result.results || [];
  }

  /**
   * Get integration config schema
   */
  getConfigSchema(): IntegrationConfigSchema {
    return {
      type: "oauth" as const,
      auth_url: "/api/integrations/hubspot/auth",
      fields: [],
    };
  }

  /**
   * Get HubSpot integration capabilities
   */
  getCapabilities(): string[] {
    return [
      "create_contact",
      "update_contact",
      "get_contact",
      "search_contacts",
      "create_company",
      "update_company",
      "create_deal",
      "update_deal",
      "get_deals",
    ];
  }
}

export default HubSpotIntegration;
