/**
 * Knowledge Base API
 * Handles document upload and management operations
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { uploadDocument, getDocuments, deleteDocument } from "@/lib/knowledge/actions";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { name, content, agentId, metadata } = body;

    if (!name || !content) {
      return NextResponse.json({ error: "Name and content are required" }, { status: 400 });
    }

    const result = await uploadDocument(
      profile.tenant_id,
      agentId || null,
      name,
      content,
      metadata || {}
    );

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error("Knowledge API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    const result = await getDocuments(profile.tenant_id, agentId || undefined);

    if (result.success) {
      return NextResponse.json({ documents: result.documents });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error("Knowledge API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
    const documentName = searchParams.get("name");

    if (!documentName) {
      return NextResponse.json({ error: "Document name is required" }, { status: 400 });
    }

    const result = await deleteDocument(profile.tenant_id, documentName);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error("Knowledge API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}