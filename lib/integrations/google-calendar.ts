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
    
    // Use explicit redirect URI if set, otherwise build from app URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.NEXT_PUBLIC_SITE_URL ||
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
                        `${appUrl}/api/integrations/google-calendar/callback`;
    
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    const params = new URLSearchParams({
      client_id: clientId || '',
      redirect_uri: redirectUri,
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
    // Use same redirect URI logic as authorization URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.NEXT_PUBLIC_SITE_URL ||
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
                        `${appUrl}/api/integrations/google-calendar/callback`;
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
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
        return this.createEvent(params.event, params.calendarId, params.agent_id);
      
      case 'update_event':
        return this.updateEvent(params.eventId, params.event, params.calendarId, params.agent_id);
      
      case 'delete_event':
        return this.deleteEvent(params.eventId, params.calendarId, params.agent_id);
      
      case 'get_events':
      case 'list_events':
        return this.listEvents(params.calendarId, params.maxResults, params.agent_id);
      
      case 'check_availability':
        return this.checkAvailability(params.calendarId, params.timeMin, params.timeMax, params.agent_id);
      
      case 'find_available_slots':
        return this.findAvailableSlots(
          new Date(params.startDate),
          new Date(params.endDate),
          params.durationMinutes,
          params.calendarId,
          params.agent_id
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
   * Track calendar usage for analytics and rate limiting
   */
  private async trackCalendarUsage(usage: {
    action_type: string;
    event_id?: string;
    event_title?: string;
    event_start?: Date;
    event_end?: Date;
    attendee_email?: string;
    google_event_id?: string;
    calendar_id?: string;
    agent_id?: string;
    status: 'success' | 'failed';
    error_message?: string;
  }): Promise<void> {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      await supabase.from('calendar_usage').insert({
        tenant_id: this.getTenantId(),
        integration_id: this.integrationRecord?.id || '',
        agent_id: usage.agent_id || null,
        action_type: usage.action_type,
        event_id: usage.event_id,
        event_title: usage.event_title,
        event_start: usage.event_start?.toISOString(),
        event_end: usage.event_end?.toISOString(),
        attendee_email: usage.attendee_email,
        google_event_id: usage.google_event_id,
        calendar_id: usage.calendar_id,
        status: usage.status,
        error_message: usage.error_message,
      });
    } catch (error) {
      // Don't fail the action if tracking fails
      console.error('Failed to track calendar usage:', error);
    }
  }

  /**
   * Create a calendar event
   */
  async createEvent(event: GoogleCalendarEvent, calendarId: string = 'primary', agentId?: string): Promise<any> {
    try {
      const result = await this.makeCalendarRequest<any>(`/calendars/${calendarId}/events`, {
        method: 'POST',
        body: JSON.stringify(event),
      });

      // Track successful creation
      await this.trackCalendarUsage({
        action_type: 'create_event',
        event_title: event.summary,
        event_start: event.start?.dateTime ? new Date(event.start.dateTime) : undefined,
        event_end: event.end?.dateTime ? new Date(event.end.dateTime) : undefined,
        attendee_email: event.attendees?.[0]?.email,
        google_event_id: result.id,
        calendar_id: calendarId,
        agent_id: agentId,
        status: 'success',
      });

      return result;
    } catch (error) {
      // Track failed creation
      await this.trackCalendarUsage({
        action_type: 'create_event',
        event_title: event.summary,
        calendar_id: calendarId,
        agent_id: agentId,
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get upcoming events
   */
  async listEvents(
    calendarId: string = 'primary',
    maxResults: number = 10,
    agentId?: string
  ): Promise<any> {
    const params = new URLSearchParams({
      maxResults: maxResults.toString(),
      orderBy: 'startTime',
      singleEvents: 'true',
      timeMin: new Date().toISOString(),
    });

    try {
      const result = await this.makeCalendarRequest(`/calendars/${calendarId}/events?${params.toString()}`);

      // Track successful list
      await this.trackCalendarUsage({
        action_type: 'list_events',
        calendar_id: calendarId,
        agent_id: agentId,
        status: 'success',
      });

      return result;
    } catch (error) {
      // Track failed list
      await this.trackCalendarUsage({
        action_type: 'list_events',
        calendar_id: calendarId,
        agent_id: agentId,
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Check availability (free/busy)
   */
  async checkAvailability(
    calendarId: string = 'primary',
    timeMin: string,
    timeMax: string,
    agentId?: string
  ): Promise<any> {
    try {
      const result = await this.makeCalendarRequest('/freeBusy', {
        method: 'POST',
        body: JSON.stringify({
          timeMin,
          timeMax,
          items: [{ id: calendarId }],
        }),
      });

      // Track successful availability check
      await this.trackCalendarUsage({
        action_type: 'check_availability',
        event_start: new Date(timeMin),
        event_end: new Date(timeMax),
        calendar_id: calendarId,
        agent_id: agentId,
        status: 'success',
      });

      return result;
    } catch (error) {
      // Track failed availability check
      await this.trackCalendarUsage({
        action_type: 'check_availability',
        event_start: new Date(timeMin),
        event_end: new Date(timeMax),
        calendar_id: calendarId,
        agent_id: agentId,
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update an event
   */
  async updateEvent(
    eventId: string,
    event: Partial<GoogleCalendarEvent>,
    calendarId: string = 'primary',
    agentId?: string
  ): Promise<any> {
    try {
      const result: any = await this.makeCalendarRequest(`/calendars/${calendarId}/events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify(event),
      });

      // Track successful update
      await this.trackCalendarUsage({
        action_type: 'update_event',
        event_id: eventId,
        event_title: event.summary,
        google_event_id: result.id,
        calendar_id: calendarId,
        agent_id: agentId,
        status: 'success',
      });

      return result;
    } catch (error) {
      // Track failed update
      await this.trackCalendarUsage({
        action_type: 'update_event',
        event_id: eventId,
        calendar_id: calendarId,
        agent_id: agentId,
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string, calendarId: string = 'primary', agentId?: string): Promise<void> {
    try {
      await this.makeCalendarRequest(`/calendars/${calendarId}/events/${eventId}`, {
        method: 'DELETE',
      });

      // Track successful deletion
      await this.trackCalendarUsage({
        action_type: 'delete_event',
        event_id: eventId,
        google_event_id: eventId,
        calendar_id: calendarId,
        agent_id: agentId,
        status: 'success',
      });

      // Return type is void, so no explicit return value needed for success
    } catch (error) {
      // Track failed deletion
      await this.trackCalendarUsage({
        action_type: 'delete_event',
        event_id: eventId,
        calendar_id: calendarId,
        agent_id: agentId,
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find available time slots
   */
  async findAvailableSlots(
    startDate: Date,
    endDate: Date,
    durationMinutes: number,
    calendarId: string = 'primary',
    agentId?: string
  ): Promise<Array<{ start: string; end: string }>> {
    try {
      const freeBusy = await this.checkAvailability(
        calendarId,
        startDate.toISOString(),
        endDate.toISOString(),
        agentId
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

      // Track successful find available slots
      await this.trackCalendarUsage({
        action_type: 'find_available_slots',
        event_start: startDate,
        event_end: endDate,
        calendar_id: calendarId,
        agent_id: agentId,
        status: 'success',
      });

      return slots;
    } catch (error) {
      // Track failed find available slots
      await this.trackCalendarUsage({
        action_type: 'find_available_slots',
        event_start: startDate,
        event_end: endDate,
        calendar_id: calendarId,
        agent_id: agentId,
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
  // ============================================================================
  // BUSINESS ASSISTANT QUERY METHODS
  // ============================================================================

  /**
   * Get upcoming events
   * Used by Executive Assistant to manage schedule
   */
  async getUpcomingEvents(days: number = 7): Promise<any[]> {
    const timeMin = new Date();
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + days);

    const params = new URLSearchParams({
      maxResults: '50',
      orderBy: 'startTime',
      singleEvents: 'true',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
    });

    try {
      const result = await this.makeCalendarRequest<any>(`/calendars/primary/events?${params.toString()}`);
      
      return (result.items || []).map((event: any) => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        location: event.location,
        attendees: event.attendees?.map((a: any) => a.email),
        link: event.htmlLink
      }));
    } catch (error) {
      console.error('Failed to get upcoming events:', error);
      return [];
    }
  }

  /**
   * Get meeting summary for a specific date
   * Used by Executive Assistant to brief the user
   */
  async getMeetingSummary(date: Date = new Date()): Promise<string> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const params = new URLSearchParams({
      orderBy: 'startTime',
      singleEvents: 'true',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
    });

    try {
      const result = await this.makeCalendarRequest<any>(`/calendars/primary/events?${params.toString()}`);
      const events = result.items || [];
      
      if (events.length === 0) {
        return `No meetings scheduled for ${date.toLocaleDateString()}.`;
      }

      const summary = events.map((event: any) => {
        const time = event.start.dateTime 
          ? new Date(event.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'All Day';
        return `- ${time}: ${event.summary}`;
      }).join('\n');

      return `You have ${events.length} meetings scheduled for ${date.toLocaleDateString()}:\n${summary}`;
    } catch (error) {
      console.error('Failed to get meeting summary:', error);
      return 'Unable to retrieve meeting summary.';
    }
  }

  /**
   * Get Google Calendar capabilities
   */
  getCapabilities(): string[] {
    return [
      'create_event',
      'update_event',
      'delete_event',
      'list_events',
      'check_availability',
      'find_available_slots',
      // Business insights
      'get_upcoming_events',
      'get_meeting_summary'
    ];
  }
}
