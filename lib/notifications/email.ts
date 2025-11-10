/**
 * Email Notification System
 * Handles sending email notifications using Resend
 */

"use server";

import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase/server";
import { NewLeadEmail } from "@/emails/new-lead";
import { NewConversationEmail } from "@/emails/new-conversation";
import { DailySummaryEmail } from "@/emails/daily-summary";
import { WeeklySummaryEmail } from "@/emails/weekly-summary";

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

export type NotificationType =
  | "new_lead"
  | "new_conversation"
  | "daily_summary"
  | "weekly_summary";

interface SendEmailNotificationParams {
  to: string;
  type: NotificationType;
  data: any;
  tenantId: string;
}

/**
 * Get user's notification preferences from database
 */
async function getNotificationPreferences(email: string) {
  const supabase = await createServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_preferences")
    .eq("email", email)
    .single();

  // Default preferences if not set
  const defaultPreferences = {
    email: {
      newLeads: true,
      newConversations: true,
      dailySummary: false,
      weeklySummary: false,
    },
  };

  return profile?.notification_preferences || defaultPreferences;
}

/**
 * Get all users for a tenant with their notification preferences
 */
export async function getTenantUsersWithNotifications(tenantId: string) {
  const supabase = await createServerClient();

  const { data: users } = await supabase
    .from("profiles")
    .select("id, email, full_name, notification_preferences")
    .eq("tenant_id", tenantId);

  return users || [];
}

/**
 * Send email notification based on type
 */
export async function sendEmailNotification(
  params: SendEmailNotificationParams
): Promise<{ success: boolean; error?: string }> {
  // Check if Resend API key is configured
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured, skipping email notification");
    return { success: false, error: "Email not configured" };
  }

  try {
    // 1. Check user's notification preferences
    const preferences = await getNotificationPreferences(params.to);

    // 2. Check if this notification type is enabled
    const typeMap: Record<NotificationType, boolean> = {
      new_lead: preferences.email?.newLeads ?? true,
      new_conversation: preferences.email?.newConversations ?? true,
      daily_summary: preferences.email?.dailySummary ?? false,
      weekly_summary: preferences.email?.weeklySummary ?? false,
    };

    if (!typeMap[params.type]) {
      console.log(
        `Notification type ${params.type} is disabled for ${params.to}`
      );
      return { success: true }; // Not an error, just disabled
    }

    // 3. Get email template and subject
    const { subject, react } = getEmailTemplate(params.type, params.data);

    // 4. Send via Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Zapta <notifications@zapta.ai>",
      to: params.to,
      subject,
      react,
    });

    if (error) {
      console.error("Error sending email:", error);
      return { success: false, error: error.message };
    }

    console.log(`Email sent successfully to ${params.to}:`, data?.id);
    return { success: true };
  } catch (error) {
    console.error("Error in sendEmailNotification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get email template component and subject based on notification type
 */
function getEmailTemplate(type: NotificationType, data: any) {
  switch (type) {
    case "new_lead":
      return {
        subject: `New Lead: ${data.lead.name || data.lead.email || "Anonymous"}`,
        react: NewLeadEmail({
          lead: data.lead,
          agent: data.agent,
          appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        }),
      };

    case "new_conversation":
      return {
        subject: `New Conversation with ${data.agent.name}`,
        react: NewConversationEmail({
          conversation: data.conversation,
          agent: data.agent,
          appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        }),
      };

    case "daily_summary":
      return {
        subject: `Your Daily Summary - ${data.date}`,
        react: DailySummaryEmail({
          userName: data.userName,
          activity: data.activity,
          date: data.date,
          appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        }),
      };

    case "weekly_summary":
      return {
        subject: `Your Weekly Summary - ${data.weekStart} to ${data.weekEnd}`,
        react: WeeklySummaryEmail({
          userName: data.userName,
          activity: data.activity,
          weekStart: data.weekStart,
          weekEnd: data.weekEnd,
          appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        }),
      };

    default:
      throw new Error(`Unknown notification type: ${type}`);
  }
}

/**
 * Send notification to all users in a tenant
 */
export async function notifyTenantUsers(
  tenantId: string,
  type: NotificationType,
  data: any
): Promise<{ success: boolean; sent: number; failed: number }> {
  const users = await getTenantUsersWithNotifications(tenantId);

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    const result = await sendEmailNotification({
      to: user.email,
      type,
      data,
      tenantId,
    });

    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { success: true, sent, failed };
}
