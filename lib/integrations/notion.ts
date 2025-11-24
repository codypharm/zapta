/**
 * Notion Integration
 * Handles Notion databases and page management
 */

import { BaseIntegration, type IntegrationConfigSchema } from "./base";

interface NotionCredentials {
  integration_token: string;
  database_id?: string;
}

export class NotionIntegration extends BaseIntegration {
  provider = "notion";
  type = "productivity" as const;

  private getAuthHeaders(): Record<string, string> {
    const credentials = this.getCredentials();

    if (!credentials.integration_token) {
      throw new Error("Notion integration not authenticated");
    }

    return {
      Authorization: `Bearer ${credentials.integration_token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    };
  }

  protected getCredentials(): NotionCredentials {
    // In a real implementation, this would fetch from secure storage
    return {} as NotionCredentials;
  }

  /**
   * Authenticate with Notion integration token
   */
  async authenticate(credentials: NotionCredentials): Promise<void> {
    // Store credentials securely
    console.log("Notion authentication initiated");

    // Validate credentials format
    if (!credentials.integration_token) {
      throw new Error("Integration token is required");
    }

    // Test API access
    try {
      const response = await fetch("https://api.notion.com/v1/users/me", {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Invalid Notion credentials");
      }
    } catch (error) {
      throw new Error(`Notion authentication failed: ${error}`);
    }
  }

  /**
   * Test Notion connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const credentials = this.getCredentials();

      if (!credentials.integration_token) {
        console.log("No integration token available for testing");
        return false;
      }

      // Test API access by fetching user info
      const response = await fetch("https://api.notion.com/v1/users/me", {
        headers: this.getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Notion connection test successful");
        return true;
      } else {
        console.error("Notion connection test failed");
        return false;
      }
    } catch (error) {
      console.error("Notion connection test error:", error);
      return false;
    }
  }

  /**
   * Execute Notion actions
   */
  async executeAction(action: string, params: any): Promise<any> {
    const credentials = this.getCredentials();

    switch (action) {
      case "create_page":
        return this.createPage(params);

      case "update_page":
        return this.updatePage(params.page_id, params.data);

      case "create_database":
        return this.createDatabase(params);

      case "update_database":
        return this.updateDatabase(params.database_id, params.data);

      case "search_content":
        return this.searchContent(params.query);

      default:
        throw new Error(`Unknown Notion action: ${action}`);
    }
  }

  /**
   * Create a new page
   */
  private async createPage(pageData: {
    parent_id?: string;
    title: string;
    content?: any[];
    database_id?: string;
    properties?: Record<string, any>;
  }): Promise<any> {
    const pageContent = {
      parent: pageData.parent_id
        ? { page_id: pageData.parent_id }
        : { database_id: pageData.database_id },
      properties: pageData.properties || {},
      title: [
        {
          text: {
            content: pageData.title,
          },
        },
      ],
      children: pageData.content || [],
    };

    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(pageContent),
    });

    if (!response.ok) {
      throw new Error(`Failed to create page: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Update an existing page
   */
  private async updatePage(
    pageId: string,
    updateData: Record<string, any>
  ): Promise<any> {
    const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update page: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Create a new database
   */
  private async createDatabase(databaseData: {
    parent_id?: string;
    title: string;
    properties: Record<string, any>;
  }): Promise<any> {
    const dbContent = {
      parent: databaseData.parent_id
        ? { page_id: databaseData.parent_id }
        : { page_id: this.getCredentials().database_id },
      title: [
        {
          text: {
            content: databaseData.title,
          },
        },
      ],
      properties: databaseData.properties,
      is_query: true,
    };

    const response = await fetch("https://api.notion.com/v1/databases", {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(dbContent),
    });

    if (!response.ok) {
      throw new Error(`Failed to create database: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Update an existing database
   */
  private async updateDatabase(
    databaseId: string,
    updateData: Record<string, any>
  ): Promise<any> {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}`,
      {
        method: "PATCH",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update database: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Search content in Notion
   */
  private async searchContent(query: string): Promise<any[]> {
    const response = await fetch(
      `https://api.notion.com/v1/search?q=${encodeURIComponent(query)}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to search content: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  /**
   * Get Notion integration config schema
   */
  getConfigSchema(): IntegrationConfigSchema {
    return {
      type: "api_key" as const,
      fields: [
        {
          key: "integration_token",
          label: "Integration Token",
          type: "password" as const,
          required: true,
          description: "Your Notion integration token (secret_...)",
          placeholder: "secret_...",
        },
        {
          key: "database_id",
          label: "Database ID (Optional)",
          type: "text" as const,
          required: false,
          description: "Default database ID for page and database operations",
          placeholder: "your-database-id",
        },
      ],
    };
  }

  /**
   * Get Notion integration capabilities
   */
  getCapabilities(): string[] {
    return [
      "create_page",
      "update_page",
      "create_database",
      "update_database",
      "search_content",
      "manage_blocks",
      "create_comments",
    ];
  }
}

export default NotionIntegration;
