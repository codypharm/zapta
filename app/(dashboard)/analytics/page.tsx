/**
 * Analytics Dashboard Page
 * Shows metrics, charts, and insights about agent performance
 */

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAnalyticsMetrics } from "@/lib/analytics/actions";
import { MetricCard } from "@/components/analytics/metric-card";
import { ConversationsChart } from "@/components/analytics/conversations-chart";
import { TopAgentsTable } from "@/components/analytics/top-agents-table";
import { KnowledgeBaseStats } from "@/components/analytics/knowledge-base-stats";
import { IntegrationUsage } from "@/components/analytics/integration-usage";
import { WebhookActivity } from "@/components/analytics/webhook-activity";
import { AgentTypesStats } from "@/components/analytics/agent-types-stats";
import { MessageSquare, Users, Bot } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function AnalyticsPage() {
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

  // Fetch analytics metrics
  const { metrics, error } = await getAnalyticsMetrics(30);

  if (error || !metrics) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold tracking-tight mb-8">Analytics</h1>
          <Alert variant="destructive">
            <AlertDescription>
              {error || "Failed to load analytics data"}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
        {/* Header with gradient */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 p-6 sm:p-8 shadow-lg">
          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Analytics</h1>
            <p className="text-sm sm:text-base text-slate-300 mt-2">
              Monitor your agent performance and activity over time
            </p>
          </div>
          {/* Decorative elements */}
          <div className="absolute right-0 top-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/5" />
          <div className="absolute right-20 bottom-0 -mb-6 h-24 w-24 rounded-full bg-white/5" />
        </div>

        {/* Metric Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <MetricCard
            title="Total Conversations"
            value={metrics.conversations.total}
            change={metrics.conversations.change}
            icon={MessageSquare}
            description="Last 30 days"
            variant="blue"
          />
          <MetricCard
            title="Leads Collected"
            value={metrics.leads.total}
            change={metrics.leads.change}
            icon={Users}
            description="Last 30 days"
            variant="green"
          />
          <MetricCard
            title="Active Agents"
            value={metrics.activeAgents.total}
            change={metrics.activeAgents.change}
            icon={Bot}
            description="Currently active"
            variant="purple"
          />
        </div>

        {/* Agent Types Breakdown */}
        <AgentTypesStats metrics={metrics.agentTypes} />

        {/* Activity Chart */}
        <ConversationsChart data={metrics.timeline} />

        {/* Knowledge Base Analytics */}
        <KnowledgeBaseStats metrics={metrics.knowledgeBase} />

        {/* Integration & Webhook Analytics */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <IntegrationUsage metrics={metrics.integrations} />
          <WebhookActivity metrics={metrics.webhooks} />
        </div>

        {/* Top Agents Table */}
        <TopAgentsTable agents={metrics.topAgents} />
      </div>
    </div>
  );
}
