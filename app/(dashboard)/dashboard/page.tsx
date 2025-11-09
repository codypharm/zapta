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

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="flex h-16 items-center px-8">
          <h1 className="text-xl font-bold">Zapta</h1>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {profile?.full_name || user.email}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-8">
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
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Welcome back, {profile?.full_name?.split(" ")[0] || "there"}! 👋
            </h2>
            <p className="text-muted-foreground mt-2">
              Organization: <span className="font-semibold">{(profile as any)?.tenants?.name}</span>
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Agents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  No agents created yet
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Conversations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  This month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Integrations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Connected services
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-2xl">
                  🤖
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold">Create your first agent</h3>
                  <p className="text-sm text-muted-foreground">
                    Use natural language to describe what you want your agent to do.
                    No coding required!
                  </p>
                  <Button asChild className="mt-2">
                    <Link href="/agents/new">Create Agent →</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
