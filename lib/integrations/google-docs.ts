/**
 * Google Docs Integration
 * Handles reading and searching documents for Business Assistants
 */

import { BaseIntegration, type IntegrationConfigSchema } from "./base";
import type { IntegrationRecord } from "./registry";

interface GoogleDocsCredentials {
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: number;
}

export class GoogleDocsIntegration extends BaseIntegration {
  provider = "google_docs";
  type = "document" as const;

  private accessToken?: string;
  private refreshToken?: string;
  private tokenExpiresAt?: number;

  constructor(integrationRecord: IntegrationRecord) {
    super(integrationRecord);
    
    const creds = this.getCredentials() as GoogleDocsCredentials;
    this.accessToken = creds?.access_token;
    this.refreshToken = creds?.refresh_token;
    this.tokenExpiresAt = creds?.token_expires_at;
  }

  /**
   * Get OAuth authorization URL
   */
  static getAuthorizationUrl(state: string): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google-docs/callback`;
    
    const scopes = [
      'https://www.googleapis.com/auth/documents.readonly',
      'https://www.googleapis.com/auth/documents'
    ];

    const params = new URLSearchParams({
      client_id: clientId || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange code for token
   */
  static async exchangeCodeForToken(code: string): Promise<any> {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google-docs/callback`;
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) throw new Error('Failed to exchange code');
    return response.json();
  }

  private async ensureValidToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiresAt && this.tokenExpiresAt > Date.now() + 300000) {
      return this.accessToken;
    }
    
    if (!this.refreshToken) throw new Error('No refresh token');

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: this.refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) throw new Error('Failed to refresh token');
    
    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
    
    return this.accessToken!;
  }

  private async makeDocsRequest<T>(documentId: string): Promise<T> {
    const token = await this.ensureValidToken();
    const response = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error(`Docs API error: ${response.statusText}`);
    return response.json();
  }

  async authenticate(): Promise<void> {
    if (!this.accessToken) throw new Error('Not authenticated');
  }

  async testConnection(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      console.log('[GOOGLE DOCS] Testing connection...');
      const token = await this.ensureValidToken();
      const response = await fetch('https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.document%27&pageSize=1', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to access Docs');
      console.log('[GOOGLE DOCS] Connection test successful');
      return { success: true, message: 'Connected to Google Docs successfully' };
    } catch (error) {
      console.error('[GOOGLE DOCS] Test connection error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to connect to Google Docs' 
      };
    }
  }

  getConfigSchema(): IntegrationConfigSchema {
    return {
      type: 'oauth',
      auth_url: GoogleDocsIntegration.getAuthorizationUrl(''),
      fields: [],
    };
  }

  async executeAction(action: string, params: any): Promise<any> {
    switch (action) {
      case 'list_documents':
        return this.listDocuments(params?.limit || 10);
      case 'get_document':
        return this.getDocument(params?.documentId);
      case 'get_document_content':
        return this.getDocumentContent(params?.documentId);
      case 'search_documents':
        return this.searchDocuments(params?.query);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * List documents
   */
  async listDocuments(limit: number = 10): Promise<any[]> {
    const token = await this.ensureValidToken();
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.document%27&pageSize=${limit}&fields=files(id,name,modifiedTime,webViewLink)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (!response.ok) throw new Error('Failed to list documents');
    const data = await response.json();
    return data.files || [];
  }

  /**
   * Get document metadata and structure
   */
  async getDocument(documentId: string): Promise<any> {
    return this.makeDocsRequest(documentId);
  }

  /**
   * Get document content as plain text
   */
  async getDocumentContent(documentId: string): Promise<string> {
    const doc = await this.makeDocsRequest<any>(documentId);
    return this.extractTextFromDocument(doc);
  }

  /**
   * Search documents by name
   */
  async searchDocuments(query: string): Promise<any[]> {
    const token = await this.ensureValidToken();
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.document%27+and+name+contains+%27${encodeURIComponent(query)}%27&fields=files(id,name,modifiedTime,webViewLink)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (!response.ok) throw new Error('Failed to search documents');
    const data = await response.json();
    return data.files || [];
  }

  /**
   * Extract plain text from Google Docs document structure
   */
  private extractTextFromDocument(doc: any): string {
    const content: string[] = [];
    
    if (doc.body?.content) {
      for (const element of doc.body.content) {
        if (element.paragraph?.elements) {
          for (const textElement of element.paragraph.elements) {
            if (textElement.textRun?.content) {
              content.push(textElement.textRun.content);
            }
          }
        }
      }
    }
    
    return content.join('');
  }

  getCapabilities(): string[] {
    return [
      'list_documents',
      'get_document',
      'get_document_content',
      'search_documents',
    ];
  }
}

export default GoogleDocsIntegration;
