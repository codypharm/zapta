/**
 * Conversation Management Actions
 * Server actions for fetching and managing conversations
 */

"use server";

import { createServerClient } from "@/lib/supabase/server";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface Conversation {
  id: string;
  tenant_id: string;
  agent_id: string;
  messages: Message[];
  metadata: {
    sessionId?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
  agent?: {
    id: string;
    name: string;
    type: string;
  };
}

interface GetConversationsOptions {
  agentId?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get all conversations for the current user's tenant
 */
export async function getConversations(options: GetConversationsOptions = {}) {
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
    let query = supabase
      .from("conversations")
      .select(
        `
        *,
        agent:agents (
          id,
          name,
          type
        )
      `
      )
      .eq("tenant_id", profile.tenant_id)
      .order("updated_at", { ascending: false });

    // Filter by agent if specified
    if (options.agentId) {
      query = query.eq("agent_id", options.agentId);
    }

    // Apply limit and offset for pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data: conversations, error } = await query;

    if (error) {
      console.error("Error fetching conversations:", error);
      return { error: "Failed to fetch conversations" };
    }

    // Filter by search query on the client side if needed
    let filteredConversations = conversations as Conversation[];

    if (options.searchQuery && filteredConversations) {
      const query = options.searchQuery.toLowerCase();
      filteredConversations = filteredConversations.filter((conv) => {
        // Search in messages
        const hasMatchingMessage = conv.messages.some((msg) =>
          msg.content.toLowerCase().includes(query)
        );

        // Search in agent name
        const hasMatchingAgent = conv.agent?.name.toLowerCase().includes(query);

        return hasMatchingMessage || hasMatchingAgent;
      });
    }

    return { conversations: filteredConversations };
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return { error: "Failed to fetch conversations" };
  }
}

/**
 * Get a single conversation by ID
 */
export async function getConversationById(conversationId: string) {
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
    const { data: conversation, error } = await supabase
      .from("conversations")
      .select(
        `
        *,
        agent:agents (
          id,
          name,
          type,
          description,
          config
        )
      `
      )
      .eq("id", conversationId)
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (error || !conversation) {
      return { error: "Conversation not found" };
    }

    return { conversation: conversation as Conversation };
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return { error: "Failed to fetch conversation" };
  }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string) {
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
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId)
      .eq("tenant_id", profile.tenant_id);

    if (error) {
      return { error: "Failed to delete conversation" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return { error: "Failed to delete conversation" };
  }
}

/**
 * Get conversation statistics
 */
export async function getConversationStats() {
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
    const { data: conversations } = await supabase
      .from("conversations")
      .select("agent_id, created_at")
      .eq("tenant_id", profile.tenant_id);

    if (!conversations) {
      return { stats: { total: 0, byAgent: {} } };
    }

    // Count by agent
    const byAgent: Record<string, number> = {};
    conversations.forEach((conv) => {
      byAgent[conv.agent_id] = (byAgent[conv.agent_id] || 0) + 1;
    });

    return {
      stats: {
        total: conversations.length,
        byAgent,
      },
    };
  } catch (error) {
    console.error("Error fetching conversation stats:", error);
    return { error: "Failed to fetch statistics" };
  }
}
