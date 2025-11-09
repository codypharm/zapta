/**
 * Lead Management Actions
 * Server actions for creating and managing leads (contact information)
 */

"use server";

import { createServerClient } from "@/lib/supabase/server";

export interface Lead {
  id: string;
  tenant_id: string;
  agent_id: string;
  conversation_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  custom_data?: Record<string, any>;
  source: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  agent?: {
    id: string;
    name: string;
    type: string;
  };
  conversation?: {
    id: string;
    messages: any[];
  };
}

interface CreateLeadData {
  agentId: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  customData?: Record<string, any>;
  source?: string;
}

interface GetLeadsOptions {
  agentId?: string;
  searchQuery?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Create a new lead
 */
export async function createLead(data: CreateLeadData) {
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
    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        tenant_id: profile.tenant_id,
        agent_id: data.agentId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        custom_data: data.customData || {},
        source: data.source || "dashboard",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating lead:", error);
      return { error: "Failed to create lead" };
    }

    return { lead };
  } catch (error) {
    console.error("Error creating lead:", error);
    return { error: "Failed to create lead" };
  }
}

/**
 * Get all leads for the current user's tenant
 */
export async function getLeads(options: GetLeadsOptions = {}) {
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
      .from("leads")
      .select(
        `
        *,
        agent:agents (
          id,
          name,
          type
        ),
        conversation:conversations (
          id,
          messages
        )
      `
      )
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false });

    // Filter by agent if specified
    if (options.agentId) {
      query = query.eq("agent_id", options.agentId);
    }

    // Filter by has email
    if (options.hasEmail) {
      query = query.not("email", "is", null);
    }

    // Filter by has phone
    if (options.hasPhone) {
      query = query.not("phone", "is", null);
    }

    // Apply limit and offset for pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data: leads, error } = await query;

    if (error) {
      console.error("Error fetching leads:", error);
      return { error: "Failed to fetch leads" };
    }

    // Filter by search query on the client side if needed
    let filteredLeads = leads as Lead[];

    if (options.searchQuery && filteredLeads) {
      const query = options.searchQuery.toLowerCase();
      filteredLeads = filteredLeads.filter((lead) => {
        return (
          lead.name?.toLowerCase().includes(query) ||
          lead.email?.toLowerCase().includes(query) ||
          lead.company?.toLowerCase().includes(query) ||
          lead.agent?.name.toLowerCase().includes(query)
        );
      });
    }

    return { leads: filteredLeads };
  } catch (error) {
    console.error("Error fetching leads:", error);
    return { error: "Failed to fetch leads" };
  }
}

/**
 * Get a single lead by ID
 */
export async function getLeadById(leadId: string) {
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
    const { data: lead, error } = await supabase
      .from("leads")
      .select(
        `
        *,
        agent:agents (
          id,
          name,
          type,
          description
        ),
        conversation:conversations (
          id,
          messages,
          created_at,
          updated_at
        )
      `
      )
      .eq("id", leadId)
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (error || !lead) {
      return { error: "Lead not found" };
    }

    return { lead: lead as Lead };
  } catch (error) {
    console.error("Error fetching lead:", error);
    return { error: "Failed to fetch lead" };
  }
}

/**
 * Update a lead
 */
export async function updateLead(
  leadId: string,
  data: Partial<CreateLeadData>
) {
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
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.company !== undefined) updateData.company = data.company;
    if (data.customData !== undefined) updateData.custom_data = data.customData;

    const { error } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", leadId)
      .eq("tenant_id", profile.tenant_id);

    if (error) {
      console.error("Error updating lead:", error);
      return { error: "Failed to update lead" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating lead:", error);
    return { error: "Failed to update lead" };
  }
}

/**
 * Delete a lead
 */
export async function deleteLead(leadId: string) {
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
      .from("leads")
      .delete()
      .eq("id", leadId)
      .eq("tenant_id", profile.tenant_id);

    if (error) {
      return { error: "Failed to delete lead" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting lead:", error);
    return { error: "Failed to delete lead" };
  }
}

/**
 * Link a lead to a conversation
 */
export async function linkLeadToConversation(
  leadId: string,
  conversationId: string
) {
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
      .from("leads")
      .update({ conversation_id: conversationId })
      .eq("id", leadId)
      .eq("tenant_id", profile.tenant_id);

    if (error) {
      return { error: "Failed to link lead to conversation" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error linking lead:", error);
    return { error: "Failed to link lead to conversation" };
  }
}

/**
 * Export leads to CSV
 */
export async function exportLeadsToCSV() {
  const result = await getLeads();

  if (result.error || !result.leads) {
    return { error: result.error || "Failed to fetch leads" };
  }

  // Create CSV content
  const headers = ["Name", "Email", "Phone", "Company", "Agent", "Created At"];
  const rows = result.leads.map((lead) => [
    lead.name || "",
    lead.email || "",
    lead.phone || "",
    lead.company || "",
    lead.agent?.name || "",
    new Date(lead.created_at).toLocaleString(),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return { csv: csvContent };
}
