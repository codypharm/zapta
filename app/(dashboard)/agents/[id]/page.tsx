/**
 * Agent Detail & Chat Page
 * View agent details and test via chat interface
 */

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AgentChat } from "@/components/agents/agent-chat";

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
      <div className="p-8">
        <Alert variant="destructive">
          <AlertDescription>Agent not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b bg-white p-6">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="mb-4"
          >
            <Link href="/agents">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Agents
            </Link>
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{agent.name}</h1>
              <p className="text-muted-foreground mt-2">{agent.description}</p>
              <div className="flex items-center gap-4 mt-4 text-sm">
                <span className="capitalize">
                  <strong>Type:</strong> {agent.type}
                </span>
                <span>
                  <strong>Model:</strong> {agent.config?.model || "Not set"}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  agent.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {agent.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden bg-muted/30">
        <div className="h-full max-w-4xl mx-auto flex flex-col">
          <AgentChat agentId={agent.id} agentStatus={agent.status} />
        </div>
      </div>
    </div>
  );
}
