/**
 * Billing Settings Page
 * Manage subscription, view usage, and update payment method
 */

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getCurrentSubscription, getUsageStats } from "@/lib/billing/actions";
import { getPlanLimits, getPlanPrice, PLAN_NAMES } from "@/lib/billing/plans";
import { UpgradeButton } from "@/components/billing/upgrade-button";
import { ManageSubscriptionButton } from "@/components/billing/manage-subscription-button";
import Link from "next/link";

export default async function BillingPage() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { subscription } = await getCurrentSubscription();
  const { usage } = await getUsageStats();

  if (!subscription || !usage) {
    return <div>Loading...</div>;
  }

  const planLimits = getPlanLimits(subscription.plan_id);
  const planPrice = getPlanPrice(subscription.plan_id);

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Billing & Usage</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Manage your subscription and monitor your usage
          </p>
        </div>

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Your active subscription details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-xl sm:text-2xl font-bold capitalize">
                    {PLAN_NAMES[subscription.plan_id as keyof typeof PLAN_NAMES]}
                  </h3>
                  <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                    {subscription.status}
                  </Badge>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {planPrice > 0 ? `$${planPrice}/month` : 'Free forever'}
                </p>
                {subscription.current_period_end && (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    {subscription.cancel_at_period_end
                      ? `Cancels on ${new Date(subscription.current_period_end).toLocaleDateString()}`
                      : `Renews on ${new Date(subscription.current_period_end).toLocaleDateString()}`
                    }
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {subscription.plan_id !== 'enterprise' && (
                  <UpgradeButton currentPlan={subscription.plan_id} />
                )}
                {subscription.plan_id !== 'free' && (
                  <ManageSubscriptionButton />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Usage This Month</CardTitle>
            <CardDescription>Monitor your current usage against plan limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Agents */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">AI Agents</span>
                <span className={usage.agents > planLimits.agents && planLimits.agents !== -1 ? "text-orange-600 font-semibold" : "text-muted-foreground"}>
                  {usage.agents} / {planLimits.agents === -1 ? '∞' : planLimits.agents}
                </span>
              </div>
              <Progress 
                value={planLimits.agents === -1 ? 0 : (usage.agents / planLimits.agents) * 100} 
                className={usage.agents > planLimits.agents && planLimits.agents !== -1 ? "[&>div]:bg-orange-500" : ""}
              />
              {usage.agents > planLimits.agents && planLimits.agents !== -1 && (
                <p className="text-sm text-orange-600">
                  ⚠️ Over limit! You can't create new agents. Upgrade your plan or delete {usage.agents - planLimits.agents} agent{usage.agents - planLimits.agents > 1 ? 's' : ''}.
                </p>
              )}
            </div>

            {/* Messages */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Messages</span>
                <span className="text-muted-foreground">
                  {usage.messages} / {planLimits.messages.toLocaleString()}
                </span>
              </div>
              <Progress 
                value={(usage.messages / planLimits.messages) * 100} 
              />
              {usage.messages >= planLimits.messages * 0.8 && (
                <p className="text-sm text-orange-600">
                  ⚠️ You're at {Math.round((usage.messages / planLimits.messages) * 100)}% of your limit
                </p>
              )}
            </div>

            {/* Storage */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Storage</span>
                <span className={usage.storage_mb > planLimits.storage_mb ? "text-orange-600 font-semibold" : "text-muted-foreground"}>
                  {usage.storage_mb} MB / {planLimits.storage_mb} MB
                </span>
              </div>
              <Progress 
                value={(usage.storage_mb / planLimits.storage_mb) * 100} 
                className={usage.storage_mb > planLimits.storage_mb ? "[&>div]:bg-orange-500" : ""}
              />
              {usage.storage_mb > planLimits.storage_mb && (
                <p className="text-sm text-orange-600">
                  ⚠️ Over limit by {usage.storage_mb - planLimits.storage_mb} MB! You can't upload new files. Upgrade your plan or delete some documents.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plan Features */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Features</CardTitle>
            <CardDescription>What's included in your current plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <p className="font-medium">AI Models</p>
                <p className="text-sm text-muted-foreground">
                  {planLimits.models === '*' 
                    ? 'All models available' 
                    : (planLimits.models as readonly string[]).slice(0, 3).join(', ') + 
                      ((planLimits.models as readonly string[]).length > 3 ? '...' : '')
                  }
                </p>
              </div>
              <div>
                <p className="font-medium">Storage</p>
                <p className="text-sm text-muted-foreground">
                  {planLimits.storage_mb < 1024 
                    ? `${planLimits.storage_mb} MB`
                    : `${(planLimits.storage_mb / 1024).toFixed(0)} GB`
                  }
                </p>
              </div>
              <div>
                <p className="font-medium">Email</p>
                <p className="text-sm text-muted-foreground">
                  {planLimits.integrations.email === -1 
                    ? 'Unlimited' 
                    : `${planLimits.integrations.email}/month`
                  }
                </p>
              </div>
              <div>
                <p className="font-medium">SMS</p>
                <p className="text-sm text-muted-foreground">
                  {planLimits.integrations.sms === -1 
                    ? 'Unlimited' 
                    : planLimits.integrations.sms === 0
                      ? 'Not available'
                      : `${planLimits.integrations.sms}/month`
                  }
                </p>
              </div>
              <div>
                <p className="font-medium">Calendar</p>
                <p className="text-sm text-muted-foreground">
                  {planLimits.integrations.calendar ? '✓ Available' : '✗ Not available'}
                </p>
              </div>
              <div>
                <p className="font-medium">Google Drive</p>
                <p className="text-sm text-muted-foreground">
                  {planLimits.integrations.google_drive ? '✓ Available' : '✗ Not available'}
                </p>
              </div>
              <div>
                <p className="font-medium">Notion</p>
                <p className="text-sm text-muted-foreground">
                  {planLimits.integrations.notion ? '✓ Available' : '✗ Not available'}
                </p>
              </div>
              <div>
                <p className="font-medium">HubSpot</p>
                <p className="text-sm text-muted-foreground">
                  {planLimits.integrations.hubspot ? '✓ Available' : '✗ Not available'}
                </p>
              </div>
              <div>
                <p className="font-medium">Stripe</p>
                <p className="text-sm text-muted-foreground">
                  {planLimits.integrations.stripe ? '✓ Available' : '✗ Not available'}
                </p>
              </div>
              <div>
                <p className="font-medium">Webhooks</p>
                <p className="text-sm text-muted-foreground">
                  {planLimits.integrations.webhooks ? '✓ Available' : '✗ Not available'}
                </p>
              </div>
              <div>
                <p className="font-medium">Slack</p>
                <p className="text-sm text-muted-foreground">
                  {planLimits.integrations.slack ? '✓ Available' : '✗ Not available'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upgrade CTA if on free plan */}
        {subscription.plan_id === 'free' && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="py-4 sm:py-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-semibold mb-1 text-base sm:text-lg">Upgrade to unlock more</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Get access to all AI models, more messages, and premium features
                  </p>
                </div>
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/pricing">View Plans</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
