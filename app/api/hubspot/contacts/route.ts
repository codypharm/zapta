/**
 * HubSpot Contacts API Endpoint
 * Handles CRUD operations for HubSpot contacts
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

    // Fetch contacts from database
    const { data: contacts, error } = await supabase
      .from("hubspot_contacts")
      .select("*")
      .eq("tenant_id", profile.tenant_id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch contacts" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: contacts || [],
    });
  } catch (error) {
    console.error("Contacts API error:", error);
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
    const { properties, ...contactData } = body;

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
        { error: "Contact properties are required" },
        { status: 400 }
      );
    }

    // Create contact in HubSpot
    const hubspotIntegration = (await import("@/lib/integrations/hubspot"))
      .default;

    try {
      const hubspotInstance = new hubspotIntegration();
      const contactId = await hubspotInstance.createContact({
        properties: {
          email: contactData.email,
          firstname: contactData.firstname,
          lastname: contactData.lastname,
          phone: contactData.phone,
          company: contactData.company,
        },
      });

      // Store contact in database
      const { error } = await supabase.from("hubspot_contacts").insert({
        id: contactId,
        tenant_id: profile.tenant_id,
        hubspot_contact_id: contactId,
        properties,
        data: contactData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        return NextResponse.json(
          { error: "Failed to create contact" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        id: contactId,
        message: "Contact created successfully",
      });
    } catch (error) {
      console.error("Create contact error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Contacts API error:", error);
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
    const contactId = searchParams.get("id") as string;

    if (!contactId) {
      return NextResponse.json(
        { error: "Contact ID is required" },
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
    const { properties, ...contactData } = body;

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
        { error: "Contact properties are required" },
        { status: 400 }
      );
    }

    // Update contact in HubSpot
    const hubspotIntegration = (await import("@/lib/integrations/hubspot"))
      .default;

    try {
      const hubspotInstance = new hubspotIntegration();
      await hubspotInstance.updateContact(contactId, {
        properties: {
          email: contactData.email,
          firstname: contactData.firstname,
          lastname: contactData.lastname,
          phone: contactData.phone,
          company: contactData.company,
        },
      });

      // Update contact in database
      const { error } = await supabase
        .from("hubspot_contacts")
        .update({
          data: {
            updated_at: new Date().toISOString(),
          },
        })
        .eq("id", contactId);

      if (error) {
        return NextResponse.json(
          { error: "Failed to update contact" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "Contact updated successfully",
      });
    } catch (error) {
      console.error("Update contact error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Update contact error:", error);
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
    const contactId = searchParams.get("id") as string;

    if (!contactId) {
      return NextResponse.json(
        { error: "Contact ID is required" },
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

    // Archive contact in HubSpot
    const hubspotIntegration = (await import("@/lib/integrations/hubspot"))
      .default;

    try {
      const hubspotInstance = new hubspotIntegration();
      await hubspotInstance.updateContact(contactId, {
        properties: {
          archived: true,
        },
      });

      // Archive contact in database
      const { error } = await supabase
        .from("hubspot_contacts")
        .update({
          data: {
            archived: true,
            updated_at: new Date().toISOString(),
          },
        })
        .eq("id", contactId);

      if (error) {
        return NextResponse.json(
          { error: "Failed to archive contact" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "Contact archived successfully",
      });
    } catch (error) {
      console.error("Delete contact error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Delete contact error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
