/**
 * Base Integration Interface
 * All integrations must implement these methods
 */

export interface Integration {
  /** Integration ID */
  id: string;

  /** Integration provider name */
  provider: string;

  /** Integration type */
  type:
    | "email"
    | "slack"
    | "crm"
    | "sms"
    | "webhook"
    | "calendar"
    | "payment"
    | "communication"
    | "storage"
    | "productivity"
    | "development"
    | "document";

  /** Integration status */
  status: "connected" | "error" | "disconnected";

  /** Integration credentials (encrypted) */
  credentials: any;

  /** Integration configuration */
  config: any;

  /** Webhook URL (if applicable) */
  webhook_url?: string;

  /** Created timestamp */
  created_at: string;

  /** Updated timestamp */
  updated_at: string;

  /** Tenant ID */
  tenant_id: string;
}

export interface IntegrationClass {
  /** Integration provider name */
  provider: string;

  /** Integration type */
  type:
    | "email"
    | "slack"
    | "crm"
    | "sms"
    | "webhook"
    | "calendar"
    | "payment"
    | "communication"
    | "storage"
    | "productivity"
    | "development"
    | "document";

  /** Authenticate with OAuth or API key */
  authenticate(credentials: any): Promise<void>;

  /** Test connection health */
  testConnection(): Promise<boolean>;

  /** Execute an action (send message, create record, etc.) */
  executeAction(action: string, params: any): Promise<any>;

  /** Handle incoming webhooks */
  handleWebhook?(payload: any): Promise<void>;

  /** Get available actions for this integration */
  getCapabilities(): string[];

  /** Get integration configuration schema */
  getConfigSchema(): IntegrationConfigSchema;
}

export interface IntegrationAction {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  category: "trigger" | "action";
}

export interface IntegrationConfigSchema {
  type: "oauth" | "api_key" | "custom";
  fields: IntegrationConfigField[];
  auth_url?: string;
}

export interface IntegrationConfigField {
  key: string;
  label: string;
  type:
    | "text"
    | "password"
    | "url"
    | "select"
    | "textarea"
    | "checkbox"
    | "email"
    | "number";
  required: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  description?: string;
}

export interface IntegrationCredentials {
  provider: string;
  type: string;
  credentials: any;
  config: any;
  webhook_url?: string;
  oauth_data?: any;
}

export interface WebhookEvent {
  id: string;
  type: string;
  provider: string;
  payload: any;
  tenant_id: string;
  agent_id?: string;
  created_at: string;
}

/**
 * Base class for integrations with common functionality
 */
export abstract class BaseIntegration implements IntegrationClass {
  abstract provider: string;
  abstract type: Integration["type"];

  protected integrationRecord?: {
    id: string;
    tenant_id: string;
    provider: string;
    type: string;
    credentials: any;
    config: any;
    status: string;
    webhook_url?: string;
  };

  /**
   * Constructor accepts optional integration record from database
   */
  constructor(integrationRecord?: any) {
    this.integrationRecord = integrationRecord;
  }

  /**
   * Get credentials from integration record
   */
  protected getCredentials(): any {
    if (!this.integrationRecord?.credentials) {
      throw new Error(`${this.provider} integration not configured`);
    }
    return this.integrationRecord.credentials;
  }

  /**
   * Get config from integration record
   */
  protected getConfig(): any {
    return this.integrationRecord?.config || {};
  }

  /**
   * Get tenant ID
   */
  protected getTenantId(): string {
    if (!this.integrationRecord?.tenant_id) {
      throw new Error("Integration not associated with a tenant");
    }
    return this.integrationRecord.tenant_id;
  }

  /**
   * Execute an action - must be implemented by specific integration
   */
  abstract executeAction(action: string, params: any): Promise<any>;

  /**
   * Get integration config schema - must be implemented by specific integration
   */
  abstract getConfigSchema(): IntegrationConfigSchema;

  /**
   * Default implementation for OAuth authentication
   */
  async authenticate(credentials: any): Promise<void> {
    // Override in specific integration
    throw new Error("Authentication not implemented");
  }

  /**
   * Default test connection implementation
   */
  async testConnection(): Promise<boolean> {
    try {
      // Basic health check - override for specific logic
      return true;
    } catch (error) {
      console.error(`Connection test failed for ${this.provider}:`, error);
      return false;
    }
  }

  /**
   * Get default capabilities for integration type
   */
  getCapabilities(): string[] {
    switch (this.type) {
      case "email":
        return ["send_email", "parse_inbound", "get_emails"];
      case "slack":
        return ["send_message", "create_channel", "get_channels", "get_users"];
      case "crm":
        return [
          "create_contact",
          "update_contact",
          "create_deal",
          "update_deal",
        ];
      case "sms":
        return ["send_sms", "get_sms_history"];
      case "webhook":
        return ["send_webhook", "receive_webhook"];
      case "calendar":
        return [
          "create_event",
          "update_event",
          "get_events",
          "check_availability",
        ];
      case "payment":
        return [
          "create_payment",
          "create_customer",
          "create_subscription",
          "get_payment",
          "refund_payment",
          "handle_webhooks",
          "manage_subscriptions",
        ];
      case "communication":
        return [
          "send_message",
          "create_channel",
          "get_channels",
          "get_users",
          "handle_webhooks",
        ];
      case "storage":
        return [
          "upload_file",
          "download_file",
          "list_files",
          "create_folder",
          "search_files",
        ];
      case "productivity":
        return [
          "create_page",
          "update_page",
          "create_database",
          "update_database",
          "search_content",
        ];
      case "development":
        return [
          "create_repository",
          "update_repository",
          "create_issue",
         "update_issue",
          "create_pull_request",
          "handle_webhooks",
        ];
      case "document":
        return [
          "list_files",
          "read_document",
          "search_files", "create_document",
          "update_document",
          "delete_document",
        ];
      default:
        return [];
    }
  }
}
