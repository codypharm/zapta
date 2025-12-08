/**
 * Gmail Integration
 * Handles reading inbox, searching emails, and sending via Gmail API
 */

import { BaseIntegration, type IntegrationConfigSchema } from "./base";
import type { IntegrationRecord } from "./registry";

interface GmailCredentials {
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: number;
}

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  internalDate: string;
  payload?: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{
      mimeType: string;
      body?: { data?: string };
    }>;
  };
}

interface GmailMessageResponse {
  messages: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export class GmailIntegration extends BaseIntegration {
  provider = "gmail";
  type = "email" as const;

  private accessToken?: string;
  private refreshToken?: string;
  private tokenExpiresAt?: number;

  constructor(integrationRecord: IntegrationRecord) {
    super(integrationRecord);
    
    const creds = this.getCredentials() as GmailCredentials;
    this.accessToken = creds?.access_token;
    this.refreshToken = creds?.refresh_token;
    this.tokenExpiresAt = creds?.token_expires_at;
  }

  /**
   * Get OAuth authorization URL
   */
  static getAuthorizationUrl(state: string): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/gmail/callback`;
    
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify'
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
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/gmail/callback`;
    
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

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code: ${error}`);
    }
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

  private async makeGmailRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.ensureValidToken();
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gmail API error: ${response.status} - ${error}`);
    }
    return response.json();
  }

  async authenticate(): Promise<void> {
    if (!this.accessToken) throw new Error('Not authenticated');
  }

  async testConnection(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      console.log('[GMAIL] Testing connection...');
      const profile = await this.makeGmailRequest<{ emailAddress: string }>('/profile');
      console.log('[GMAIL] Connected as:', profile.emailAddress);
      return { success: true, message: `Connected as ${profile.emailAddress}` };
    } catch (error) {
      console.error('[GMAIL] Test connection error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to connect to Gmail' 
      };
    }
  }

  getConfigSchema(): IntegrationConfigSchema {
    return {
      type: 'oauth',
      auth_url: GmailIntegration.getAuthorizationUrl(''),
      fields: [],
    };
  }

  async executeAction(action: string, params: any): Promise<any> {
    switch (action) {
      case 'get_emails':
      case 'get_recent_emails':
        return this.getRecentEmails(params?.limit || 10, params?.query);
      case 'search_emails':
        return this.searchEmails(params?.query || '');
      case 'get_email':
        return this.getEmail(params?.id);
      case 'send_email':
        return this.sendEmail(params);
      case 'get_unread_count':
        return this.getUnreadCount();
      case 'get_labels':
        return this.getLabels();
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Get recent emails from inbox
   */
  async getRecentEmails(limit: number = 10, query?: string): Promise<any[]> {
    const q = query || 'in:inbox';
    const response = await this.makeGmailRequest<GmailMessageResponse>(
      `/messages?maxResults=${limit}&q=${encodeURIComponent(q)}`
    );

    if (!response.messages || response.messages.length === 0) {
      return [];
    }

    // Fetch full details for each message
    const emails = await Promise.all(
      response.messages.slice(0, limit).map(msg => this.getEmail(msg.id))
    );

    return emails;
  }

  /**
   * Search emails
   */
  async searchEmails(query: string): Promise<any[]> {
    const response = await this.makeGmailRequest<GmailMessageResponse>(
      `/messages?maxResults=20&q=${encodeURIComponent(query)}`
    );

    if (!response.messages || response.messages.length === 0) {
      return [];
    }

    const emails = await Promise.all(
      response.messages.map(msg => this.getEmail(msg.id))
    );

    return emails;
  }

  /**
   * Get single email by ID
   */
  async getEmail(messageId: string): Promise<any> {
    const message = await this.makeGmailRequest<GmailMessage>(
      `/messages/${messageId}?format=full`
    );

    return this.parseMessage(message);
  }

  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<number> {
    const response = await this.makeGmailRequest<GmailMessageResponse>(
      '/messages?maxResults=1&q=is:unread'
    );
    return response.resultSizeEstimate || 0;
  }

  /**
   * Get labels
   */
  async getLabels(): Promise<any[]> {
    const response = await this.makeGmailRequest<{ labels: any[] }>('/labels');
    return response.labels || [];
  }

  /**
   * Send email
   */
  async sendEmail(params: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
  }): Promise<any> {
    const email = [
      `To: ${params.to}`,
      params.cc ? `Cc: ${params.cc}` : '',
      params.bcc ? `Bcc: ${params.bcc}` : '',
      `Subject: ${params.subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      params.body,
    ].filter(Boolean).join('\r\n');

    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await this.makeGmailRequest<any>('/messages/send', {
      method: 'POST',
      body: JSON.stringify({ raw: encodedEmail }),
    });

    return { success: true, messageId: response.id };
  }

  /**
   * Parse Gmail message into friendly format
   */
  private parseMessage(message: GmailMessage): any {
    const headers = message.payload?.headers || [];
    const getHeader = (name: string) => 
      headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    let body = '';
    if (message.payload?.body?.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    } else if (message.payload?.parts) {
      const textPart = message.payload.parts.find(p => p.mimeType === 'text/plain');
      const htmlPart = message.payload.parts.find(p => p.mimeType === 'text/html');
      const part = textPart || htmlPart;
      if (part?.body?.data) {
        body = Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }

    return {
      id: message.id,
      threadId: message.threadId,
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      snippet: message.snippet,
      body,
      labels: message.labelIds,
      isUnread: message.labelIds?.includes('UNREAD'),
    };
  }

  getCapabilities(): string[] {
    return [
      'get_recent_emails',
      'search_emails',
      'get_email',
      'send_email',
      'get_unread_count',
      'get_labels',
    ];
  }
}

export default GmailIntegration;
