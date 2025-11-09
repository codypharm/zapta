/**
 * Public Lead Collection API
 * Handles lead form submissions from embedded widgets
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifyTenantUsers } from "@/lib/notifications/email";

// Create Supabase client with service role (bypass RLS for public endpoint)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const body = await request.json();
    const { name, email, phone, company, customData = {} } = body;

    // Validate at least one field is provided
    if (!name && !email && !phone && !company) {
      return NextResponse.json(
        { error: "At least one contact field is required" },
        { status: 400 }
      );
    }

    // Load agent configuration to check lead collection settings
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Check if agent is active
    if (agent.status !== "active") {
      return NextResponse.json(
        { error: "Agent is not available" },
        { status: 503 }
      );
    }

    // Check if lead collection is enabled
    if (!agent.config?.leadCollection?.enabled) {
      return NextResponse.json(
        { error: "Lead collection is not enabled for this agent" },
        { status: 400 }
      );
    }

    // Validate required fields based on agent configuration
    const requiredFields = agent.config.leadCollection.fields || {};

    if (requiredFields.name?.required && !name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (requiredFields.email?.required && !email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (requiredFields.phone?.required && !phone) {
      return NextResponse.json(
        { error: "Phone is required" },
        { status: 400 }
      );
    }

    if (requiredFields.company?.required && !company) {
      return NextResponse.json(
        { error: "Company is required" },
        { status: 400 }
      );
    }

    // Check for existing lead with same email (deduplication)
    let lead;
    if (email) {
      const { data: existingLead } = await supabase
        .from("leads")
        .select("*")
        .eq("tenant_id", agent.tenant_id)
        .eq("agent_id", agentId)
        .eq("email", email)
        .maybeSingle();

      if (existingLead) {
        // Update existing lead with new information
        const { data: updatedLead, error: updateError } = await supabase
          .from("leads")
          .update({
            name: name || existingLead.name,
            phone: phone || existingLead.phone,
            company: company || existingLead.company,
            custom_data: { ...existingLead.custom_data, ...customData },
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingLead.id)
          .select()
          .single();

        if (updateError) {
          console.error("Failed to update lead:", updateError);
          return NextResponse.json(
            { error: "Failed to update contact information" },
            { status: 500 }
          );
        }

        lead = updatedLead;
      }
    }

    // Create new lead if no existing one found
    if (!lead) {
      const { data: newLead, error: leadError } = await supabase
        .from("leads")
        .insert({
          tenant_id: agent.tenant_id,
          agent_id: agentId,
          name: name || null,
          email: email || null,
          phone: phone || null,
          company: company || null,
          custom_data: customData,
          source: "widget",
          metadata: {
            userAgent: request.headers.get("user-agent"),
            referer: request.headers.get("referer"),
          },
        })
        .select()
        .single();

      if (leadError) {
        console.error("Failed to create lead:", leadError);
        return NextResponse.json(
          { error: "Failed to save contact information" },
          { status: 500 }
        );
      }

      lead = newLead;

      // Send notification to tenant users (non-blocking)
      // Only notify for NEW leads, not updates
      notifyTenantUsers(agent.tenant_id, "new_lead", {
        lead: newLead,
        agent: {
          name: agent.name,
          type: agent.type,
        },
      }).catch((error) => {
        console.error("Failed to send lead notification:", error);
        // Don't fail the request if notification fails
      });
    }

    // Return success with lead ID
    return NextResponse.json({
      success: true,
      leadId: lead.id,
      message: "Contact information saved successfully",
    });
  } catch (error) {
    console.error("Lead collection error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
