/**
 * Google Drive Integration
 * Handles file access and search for Analytics Assistant
 */

import { BaseIntegration, type IntegrationConfigSchema } from "./base";
import type { IntegrationRecord } from "./registry";

interface GoogleDriveCredentials {
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: number;
}

export class GoogleDriveIntegration extends BaseIntegration {
  provider = "google-drive";
  type = "document" as const;

  private accessToken?: string;
  private refreshToken?: string;
  private tokenExpiresAt?: number;

  constructor(integrationRecord: IntegrationRecord) {
    super(integrationRecord);
    
    const creds = this.getCredentials() as GoogleDriveCredentials;
    this.accessToken = creds?.access_token;
    this.refreshToken = creds?.refresh_token;
    this.tokenExpiresAt = creds?.token_expires_at;
  }

  /**
   * Get OAuth authorization URL
   */
  static getAuthorizationUrl(state: string): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
                        `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google-drive/callback`;
    
    const scopes = [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
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
   * (Reusing similar logic to Calendar, but could be shared utility)
   */
  static async exchangeCodeForToken(code: string): Promise<any> {
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
                        `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google-drive/callback`;
    
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

  private async makeDriveRequest<T>(endpoint: string): Promise<T> {
    const token = await this.ensureValidToken();
    const response = await fetch(`https://www.googleapis.com/drive/v3${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) throw new Error(`Drive API error: ${response.statusText}`);
    return response.json();
  }

  async authenticate(): Promise<void> {
    if (!this.accessToken) throw new Error('Not authenticated');
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeDriveRequest('/files?pageSize=1');
      return true;
    } catch {
      return false;
    }
  }

  async executeAction(action: string, params: any): Promise<any> {
    switch (action) {
      case 'list_files':
        return this.listFiles(params.limit, params.query);
      case 'read_document':
        return this.readDocument(params.fileId);
      case 'search_files':
        return this.searchFiles(params.query);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  getConfigSchema(): IntegrationConfigSchema {
    return {
      type: 'oauth',
      auth_url: '/api/integrations/google-drive/connect',
      fields: []
    };
  }

  getCapabilities(): string[] {
    return ['list_files', 'read_document', 'search_files'];
  }

  // ============================================================================
  // BUSINESS ASSISTANT QUERY METHODS
  // ============================================================================

  /**
   * List files
   * Used by Analytics Assistant to find documents
   */
  async listFiles(limit: number = 10, query?: string): Promise<any[]> {
    let q = "trashed = false";
    if (query) {
      q += ` and name contains '${query}'`;
    }

    const result = await this.makeDriveRequest<any>(
      `/files?pageSize=${limit}&q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,webViewLink,createdTime,modifiedTime)`
    );

    return result.files || [];
  }

  /**
   * Search files
   * Used by Analytics Assistant
   */
  async searchFiles(query: string): Promise<any[]> {
    return this.listFiles(20, query);
  }

  /**
   * Read document content (export to plain text)
   * Used by Analytics Assistant to analyze content
   */
  async readDocument(fileId: string): Promise<string> {
    const token = await this.ensureValidToken();
    
    // First get file metadata to check mime type
    const meta = await this.makeDriveRequest<any>(`/files/${fileId}?fields=mimeType,name`);
    
    let url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
    
    // If it's a Google Doc, export it
    if (meta.mimeType === 'application/vnd.google-apps.document') {
      url += '/export?mimeType=text/plain';
    } else if (meta.mimeType === 'application/vnd.google-apps.spreadsheet') {
      url += '/export?mimeType=text/csv'; // Export sheets as CSV
    } else {
      url += '?alt=media'; // Download binary content
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to read file content');
    
    return await response.text();
  }
}
