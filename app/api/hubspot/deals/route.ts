/**
 * HubSpot Deals API Endpoint
 * Handles CRUD operations for HubSpot deals
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's tenant_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Fetch deals from database
    const { data: deals, error } = await supabase
      .from("hubspot_deals")
      .select("*")
      .eq("tenant_id", profile.tenant_id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch deals" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: deals || [],
    });
  } catch (error) {
    console.error("Deals API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { properties, amount, stage, ...dealData } = body;

    // Get user's tenant_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!properties) {
      return NextResponse.json(
        { error: "Deal properties are required" },
        { status: 400 }
      );
    }

    // Create deal in HubSpot
    const hubspotIntegration = (await import("@/lib/integrations/hubspot"))
      .default;

    try {
      const hubspotInstance = new hubspotIntegration(profile.tenant_id);
      const dealId = await hubspotInstance.createDeal({
        properties: {
          dealname: dealData.dealname,
          amount: amount || 0,
          dealstage: stage || "appointmentscheduled",
          closedate: dealData.closedate,
          hubspot_owner_id: dealData.hubspot_owner_id,
        },
      });

      // Store deal in database
      const { error } = await supabase.from("hubspot_deals").insert({
        id: dealId,
        tenant_id: profile.tenant_id,
        hubspot_deal_id: dealId,
        properties,
        amount: amount || 0,
        stage: stage || "appointmentscheduled",
        data: dealData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        return NextResponse.json(
          { error: "Failed to create deal" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        id: dealId,
        message: "Deal created successfully",
      });
    } catch (error) {
      console.error("Create deal error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Deals API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createServerClient();

  try {
    const { searchParams } = request.nextUrl;
    const dealId = searchParams.get("id") as string;

    if (!dealId) {
      return NextResponse.json(
        { error: "Deal ID is required" },
        { status: 400 }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { properties, amount, stage, ...dealData } = body;

    // Get user's tenant_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!properties) {
      return NextResponse.json(
        { error: "Deal properties are required" },
        { status: 400 }
      );
    }

    // Update deal in HubSpot
    const hubspotIntegration = (await import("@/lib/integrations/hubspot"))
      .default;

    try {
      const hubspotInstance = new hubspotIntegration(profile.tenant_id);
      await hubspotInstance.updateDeal(dealId, {
        properties: {
          dealname: dealData.dealname,
          closedate: dealData.closedate,
          hubspot_owner_id: dealData.hubspot_owner_id,
        },
      });

      // Update deal in database
      const { error } = await supabase
        .from("hubspot_deals")
        .update({
          amount: amount,
          stage: stage,
          data: {
            ...dealData,
            updated_at: new Date().toISOString(),
          },
        })
        .eq("id", dealId);

      if (error) {
        return NextResponse.json(
          { error: "Failed to update deal" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "Deal updated successfully",
      });
    } catch (error) {
      console.error("Update deal error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Update deal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerClient();

  try {
    const { searchParams } = request.nextUrl;
    const dealId = searchParams.get("id") as string;

    if (!dealId) {
      return NextResponse.json(
        { error: "Deal ID is required" },
        { status: 400 }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { archived } = body;

    // Get user's tenant_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Archive deal in HubSpot
    const hubspotIntegration = (await import("@/lib/integrations/hubspot"))
      .default;

    try {
      const hubspotInstance = new hubspotIntegration(profile.tenant_id);
      await hubspotInstance.updateDeal(dealId, {
        properties: {
          archived: true,
        },
      });

      // Archive deal in database
      const { error } = await supabase
        .from("hubspot_deals")
        .update({
          archived: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", dealId);

      if (error) {
        return NextResponse.json(
          { error: "Failed to archive deal" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "Deal archived successfully",
      });
    } catch (error) {
      console.error("Delete deal error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Delete deal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
