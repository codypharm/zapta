"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Webhook, CheckCircle2 } from "lucide-react";

interface WebhookActivityProps {
  metrics: {
    totalEvents: number;
    successRate: number;
    byType: Array<{
      eventType: string;
      count: number;
      percentage: number;
    }>;
  };
}

export function WebhookActivity({ metrics }: WebhookActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="w-5 h-5" />
          Webhook Events
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Total Events</p>
            <p className="text-2xl font-bold">{metrics.totalEvents}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Success Rate</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
              {metrics.successRate}%
              <CheckCircle2 className="w-5 h-5" />
            </p>
          </div>
        </div>

        {/* Event Type Breakdown */}
        {metrics.byType && metrics.byType.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Event Types</h4>
            {metrics.byType.map((type) => (
              <div
                key={type.eventType}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <span className="text-sm font-medium">{type.eventType}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {type.count}
                  </span>
                  <span className="text-sm font-medium">
                    {type.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            No webhook events yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
