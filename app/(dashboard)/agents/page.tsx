/**
 * Agents List Page
 * Displays all user's AI agents with improved card design
 */

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Bot, Plus } from "lucide-react";
import { AgentCard } from "@/components/agents/agent-card";

export default async function AgentsPage() {
  const supabase = await createServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's agents
  const { data: agents } = await supabase
    .from("agents")
    .select("*")
    .order("created_at", { ascending: false });

  // Get conversation counts for each agent
  const conversationCounts: Record<string, number> = {};
  if (agents && agents.length > 0) {
    const { data: conversations } = await supabase
      .from("conversations")
      .select("agent_id");

    if (conversations) {
      conversations.forEach((conv) => {
        conversationCounts[conv.agent_id] = (conversationCounts[conv.agent_id] || 0) + 1;
      });
    }
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
            <p className="text-muted-foreground mt-2">
              Create and manage your AI agents
            </p>
          </div>
          {agents && agents.length > 0 && (
            <Button asChild>
              <Link href="/agents/new">
                <Plus className="w-4 h-4 mr-2" />
                Create Agent
              </Link>
            </Button>
          )}
        </div>

        {/* Empty State */}
        {!agents || agents.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Bot className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No agents yet</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Get started by creating your first AI agent. Just describe what you want it to do in plain English.
              </p>
              <Button asChild size="lg">
                <Link href="/agents/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Agent
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Agents Grid */
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                conversationCount={conversationCounts[agent.id] || 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
