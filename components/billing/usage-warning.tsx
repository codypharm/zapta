/**
 * Usage Warning Component
 * Displays warning when approaching or exceeding usage limits
 */

"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, XCircle } from "lucide-react";
import Link from "next/link";

interface UsageWarningProps {
  resourceType: 'messages' | 'agents' | 'storage';
  current: number;
  limit: number;
  planId: string;
}

export function UsageWarning({ resourceType, current, limit, planId }: UsageWarningProps) {
  const percentage = (current / limit) * 100;
  
  // Don't show warning if under 80%
  if (percentage < 80) return null;

  const isAtLimit = percentage >= 100;
  const resourceLabel = {
    messages: 'messages',
    agents: 'agents',
    storage: 'storage',
  }[resourceType];

  return (
    <Alert variant={isAtLimit ? 'destructive' : 'default'}>
      <div className="flex items-start gap-2">
        {isAtLimit ? (
          <XCircle className="w-5 h-5 mt-0.5" />
        ) : (
          <AlertTriangle className="w-5 h-5 mt-0.5" />
        )}
        <div className="flex-1">
          <AlertDescription>
            {isAtLimit ? (
              <div className="space-y-2">
                <p className="font-medium">
                  You've reached your {resourceLabel} limit
                </p>
                <p className="text-sm">
                  Upgrade your plan to continue using your agents without interruption.
                </p>
                <Button asChild size="sm" className="mt-2">
                  <Link href="/settings/billing">Upgrade Now</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-medium">
                  You're at {Math.round(percentage)}% of your {resourceLabel} limit
                </p>
                <p className="text-sm">
                  You have {limit - current} {resourceLabel} remaining. Consider upgrading to avoid hitting your limit.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-2">
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
