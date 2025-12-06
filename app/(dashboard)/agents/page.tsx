/**
 * Agents List Page
 * Displays all user's AI agents with improved card design
 */

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Bot, Plus, Users, Briefcase, MessageSquare, TrendingUp } from "lucide-react";
import { AgentCard } from "@/components/agents/agent-card";
import { UsageLimitBanner } from "@/components/billing/usage-limit-banner";
import { checkAgentLimit } from "@/lib/billing/usage";

export default async function AgentsPage() {
  const supabase = await createServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's tenant for limit checking
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  // Check agent limits
  let agentUsage = null;
  if (profile?.tenant_id) {
    agentUsage = await checkAgentLimit(profile.tenant_id);
  }

  // Get user's agents
  const { data: agents } = await supabase
    .from("agents")
    .select("*")
    .order("created_at", { ascending: false });

  // Get conversation counts for each agent
  const conversationCounts: Record<string, number> = {};
  let totalConversations = 0;
  if (agents && agents.length > 0) {
    const { data: conversations } = await supabase
      .from("conversations")
      .select("agent_id");

    if (conversations) {
      conversations.forEach((conv) => {
        conversationCounts[conv.agent_id] = (conversationCounts[conv.agent_id] || 0) + 1;
        totalConversations++;
      });
    }
  }

  // Count agent types
  const customerAssistants = agents?.filter(a => a.type === 'customer_assistant' || a.type === 'support' || a.type === 'sales').length || 0;
  const businessAssistants = agents?.filter(a => a.type === 'business_assistant').length || 0;
  const activeAgents = agents?.filter(a => a.status === 'active').length || 0;

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Agents</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Create and manage your AI agents
            </p>
          </div>
          <Button asChild size="lg" className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-shadow">
            <Link href="/agents/new">
              <Plus className="mr-2 h-5 w-5" />
              Create Agent
            </Link>
          </Button>
        </div>

        {/* Agent Usage Limit Banner */}
        {agentUsage && (
          <UsageLimitBanner
            current={agentUsage.current}
            limit={agentUsage.limit}
            resourceType="agents"
          />
        )}

        {/* Stats Cards - Only show if there are agents */}
        {agents && agents.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border-0 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold">{agents.length}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Agents</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-slate-800">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold">{activeAgents}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-800">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold">{customerAssistants}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Customer</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-slate-800">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold">{businessAssistants}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Business</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {!agents || agents.length === 0 ? (
          <Card className="border-2 border-dashed bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
            <CardContent className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
                <Bot className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2 text-center">No agents yet</h3>
              <p className="text-muted-foreground text-center max-w-md mb-8 text-sm sm:text-base">
                Get started by creating your first AI agent. Choose between a Customer Assistant for your website or a Business Assistant for internal productivity.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                <Button asChild size="lg" className="flex-1">
                  <Link href="/agents/new">
                    <Plus className="w-5 h-5 mr-2" />
                    Create Your First Agent
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Section Headers + Agents Grid */}
            <div className="space-y-6">
              {/* Filter/Sort options could go here */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-semibold">Your Agents</h2>
                <p className="text-sm text-muted-foreground">
                  <MessageSquare className="w-4 h-4 inline mr-1" />
                  {totalConversations} total conversations
                </p>
              </div>
              
              {/* Agents Grid */}
              <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {agents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    conversationCount={conversationCounts[agent.id] || 0}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
