/**
 * Agent Detail & Chat Page
 * View agent details and test via chat interface
 */

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Edit, Code2, FileText, MessageSquare } from "lucide-react";
import Link from "next/link";
import { AgentChat } from "@/components/agents/agent-chat";
import { KnowledgeBasePrompt } from "@/components/agents/knowledge-base-prompt";
import { DeleteAgentButton } from "@/components/agents/delete-agent-button";

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
      <div className="p-4 sm:p-6 md:p-8">
        <Alert variant="destructive">
          <AlertDescription>Agent not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b bg-white p-4 sm:p-6">
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{agent.name}</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-2">{agent.description}</p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm">
                <span className="capitalize">
                  <strong>Type:</strong> {agent.type}
                </span>
                <span className="truncate">
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
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button asChild variant="outline" size="sm">
                <Link href={`/conversations?agent=${agent.id}`}>
                  <MessageSquare className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Conversations</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/agents/${agent.id}/knowledge`}>
                  <FileText className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Knowledge</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/agents/${agent.id}/widget`}>
                  <Code2 className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Widget</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/agents/${agent.id}/edit`}>
                  <Edit className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Edit</span>
                </Link>
              </Button>
              <DeleteAgentButton agentId={agent.id} agentName={agent.name} />
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden bg-muted/30 relative">
        {/* Knowledge Base Prompt - absolute positioned overlay */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            <KnowledgeBasePrompt agentId={agent.id} />
          </div>
        </div>

        {/* Chat Interface - original full layout */}
        <div className="h-full max-w-4xl mx-auto flex flex-col px-2 sm:px-0">
          <AgentChat agentId={agent.id} agentStatus={agent.status} />
        </div>
      </div>
    </div>
  );
}
