/**
 * Dashboard Page
 * Main dashboard showing overview and quick actions
 */

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { getDashboardStats, getRecentActivity } from "@/lib/analytics/actions";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { Bot, MessageSquare, Users, BarChart3 } from "lucide-react";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  const supabase = await createServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile with tenant info
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, tenants(*)")
    .eq("id", user.id)
    .single();

  // Await searchParams
  const params = await searchParams;

  // Fetch dashboard stats and recent activity
  const { stats } = await getDashboardStats();
  const { activities } = await getRecentActivity(8);

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Email verification success message */}
        {params.verified === "true" && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <AlertDescription>
              <div className="flex items-center gap-2">
                <span className="text-xl">✓</span>
                <span className="font-semibold">
                  Email verified successfully! Your account is now active.
                </span>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Welcome section */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Welcome back, {profile?.full_name?.split(" ")[0] || "there"}! 👋
            </h2>
            <p className="text-muted-foreground mt-2">
              Organization:{" "}
              <span className="font-semibold">
                {(profile as any)?.tenants?.name}
              </span>
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              View Full Analytics
            </Link>
          </Button>
        </div>

        {/* Quick stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Agents
              </CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.activeAgents || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.activeAgents === 0
                  ? "No agents created yet"
                  : "Currently active"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Recent Conversations
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.recentConversations || 0}
              </div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Recent Leads
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.recentLeads || 0}
              </div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Two column layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Activity */}
          <ActivityFeed activities={activities || []} />

          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-lg border hover:border-primary/50 transition-colors">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold">Create Agent</h3>
                  <p className="text-sm text-muted-foreground">
                    Build a new AI agent in minutes using natural language
                  </p>
                  <Button asChild size="sm" className="mt-2">
                    <Link href="/agents/new">Create Agent →</Link>
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg border hover:border-primary/50 transition-colors">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold">View Leads</h3>
                  <p className="text-sm text-muted-foreground">
                    See all leads captured by your agents
                  </p>
                  <Button asChild size="sm" variant="outline" className="mt-2">
                    <Link href="/leads">View Leads →</Link>
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg border hover:border-primary/50 transition-colors">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold">Conversations</h3>
                  <p className="text-sm text-muted-foreground">
                    Review chat history and agent interactions
                  </p>
                  <Button asChild size="sm" variant="outline" className="mt-2">
                    <Link href="/conversations">View All →</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
