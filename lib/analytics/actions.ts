/**
 * Analytics Actions
 * Server actions for fetching analytics data and metrics
 */

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { subDays, startOfDay, endOfDay, format } from "date-fns";

export interface AnalyticsMetrics {
  conversations: {
    total: number;
    change: number; // percentage change from previous period
  };
  leads: {
    total: number;
    change: number;
  };
  activeAgents: {
    total: number;
    change: number;
  };
  timeline: Array<{
    date: string;
    conversations: number;
    leads: number;
  }>;
  topAgents: Array<{
    id: string;
    name: string;
    type: string;
    conversationCount: number;
    leadCount: number;
  }>;
  knowledgeBase: { // NEW
    totalSearches: number;
    documentsUsed: number;
    avgRelevance: number;
    hitRate: number;
    topDocuments: Array<{
      id: string;
      filename: string;
      usageCount: number;
    }>;
  };
  integrations: { // NEW
    totalActions: number;
    byProvider: Array<{
      provider: string;
      actionCount: number;
      successRate: number;
    }>;
  };
  webhooks: { // NEW
    totalEvents: number;
    successRate: number;
    byType: Array<{
      eventType: string;
      count: number;
      percentage: number;
    }>;
  };
}

/**
 * Get knowledge base analytics metrics
 */
async function getKnowledgeBaseMetrics(
  tenantId: string,
  startDate: Date
) {
  const supabase = await createServerClient();
  
  // Get knowledge searches
  const { data: searches } = await supabase
    .from("knowledge_searches")
    .select("*")
    .eq("tenant_id", tenantId)
    .gte("created_at", startDate.toISOString());
    
  // Get context usage (documents actually used in responses)
  const { data: usage } = await supabase
    .from("knowledge_context_usage")
    .select("document_id, similarity_score, document_metadata")
    .eq("tenant_id", tenantId)
    .gte("created_at", startDate.toISOString());
    
  // Calculate metrics
  const totalSearches = searches?.length || 0;
  const documentsUsed = new Set(usage?.map(u => u.document_id)).size;
  const avgRelevance = usage && usage.length > 0
    ? usage.reduce((sum, u) => sum + (u.similarity_score || 0), 0) / usage.length
    : 0;
  const hitRate = totalSearches > 0 ? ((usage?.length || 0) / totalSearches) * 100 : 0;
  
  // Get top documents
  const documentCounts = new Map<string, { id: string; filename: string; usageCount: number }>();
  usage?.forEach(u => {
    const filename = u.document_metadata?.originalFileName || 'Unknown';
    const existing = documentCounts.get(u.document_id);
    if (existing) {
      existing.usageCount++;
    } else {
      documentCounts.set(u.document_id, {
        id: u.document_id,
        filename,
        usageCount: 1
      });
    }
  });
  
  const topDocuments = Array.from(documentCounts.values())
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 5);
  
  return {
    totalSearches,
    documentsUsed,
    avgRelevance: Math.round(avgRelevance * 100) / 100,
    hitRate: Math.round(hitRate * 10) / 10,
    topDocuments
  };
}

/**
 * Get integration usage analytics
 */
async function getIntegrationMetrics(
  tenantId: string,
  startDate: Date
) {
  const supabase = await createServerClient();
  
  // Get execution logs with integration actions
  const { data: executions } = await supabase
    .from("execution_logs")
    .select("output")
    .eq("tenant_id", tenantId)
    .gte("created_at", startDate.toISOString())
    .not("output", "is", null);
    
  // Parse actions from execution logs
  const integrationActions: Array<{ provider: string; success: boolean }> = [];
  
  executions?.forEach(exec => {
    try {
      const output = typeof exec.output === 'string' ? JSON.parse(exec.output) : exec.output;
      const actions = output?.actions || [];
      actions.forEach((action: any) => {
        if (action.type && action.status) {
          integrationActions.push({
            provider: action.type,
            success: action.status === 'success'
          });
        }
      });
    } catch (e) {
      // Skip invalid entries
    }
  });
  
  // Group by provider
  const providerStats = new Map<string, { total: number; successful: number }>();
  integrationActions.forEach(action => {
    const stats = providerStats.get(action.provider) || { total: 0, successful: 0 };
    stats.total++;
    if (action.success) stats.successful++;
    providerStats.set(action.provider, stats);
  });
  
  const byProvider = Array.from(providerStats.entries()).map(([provider, stats]) => ({
    provider,
    actionCount: stats.total,
    successRate: Math.round((stats.successful / stats.total) * 100)
  })).sort((a, b) => b.actionCount - a.actionCount);
  
  return {
    totalActions: integrationActions.length,
    byProvider
  };
}

/**
 * Get webhook analytics
 */
async function getWebhookMetrics(
  tenantId: string,
  startDate: Date
) {
  const supabase = await createServerClient();
  
  // Get execution logs with webhook events
  // In the future, we might have a separate webhook_events table
  // For now, approximate from execution logs
  const { data: executions } = await supabase
    .from("execution_logs")
    .select("input, output, error")
    .eq("tenant_id", tenantId)
    .gte("created_at", startDate.toISOString());
    
  // Count webhook triggers (approximation)
  // Actual webhook events would be better tracked in a dedicated table
  const webhookEvents: Array<{ type: string; success: boolean }> = [];
  
  executions?.forEach(exec => {
    // Each execution potentially triggers webhooks
    if (exec.error) {
      webhookEvents.push({ type: 'agent.failed', success: true });
    } else {
      webhookEvents.push({ type: 'agent.completed', success: true });
    }
  });
  
  const totalEvents = webhookEvents.length;
  const successfulEvents = webhookEvents.filter(e => e.success).length;
  const successRate = totalEvents > 0 
    ? Math.round((successfulEvents / totalEvents) * 100) 
    : 100;
  
  // Group by type
  const typeCounts = new Map<string, number>();
  webhookEvents.forEach(event => {
    typeCounts.set(event.type, (typeCounts.get(event.type) || 0) + 1);
  });
  
  const byType = Array.from(typeCounts.entries()).map(([eventType, count]) => ({
    eventType,
    count,
    percentage: Math.round((count / totalEvents) * 100)
  }));
  
  return {
    totalEvents,
    successRate,
    byType
  };
}

/**
 * Get comprehensive analytics metrics for the dashboard
 * Includes current period stats and comparison to previous period
 */
export async function getAnalyticsMetrics(
  days: number = 30
): Promise<{ metrics?: AnalyticsMetrics; error?: string }> {
  const supabase = await createServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get user's tenant_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) {
    return { error: "User profile not found" };
  }

  try {
    const now = new Date();
    const currentPeriodStart = startOfDay(subDays(now, days));
    const previousPeriodStart = startOfDay(subDays(now, days * 2));
    const previousPeriodEnd = endOfDay(subDays(now, days + 1));

    // Fetch conversations for current period
    const { data: currentConversations } = await supabase
      .from("conversations")
      .select("id, created_at, agent_id")
      .eq("tenant_id", profile.tenant_id)
      .gte("created_at", currentPeriodStart.toISOString());

    // Fetch conversations for previous period
    const { data: previousConversations } = await supabase
      .from("conversations")
      .select("id")
      .eq("tenant_id", profile.tenant_id)
      .gte("created_at", previousPeriodStart.toISOString())
      .lt("created_at", previousPeriodEnd.toISOString());

    // Fetch leads for current period
    const { data: currentLeads } = await supabase
      .from("leads")
      .select("id, created_at, agent_id")
      .eq("tenant_id", profile.tenant_id)
      .gte("created_at", currentPeriodStart.toISOString());

    // Fetch leads for previous period
    const { data: previousLeads } = await supabase
      .from("leads")
      .select("id")
      .eq("tenant_id", profile.tenant_id)
      .gte("created_at", previousPeriodStart.toISOString())
      .lt("created_at", previousPeriodEnd.toISOString());

    // Fetch all agents
    const { data: agents } = await supabase
      .from("agents")
      .select("id, name, type, status, created_at")
      .eq("tenant_id", profile.tenant_id);

    // Calculate metrics
    const conversationsTotal = currentConversations?.length || 0;
    const conversationsPrevious = previousConversations?.length || 0;
    const conversationsChange = calculatePercentageChange(
      conversationsTotal,
      conversationsPrevious
    );

    const leadsTotal = currentLeads?.length || 0;
    const leadsPrevious = previousLeads?.length || 0;
    const leadsChange = calculatePercentageChange(leadsTotal, leadsPrevious);

    const activeAgentsTotal =
      agents?.filter((a) => a.status === "active").length || 0;
    const activeAgentsPrevious =
      agents?.filter(
        (a) =>
          a.status === "active" &&
          new Date(a.created_at) < currentPeriodStart
      ).length || 0;
    const activeAgentsChange = calculatePercentageChange(
      activeAgentsTotal,
      activeAgentsPrevious
    );

    // Build timeline data (daily breakdown)
    const timeline: Array<{
      date: string;
      conversations: number;
      leads: number;
    }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(now, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const dayConversations =
        currentConversations?.filter((c) => {
          const createdAt = new Date(c.created_at);
          return createdAt >= dayStart && createdAt <= dayEnd;
        }).length || 0;

      const dayLeads =
        currentLeads?.filter((l) => {
          const createdAt = new Date(l.created_at);
          return createdAt >= dayStart && createdAt <= dayEnd;
        }).length || 0;

      timeline.push({
        date: format(date, "MMM dd"),
        conversations: dayConversations,
        leads: dayLeads,
      });
    }

    // Calculate top performing agents
    const agentStats = new Map<
      string,
      {
        id: string;
        name: string;
        type: string;
        conversationCount: number;
        leadCount: number;
      }
    >();

    agents?.forEach((agent) => {
      agentStats.set(agent.id, {
        id: agent.id,
        name: agent.name,
        type: agent.type,
        conversationCount: 0,
        leadCount: 0,
      });
    });

    currentConversations?.forEach((conv) => {
      const agent = agentStats.get(conv.agent_id);
      if (agent) {
        agent.conversationCount++;
      }
    });

    currentLeads?.forEach((lead) => {
      const agent = agentStats.get(lead.agent_id);
      if (agent) {
        agent.leadCount++;
      }
    });
    const topAgents = Array.from(agentStats.values())
      .sort((a, b) => b.conversationCount - a.conversationCount)
      .slice(0, 5);

    // Fetch new analytics metrics
    const [knowledgeBase, integrations, webhooks] = await Promise.all([
      getKnowledgeBaseMetrics(profile.tenant_id, currentPeriodStart),
      getIntegrationMetrics(profile.tenant_id, currentPeriodStart),
      getWebhookMetrics(profile.tenant_id, currentPeriodStart)
    ]);

    const metrics: AnalyticsMetrics = {
      conversations: {
        total: conversationsTotal,
        change: conversationsChange,
      },
      leads: {
        total: leadsTotal,
        change: leadsChange,
      },
      activeAgents: {
        total: activeAgentsTotal,
        change: activeAgentsChange,
      },
      timeline,
      topAgents,
      knowledgeBase, // NEW
      integrations, // NEW
      webhooks, // NEW
    };

    return { metrics };
  } catch (error) {
    console.error("Error fetching analytics metrics:", error);
    return { error: "Failed to fetch analytics metrics" };
  }
}

/**
 * Calculate percentage change between two values
 */
function calculatePercentageChange(
  current: number,
  previous: number
): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Get quick stats for dashboard (last 7 days)
 */
export async function getDashboardStats(): Promise<{
  stats?: {
    activeAgents: number;
    recentConversations: number;
    recentLeads: number;
  };
  error?: string;
}> {
  const supabase = await createServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get user's tenant_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) {
    return { error: "User profile not found" };
  }

  try {
    const sevenDaysAgo = subDays(new Date(), 7);

    // Count active agents
    const { count: activeAgents } = await supabase
      .from("agents")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "active");

    // Count recent conversations (last 7 days)
    const { count: recentConversations } = await supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", profile.tenant_id)
      .gte("created_at", sevenDaysAgo.toISOString());

    // Count recent leads (last 7 days)
    const { count: recentLeads } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", profile.tenant_id)
      .gte("created_at", sevenDaysAgo.toISOString());

    return {
      stats: {
        activeAgents: activeAgents || 0,
        recentConversations: recentConversations || 0,
        recentLeads: recentLeads || 0,
      },
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return { error: "Failed to fetch dashboard stats" };
  }
}

export interface Activity {
  id: string;
  type: "lead" | "conversation" | "agent";
  title: string;
  description: string;
  timestamp: string;
  agentName?: string;
}

/**
 * Get recent activity for dashboard
 */
export async function getRecentActivity(
  limit: number = 10
): Promise<{ activities?: Activity[]; error?: string }> {
  const supabase = await createServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get user's tenant_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) {
    return { error: "User profile not found" };
  }

  try {
    // Fetch recent leads
    const { data: leads } = await supabase
      .from("leads")
      .select("id, name, email, created_at, agent:agents(name)")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Fetch recent conversations
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id, created_at, agent:agents(name)")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Fetch recently created agents
    const { data: agents } = await supabase
      .from("agents")
      .select("id, name, type, created_at")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Combine and format activities
    const activities: Activity[] = [];

    leads?.forEach((lead) => {
      activities.push({
        id: lead.id,
        type: "lead",
        title: "New lead captured",
        description: `${lead.name || lead.email || "Anonymous"} via ${(lead.agent as any)?.name || "Unknown agent"}`,
        timestamp: lead.created_at,
        agentName: (lead.agent as any)?.name,
      });
    });

    conversations?.forEach((conv) => {
      activities.push({
        id: conv.id,
        type: "conversation",
        title: "New conversation",
        description: `Started with ${(conv.agent as any)?.name || "Unknown agent"}`,
        timestamp: conv.created_at,
        agentName: (conv.agent as any)?.name,
      });
    });

    agents?.forEach((agent) => {
      activities.push({
        id: agent.id,
        type: "agent",
        title: "Agent created",
        description: `${agent.name} (${agent.type})`,
        timestamp: agent.created_at,
        agentName: agent.name,
      });
    });

    // Sort by timestamp and limit
    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return { activities: activities.slice(0, limit) };
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    return { error: "Failed to fetch recent activity" };
  }
}
