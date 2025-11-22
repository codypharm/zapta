import { BaseIntegration, type IntegrationConfigSchema } from "./base";
import type { IntegrationRecord } from "./registry";

interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{ email: string }>;
  location?: string;
}

interface GoogleCalendarCredentials {
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: number;
}

export class GoogleCalendarIntegration extends BaseIntegration {
  provider = "google-calendar";
  type = "calendar" as const;

  private accessToken?: string;
  private refreshToken?: string;
  private tokenExpiresAt?: number;

  constructor(integrationRecord: IntegrationRecord) {
    super(integrationRecord);
    
    console.log('[CALENDAR] Constructor - integration record:', {
      id: integrationRecord.id,
      provider: integrationRecord.provider,
      has_credentials: !!integrationRecord.credentials
    });
    
    // Load OAuth tokens from credentials
    const creds = this.getCredentials() as GoogleCalendarCredentials;
    console.log('[CALENDAR] Decrypted credentials:', {
      has_access_token: !!creds?.access_token,
      has_refresh_token: !!creds?.refresh_token,
      has_token_expires_at: !!creds?.token_expires_at
    });
    
    this.accessToken = creds?.access_token;
    this.refreshToken = creds?.refresh_token;
    this.tokenExpiresAt = creds?.token_expires_at;
  }

  /**
   * Get OAuth authorization URL to initiate the flow
   */
  static getAuthorizationUrl(state: string): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    const params = new URLSearchParams({
      client_id: clientId || '',
      redirect_uri: redirectUri || '',
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline', // Request refresh token
      prompt: 'consent', // Force consent screen to get refresh token
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || '',
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for token: ${error}`);
    }

    return response.json();
  }

  /**
   * Refresh the access token using refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    console.log('[CALENDAR] Refreshing access token...');

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: this.refreshToken,
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[CALENDAR] Token refresh failed:', error);
        throw new Error(`Failed to refresh token: ${error}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
      
      console.log('[CALENDAR] Token refreshed successfully');

      // Update the stored credentials
      // Note: This should also update the database, but we'll handle that in the action
    } catch (error) {
      console.error('[CALENDAR] Error refreshing token:', error);
      if (error instanceof Error) {
        throw new Error(`Token refresh failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<string> {
    // If we have an access token and expiry time, check if it's still valid
    if (this.accessToken && this.tokenExpiresAt) {
      // Token is valid if it expires more than 5 minutes from now
      if (this.tokenExpiresAt > Date.now() + 5 * 60 * 1000) {
        console.log('[CALENDAR] Using existing valid token');
        return this.accessToken;
      }
      console.log('[CALENDAR] Token expired or expiring soon, refreshing...');
    } else if (this.accessToken) {
      // We have a token but no expiry time - try to use it
      console.log('[CALENDAR] Using access token (no expiry tracked)');
      return this.accessToken;
    }

    // Need to refresh or get a new token
    if (!this.refreshToken) {
      throw new Error('No refresh token available - please reconnect the integration');
    }

    await this.refreshAccessToken();

    if (!this.accessToken) {
      throw new Error('Failed to obtain access token');
    }

    return this.accessToken;
  }

  /**
   * Make an authenticated request to Google Calendar API
   */
  private async makeCalendarRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.ensureValidToken();

    const response = await fetch(`https://www.googleapis.com/calendar/v3${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Calendar API error: ${error}`);
    }

    return response.json();
  }

  async authenticate(): Promise<void> {
    // OAuth is handled via redirect flow, not here
    // This method is called during testConnection
    if (!this.accessToken || !this.refreshToken) {
      throw new Error('Not authenticated - no tokens available');
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Try to list calendars to verify the token works
      await this.makeCalendarRequest('/users/me/calendarList');
      return true;
    } catch (error) {
      console.error('[CALENDAR] Test connection failed:', error);
      return false;
    }
  }

  /**
   * Execute calendar actions
   */
  async executeAction(action: string, params: any): Promise<any> {
    switch (action) {
      case 'create_event':
        return this.createEvent(params.event, params.calendarId);
      
      case 'update_event':
        return this.updateEvent(params.eventId, params.event, params.calendarId);
      
      case 'delete_event':
        return this.deleteEvent(params.eventId, params.calendarId);
      
      case 'get_events':
      case 'list_events':
        return this.listEvents(params.calendarId, params.maxResults);
      
      case 'check_availability':
        return this.checkAvailability(params.timeMin, params.timeMax, params.calendarId);
      
      case 'find_available_slots':
        return this.findAvailableSlots(
          new Date(params.startDate),
          new Date(params.endDate),
          params.durationMinutes,
          params.calendarId
        );
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Get configuration schema for Google Calendar OAuth
   */
  getConfigSchema(): IntegrationConfigSchema {
    return {
      type: 'oauth',
      auth_url: '/api/integrations/google-calendar/connect',
      fields: [
        {
          key: 'calendar_id',
          label: 'Default Calendar ID',
          type: 'text',
          required: false,
          placeholder: 'primary',
          description: 'The calendar ID to use by default (use "primary" for your main calendar)',
        },
      ],
    };
  }

  /**
   * Create a calendar event
   */
  async createEvent(event: GoogleCalendarEvent, calendarId: string = 'primary'): Promise<any> {
    return this.makeCalendarRequest(`/calendars/${calendarId}/events`, {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  /**
   * Get upcoming events
   */
  async listEvents(
    calendarId: string = 'primary',
    maxResults: number = 10
  ): Promise<any> {
    const params = new URLSearchParams({
      maxResults: maxResults.toString(),
      orderBy: 'startTime',
      singleEvents: 'true',
      timeMin: new Date().toISOString(),
    });

    return this.makeCalendarRequest(`/calendars/${calendarId}/events?${params.toString()}`);
  }

  /**
   * Check availability (free/busy)
   */
  async checkAvailability(
    timeMin: string,
    timeMax: string,
    calendarId: string = 'primary'
  ): Promise<any> {
    return this.makeCalendarRequest('/freeBusy', {
      method: 'POST',
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: calendarId }],
      }),
    });
  }

  /**
   * Update an event
   */
  async updateEvent(
    eventId: string,
    event: Partial<GoogleCalendarEvent>,
    calendarId: string = 'primary'
  ): Promise<any> {
    return this.makeCalendarRequest(`/calendars/${calendarId}/events/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify(event),
    });
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string, calendarId: string = 'primary'): Promise<void> {
    await this.makeCalendarRequest(`/calendars/${calendarId}/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Find available time slots
   */
  async findAvailableSlots(
    startDate: Date,
    endDate: Date,
    durationMinutes: number,
    calendarId: string = 'primary'
  ): Promise<Array<{ start: string; end: string }>> {
    const freeBusy = await this.checkAvailability(
      startDate.toISOString(),
      endDate.toISOString(),
      calendarId
    );

    const busyTimes = freeBusy.calendars[calendarId]?.busy || [];
    const slots: Array<{ start: string; end: string }> = [];

    // Simple algorithm to find free slots
    let currentTime = new Date(startDate);
    const endTime = new Date(endDate);

    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + durationMinutes * 60000);

      // Check if this slot overlaps with any busy time
      const isFree = !busyTimes.some((busy: any) => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        return currentTime < busyEnd && slotEnd > busyStart;
      });

      if (isFree && slotEnd <= endTime) {
        slots.push({
          start: currentTime.toISOString(),
          end: slotEnd.toISOString(),
        });
      }

      // Move to next 30-minute slot
      currentTime = new Date(currentTime.getTime() + 30 * 60000);
    }

    return slots;
  }
}
