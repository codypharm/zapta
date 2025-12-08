/**
 * Google Sheets Integration
 * Handles reading and writing spreadsheet data for Business Assistants
 */

import { BaseIntegration, type IntegrationConfigSchema } from "./base";
import type { IntegrationRecord } from "./registry";

interface GoogleSheetsCredentials {
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: number;
}

export class GoogleSheetsIntegration extends BaseIntegration {
  provider = "google_sheets";
  type = "document" as const;

  private accessToken?: string;
  private refreshToken?: string;
  private tokenExpiresAt?: number;

  constructor(integrationRecord: IntegrationRecord) {
    super(integrationRecord);
    
    const creds = this.getCredentials() as GoogleSheetsCredentials;
    this.accessToken = creds?.access_token;
    this.refreshToken = creds?.refresh_token;
    this.tokenExpiresAt = creds?.token_expires_at;
  }

  /**
   * Get OAuth authorization URL
   */
  static getAuthorizationUrl(state: string): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google-sheets/callback`;
    
    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/spreadsheets'
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
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google-sheets/callback`;
    
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

  private async makeSheetsRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.ensureValidToken();
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) throw new Error(`Sheets API error: ${response.statusText}`);
    return response.json();
  }

  async authenticate(): Promise<void> {
    if (!this.accessToken) throw new Error('Not authenticated');
  }

  async testConnection(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      console.log('[GOOGLE SHEETS] Testing connection...');
      // Try to list files to test connection (using Drive API)
      const token = await this.ensureValidToken();
      const response = await fetch('https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.spreadsheet%27&pageSize=1', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to access Sheets');
      console.log('[GOOGLE SHEETS] Connection test successful');
      return { success: true, message: 'Connected to Google Sheets successfully' };
    } catch (error) {
      console.error('[GOOGLE SHEETS] Test connection error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to connect to Google Sheets' 
      };
    }
  }

  getConfigSchema(): IntegrationConfigSchema {
    return {
      type: 'oauth',
      auth_url: GoogleSheetsIntegration.getAuthorizationUrl(''),
      fields: [],
    };
  }

  async executeAction(action: string, params: any): Promise<any> {
    switch (action) {
      case 'list_spreadsheets':
        return this.listSpreadsheets(params?.limit || 10);
      case 'get_spreadsheet':
        return this.getSpreadsheet(params?.spreadsheetId);
      case 'get_sheet_data':
        return this.getSheetData(params?.spreadsheetId, params?.range);
      case 'search_spreadsheets':
        return this.searchSpreadsheets(params?.query);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * List spreadsheets
   */
  async listSpreadsheets(limit: number = 10): Promise<any[]> {
    const token = await this.ensureValidToken();
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.spreadsheet%27&pageSize=${limit}&fields=files(id,name,modifiedTime,webViewLink)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (!response.ok) throw new Error('Failed to list spreadsheets');
    const data = await response.json();
    return data.files || [];
  }

  /**
   * Get spreadsheet metadata
   */
  async getSpreadsheet(spreadsheetId: string): Promise<any> {
    return this.makeSheetsRequest(`/${spreadsheetId}`);
  }

  /**
   * Get data from a specific range
   */
  async getSheetData(spreadsheetId: string, range: string): Promise<any> {
    return this.makeSheetsRequest(`/${spreadsheetId}/values/${encodeURIComponent(range)}`);
  }

  /**
   * Search spreadsheets by name
   */
  async searchSpreadsheets(query: string): Promise<any[]> {
    const token = await this.ensureValidToken();
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.spreadsheet%27+and+name+contains+%27${encodeURIComponent(query)}%27&fields=files(id,name,modifiedTime,webViewLink)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (!response.ok) throw new Error('Failed to search spreadsheets');
    const data = await response.json();
    return data.files || [];
  }

  getCapabilities(): string[] {
    return [
      'list_spreadsheets',
      'get_spreadsheet',
      'get_sheet_data',
      'search_spreadsheets',
    ];
  }
}

export default GoogleSheetsIntegration;
