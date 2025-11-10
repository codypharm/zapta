/**
 * Weekly Summary Job
 * Sends weekly activity summary emails to users
 * Runs every Monday at 8 AM
 */

import { task } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import { sendEmailNotification } from "@/lib/notifications/email";
import { subWeeks, startOfWeek, endOfWeek, format } from "date-fns";

// Initialize Supabase client for background jobs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface WeeklySummaryPayload {
  weekStart?: string; // Optional - for manual runs
  weekEnd?: string; // Optional - for manual runs
}

export const weeklySummaryTask = task({
  id: "weekly-summary",
  run: async (payload: WeeklySummaryPayload) => {
    // Default to last week (Monday to Sunday)
    const lastWeekStart = payload.weekStart
      ? new Date(payload.weekStart)
      : startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });

    const lastWeekEnd = payload.weekEnd
      ? new Date(payload.weekEnd)
      : endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });

    const formattedStart = format(lastWeekStart, "MMM d, yyyy");
    const formattedEnd = format(lastWeekEnd, "MMM d, yyyy");

    console.log(`Processing weekly summary for ${formattedStart} - ${formattedEnd}`);

    // 1. Get all tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, name");

    if (tenantsError) {
      throw new Error(`Failed to fetch tenants: ${tenantsError.message}`);
    }

    let totalSent = 0;
    let totalFailed = 0;

    // 2. Process each tenant
    for (const tenant of tenants || []) {
      try {
        // Get tenant's activity for the week
        const activity = await getTenantWeeklyActivity(
          tenant.id,
          lastWeekStart,
          lastWeekEnd
        );

        // Get users with weekly summary enabled
        const { data: users } = await supabase
          .from("profiles")
          .select("id, email, full_name, notification_preferences")
          .eq("tenant_id", tenant.id);

        if (!users || users.length === 0) {
          console.log(`No users found for tenant ${tenant.id}`);
          continue;
        }

        // Send email to each user with weekly summary enabled
        for (const user of users) {
          const prefs = user.notification_preferences || {};
          if (prefs.email?.weeklySummary === true) {
            const result = await sendEmailNotification({
              to: user.email,
              type: "weekly_summary",
              data: {
                userName: user.full_name || user.email.split("@")[0],
                activity,
                weekStart: formattedStart,
                weekEnd: formattedEnd,
              },
              tenantId: tenant.id,
            });

            if (result.success) {
              totalSent++;
              console.log(`Sent weekly summary to ${user.email}`);
            } else {
              totalFailed++;
              console.error(
                `Failed to send weekly summary to ${user.email}:`,
                result.error
              );
            }
          }
        }
      } catch (error) {
        console.error(`Error processing tenant ${tenant.id}:`, error);
        totalFailed++;
      }
    }

    return {
      success: true,
      weekStart: formattedStart,
      weekEnd: formattedEnd,
      sent: totalSent,
      failed: totalFailed,
    };
  },
});

/**
 * Get weekly activity for a tenant
 */
async function getTenantWeeklyActivity(
  tenantId: string,
  weekStart: Date,
  weekEnd: Date
) {
  // Get conversations count
  const { count: conversationsCount } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("created_at", weekStart.toISOString())
    .lte("created_at", weekEnd.toISOString());

  // Get leads count
  const { count: leadsCount } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("created_at", weekStart.toISOString())
    .lte("created_at", weekEnd.toISOString());

  // Get per-agent activity
  const { data: agents } = await supabase
    .from("agents")
    .select("id, name")
    .eq("tenant_id", tenantId);

  const agentActivity = [];

  for (const agent of agents || []) {
    const { count: agentConversations } = await supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", agent.id)
      .gte("created_at", weekStart.toISOString())
      .lte("created_at", weekEnd.toISOString());

    const { count: agentLeads } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", agent.id)
      .gte("created_at", weekStart.toISOString())
      .lte("created_at", weekEnd.toISOString());

    if (agentConversations || agentLeads) {
      agentActivity.push({
        name: agent.name,
        conversations: agentConversations || 0,
        leads: agentLeads || 0,
      });
    }
  }

  return {
    conversations: conversationsCount || 0,
    leads: leadsCount || 0,
    agentActivity,
  };
}
