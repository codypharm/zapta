/**
 * Usage Limit Banner
 * Shows when user is approaching or at their plan limit
 */

"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, XCircle, TrendingUp } from "lucide-react";
import Link from "next/link";

interface UsageLimitBannerProps {
  current: number;
  limit: number;
  resourceType: 'messages' | 'agents' | 'storage';
}

export function UsageLimitBanner({ current, limit, resourceType }: UsageLimitBannerProps) {
  const percentage = (current / limit) * 100;
  const isAtLimit = percentage >= 100;
  const isWarning = percentage >= 80 && percentage < 100;

  if (percentage < 80) return null; // Don't show until 80%

  const resourceLabel = {
    messages: 'messages this month',
    agents: 'agents',
    storage: 'storage',
  }[resourceType];

  return (
    <Alert 
      variant={isAtLimit ? 'destructive' : 'default'}
      className={`mb-6 border-2 ${
        isAtLimit 
          ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900' 
          : 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900'
      }`}
    >
      <div className="flex items-start gap-3">
        {isAtLimit ? (
          <XCircle className="w-5 h-5 mt-0.5 text-red-600 dark:text-red-400" />
        ) : (
          <AlertTriangle className="w-5 h-5 mt-0.5 text-blue-600 dark:text-blue-400" />
        )}
        
        <div className="flex-1 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className={`font-semibold ${
                isAtLimit 
                  ? 'text-red-900 dark:text-red-100' 
                  : 'text-blue-900 dark:text-blue-100'
              }`}>
                {isAtLimit 
                  ? `${resourceLabel} limit reached` 
                  : `Approaching ${resourceLabel} limit`
                }
              </p>
              <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                isAtLimit
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
              }`}>
                {current} / {limit}
              </span>
            </div>
            <Progress 
              value={Math.min(percentage, 100)} 
              className={`h-2 ${
                isAtLimit 
                  ? '[&>div]:bg-red-600' 
                  : '[&>div]:bg-blue-600'
              }`}
            />
          </div>

          <AlertDescription className={
            isAtLimit 
              ? 'text-red-800 dark:text-red-200' 
              : 'text-blue-800 dark:text-blue-200'
          }>
            {isAtLimit ? (
              <div className="space-y-2">
                <p>
                  You've used all your {resourceLabel}. Upgrade to continue using your agents.
                </p>
                <div className="flex gap-2">
                  <Button asChild size="sm" className="bg-red-600 hover:bg-red-700">
                    <Link href="/pricing">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      View Plans
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">
                    <Link href="/settings/billing">
                      Manage Billing
                   </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p>
                  You're at {Math.round(percentage)}% of your {resourceLabel} limit. 
                  Consider upgrading to avoid interruptions.
                </p>
                <Button asChild variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                  <Link href="/pricing">View Plans</Link>
                </Button>
              </div>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
