/**
 * Public Agent Config API
 * Returns agent configuration for widget (lead collection settings)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create Supabase client with service role (bypass RLS for public endpoint)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;

    // Load agent configuration
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, config")
      .eq("id", agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Return only the config (includes leadCollection settings)
    return NextResponse.json({
      id: agent.id,
      config: agent.config,
    });
  } catch (error) {
    console.error("Agent config API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent configuration" },
      { status: 500 }
    );
  }
}
