"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface IntegrationUsageProps {
  metrics: {
    totalActions: number;
    byProvider: Array<{
      provider: string;
      actionCount: number;
      successRate: number;
    }>;
  };
}

export function IntegrationUsage({ metrics }: IntegrationUsageProps) {
  const maxActions = Math.max(...metrics.byProvider.map(p => p.actionCount), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Integration Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Actions */}
        <div>
          <p className="text-sm text-muted-foreground">Total Actions</p>
          <p className="text-3xl font-bold">{metrics.totalActions}</p>
        </div>

        {/* Provider Breakdown */}
        {metrics.byProvider && metrics.byProvider.length > 0 ? (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">By Integration</h4>
            {metrics.byProvider.map((provider) => (
              <div key={provider.provider} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">
                    {provider.provider}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {provider.actionCount} actions
                    </span>
                    <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {provider.successRate}%
                    </span>
                  </div>
                </div>
                <Progress 
                  value={(provider.actionCount / maxActions) * 100} 
                  className="h-2"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            No integration actions yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
