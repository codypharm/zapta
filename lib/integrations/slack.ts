/**
 * Slack Integration
 * Handles OAuth authentication and Slack API interactions
 */

import { BaseIntegration, IntegrationConfigSchema, Integration as IntegrationRecord } from './base';

interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
}

interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  email?: string;
}

interface SlackMessage {
  channel: string;
  text: string;
  blocks?: any[];
  thread_ts?: string; // For replying to threads
}

export class SlackIntegration extends BaseIntegration {
  provider = 'slack';
  type = 'slack' as const;

  private accessToken?: string;
  private teamId?: string;
  private teamName?: string;

  constructor(integrationRecord?: IntegrationRecord) {
    super(integrationRecord);

    if (integrationRecord?.credentials) {
      const creds = integrationRecord.credentials;
      this.accessToken = creds.access_token;
      this.teamId = creds.team_id;
      this.teamName = creds.team_name;
    }
  }

  /**
   * Get OAuth authorization URL
   */
  static getAuthorizationUrl(state: string): string {
    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/slack/callback`;
    
    // Scopes for sending messages and reading channel info
    const scopes = [
      'channels:read',
      'channels:join',
      'chat:write',
      'chat:write.public',
      'users:read',
      'users:read.email',
      'im:write',
      'groups:read',
    ].join(',');

    return `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    team_id: string;
    team_name: string;
    bot_user_id: string;
    scope: string;
  }> {
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/slack/callback`;

    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Slack OAuth error: ${data.error}`);
    }

    return {
      access_token: data.access_token,
      team_id: data.team?.id,
      team_name: data.team?.name,
      bot_user_id: data.bot_user_id,
      scope: data.scope,
    };
  }

  /**
   * Make authenticated request to Slack API
   */
  private async makeSlackRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.accessToken) {
      throw new Error('Slack not authenticated');
    }

    const response = await fetch(`https://slack.com/api/${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('[SLACK] API error:', data.error);
      throw new Error(`Slack API error: ${data.error}`);
    }

    return data;
  }

  /**
   * Authenticate - for API key based auth (not used for OAuth)
   */
  async authenticate(credentials: any): Promise<void> {
    this.accessToken = credentials.access_token;
    this.teamId = credentials.team_id;
    this.teamName = credentials.team_name;
  }

  /**
   * Test connection by getting auth info
   */
  async testConnection(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      if (!this.accessToken) {
        return { success: false, error: 'No access token configured' };
      }

      const result = await this.makeSlackRequest<{ user_id: string; team_id: string }>('auth.test');
      
      return {
        success: true,
        message: `Connected to ${this.teamName || result.team_id}`,
      };
    } catch (error) {
      console.error('[SLACK] Test connection failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(message: SlackMessage): Promise<{ ts: string; channel: string }> {
    const result = await this.makeSlackRequest<{ ts: string; channel: string }>('chat.postMessage', {
      method: 'POST',
      body: JSON.stringify({
        channel: message.channel,
        text: message.text,
        blocks: message.blocks,
        thread_ts: message.thread_ts,
      }),
    });

    console.log(`[SLACK] ✓ Message sent to ${message.channel}`);
    return result;
  }

  /**
   * Send a direct message to a user
   */
  async sendDirectMessage(userId: string, text: string): Promise<{ ts: string; channel: string }> {
    // First, open a DM channel with the user
    const dmResult = await this.makeSlackRequest<{ channel: { id: string } }>('conversations.open', {
      method: 'POST',
      body: JSON.stringify({ users: userId }),
    });

    // Then send the message
    return this.sendMessage({
      channel: dmResult.channel.id,
      text,
    });
  }

  /**
   * Get list of channels
   */
  async getChannels(): Promise<SlackChannel[]> {
    const result = await this.makeSlackRequest<{ channels: SlackChannel[] }>('conversations.list', {
      method: 'GET',
    });

    return result.channels || [];
  }

  /**
   * Get list of users
   */
  async getUsers(): Promise<SlackUser[]> {
    const result = await this.makeSlackRequest<{ members: SlackUser[] }>('users.list', {
      method: 'GET',
    });

    return result.members || [];
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<SlackUser | null> {
    try {
      const result = await this.makeSlackRequest<{ user: SlackUser }>(`users.lookupByEmail?email=${encodeURIComponent(email)}`);
      return result.user;
    } catch (error) {
      return null;
    }
  }

  /**
   * Join a channel
   */
  async joinChannel(channelId: string): Promise<void> {
    await this.makeSlackRequest('conversations.join', {
      method: 'POST',
      body: JSON.stringify({ channel: channelId }),
    });
    console.log(`[SLACK] ✓ Joined channel ${channelId}`);
  }

  /**
   * Execute actions
   */
  async executeAction(action: string, params: any): Promise<any> {
    switch (action) {
      case 'send_message':
        return this.sendMessage({
          channel: params.channel,
          text: params.text,
          blocks: params.blocks,
          thread_ts: params.thread_ts,
        });
      case 'send_direct_message':
        return this.sendDirectMessage(params.user_id, params.text);
      case 'get_channels':
        return this.getChannels();
      case 'get_users':
        return this.getUsers();
      case 'get_user_by_email':
        return this.getUserByEmail(params.email);
      case 'join_channel':
        return this.joinChannel(params.channel);
      default:
        throw new Error(`Unknown Slack action: ${action}`);
    }
  }

  /**
   * Get capabilities
   */
  getCapabilities(): string[] {
    return [
      'send_message',
      'send_direct_message',
      'get_channels',
      'get_users',
      'get_user_by_email',
      'join_channel',
    ];
  }

  /**
   * Get config schema
   */
  getConfigSchema(): IntegrationConfigSchema {
    return {
      type: 'oauth',
      fields: [
        {
          key: 'default_channel',
          label: 'Default Channel',
          type: 'text',
          required: false,
          description: 'Default channel for sending messages',
        },
      ],
    };
  }
}

export default SlackIntegration;
