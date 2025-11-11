/**
 * Knowledge Analytics API
 * Provides analytics data for knowledge base usage
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getAnalyticsDashboard } from "@/lib/knowledge/analytics";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's tenant_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: "Profile not found" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    const daysBack = parseInt(searchParams.get("daysBack") || "30");

    const analytics = await getAnalyticsDashboard(
      profile.tenant_id,
      agentId || undefined,
      daysBack
    );

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}