/**
 * Agent Tools
 * Defines all available tools for Business Assistants using Vercel AI SDK
 * Uses factory pattern to inject context (integrationMap, tenantId, agentId) into tools
 */

import { tool } from 'ai';
import { z } from 'zod';

/**
 * Tool Context
 * Captured in closure by tool factories
 */
export interface ToolContext {
  integrationMap: Map<string, any>;
  tenantId: string;
  agentId: string;
}

/**
 * Create tool definitions with injected context
 * This factory function binds context to tools via closure
 */
export function createTools(context: ToolContext) {
  const { integrationMap, tenantId, agentId } = context;

  return {
    // ========================================================================
    // STRIPE QUERY TOOLS
    // ========================================================================

    getRevenue: tool({
      description: 'Get total revenue from Stripe for a specific date range. Use this to answer questions about sales, income, or earnings.',
      inputSchema: z.object({
        startDate: z.string().describe('Start date in YYYY-MM-DD format'),
        endDate: z.string().describe('End date in YYYY-MM-DD format'),
      }),
      execute: async ({ startDate, endDate }) => {
        const stripe = integrationMap.get('stripe');
        if (!stripe) throw new Error('Stripe integration not connected');
        
        return await stripe.executeAction('getRevenue', { startDate, endDate });
      },
    }),

    getRecentPayments: tool({
      description: 'Get recent successful payments from Stripe. Shows customer transactions and payment details.',
      inputSchema: z.object({
        limit: z.number().optional().default(10).describe('Number of payments to retrieve (default 10)'),
      }),
      execute: async ({ limit }) => {
        const stripe = integrationMap.get('stripe');
        if (!stripe) throw new Error('Stripe integration not connected');
        
        return await stripe.executeAction('getRecentPayments', { limit });
      },
    }),

    getFailedCharges: tool({
      description: 'Get recent failed payment attempts from Stripe. Use this to identify payment issues or customers needing attention.',
      inputSchema: z.object({
        limit: z.number().optional().default(10).describe('Number of failed charges to retrieve'),
      }),
      execute: async ({ limit }) => {
        const stripe = integrationMap.get('stripe');
        if (!stripe) throw new Error('Stripe integration not connected');
        
        return await stripe.executeAction('getFailedCharges', { limit });
      },
    }),

    getCustomerCount: tool({
      description: 'Get total number of customers in Stripe. Use for customer base metrics.',
      inputSchema: z.object({}),
      execute: async () => {
        const stripe = integrationMap.get('stripe');
        if (!stripe) throw new Error('Stripe integration not connected');
        
        return await stripe.executeAction('getCustomerCount', {});
      },
    }),

    // ========================================================================
    // EMAIL QUERY TOOLS
    // ========================================================================

    getRecentEmails: tool({
      description: 'Get recent emails from the inbox. Shows sent email activity and usage.',
      inputSchema: z.object({
        limit: z.number().optional().default(10).describe('Number of emails to retrieve'),
        filter: z.enum(['all', 'unread']).optional().default('all').describe('Filter for all or unread emails'),
      }),
      execute: async ({ limit, filter }) => {
        const email = integrationMap.get('email');
        if (!email) throw new Error('Email integration not connected');
        
        return await email.executeAction('getRecentEmails', { limit, filter });
      },
    }),

    searchEmails: tool({
      description: 'Search emails by subject or content. Use this to find specific email conversations.',
      inputSchema: z.object({
        query: z.string().describe('Search query to match against email subjects'),
      }),
      execute: async ({ query }) => {
        const email = integrationMap.get('email');
        if (!email) throw new Error('Email integration not connected');
        
        return await email.executeAction('searchEmails', { query });
      },
    }),

    getUnreadCount: tool({
      description: 'Get count of unread emails. Use for inbox status checks.',
      inputSchema: z.object({}),
      execute: async () => {
        const email = integrationMap.get('email');
        if (!email) throw new Error('Email integration not connected');
        
        return await email.executeAction('getUnreadCount', {});
      },
    }),

    // ========================================================================
    // CALENDAR QUERY TOOLS
    // ========================================================================

    getUpcomingEvents: tool({
      description: 'Get upcoming calendar events for the next N days. Use this to check schedule, meetings, or appointments.',
      inputSchema: z.object({
        days: z.number().optional().default(7).describe('Number of days to look ahead (default 7)'),
      }),
      execute: async ({ days }) => {
        const calendar = integrationMap.get('google-calendar');
        if (!calendar) throw new Error('Google Calendar integration not connected');
        
        return await calendar.executeAction('getUpcomingEvents', { days });
      },
    }),

    getMeetingSummary: tool({
      description: 'Get a summary of meetings for a specific date. Shows all events scheduled for that day.',
      inputSchema: z.object({
        date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today if not specified)'),
      }),
      execute: async ({ date }) => {
        const calendar = integrationMap.get('google-calendar');
        if (!calendar) throw new Error('Google Calendar integration not connected');
        
        const targetDate = date ? new Date(date) : new Date();
        return await calendar.executeAction('getMeetingSummary', { date: targetDate });
      },
    }),

    checkAvailability: tool({
      description: 'Check calendar availability between two times. Returns free/busy status.',
      inputSchema: z.object({
        startTime: z.string().describe('Start time in ISO 8601 format'),
        endTime: z.string().describe('End time in ISO 8601 format'),
        calendarId: z.string().optional().default('primary').describe('Calendar ID to check'),
      }),
      execute: async ({ startTime, endTime, calendarId }) => {
        const calendar = integrationMap.get('google-calendar');
        if (!calendar) throw new Error('Google Calendar integration not connected');
        
        return await calendar.executeAction('check_availability', { 
          calendarId,
          timeMin: startTime, 
          timeMax: endTime 
        });
      },
    }),

    // ========================================================================
    // HUBSPOT QUERY TOOLS
    // ========================================================================

    getRecentContacts: tool({
      description: 'Get recently created contacts from HubSpot CRM. Shows new leads and contacts.',
      inputSchema: z.object({
        limit: z.number().optional().default(10).describe('Number of contacts to retrieve'),
      }),
      execute: async ({ limit }) => {
        const hubspot = integrationMap.get('hubspot');
        if (!hubspot) throw new Error('HubSpot integration not connected');
        
        return await hubspot.executeAction('getRecentContacts', { limit });
      },
    }),

    getDeals: tool({
      description: 'Get deals from HubSpot CRM. Shows sales pipeline and opportunities.',
      inputSchema: z.object({
        limit: z.number().optional().default(10).describe('Number of deals to retrieve'),
      }),
      execute: async ({ limit }) => {
        const hubspot = integrationMap.get('hubspot');
        if (!hubspot) throw new Error('HubSpot integration not connected');
        
        return await hubspot.executeAction('get_deals', { limit });
      },
    }),

    getPipelineValue: tool({
      description: 'Get total pipeline value from HubSpot. Shows aggregate deal values by stage.',
      inputSchema: z.object({}),
      execute: async () => {
        const hubspot = integrationMap.get('hubspot');
        if (!hubspot) throw new Error('HubSpot integration not connected');
        
        return await hubspot.executeAction('getPipelineValue', {});
      },
    }),

    searchContacts: tool({
      description: 'Search for contacts in HubSpot by email or name.',
      inputSchema: z.object({
        query: z.string().describe('Search query (email, name, etc.)'),
        limit: z.number().optional().default(10).describe('Number of results'),
      }),
      execute: async ({ query, limit }) => {
        const hubspot = integrationMap.get('hubspot');
        if (!hubspot) throw new Error('HubSpot integration not connected');
        
        return await hubspot.executeAction('search_contacts', { query, limit });
      },
    }),

    // ========================================================================
    // GOOGLE DRIVE QUERY TOOLS
    // ========================================================================

    listFiles: tool({
      description: 'List files from Google Drive. Shows recent documents and files.',
      inputSchema: z.object({
        limit: z.number().optional().default(10).describe('Number of files to list'),
        query: z.string().optional().describe('Optional search query to filter files by name'),
      }),
      execute: async ({ limit, query }) => {
        const drive = integrationMap.get('google-drive');
        if (!drive) throw new Error('Google Drive integration not connected');
        
        return await drive.executeAction('list_files', { limit, query });
      },
    }),

    searchFiles: tool({
      description: 'Search for files in Google Drive by name or content.',
      inputSchema: z.object({
        query: z.string().describe('Search query to find files'),
      }),
      execute: async ({ query }) => {
        const drive = integrationMap.get('google-drive');
        if (!drive) throw new Error('Google Drive integration not connected');
        
        return await drive.executeAction('search_files', { query });
      },
    }),

    readDocument: tool({
      description: 'Read content from a Google Drive document by file ID. Returns the document text.',
      inputSchema: z.object({
        fileId: z.string().describe('The Google Drive file ID to read'),
      }),
      execute: async ({ fileId }) => {
        const drive = integrationMap.get('google-drive');
        if (!drive) throw new Error('Google Drive integration not connected');
        
        return await drive.executeAction('read_document', { fileId });
      },
    }),

    // ========================================================================
   // NOTION QUERY TOOLS
    // ========================================================================

    getDatabases: tool({
      description: 'Get accessible Notion databases. Shows all databases the integration can access.',
      inputSchema: z.object({}),
      execute: async () => {
        const notion = integrationMap.get('notion');
        if (!notion) throw new Error('Notion integration not connected');
        
        return await notion.executeAction('get_databases', {});
      },
    }),

    queryDatabase: tool({
      description: 'Query a Notion database to retrieve entries. Use this to get structured data from Notion.',
      inputSchema: z.object({
        databaseId: z.string().describe('The Notion database ID to query'),
        query: z.string().optional().describe('Optional filter query'),
      }),
      execute: async ({ databaseId, query }) => {
        const notion = integrationMap.get('notion');
        if (!notion) throw new Error('Notion integration not connected');
        
        return await notion.executeAction('query_database', { databaseId, query });
      },
    }),

    getPage: tool({
      description: 'Get content from a Notion page by page ID. Returns the page content as text.',
      inputSchema: z.object({
        pageId: z.string().describe('The Notion page ID to retrieve'),
      }),
      execute: async ({ pageId }) => {
        const notion = integrationMap.get('notion');
        if (!notion) throw new Error('Notion integration not connected');
        
        return await notion.executeAction('get_page', { pageId });
      },
    }),

    searchNotion: tool({
      description: 'Search across all Notion pages and databases accessible to the integration.',
      inputSchema: z.object({
        query: z.string().describe('Search query to find pages or databases'),
      }),
      execute: async ({ query }) => {
        const notion = integrationMap.get('notion');
        if (!notion) throw new Error('Notion integration not connected');
        
        return await notion.executeAction('search', { query });
      },
    }),

    // ========================================================================
    // EMAIL ACTION TOOLS
    // ========================================================================

    sendEmail: tool({
      description: 'Send an email to one or more recipients. Use this to send notifications, responses, or messages.',
      inputSchema: z.object({
        to: z.union([z.string(), z.array(z.string())]).describe('Recipient email address(es)'),
        subject: z.string().describe('Email subject line'),
        body: z.string().describe('Email body content (plain text or HTML)'),
        from: z.string().optional().describe('Optional from address (uses default if not specified)'),
      }),
      execute: async ({ to, subject, body, from }) => {
        const email = integrationMap.get('email');
        if (!email) throw new Error('Email integration not connected');
        
        return await email.executeAction('send_email', { 
          to, 
          subject, 
          body,
          from,
          agent_id: agentId,
          billable: true
        });
      },
    }),

    // ========================================================================
    // CALENDAR ACTION TOOLS
    // ========================================================================

    createCalendarEvent: tool({
     description: 'Create a new event in Google Calendar. Use this to schedule meetings or appointments.',
      inputSchema: z.object({
        summary: z.string().describe('Event title/summary'),
        description: z.string().optional().describe('Event description'),
        startTime: z.string().describe('Start time in ISO 8601 format'),
        endTime: z.string().describe('End time in ISO 8601 format'),
        attendees: z.array(z.string()).optional().describe('List of attendee email addresses'),
        location: z.string().optional().describe('Event location'),
      }),
      execute: async ({ summary, description, startTime, endTime, attendees, location }) => {
        const calendar = integrationMap.get('google-calendar');
        if (!calendar) throw new Error('Google Calendar integration not connected');
        
        return await calendar.executeAction('create_event', {
          event: {
            summary,
            description,
            start: { dateTime: startTime },
            end: { dateTime: endTime },
            attendees: attendees?.map(email => ({ email })),
            location,
          },
          agent_id: agentId,
        });
      },
    }),

    // ========================================================================
    // HUBSPOT ACTION TOOLS
    // ========================================================================

    createContact: tool({
      description: 'Create a new contact in HubSpot CRM. Use this to add leads or customers.',
      inputSchema: z.object({
        email: z.string().email().describe('Contact email address (required)'),
        firstName: z.string().optional().describe('Contact first name'),
        lastName: z.string().optional().describe('Contact last name'),
        phone: z.string().optional().describe('Contact phone number'),
        company: z.string().optional().describe('Contact company name'),
      }),
      execute: async ({ email, firstName, lastName, phone, company }) => {
        const hubspot = integrationMap.get('hubspot');
        if (!hubspot) throw new Error('HubSpot integration not connected');
        
        return await hubspot.executeAction('create_contact', {
          contact: {
            properties: {
              email,
              firstname: firstName,
              lastname: lastName,
              phone,
              company,
            },
          },
        });
      },
    }),

    createDeal: tool({
      description: 'Create a new deal in HubSpot CRM. Use this to track sales opportunities.',
      inputSchema: z.object({
        dealName: z.string().describe('Name of the deal'),
        amount: z.number().describe('Deal amount in dollars'),
        stage: z.string().optional().describe('Deal stage (default: appointmentscheduled)'),
      }),
      execute: async ({ dealName, amount, stage }) => {
        const hubspot = integrationMap.get('hubspot');
        if (!hubspot) throw new Error('HubSpot integration not connected');
        
        return await hubspot.executeAction('create_deal', {
          deal: {
            properties: {
              dealname: dealName,
              amount: amount.toString(),
              dealstage: stage || 'appointmentscheduled',
            },
          },
        });
      },
    }),
  };
}

/**
 * Get tools available based on connected integrations
 * Filters to only include tools for integrations that are connected
 */
export function getAvailableToolNames(integrationMap: Map<string, any>): string[] {
  const availableTools: string[] = [];
  
  // Add tools based on available integrations
  if (integrationMap.has('stripe')) {
    availableTools.push('getRevenue', 'getRecentPayments', 'getFailedCharges', 'getCustomerCount');
  }
  if (integrationMap.has('email')) {
    availableTools.push('getRecentEmails', 'searchEmails', 'getUnreadCount', 'sendEmail');
  }
  if (integrationMap.has('google-calendar')) {
    availableTools.push('getUpcomingEvents', 'getMeetingSummary', 'checkAvailability', 'createCalendarEvent');
  }
  if (integrationMap.has('hubspot')) {
    availableTools.push('getRecentContacts', 'getDeals', 'getPipelineValue', 'searchContacts', 'createContact', 'createDeal');
  }
  if (integrationMap.has('google-drive')) {
    availableTools.push('listFiles', 'searchFiles', 'readDocument');
  }
  if (integrationMap.has('notion')) {
    availableTools.push('getDatabases', 'queryDatabase', 'getPage', 'searchNotion');
  }
  
  return availableTools;
}
