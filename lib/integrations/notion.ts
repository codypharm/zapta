/**
 * Notion Integration
 * Handles database access and page content for Analytics Assistant
 */

import { BaseIntegration, type IntegrationConfigSchema } from "./base";
import type { IntegrationRecord } from "./registry";
import { Client } from "@notionhq/client";

interface NotionCredentials {
  access_token?: string;
  workspace_id?: string;
  bot_id?: string;
}

export class NotionIntegration extends BaseIntegration {
  provider = "notion";
  type = "document" as const;

  private client?: Client;

  constructor(integrationRecord: IntegrationRecord) {
    super(integrationRecord);
    
    const creds = this.getCredentials() as NotionCredentials;
    if (creds?.access_token) {
      this.client = new Client({ auth: creds.access_token });
    }
  }

  /**
   * Get OAuth authorization URL
   */
  static getAuthorizationUrl(state: string): string {
    const clientId = process.env.NOTION_CLIENT_ID;
    const redirectUri = process.env.NOTION_REDIRECT_URI || 
                        `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/notion/callback`;
    
    const params = new URLSearchParams({
      client_id: clientId || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      owner: 'user',
      state,
    });

    return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange code for token
   */
  static async exchangeCodeForToken(code: string): Promise<any> {
    const clientId = process.env.NOTION_CLIENT_ID;
    const clientSecret = process.env.NOTION_CLIENT_SECRET;
    const redirectUri = process.env.NOTION_REDIRECT_URI || 
                        `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/notion/callback`;
    
    // Notion requires Basic Auth for token exchange
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) throw new Error('Failed to exchange code');
    return response.json();
  }

  private getClient(): Client {
    if (!this.client) throw new Error('Not authenticated');
    return this.client;
  }

  async authenticate(): Promise<void> {
    if (!this.client) throw new Error('Not authenticated');
  }

  async testConnection(): Promise<boolean> {
    try {
      const client = this.getClient();
      await client.users.me({});
      return true;
    } catch {
      return false;
    }
  }

  async executeAction(action: string, params: any): Promise<any> {
    switch (action) {
      case 'get_databases':
        return this.getDatabases();
      case 'query_database':
        return this.queryDatabase(params.databaseId, params.query);
      case 'get_page':
        return this.getPage(params.pageId);
      case 'search':
        return this.search(params.query);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  getConfigSchema(): IntegrationConfigSchema {
    return {
      type: 'oauth',
      auth_url: '/api/integrations/notion/connect',
      fields: []
    };
  }

  getCapabilities(): string[] {
    return ['get_databases', 'query_database', 'get_page', 'search'];
  }

  // ============================================================================
  // BUSINESS ASSISTANT QUERY METHODS
  // ============================================================================

  /**
   * Get accessible databases
   * Used by Analytics Assistant
   */
  async getDatabases(): Promise<any[]> {
    const client = this.getClient();
    const response = await client.search({
      filter: {
        value: 'database' as any,
        property: 'object' as any
      },
      page_size: 20
    });

    return response.results.map((db: any) => ({
      id: db.id,
      title: db.title?.[0]?.plain_text || 'Untitled',
      url: db.url,
      created_time: db.created_time
    }));
  }

  /**
   * Query a database
   * Used by Analytics Assistant to extract structured data
   */
  async queryDatabase(databaseId: string, query?: string): Promise<any[]> {
    const client = this.getClient();
    
    // Simple query support for now
    const params: any = { database_id: databaseId, page_size: 20 };
    if (query) {
      // Basic text search in database
      // Note: Notion API filter capabilities are complex, 
      // for now we'll just fetch and let the agent filter if needed
    }

    const response = await (client.databases as any).query(params);

    return response.results.map((page: any) => {
      // Simplify properties for the agent
      const props: Record<string, any> = {};
      Object.entries(page.properties).forEach(([key, value]: [string, any]) => {
        if (value.type === 'title') props[key] = value.title?.[0]?.plain_text;
        else if (value.type === 'rich_text') props[key] = value.rich_text?.[0]?.plain_text;
        else if (value.type === 'number') props[key] = value.number;
        else if (value.type === 'select') props[key] = value.select?.name;
        else if (value.type === 'status') props[key] = value.status?.name;
        else if (value.type === 'date') props[key] = value.date?.start;
        else if (value.type === 'checkbox') props[key] = value.checkbox;
      });

      return {
        id: page.id,
        url: page.url,
        properties: props
      };
    });
  }

  /**
   * Get page content (as text)
   * Used by Analytics Assistant
   */
  async getPage(pageId: string): Promise<string> {
    const client = this.getClient();
    
    // Get page metadata
    const page = await client.pages.retrieve({ page_id: pageId });
    const title = (page as any).properties?.title?.title?.[0]?.plain_text || 'Untitled';

    // Get blocks (content)
    const blocks = await client.blocks.children.list({ block_id: pageId });
    
    // Convert blocks to markdown-like text
    const content = blocks.results.map((block: any) => {
      if (block.type === 'paragraph') return block.paragraph.rich_text?.[0]?.plain_text || '';
      if (block.type === 'heading_1') return `# ${block.heading_1.rich_text?.[0]?.plain_text || ''}`;
      if (block.type === 'heading_2') return `## ${block.heading_2.rich_text?.[0]?.plain_text || ''}`;
      if (block.type === 'heading_3') return `### ${block.heading_3.rich_text?.[0]?.plain_text || ''}`;
      if (block.type === 'bulleted_list_item') return `- ${block.bulleted_list_item.rich_text?.[0]?.plain_text || ''}`;
      return '';
    }).join('\n');

    return `# ${title}\n\n${content}`;
  }

  /**
   * Search all accessible pages/databases
   */
  async search(query: string): Promise<any[]> {
    const client = this.getClient();
    const response = await client.search({
      query,
      page_size: 10
    });

    return response.results.map((item: any) => ({
      id: item.id,
      type: item.object,
      title: item.properties?.title?.title?.[0]?.plain_text || 'Untitled',
      url: item.url
    }));
  }
}
