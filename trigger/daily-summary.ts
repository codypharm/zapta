/**
 * Daily Summary Job
 * Sends daily activity summary emails to users
 * Runs every day at 8 AM
 */

import { task } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import { sendEmailNotification } from "@/lib/notifications/email";
import { subDays, format, startOfDay, endOfDay } from "date-fns";

// Initialize Supabase client for background jobs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DailySummaryPayload {
  date?: string; // Optional - for manual runs, defaults to yesterday
}

export const dailySummaryTask = task({
  id: "daily-summary",
  run: async (payload: DailySummaryPayload) => {
    const targetDate = payload.date
      ? new Date(payload.date)
      : subDays(new Date(), 1);

    const dateStart = startOfDay(targetDate);
    const dateEnd = endOfDay(targetDate);
    const formattedDate = format(targetDate, "MMMM d, yyyy");

    console.log(`Processing daily summary for ${formattedDate}`);

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
        // Get tenant's activity for the day
        const activity = await getTenantDailyActivity(
          tenant.id,
          dateStart,
          dateEnd
        );

        // Get users with daily summary enabled
        const { data: users } = await supabase
          .from("profiles")
          .select("id, email, full_name, notification_preferences")
          .eq("tenant_id", tenant.id);

        if (!users || users.length === 0) {
          console.log(`No users found for tenant ${tenant.id}`);
          continue;
        }

        // Send email to each user with daily summary enabled
        for (const user of users) {
          const prefs = user.notification_preferences || {};
          if (prefs.email?.dailySummary === true) {
            const result = await sendEmailNotification({
              to: user.email,
              type: "daily_summary",
              data: {
                userName: user.full_name || user.email.split("@")[0],
                activity,
                date: formattedDate,
              },
              tenantId: tenant.id,
            });

            if (result.success) {
              totalSent++;
              console.log(`Sent daily summary to ${user.email}`);
            } else {
              totalFailed++;
              console.error(
                `Failed to send daily summary to ${user.email}:`,
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
      date: formattedDate,
      sent: totalSent,
      failed: totalFailed,
    };
  },
});

/**
 * Get daily activity for a tenant
 */
async function getTenantDailyActivity(
  tenantId: string,
  dateStart: Date,
  dateEnd: Date
) {
  // Get conversations count
  const { count: conversationsCount } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("created_at", dateStart.toISOString())
    .lte("created_at", dateEnd.toISOString());

  // Get leads count
  const { count: leadsCount } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("created_at", dateStart.toISOString())
    .lte("created_at", dateEnd.toISOString());

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
      .gte("created_at", dateStart.toISOString())
      .lte("created_at", dateEnd.toISOString());

    const { count: agentLeads } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", agent.id)
      .gte("created_at", dateStart.toISOString())
      .lte("created_at", dateEnd.toISOString());

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
