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
import { Bot, MessageSquare, Users, BarChart3, Lightbulb } from "lucide-react";
import { Suspense } from "react";
import { LoadingStats, LoadingCard } from "@/components/ui/loading-state";
import { UsageLimitBanner } from "@/components/billing/usage-limit-banner";
import { checkMessageLimit } from "@/lib/billing/usage";

async function DashboardContent({ params }: { params: { verified?: string } }) {
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

  // Check message usage limits
  const tenantId = (profile as any)?.tenants?.id;
  let messageUsage = null;
  if (tenantId) {
    messageUsage = await checkMessageLimit(tenantId);
  }

  // Parallel data fetching for better performance
  const [{ stats }, { activities }] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(8)
  ]);

  // Check if user is new (no activity)
  const isNewUser = (stats?.activeAgents || 0) === 0 && 
                    (stats?.recentConversations || 0) === 0 && 
                    (stats?.recentLeads || 0) === 0;

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

        {/* Usage Limit Banner */}
        {messageUsage && (
          <UsageLimitBanner
            current={messageUsage.current}
            limit={messageUsage.limit}
            resourceType="messages"
          />
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

        {/* New User Welcome Card */}
        {isNewUser && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="py-8">
              <div className="text-center space-y-4">
                <h3 className="text-xl font-bold">🎉 Welcome to Zapta!</h3>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  Get started in 3 easy steps:
                </p>
                <div className="grid gap-4 md:grid-cols-3 mt-6">
                  <div className="space-y-2">
                    <div className="text-3xl">1️⃣</div>
                    <h4 className="font-semibold">Create an Agent</h4>
                    <p className="text-sm text-muted-foreground">
                      Build your first AI agent in minutes
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="text-3xl">2️⃣</div>
                    <h4 className="font-semibold">Add Knowledge</h4>
                    <p className="text-sm text-muted-foreground">
                      Upload documents to help your agent answer questions
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="text-3xl">3️⃣</div>
                    <h4 className="font-semibold">Start Chatting</h4>
                    <p className="text-sm text-muted-foreground">
                      Test your agent and share with users
                    </p>
                  </div>
                </div>
                <Button asChild size="lg" className="mt-4">
                  <Link href="/agents/new">Create Your First Agent →</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
          {/* Recent Activity with Empty State */}
          {activities && activities.length > 0 ? (
            <ActivityFeed activities={activities} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No activity yet</p>
                  <p className="text-sm mt-1">
                    Activity will appear here as you use your agents
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick actions with improved hierarchy */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Primary action - more prominent */}
              <div className="flex items-start gap-4 p-4 rounded-lg bg-primary/10 border-2 border-primary/20">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary">
                  <Bot className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-bold">Create Agent</h3>
                  <p className="text-sm text-muted-foreground">
                    Build a new AI agent in minutes using natural language
                  </p>
                  <Button asChild size="lg" className="mt-2">
                    <Link href="/agents/new">Get Started →</Link>
                  </Button>
                </div>
              </div>

              {/* Secondary actions */}
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

        {/* Tip of the Day - only show for non-new users */}
        {!isNewUser && (
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                💡 Tip of the Day
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Did you know? You can connect your agents to HubSpot, 
                send emails, schedule meetings, and more with integrations!
              </p>
              <Button asChild variant="link" className="px-0 mt-2">
                <Link href="/integrations">Explore Integrations →</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  const params = await searchParams;

  return (
    <Suspense fallback={
      <div className="p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="space-y-2">
            <div className="h-10 w-64 bg-muted animate-pulse rounded" />
            <div className="h-4 w-48 bg-muted animate-pulse rounded" />
          </div>
          <LoadingStats />
          <div className="grid gap-6 lg:grid-cols-2">
            <LoadingCard />
            <LoadingCard />
          </div>
        </div>
      </div>
    }>
      <DashboardContent params={params} />
    </Suspense>
  );
}
