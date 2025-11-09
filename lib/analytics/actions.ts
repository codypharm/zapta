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
