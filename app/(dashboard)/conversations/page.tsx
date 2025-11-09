/**
 * Conversations List Page
 * View all conversations across agents
 */

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ConversationsList } from "@/components/conversations/conversations-list";

export default async function ConversationsPage() {
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

  // Fetch agents for filter dropdown
  const { data: agents } = await supabase
    .from("agents")
    .select("id, name, type")
    .eq("tenant_id", profile.tenant_id)
    .order("name");

  return <ConversationsList agents={agents || []} />;
}
