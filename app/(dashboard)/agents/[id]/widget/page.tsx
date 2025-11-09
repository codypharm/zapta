/**
 * Agent Widget Settings Page
 * Generate embed code for agents
 */

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WidgetSettings } from "@/components/agents/widget-settings";

export default async function AgentWidgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's tenant_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) {
    redirect("/login");
  }

  // Fetch agent
  const { data: agent, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", profile.tenant_id)
    .single();

  if (error || !agent) {
    redirect("/agents");
  }

  return <WidgetSettings agent={agent} />;
}
