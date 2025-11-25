/**
 * Agent Edit Page
 * Edit an existing agent's configuration
 */

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AgentEditForm } from "@/components/agents/agent-edit-form";

export default async function AgentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Load agent details
  const { data: agent, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !agent) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <Alert variant="destructive">
          <AlertDescription>Agent not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return <AgentEditForm agent={agent} />;
}
