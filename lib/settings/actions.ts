/**
 * Settings Server Actions
 * Handles user and organization settings management
 */

"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface ProfileData {
  full_name?: string;
  email?: string;
}

export interface OrganizationData {
  name?: string;
}

export interface NotificationPreferences {
  email: {
    newLeads: boolean;
    newConversations: boolean;
    dailySummary: boolean;
    weeklySummary: boolean;
  };
  inApp: {
    enabled: boolean;
  };
}

/**
 * Get current user profile and organization
 */
export async function getSettings() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get profile with tenant info
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      *,
      tenant:tenants(*)
    `)
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { error: "Profile not found" };
  }

  return {
    profile: {
      id: profile.id,
      email: user.email,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      role: profile.role,
      created_at: profile.created_at,
      notification_preferences: profile.notification_preferences,
    },
    organization: profile.tenant,
  };
}

/**
 * Update user profile
 */
export async function updateProfile(data: ProfileData) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    const updateData: any = {};

    if (data.full_name !== undefined) {
      updateData.full_name = data.full_name;
    }

    // Update profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
      return { error: "Failed to update profile" };
    }

    // Update email in auth if provided
    if (data.email && data.email !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: data.email,
      });

      if (emailError) {
        console.error("Email update error:", emailError);
        return { error: "Failed to update email. Please check if email is already in use." };
      }
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Profile update error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error("Password update error:", error);
      return { error: "Failed to update password" };
    }

    return { success: true };
  } catch (error) {
    console.error("Password update error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Update organization settings
 */
export async function updateOrganization(data: OrganizationData) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    // Get user's tenant_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return { error: "Profile not found" };
    }

    // Only owner or admin can update organization
    if (profile.role !== "owner" && profile.role !== "admin") {
      return { error: "You don't have permission to update organization settings" };
    }

    const { error } = await supabase
      .from("tenants")
      .update({
        name: data.name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.tenant_id);

    if (error) {
      console.error("Organization update error:", error);
      return { error: "Failed to update organization" };
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Organization update error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(preferences: NotificationPreferences) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        notification_preferences: preferences,
      })
      .eq("id", user.id);

    if (error) {
      console.error("Notification preferences update error:", error);
      return { error: "Failed to update notification preferences" };
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Notification preferences update error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Export all user data
 */
export async function exportData() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    // Get user's tenant_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return { error: "Profile not found" };
    }

    // Fetch all data
    const [agents, conversations, leads] = await Promise.all([
      supabase.from("agents").select("*").eq("tenant_id", profile.tenant_id),
      supabase.from("conversations").select("*").eq("tenant_id", profile.tenant_id),
      supabase.from("leads").select("*").eq("tenant_id", profile.tenant_id),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
      },
      agents: agents.data || [],
      conversations: conversations.data || [],
      leads: leads.data || [],
    };

    return { success: true, data: exportData };
  } catch (error) {
    console.error("Export data error:", error);
    return { error: "Failed to export data" };
  }
}

/**
 * Delete user account
 */
export async function deleteAccount() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    // Get user's tenant_id and role
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return { error: "Profile not found" };
    }

    // Only allow if user is owner or if they're the only user
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("tenant_id", profile.tenant_id);

    if (profile.role !== "owner" && profiles && profiles.length > 1) {
      return { error: "Only the organization owner can delete the account when there are multiple users" };
    }

    // Delete tenant (cascades to all related data)
    const { error: deleteError } = await supabase
      .from("tenants")
      .delete()
      .eq("id", profile.tenant_id);

    if (deleteError) {
      console.error("Account deletion error:", deleteError);
      return { error: "Failed to delete account" };
    }

    // Sign out user
    await supabase.auth.signOut();

    return { success: true };
  } catch (error) {
    console.error("Account deletion error:", error);
    return { error: "An unexpected error occurred" };
  }
}
