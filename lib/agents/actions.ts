/**
 * Agent Server Actions
 * Handles agent creation, updates, and deletion
 */

"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

interface CreateAgentData {
  name: string;
  type: string;
  description: string;
  instructions: string;
  model: string;
  tone: string;
}

/**
 * Create a new agent
 */
export async function createAgent(data: CreateAgentData) {
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

  // Validate inputs
  if (!data.name?.trim()) {
    return { error: "Agent name is required" };
  }

  if (!data.type) {
    return { error: "Agent type is required" };
  }

  if (!data.instructions?.trim()) {
    return { error: "Instructions are required" };
  }

  try {
    // Create agent configuration
    const config = {
      model: data.model,
      tone: data.tone,
      instructions: data.instructions,
    };

    // Insert agent
    const { data: agent, error } = await supabase
      .from("agents")
      .insert({
        tenant_id: profile.tenant_id,
        name: data.name,
        type: data.type,
        description: data.description,
        config,
        status: "active",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Agent creation error:", error);
      return { error: "Failed to create agent" };
    }

    // Revalidate agents page
    revalidatePath("/agents");

    return { success: true, agent };
  } catch (error) {
    console.error("Agent creation error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Update an existing agent
 */
export async function updateAgent(id: string, data: Partial<CreateAgentData>) {
  const supabase = await createServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.name) updateData.name = data.name;
    if (data.type) updateData.type = data.type;
    if (data.description) updateData.description = data.description;

    if (data.instructions || data.model || data.tone) {
      // Get current configuration
      const { data: currentAgent } = await supabase
        .from("agents")
        .select("config")
        .eq("id", id)
        .single();

      updateData.config = {
        ...(currentAgent?.config || {}),
        ...(data.model && { model: data.model }),
        ...(data.tone && { tone: data.tone }),
        ...(data.instructions && { instructions: data.instructions }),
      };
    }

    const { error } = await supabase
      .from("agents")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("Agent update error:", error);
      return { error: "Failed to update agent" };
    }

    revalidatePath("/agents");
    revalidatePath(`/agents/${id}`);

    return { success: true };
  } catch (error) {
    console.error("Agent update error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Delete an agent
 */
export async function deleteAgent(id: string) {
  const supabase = await createServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    const { error } = await supabase.from("agents").delete().eq("id", id);

    if (error) {
      console.error("Agent deletion error:", error);
      return { error: "Failed to delete agent" };
    }

    revalidatePath("/agents");

    return { success: true };
  } catch (error) {
    console.error("Agent deletion error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Toggle agent status (active/inactive)
 */
export async function toggleAgentStatus(id: string, status: "active" | "inactive") {
  const supabase = await createServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    const { error } = await supabase
      .from("agents")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Agent status toggle error:", error);
      return { error: "Failed to update agent status" };
    }

    revalidatePath("/agents");
    revalidatePath(`/agents/${id}`);

    return { success: true };
  } catch (error) {
    console.error("Agent status toggle error:", error);
    return { error: "An unexpected error occurred" };
  }
}
